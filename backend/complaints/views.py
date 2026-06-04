import threading
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.shortcuts import get_object_or_404
from django.utils import timezone

from accounts.permissions import IsAdminUser
from nlp import pipeline as nlp_pipeline
from .models import Complaint, Category, AdminNote, StatusHistory
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
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        queryset = _filter_complaints(request)
        serializer = ComplaintListSerializer(queryset, many=True)
        return success_response(data=serializer.data)

    def post(self, request):
        serializer = ComplaintCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return error_response("Gagal submit aduan.", errors=serializer.errors)
        complaint = serializer.save(user=request.user)
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
    """Return titik koordinat untuk Leaflet (public)."""
    permission_classes = [AllowAny]

    def get(self, request):
        points = (
            Complaint.objects.filter(latitude__isnull=False, longitude__isnull=False)
            .select_related("category")
            .values("id", "latitude", "longitude", "wilayah", "status", "urgency_level", "category__name")
        )
        return success_response(data=list(points))


class CategoryListView(APIView):
    """Return semua kategori aduan (public)."""
    permission_classes = [AllowAny]

    def get(self, request):
        categories = Category.objects.all()
        serializer = CategorySerializer(categories, many=True)
        return success_response(data=serializer.data)


class DashboardStatsView(APIView):
    """Return statistik aduan untuk dashboard admin."""
    permission_classes = [IsAdminUser]

    def get(self, request):
        stats = {
            "total": Complaint.objects.count(),
            "pending": Complaint.objects.filter(status="pending").count(),
            "in_review": Complaint.objects.filter(status="in_review").count(),
            "resolved": Complaint.objects.filter(status="resolved").count(),
            "critical": Complaint.objects.filter(urgency_level="critical").count(),
            "high": Complaint.objects.filter(urgency_level="high").count(),
        }
        return success_response(data=stats)


class AdminUserListView(APIView):
    """[Admin] List semua user."""
    permission_classes = [IsAdminUser]

    def get(self, request):
        from accounts.models import CustomUser
        from accounts.serializers import ProfileSerializer
        users = CustomUser.objects.all()
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

    return qs


def _get_complaint_or_404(request, pk):
    """Return aduan jika user berhak mengaksesnya, 404 jika tidak."""
    if request.user.role == "admin":
        return get_object_or_404(Complaint.objects.select_related("user", "category", "assigned_to"), pk=pk)
    return get_object_or_404(Complaint.objects.select_related("category"), pk=pk, user=request.user)


def _apply_complaint_update(complaint, admin_user, data):
    """Terapkan perubahan status + catatan admin ke complaint, simpan history."""
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

    if note:
        AdminNote.objects.create(complaint=complaint, admin=admin_user, note=note, status_change=new_status)

    if assigned_to_id is not None:
        complaint.assigned_to_id = assigned_to_id

    complaint.save()


def _run_nlp_pipeline(complaint_id):
    """Jalankan NLP pipeline dan update complaint. Dipanggil di background thread."""
    try:
        complaint = Complaint.objects.get(pk=complaint_id)
        result = nlp_pipeline.run_pipeline(complaint.original_text)
        complaint.detected_dialect = result.dialect
        complaint.translated_text = result.translated_text
        complaint.summary = result.summary
        complaint.named_entities = result.named_entities
        complaint.keywords = result.keywords
        complaint.urgency_level = result.urgency_level
        complaint.nlp_confidence = result.confidence
        if result.category_name:
            category, _ = Category.objects.get_or_create(name=result.category_name)
            complaint.category = category
        complaint.save()
    except Exception:
        # Jangan crash background thread — complaint tetap tersimpan tanpa NLP result
        pass
