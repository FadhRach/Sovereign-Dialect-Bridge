from rest_framework import serializers
from .models import Complaint, Category, AdminNote, StatusHistory
from accounts.serializers import UserSummarySerializer


class CategorySerializer(serializers.ModelSerializer):
    """Serializer untuk kategori aduan."""

    class Meta:
        model = Category
        fields = ["id", "name", "description", "icon"]


class AdminNoteSerializer(serializers.ModelSerializer):
    """Serializer untuk catatan admin."""

    admin = UserSummarySerializer(read_only=True)

    class Meta:
        model = AdminNote
        fields = ["id", "admin", "note", "status_change", "created_at"]


class StatusHistorySerializer(serializers.ModelSerializer):
    """Serializer untuk riwayat perubahan status."""

    changed_by = UserSummarySerializer(read_only=True)

    class Meta:
        model = StatusHistory
        fields = ["id", "old_status", "new_status", "changed_by", "note", "changed_at"]


class ComplaintListSerializer(serializers.ModelSerializer):
    """Serializer ringkas untuk list aduan."""

    user = UserSummarySerializer(read_only=True)
    category = CategorySerializer(read_only=True)

    class Meta:
        model = Complaint
        fields = [
            "id", "user", "category", "wilayah", "status", "urgency_level",
            "detected_dialect", "summary", "created_at",
        ]


class ComplaintDetailSerializer(serializers.ModelSerializer):
    """Serializer lengkap untuk detail aduan termasuk NLP result dan history."""

    user = UserSummarySerializer(read_only=True)
    category = CategorySerializer(read_only=True)
    assigned_to = UserSummarySerializer(read_only=True)
    admin_notes = AdminNoteSerializer(many=True, read_only=True)
    status_history = StatusHistorySerializer(many=True, read_only=True)

    class Meta:
        model = Complaint
        fields = "__all__"


class ComplaintCreateSerializer(serializers.ModelSerializer):
    """Serializer untuk submit aduan baru dari user."""

    class Meta:
        model = Complaint
        fields = ["original_text", "wilayah", "photo_url", "latitude", "longitude"]

    def validate_original_text(self, value):
        if len(value.strip()) < 20:
            raise serializers.ValidationError("Teks aduan minimal 20 karakter.")
        return value


class ComplaintUpdateSerializer(serializers.Serializer):
    """Serializer untuk admin mengubah status + catatan aduan."""

    status = serializers.ChoiceField(choices=Complaint.STATUS_CHOICES, required=False)
    note = serializers.CharField(required=False, allow_blank=True)
    assigned_to = serializers.IntegerField(required=False, allow_null=True)
