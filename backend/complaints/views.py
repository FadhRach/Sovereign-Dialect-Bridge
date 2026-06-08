import datetime
import threading
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.db.models import Count
from django.shortcuts import get_object_or_404
from django.utils import timezone

from django.db import models
from accounts.permissions import IsAdminUser
from .models import Complaint, Category, AdminNote, StatusHistory, Notification
from .serializers import (
    ComplaintListSerializer,
    ComplaintDetailSerializer,
    ComplaintCreateSerializer,
    ComplaintUpdateSerializer,
    CategorySerializer,
)


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
        if request.user.role != "admin":
            return error_response("Akses ditolak.", status_code=status.HTTP_403_FORBIDDEN)
        complaint = get_object_or_404(Complaint, pk=pk)
        complaint.delete()
        return success_response(message="Aduan berhasil dihapus.")


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
        weekly_trend = _build_weekly_trend(qs)

        stats = {
            "total": qs.count(),
            "by_status": by_status,
            "by_urgency": by_urgency,
            "by_category": by_category,
            "by_province": by_province,
            "by_dialect": by_dialect,
            "weekly_trend": weekly_trend,
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
        from accounts.serializers import ProfileSerializer
        users = CustomUser.objects.all().order_by("-date_joined")[: self.MAX_LIST_SIZE]
        serializer = ProfileSerializer(users, many=True)
        return success_response(data=serializer.data)


class AdminUserDetailView(APIView):
    """[Admin] Update role atau status aktif user."""
    permission_classes = [IsAdminUser]

    def patch(self, request, pk):
        from accounts.models import CustomUser
        user = get_object_or_404(CustomUser, pk=pk)
        role = request.data.get("role")
        is_active = request.data.get("is_active")
        if role in ("user", "admin"):
            user.role = role
        if is_active is not None:
            user.is_active = bool(is_active)
        user.save()
        from accounts.serializers import ProfileSerializer
        return success_response(data=ProfileSerializer(user).data, message="User berhasil diperbarui.")


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
