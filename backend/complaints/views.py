import datetime
import os
import threading
from django.conf import settings
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.db.models import Count
from django.shortcuts import get_object_or_404
from django.utils import timezone

from django.db import models
from accounts.permissions import IsAdminUser
from .models import Complaint, Category, AdminNote, StatusHistory, Notification, SystemSetting
from .serializers import (
    ADMIN_SETTING_DEFINITIONS,
    AdminSettingUpdateSerializer,
    ComplaintDeleteSerializer,
    ComplaintListSerializer,
    ComplaintDetailSerializer,
    ComplaintCreateSerializer,
    ComplaintUpdateSerializer,
    CategorySerializer,
)

MAX_PHOTO_UPLOAD_BYTES = 5 * 1024 * 1024
ALLOWED_PHOTO_TYPES = {"image/jpeg", "image/png", "image/webp"}


def success_response(data=None, message="", status_code=status.HTTP_200_OK):
    """Helper untuk format response sukses standar."""
    return Response({"success": True, "data": data, "message": message}, status=status_code)


def error_response(message="", errors=None, status_code=status.HTTP_400_BAD_REQUEST):
    """Helper untuk format response error standar."""
    return Response({"success": False, "data": None, "message": message, "errors": errors or {}}, status=status_code)


class ComplaintListCreateView(APIView):
    """
    GET  → list aduan (user: milik sendiri, admin: semua)
    POST → submit aduan baru, NLP jalan di background

    Catatan: GET dibatasi hard-cap MAX_LIST_SIZE untuk keamanan production.
    Frontend Saat ini belum paginasi — cap mencegah timeout saat data besar.
    """
    permission_classes = [IsAuthenticated]
    MAX_LIST_SIZE = 500

    def get(self, request):
        queryset = _filter_complaints(request)[: self.MAX_LIST_SIZE]
        serializer = ComplaintListSerializer(queryset, many=True)
        return success_response(data=serializer.data)

    def post(self, request):
        serializer = ComplaintCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return error_response("Gagal submit aduan.", errors=serializer.errors)
        complaint = serializer.save(user=request.user, processing_stage="queued")
        threading.Thread(target=_run_nlp_pipeline, args=(complaint.id,), daemon=True).start()
        return success_response(
            data=ComplaintDetailSerializer(complaint).data,
            message="Aduan berhasil dikirim. Sedang diproses...",
            status_code=status.HTTP_201_CREATED,
        )


class ComplaintPhotoUploadView(APIView):
    """Upload foto pendukung aduan ke Cloudinary memakai credential backend."""
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        photo = request.FILES.get("photo")
        if photo is None:
            return error_response("File foto wajib dikirim.", status_code=status.HTTP_400_BAD_REQUEST)

        validation_error = _validate_photo_file(photo)
        if validation_error:
            return error_response(validation_error, status_code=status.HTTP_400_BAD_REQUEST)

        if not _cloudinary_is_configured():
            return error_response(
                "Cloudinary belum dikonfigurasi di backend.",
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        try:
            uploaded = _upload_photo_to_cloudinary(photo, request.user.id)
        except Exception as exc:
            return error_response(
                f"Upload foto gagal: {str(exc)[:160]}",
                status_code=status.HTTP_502_BAD_GATEWAY,
            )

        return success_response(
            data=uploaded,
            message="Foto berhasil diupload.",
            status_code=status.HTTP_201_CREATED,
        )


class ComplaintDetailView(APIView):
    """
    GET   → detail aduan lengkap + NLP result + history
    PATCH → [Admin] update status + catatan
    DELETE → [Admin] hapus aduan
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        complaint = _get_complaint_or_404(request, pk)
        serializer = ComplaintDetailSerializer(complaint)
        return success_response(data=serializer.data)

    def patch(self, request, pk):
        if request.user.role != "admin":
            return error_response("Akses ditolak.", status_code=status.HTTP_403_FORBIDDEN)
        complaint = get_object_or_404(Complaint, pk=pk)
        serializer = ComplaintUpdateSerializer(data=request.data)
        if not serializer.is_valid():
            return error_response("Data tidak valid.", errors=serializer.errors)
        _apply_complaint_update(complaint, request.user, serializer.validated_data)
        return success_response(
            data=ComplaintDetailSerializer(complaint).data,
            message="Aduan berhasil diperbarui.",
        )

    def delete(self, request, pk):
        if request.user.role == "admin":
            complaint = get_object_or_404(Complaint, pk=pk)
            serializer = ComplaintDeleteSerializer(data=request.data)
            if not serializer.is_valid():
                return error_response("Alasan hapus aduan wajib diisi.", errors=serializer.errors)
            _notify_user_complaint_deleted(complaint, request.user, serializer.validated_data["reason"])
            complaint.delete()
            return success_response(message="Aduan berhasil dihapus.")

        complaint = get_object_or_404(Complaint, pk=pk, user=request.user)
        if complaint.status != "pending":
            return error_response(
                "Aduan hanya bisa dibatalkan saat masih menunggu peninjauan.",
                status_code=status.HTTP_409_CONFLICT,
            )
        _notify_admins_complaint_cancelled(complaint, request.user)
        complaint.delete()
        return success_response(message="Aduan berhasil dibatalkan.")


class ComplaintMapView(APIView):
    """Return titik koordinat untuk Leaflet (public).

    Hard-cap 2000 titik supaya Leaflet markercluster tetap responsif. Jika
    perlu lebih, frontend bisa kirim filter `urgency` / `category` / `status`.
    """
    permission_classes = [AllowAny]
    MAX_POINTS = 2000

    def get(self, request):
        qs = Complaint.objects.filter(latitude__isnull=False, longitude__isnull=False).select_related("category")

        urgency = request.query_params.get("urgency")
        category = request.query_params.get("category")
        status_filter = request.query_params.get("status")
        if urgency:
            qs = qs.filter(urgency_level=urgency)
        if category:
            qs = qs.filter(category__name__icontains=category)
        if status_filter:
            qs = qs.filter(status=status_filter)

        points = qs.values(
            "id", "latitude", "longitude", "wilayah",
            "status", "urgency_level", "category__name", "created_at",
        )[: self.MAX_POINTS]
        return success_response(data=list(points))


class CategoryListView(APIView):
    """Return semua kategori aduan (public)."""
    permission_classes = [AllowAny]

    def get(self, request):
        categories = Category.objects.all()
        serializer = CategorySerializer(categories, many=True)
        return success_response(data=serializer.data)


class DashboardStatsView(APIView):
    """Return statistik aduan lengkap untuk dashboard admin."""
    permission_classes = [IsAdminUser]

    def get(self, request):
        qs = Complaint.objects.all()

        by_status = {
            row["status"]: row["count"]
            for row in qs.values("status").annotate(count=Count("id"))
        }
        by_urgency = {
            row["urgency_level"]: row["count"]
            for row in qs.values("urgency_level").annotate(count=Count("id"))
        }
        by_category = list(
            qs.exclude(category__isnull=True)
            .values(name=models.F("category__name"))
            .annotate(count=Count("id"))
            .order_by("-count")[:8]
        )
        by_province = list(
            qs.exclude(user__isnull=True)
            .values(province=models.F("user__address_province"))
            .annotate(count=Count("id"))
            .order_by("-count")[:10]
        )
        by_dialect = {
            row["detected_dialect"]: row["count"]
            for row in qs.exclude(detected_dialect="xx").values("detected_dialect").annotate(count=Count("id"))
        }
        monthly_trend = _build_monthly_trend(qs)

        stats = {
            "total": qs.count(),
            "by_status": by_status,
            "by_urgency": by_urgency,
            "by_category": by_category,
            "by_province": by_province,
            "by_dialect": by_dialect,
            "monthly_trend": monthly_trend,
            "weekly_trend": _build_weekly_trend(qs),
            # Flat aliases for stat cards (backward compat with existing frontend)
            "pending": by_status.get("pending", 0),
            "in_review": by_status.get("in_review", 0),
            "in_progress": by_status.get("in_progress", 0),
            "resolved": by_status.get("resolved", 0),
            "critical": by_urgency.get("critical", 0),
            "high": by_urgency.get("high", 0),
        }
        return success_response(data=stats)


class AdminUserListView(APIView):
    """[Admin] List semua user (hard-cap 500 untuk safety)."""
    permission_classes = [IsAdminUser]
    MAX_LIST_SIZE = 500

    def get(self, request):
        from accounts.models import CustomUser

        role = request.query_params.get("role")
        status_filter = request.query_params.get("status")
        users = CustomUser.objects.annotate(
            complaints_total=Count("complaints"),
            complaints_pending=Count("complaints", filter=models.Q(complaints__status="pending")),
            complaints_resolved=Count("complaints", filter=models.Q(complaints__status="resolved")),
        )
        if role in ("user", "admin"):
            users = users.filter(role=role)
        if status_filter == "active":
            users = users.filter(is_active=True)
        elif status_filter == "banned":
            users = users.filter(is_active=False)
        users = users.order_by("-date_joined")[: self.MAX_LIST_SIZE]
        return success_response(data=[_serialize_admin_user(user) for user in users])


class AdminUserDetailView(APIView):
    """[Admin] Update role atau status aktif user."""
    permission_classes = [IsAdminUser]

    def get(self, request, pk):
        from accounts.models import CustomUser

        user = get_object_or_404(
            CustomUser.objects.annotate(
                complaints_total=Count("complaints"),
                complaints_pending=Count("complaints", filter=models.Q(complaints__status="pending")),
                complaints_resolved=Count("complaints", filter=models.Q(complaints__status="resolved")),
            ),
            pk=pk,
        )
        return success_response(data=_serialize_admin_user(user))

    def patch(self, request, pk):
        from accounts.models import CustomUser
        user = get_object_or_404(CustomUser, pk=pk)
        role = request.data.get("role")
        is_active = _parse_optional_bool(request.data.get("is_active"))
        ban_reason = str(request.data.get("ban_reason") or "").strip()
        old_is_active = user.is_active

        if user.pk == request.user.pk and role == "user":
            return error_response("Admin tidak bisa menurunkan role akun sendiri.", status_code=status.HTTP_409_CONFLICT)
        if user.pk == request.user.pk and is_active is False:
            return error_response("Admin tidak bisa menonaktifkan akun sendiri.", status_code=status.HTTP_409_CONFLICT)
        if role in ("user", "admin"):
            user.role = role
        if is_active is not None:
            if is_active is False and not ban_reason:
                return error_response("Alasan ban/nonaktif wajib diisi.")
            user.is_active = is_active
        user.save()

        if old_is_active != user.is_active:
            _notify_user_account_status_changed(user, request.user, ban_reason)

        refreshed = CustomUser.objects.annotate(
            complaints_total=Count("complaints"),
            complaints_pending=Count("complaints", filter=models.Q(complaints__status="pending")),
            complaints_resolved=Count("complaints", filter=models.Q(complaints__status="resolved")),
        ).get(pk=user.pk)
        return success_response(data=_serialize_admin_user(refreshed), message="User berhasil diperbarui.")


class AdminSettingsView(APIView):
    """[Admin] Lihat dan update runtime setting non-secret."""
    permission_classes = [IsAdminUser]

    def get(self, request):
        return success_response(data={
            "settings": _build_admin_settings_response(),
            "model_status": _get_nlp_model_status(),
        })

    def patch(self, request):
        serializer = AdminSettingUpdateSerializer(data=request.data)
        if not serializer.is_valid():
            return error_response("Setting tidak valid.", errors=serializer.errors)

        key = serializer.validated_data["key"]
        value = serializer.validated_data["value"]
        definition = ADMIN_SETTING_DEFINITIONS[key]
        setting, _ = SystemSetting.objects.update_or_create(
            key=key,
            defaults={
                "value": value,
                "description": definition["description"],
                "updated_by": request.user,
            },
        )
        _apply_runtime_setting_to_process(key, value)
        return success_response(
            data=_serialize_admin_setting(setting),
            message="Setting berhasil diperbarui.",
        )


def _filter_complaints(request):
    """Filter queryset aduan berdasarkan role user dan query params."""
    if request.user.role == "admin":
        qs = Complaint.objects.select_related("user", "category", "assigned_to")
    else:
        qs = Complaint.objects.filter(user=request.user).select_related("category")

    status_filter = request.query_params.get("status")
    urgency_filter = request.query_params.get("urgency")
    category_filter = request.query_params.get("category")
    dialect_filter = request.query_params.get("dialect")

    if status_filter:
        qs = qs.filter(status=status_filter)
    if urgency_filter:
        qs = qs.filter(urgency_level=urgency_filter)
    if category_filter:
        qs = qs.filter(category__name__icontains=category_filter)
    if dialect_filter:
        qs = qs.filter(detected_dialect=dialect_filter)

    date_from = request.query_params.get("date_from")
    date_to = request.query_params.get("date_to")
    if date_from:
        qs = qs.filter(created_at__date__gte=date_from)
    if date_to:
        qs = qs.filter(created_at__date__lte=date_to)

    search = request.query_params.get("search")
    if search:
        qs = qs.filter(
            models.Q(wilayah__icontains=search)
            | models.Q(original_text__icontains=search)
            | models.Q(summary__icontains=search)
            | models.Q(user__full_name__icontains=search)
            | models.Q(user__email__icontains=search)
        )

    sort = request.query_params.get("sort", "-created_at")
    allowed_sort = {
        "created_at", "-created_at",
        "urgency_level", "-urgency_level",
        "status", "-status",
        "wilayah", "-wilayah",
    }
    if sort in allowed_sort:
        qs = qs.order_by(sort)
    else:
        qs = qs.order_by("-created_at")

    return qs


def _get_complaint_or_404(request, pk):
    """Return aduan jika user berhak mengaksesnya, 404 jika tidak.

    Detail serializer akses admin_notes + status_history → prefetch supaya tidak N+1.
    """
    base = Complaint.objects.select_related("user", "category", "assigned_to").prefetch_related(
        "admin_notes__admin", "status_history__changed_by"
    )
    if request.user.role == "admin":
        return get_object_or_404(base, pk=pk)
    return get_object_or_404(base, pk=pk, user=request.user)


STATUS_LABEL = {
    "pending": "Menunggu", "in_review": "Ditinjau",
    "in_progress": "Diproses", "resolved": "Selesai", "rejected": "Ditolak",
}


def _apply_complaint_update(complaint, admin_user, data):
    """Terapkan perubahan status + catatan admin ke complaint, simpan history + notifikasi."""
    old_status = complaint.status
    new_status = data.get("status")
    note = data.get("note", "")
    assigned_to_id = data.get("assigned_to")

    if new_status and new_status != old_status:
        complaint.status = new_status
        if new_status == "resolved":
            complaint.resolved_at = timezone.now()
        StatusHistory.objects.create(
            complaint=complaint,
            old_status=old_status,
            new_status=new_status,
            changed_by=admin_user,
            note=note,
        )
        # Bikin notifikasi untuk pelapor
        if complaint.user_id:
            old_lbl = STATUS_LABEL.get(old_status, old_status)
            new_lbl = STATUS_LABEL.get(new_status, new_status)
            Notification.objects.create(
                user_id=complaint.user_id,
                complaint=complaint,
                title=f"Status aduan #{complaint.id} berubah",
                message=f"Status berubah dari \"{old_lbl}\" menjadi \"{new_lbl}\" oleh {admin_user.full_name}." + (f" Catatan: {note}" if note else ""),
            )

    if note:
        AdminNote.objects.create(complaint=complaint, admin=admin_user, note=note, status_change=new_status)

    if assigned_to_id is not None:
        complaint.assigned_to_id = assigned_to_id

    complaint.save()


def _notify_admins_complaint_cancelled(complaint, user):
    """Kirim notifikasi ke admin saat warga membatalkan aduan."""
    from accounts.models import CustomUser

    admins = CustomUser.objects.filter(role="admin", is_active=True).only("id")
    notifications = [
        Notification(
            user=admin,
            complaint=None,
            title=f"Aduan #{complaint.id} dibatalkan",
            message=(
                f"{user.full_name} membatalkan aduan di wilayah {complaint.wilayah}. "
                "Aduan sudah dihapus dari daftar aktif."
            ),
        )
        for admin in admins
    ]
    if notifications:
        Notification.objects.bulk_create(notifications)


def _notify_user_complaint_deleted(complaint, admin_user, reason: str):
    """Kirim notifikasi ke pelapor sebelum aduan dihapus admin."""
    if not complaint.user_id:
        return
    Notification.objects.create(
        user_id=complaint.user_id,
        complaint=None,
        title=f"Aduan #{complaint.id} dihapus admin",
        message=(
            f"Aduan di wilayah {complaint.wilayah} dihapus oleh {admin_user.full_name}. "
            f"Alasan: {reason}"
        ),
    )


def _notify_user_account_status_changed(user, admin_user, reason: str):
    """Kirim notifikasi saat akun user diaktifkan atau dinonaktifkan admin."""
    if user.is_active:
        title = "Akun Anda diaktifkan kembali"
        message = f"Akun Anda diaktifkan kembali oleh {admin_user.full_name}."
    else:
        title = "Akun Anda dinonaktifkan"
        message = f"Akun Anda dinonaktifkan oleh {admin_user.full_name}. Alasan: {reason}"
    Notification.objects.create(user=user, complaint=None, title=title, message=message)


def _serialize_admin_user(user) -> dict:
    """Serialize user admin dengan statistik aduan ringkas."""
    from accounts.serializers import ProfileSerializer

    data = ProfileSerializer(user).data
    data["complaints_total"] = getattr(user, "complaints_total", 0)
    data["complaints_pending"] = getattr(user, "complaints_pending", 0)
    data["complaints_resolved"] = getattr(user, "complaints_resolved", 0)
    data["last_activity"] = user.updated_at.isoformat() if user.updated_at else None
    return data


def _parse_optional_bool(value):
    if value is None:
        return None
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        normalized = value.strip().lower()
        if normalized in ("true", "1", "yes"):
            return True
        if normalized in ("false", "0", "no"):
            return False
    return bool(value)


def _build_admin_settings_response() -> list[dict]:
    stored_settings = {setting.key: setting for setting in SystemSetting.objects.select_related("updated_by")}
    data = []
    for key in ADMIN_SETTING_DEFINITIONS:
        setting = stored_settings.get(key)
        if setting:
            data.append(_serialize_admin_setting(setting))
            continue
        definition = ADMIN_SETTING_DEFINITIONS[key]
        env_value = os.environ.get(key, definition["default"])
        data.append({
            "key": key,
            "value": env_value,
            "source": "environment",
            "label": definition["label"],
            "description": definition["description"],
            "type": definition["type"],
            "choices": definition.get("choices", []),
            "updated_at": None,
            "updated_by": None,
        })
    return data


def _get_nlp_model_status() -> dict:
    try:
        from nlp.models import loader
        return loader.status()
    except Exception as exc:
        return {"error": str(exc)[:200]}


def _serialize_admin_setting(setting: SystemSetting) -> dict:
    definition = ADMIN_SETTING_DEFINITIONS[setting.key]
    return {
        "key": setting.key,
        "value": setting.value,
        "source": "database",
        "label": definition["label"],
        "description": definition["description"],
        "type": definition["type"],
        "choices": definition.get("choices", []),
        "updated_at": setting.updated_at.isoformat() if setting.updated_at else None,
        "updated_by": setting.updated_by.full_name if setting.updated_by else None,
    }


def _apply_runtime_setting_to_process(key: str, value: str) -> None:
    """Terapkan setting ke process saat ini supaya pipeline berikutnya ikut berubah."""
    os.environ[key] = value
    try:
        from nlp import config as nlp_config
    except Exception:
        return

    if key in ("NLP_ENABLED", "ALLOW_EXTERNAL_TRANSLATION"):
        setattr(nlp_config, key, value.lower() == "true")
        return
    if key in ("SUMMARIZER_FALLBACKS", "WARMUP_SUMMARIZERS"):
        setattr(nlp_config, key, [item.strip() for item in value.split(",") if item.strip()])
        return
    setattr(nlp_config, key, value)


def _apply_stored_runtime_settings() -> None:
    """Apply runtime settings tersimpan sebelum menjalankan pipeline NLP."""
    for setting in SystemSetting.objects.filter(key__in=ADMIN_SETTING_DEFINITIONS.keys()):
        _apply_runtime_setting_to_process(setting.key, setting.value)


def _validate_photo_file(photo) -> str:
    """Return pesan error jika file foto tidak valid."""
    if photo.size > MAX_PHOTO_UPLOAD_BYTES:
        return "Ukuran foto maksimal 5 MB."
    if getattr(photo, "content_type", "") not in ALLOWED_PHOTO_TYPES:
        return "Format foto harus JPG, PNG, atau WebP."
    return ""


def _cloudinary_is_configured() -> bool:
    storage = getattr(settings, "CLOUDINARY_STORAGE", {})
    return all([
        storage.get("CLOUD_NAME"),
        storage.get("API_KEY"),
        storage.get("API_SECRET"),
    ])


def _upload_photo_to_cloudinary(photo, user_id: int) -> dict:
    import cloudinary
    import cloudinary.uploader

    storage = settings.CLOUDINARY_STORAGE
    cloudinary.config(
        cloud_name=storage["CLOUD_NAME"],
        api_key=storage["API_KEY"],
        api_secret=storage["API_SECRET"],
        secure=True,
    )
    result = cloudinary.uploader.upload(
        photo,
        folder=f"sovereign-dialect-bridge/complaints/user-{user_id}",
        resource_type="image",
        overwrite=False,
        unique_filename=True,
    )
    secure_url = result.get("secure_url")
    if not secure_url:
        raise ValueError("Cloudinary tidak mengembalikan URL aman.")
    return {
        "photo_url": secure_url,
        "public_id": result.get("public_id", ""),
    }


class NotificationListView(APIView):
    """List notifikasi user yang sedang login, terbaru di atas."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = Notification.objects.filter(user=request.user)[:50]
        data = [{
            "id": n.id,
            "title": n.title,
            "message": n.message,
            "is_read": n.is_read,
            "complaint_id": n.complaint_id,
            "created_at": n.created_at.isoformat(),
        } for n in qs]
        unread = Notification.objects.filter(user=request.user, is_read=False).count()
        return success_response(data={"results": data, "unread": unread})


class NotificationReadView(APIView):
    """Tandai notifikasi terbaca. POST tanpa id → tandai semua."""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk=None):
        if pk is None:
            Notification.objects.filter(user=request.user, is_read=False).update(is_read=True)
            return success_response(message="Semua notifikasi ditandai terbaca.")
        try:
            n = Notification.objects.get(pk=pk, user=request.user)
        except Notification.DoesNotExist:
            return error_response("Notifikasi tidak ditemukan.", status_code=status.HTTP_404_NOT_FOUND)
        n.is_read = True
        n.save(update_fields=["is_read"])
        return success_response(message="Notifikasi ditandai terbaca.")


class ComplaintExportView(APIView):
    """[Admin] Export complaints filtered ke CSV.

    Hard-cap MAX_ROWS supaya tidak meledakkan memori worker pada dataset besar.
    """
    permission_classes = [IsAdminUser]
    MAX_ROWS = 5000

    def get(self, request):
        import csv
        from django.http import StreamingHttpResponse

        qs = _filter_complaints(request)[: self.MAX_ROWS].select_related("user", "category")

        class _Echo:
            def write(self, value):
                return value

        writer = csv.writer(_Echo())
        header = [
            "ID", "Tanggal", "Pelapor", "Email", "Wilayah", "Latitude", "Longitude",
            "Kategori", "Dialek", "Urgensi", "Status",
            "Original Text", "Ringkasan",
        ]

        def rows():
            yield writer.writerow(header)
            for c in qs.iterator(chunk_size=200):
                yield writer.writerow([
                    c.id,
                    c.created_at.strftime("%Y-%m-%d %H:%M"),
                    c.user.full_name if c.user else "",
                    c.user.email if c.user else "",
                    c.wilayah,
                    c.latitude or "",
                    c.longitude or "",
                    c.category.name if c.category else "",
                    c.detected_dialect,
                    c.urgency_level,
                    c.status,
                    (c.original_text or "")[:500],
                    (c.summary or "")[:500],
                ])

        response = StreamingHttpResponse(rows(), content_type="text/csv")
        response["Content-Disposition"] = 'attachment; filename="aduan-export.csv"'
        return response


def _build_weekly_trend(qs) -> list:
    """Return daftar {"week": "YYYY-WW", "count": int} untuk 8 minggu terakhir."""
    today = timezone.now().date()
    trend = []
    for weeks_ago in range(7, -1, -1):
        week_start = today - datetime.timedelta(days=today.weekday(), weeks=weeks_ago)
        week_end = week_start + datetime.timedelta(days=7)
        count = qs.filter(created_at__date__gte=week_start, created_at__date__lt=week_end).count()
        trend.append({"week": week_start.strftime("%Y-W%W"), "count": count})
    return trend


def _build_monthly_trend(qs) -> list:
    """Return daftar {"month": "YYYY-MM", "label": "Jan 2026", "count": int} untuk 12 bulan terakhir."""
    today = timezone.now().date()
    first_day_this_month = today.replace(day=1)
    trend = []
    for months_ago in range(11, -1, -1):
        month_start = _shift_month(first_day_this_month, -months_ago)
        month_end = _shift_month(month_start, 1)
        count = qs.filter(created_at__date__gte=month_start, created_at__date__lt=month_end).count()
        trend.append({
            "month": month_start.strftime("%Y-%m"),
            "label": month_start.strftime("%b %Y"),
            "count": count,
        })
    return trend


def _shift_month(date_value: datetime.date, offset: int) -> datetime.date:
    month_index = date_value.year * 12 + date_value.month - 1 + offset
    year = month_index // 12
    month = month_index % 12 + 1
    return date_value.replace(year=year, month=month, day=1)


def _run_nlp_pipeline(complaint_id):
    """Jalankan NLP pipeline dan update complaint. Dipanggil di background thread.

    Setiap pergantian tahap (detecting → translating → summarizing → extracting → done)
    di-flush ke DB lewat callback agar frontend polling bisa menampilkan progres.
    Timeout 120 detik — kalau lebih (misal model stuck di CPU), set ke "failed"
    supaya frontend tidak polling selamanya.
    """
    import signal

    def update_stage(stage_name: str) -> None:
        Complaint.objects.filter(pk=complaint_id).update(processing_stage=stage_name)

    def _timeout_handler(signum, frame):
        raise TimeoutError("NLP pipeline timeout setelah 120 detik")

    # signal.alarm hanya bekerja di main thread; di background thread pakai
    # try/except biasa — model punya internal early stopping & max_new_tokens
    try:
        _apply_stored_runtime_settings()
        from nlp import pipeline as nlp_pipeline

        complaint = Complaint.objects.get(pk=complaint_id)
        result = nlp_pipeline.run_pipeline(complaint.original_text, on_stage=update_stage)

        complaint.detected_dialect = result.dialect
        complaint.translated_text = result.translated_text
        complaint.summary = result.summary
        complaint.named_entities = result.named_entities
        complaint.keywords = result.keywords
        complaint.urgency_level = result.urgency_level
        complaint.nlp_confidence = result.confidence
        complaint.processing_stage = "done"
        complaint.processing_error = None
        if result.category_name:
            category, _ = Category.objects.get_or_create(name=result.category_name)
            complaint.category = category
        complaint.save()
    except Exception as e:
        Complaint.objects.filter(pk=complaint_id).update(
            processing_stage="failed",
            processing_error=str(e)[:500],
        )
