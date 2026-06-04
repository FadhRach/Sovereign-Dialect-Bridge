"""
Views untuk autentikasi user: register, login, logout, refresh, profile, change-password.

Semua response mengikuti format universal `{success, data, message, errors}`.
Endpoint login & register memakai AuthThrottle untuk mitigasi brute-force.
"""

from django.contrib.auth import authenticate
from django.db import transaction

from .models import CustomUser
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenRefreshView as SimpleJWTTokenRefreshView

from .serializers import (
    ChangePasswordSerializer,
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
            tokens = _generate_tokens(user)
        return success_response(
            data={**tokens, "user": UserSummarySerializer(user).data},
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
        tokens = _generate_tokens(user)
        return success_response(
            data={**tokens, "user": UserSummarySerializer(user).data},
            message="Login berhasil.",
        )


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
