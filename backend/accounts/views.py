"""
Views untuk autentikasi user: register, login, logout, refresh, profile, change-password.

Semua response mengikuti format universal `{success, data, message, errors}`.
Endpoint login & register memakai AuthThrottle untuk mitigasi brute-force.
"""

import secrets

from django.contrib.auth import authenticate
from django.conf import settings
from django.contrib.auth.hashers import check_password, make_password
from django.core.mail import EmailMultiAlternatives
from django.db import transaction
from django.utils import timezone

from .models import CustomUser, PasswordResetCode
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenRefreshView as SimpleJWTTokenRefreshView

from .serializers import (
    ChangePasswordSerializer,
    GoogleLoginSerializer,
    PasswordResetConfirmSerializer,
    PasswordResetRequestSerializer,
    PasswordResetVerifySerializer,
    ProfileSerializer,
    RegisterSerializer,
    UserSummarySerializer,
)
from .throttles import AuthThrottle


def success_response(data=None, message="", status_code=status.HTTP_200_OK):
    """Helper untuk format response sukses standar."""
    return Response(
        {"success": True, "data": data, "message": message},
        status=status_code,
    )


def error_response(message="", errors=None, status_code=status.HTTP_400_BAD_REQUEST):
    """Helper untuk format response error standar."""
    return Response(
        {"success": False, "data": None, "message": message, "errors": errors or {}},
        status=status_code,
    )


def _generate_tokens(user):
    """Buat pasangan access + refresh token dengan custom claim."""
    refresh = RefreshToken.for_user(user)
    refresh["email"] = user.email
    refresh["full_name"] = user.full_name
    refresh["role"] = user.role
    return {"access": str(refresh.access_token), "refresh": str(refresh)}


def _auth_response(user):
    tokens = _generate_tokens(user)
    return {**tokens, "user": UserSummarySerializer(user).data}


class RegisterView(APIView):
    """Registrasi user baru dan return JWT token."""

    permission_classes = [AllowAny]
    throttle_classes = [AuthThrottle]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if not serializer.is_valid():
            return error_response("Registrasi gagal.", errors=serializer.errors)
        with transaction.atomic():
            user = serializer.save()
        return success_response(
            data=_auth_response(user),
            message="Registrasi berhasil.",
            status_code=status.HTTP_201_CREATED,
        )


class LoginView(APIView):
    """Login dengan email + password, return JWT token."""

    permission_classes = [AllowAny]
    throttle_classes = [AuthThrottle]

    def post(self, request):
        email = request.data.get("email", "").strip().lower()
        password = request.data.get("password", "")
        if not email or not password:
            return error_response("Email dan password wajib diisi.")
        user = authenticate(request, username=email, password=password)
        if not user:
            # Django authenticate() menolak user is_active=False tanpa membedakan
            # dari kredensial salah. Cek manual agar pesan tepat.
            try:
                existing = CustomUser.objects.get(email=email)
            except CustomUser.DoesNotExist:
                existing = None
            if existing and not existing.is_active and existing.check_password(password):
                return error_response(
                    "Akun nonaktif. Hubungi administrator.",
                    status_code=status.HTTP_403_FORBIDDEN,
                )
            return error_response(
                "Email atau password salah.",
                status_code=status.HTTP_401_UNAUTHORIZED,
            )
        return success_response(
            data=_auth_response(user),
            message="Login berhasil.",
        )


class GoogleLoginView(APIView):
    """Login atau auto-create user dari Google ID token yang valid."""

    permission_classes = [AllowAny]
    throttle_classes = [AuthThrottle]

    def post(self, request):
        serializer = GoogleLoginSerializer(data=request.data)
        if not serializer.is_valid():
            return error_response("Login Google gagal.", errors=serializer.errors)

        google_payload, error_message = _verify_google_credential(serializer.validated_data["credential"])
        if error_message:
            return error_response(error_message, status_code=status.HTTP_401_UNAUTHORIZED)

        user = _get_or_create_google_user(google_payload)
        if not user.is_active:
            return error_response("Akun nonaktif. Hubungi administrator.", status_code=status.HTTP_403_FORBIDDEN)

        return success_response(data=_auth_response(user), message="Login Google berhasil.")


class LogoutView(APIView):
    """Blacklist refresh token saat logout."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        refresh_token = request.data.get("refresh")
        if not refresh_token:
            return error_response("Refresh token wajib disertakan.")
        try:
            RefreshToken(refresh_token).blacklist()
        except TokenError:
            return error_response("Token tidak valid atau sudah kadaluarsa.")
        return success_response(message="Logout berhasil.")


class TokenRefreshView(SimpleJWTTokenRefreshView):
    """
    Subclass dari SimpleJWT TokenRefreshView agar rotation + blacklist built-in jalan,
    sambil tetap membungkus response ke format universal.
    """

    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        try:
            response = super().post(request, *args, **kwargs)
        except TokenError:
            return error_response(
                "Refresh token tidak valid atau sudah kadaluarsa.",
                status_code=status.HTTP_401_UNAUTHORIZED,
            )
        if response.status_code != status.HTTP_200_OK:
            return error_response(
                "Refresh token tidak valid.",
                status_code=response.status_code,
            )
        return success_response(data=response.data, message="Token diperbarui.")


class ProfileView(APIView):
    """Get dan update profile user yang sedang login."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = ProfileSerializer(request.user)
        return success_response(data=serializer.data)

    def put(self, request):
        serializer = ProfileSerializer(request.user, data=request.data, partial=True)
        if not serializer.is_valid():
            return error_response("Update profile gagal.", errors=serializer.errors)
        serializer.save()
        return success_response(data=serializer.data, message="Profile berhasil diperbarui.")


class ChangePasswordView(APIView):
    """Ganti password user yang sedang login."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data)
        if not serializer.is_valid():
            return error_response("Ganti password gagal.", errors=serializer.errors)
        user = request.user
        if not user.check_password(serializer.validated_data["old_password"]):
            return error_response("Password lama salah.")
        user.set_password(serializer.validated_data["new_password"])
        user.save()
        return success_response(message="Password berhasil diubah.")


class PasswordResetRequestView(APIView):
    """Kirim kode verifikasi reset password ke email."""

    permission_classes = [AllowAny]
    throttle_classes = [AuthThrottle]

    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return error_response("Permintaan reset password gagal.", errors=serializer.errors)

        email = serializer.validated_data["email"]
        user = _find_user_for_reset(email)
        if not user:
            return _password_reset_request_accepted()

        code = _generate_reset_code()
        reset_code = PasswordResetCode.objects.create(
            user=user,
            identifier=email,
            channel="email",
            code_hash=make_password(code),
            expires_at=timezone.now() + timezone.timedelta(minutes=settings.PASSWORD_RESET_CODE_TTL_MINUTES),
        )
        delivery_ok, delivery_error = _deliver_reset_code(user, code)
        if not delivery_ok:
            reset_code.delete()
            return error_response(delivery_error, status_code=status.HTTP_503_SERVICE_UNAVAILABLE)

        data = {
            "expires_in_minutes": settings.PASSWORD_RESET_CODE_TTL_MINUTES,
        }
        if settings.DEBUG and settings.PASSWORD_RESET_DEBUG_CODE:
            data["debug_code"] = code
        return _password_reset_request_accepted(data=data)


class PasswordResetVerifyView(APIView):
    """Verifikasi kode dan return reset token sementara."""

    permission_classes = [AllowAny]
    throttle_classes = [AuthThrottle]

    def post(self, request):
        serializer = PasswordResetVerifySerializer(data=request.data)
        if not serializer.is_valid():
            return error_response("Verifikasi kode gagal.", errors=serializer.errors)

        reset_code = _get_active_reset_code(
            serializer.validated_data["email"],
        )
        if not reset_code:
            return error_response("Kode tidak valid atau sudah kedaluwarsa.", status_code=status.HTTP_400_BAD_REQUEST)

        if reset_code.attempts >= settings.PASSWORD_RESET_MAX_ATTEMPTS:
            return error_response("Percobaan verifikasi terlalu banyak. Minta kode baru.", status_code=status.HTTP_429_TOO_MANY_REQUESTS)

        code = serializer.validated_data["code"]
        if not check_password(code, reset_code.code_hash):
            reset_code.attempts += 1
            reset_code.save(update_fields=["attempts"])
            return error_response("Kode verifikasi salah.")

        reset_token = secrets.token_urlsafe(32)
        reset_code.reset_token_hash = make_password(reset_token)
        reset_code.verified_at = timezone.now()
        reset_code.save(update_fields=["reset_token_hash", "verified_at"])
        return success_response(
            data={"reset_token": reset_token},
            message="Kode benar. Silakan buat password baru.",
        )


class PasswordResetConfirmView(APIView):
    """Ganti password memakai reset token hasil verifikasi kode."""

    permission_classes = [AllowAny]
    throttle_classes = [AuthThrottle]

    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        if not serializer.is_valid():
            return error_response("Ganti password gagal.", errors=serializer.errors)

        reset_code = _find_verified_reset_code(serializer.validated_data["reset_token"])
        if not reset_code:
            return error_response("Sesi reset password tidak valid atau sudah kedaluwarsa.", status_code=status.HTTP_400_BAD_REQUEST)

        user = reset_code.user
        user.set_password(serializer.validated_data["new_password"])
        user.save(update_fields=["password"])
        reset_code.mark_used()
        PasswordResetCode.objects.filter(user=user, used_at__isnull=True).exclude(pk=reset_code.pk).update(used_at=timezone.now())
        return success_response(message="Password berhasil diganti. Silakan login kembali.")


def _verify_google_credential(credential: str):
    google_client_id = getattr(settings, "GOOGLE_CLIENT_ID", "")
    if not google_client_id:
        return None, "Login Google belum dikonfigurasi."

    try:
        from google.auth.transport import requests as google_requests
        from google.oauth2 import id_token
    except ImportError:
        return None, "Dependensi Google Auth belum terinstal di backend."

    try:
        payload = id_token.verify_oauth2_token(
            credential,
            google_requests.Request(),
            google_client_id,
        )
    except Exception:
        return None, "Token Google tidak valid."

    if not payload.get("email") or not payload.get("email_verified"):
        return None, "Email Google belum terverifikasi."
    return payload, ""


def _get_or_create_google_user(payload: dict) -> CustomUser:
    email = str(payload["email"]).strip().lower()
    full_name = str(payload.get("name") or email.split("@")[0]).strip()
    user, created = CustomUser.objects.get_or_create(
        email=email,
        defaults={
            "full_name": full_name,
            "phone": "",
            "address_city": "Belum dilengkapi",
            "address_province": "DKI Jakarta",
            "role": "user",
        },
    )
    if created:
        user.set_unusable_password()
        user.save(update_fields=["password"])
    elif not user.full_name and full_name:
        user.full_name = full_name
        user.save(update_fields=["full_name"])
    return user


def _find_user_for_reset(email: str):
    return CustomUser.objects.filter(is_active=True, email__iexact=email).first()


def _generate_reset_code() -> str:
    return f"{secrets.randbelow(1_000_000):06d}"


def _password_reset_request_accepted(data=None):
    return success_response(
        data=data or {},
        message="Jika akun ditemukan, kode verifikasi akan dikirim.",
    )


def _deliver_reset_code(user: CustomUser, code: str) -> tuple[bool, str]:
    return _send_reset_code_email(user, code)


def _send_reset_code_email(user: CustomUser, code: str) -> tuple[bool, str]:
    ttl = settings.PASSWORD_RESET_CODE_TTL_MINUTES
    subject = "Kode Reset Password — Sovereign Dialect-Bridge"
    plain = (
        f"Halo {user.full_name},\n\n"
        f"Kode reset password Anda: {code}\n"
        f"Berlaku {ttl} menit. Jangan bagikan kode ini ke siapapun.\n\n"
        "Jika Anda tidak meminta reset password, abaikan email ini.\n\n"
        "— Tim Sovereign Dialect-Bridge"
    )
    # Digit blocks untuk mudah dibaca di mobile (mis. 123 456)
    code_display = f"{code[:3]} {code[3:]}" if len(code) == 6 else code
    html = f"""<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#F4F5F7;font-family:'Segoe UI',system-ui,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F4F5F7;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:480px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(30,42,74,0.10);">

        <!-- Header -->
        <tr>
          <td style="background:#1E2A4A;padding:28px 32px;text-align:center;">
            <p style="margin:0;color:#ffffff;font-size:18px;font-weight:700;letter-spacing:-0.3px;">
              Sovereign Dialect-Bridge
            </p>
            <p style="margin:4px 0 0;color:#93C5FD;font-size:12px;">
              Platform Pengaduan Publik Multidialek Indonesia
            </p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:36px 32px 24px;">
            <p style="margin:0 0 8px;color:#1E2A4A;font-size:22px;font-weight:700;">
              Reset Password
            </p>
            <p style="margin:0 0 24px;color:#64748B;font-size:15px;line-height:1.6;">
              Halo <strong style="color:#1E2A4A;">{user.full_name}</strong>,<br>
              gunakan kode berikut untuk mereset password akun Anda.
            </p>

            <!-- Code box -->
            <div style="background:#EFF6FF;border:2px dashed #2563EB;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px;">
              <p style="margin:0 0 6px;color:#2563EB;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;">
                Kode Verifikasi
              </p>
              <p style="margin:0;color:#1E2A4A;font-size:40px;font-weight:800;letter-spacing:0.18em;font-family:'Courier New',monospace;">
                {code_display}
              </p>
              <p style="margin:10px 0 0;color:#64748B;font-size:13px;">
                Berlaku selama <strong>{ttl} menit</strong>
              </p>
            </div>

            <p style="margin:0 0 6px;color:#94A3B8;font-size:13px;line-height:1.6;">
              Jika Anda tidak meminta reset password, abaikan email ini.
              Akun Anda tetap aman.
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#F8FAFC;border-top:1px solid #E2E8F0;padding:20px 32px;text-align:center;">
            <p style="margin:0;color:#94A3B8;font-size:12px;">
              &copy; {__import__('datetime').date.today().year} Sovereign Dialect-Bridge
              &nbsp;&bull;&nbsp; Jangan balas email ini
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>"""

    try:
        msg = EmailMultiAlternatives(
            subject=subject,
            body=plain,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[user.email],
        )
        msg.attach_alternative(html, "text/html")
        msg.send()
    except Exception as exc:
        return False, f"Gagal mengirim email verifikasi: {str(exc)[:120]}"
    return True, ""


def _get_active_reset_code(email: str):
    now = timezone.now()
    return PasswordResetCode.objects.filter(
        identifier=email,
        channel="email",
        used_at__isnull=True,
        expires_at__gt=now,
    ).first()


def _find_verified_reset_code(reset_token: str):
    now = timezone.now()
    candidates = PasswordResetCode.objects.filter(
        used_at__isnull=True,
        verified_at__isnull=False,
        expires_at__gt=now,
    ).select_related("user")[:50]
    for candidate in candidates:
        if candidate.reset_token_hash and check_password(reset_token, candidate.reset_token_hash):
            return candidate
    return None
