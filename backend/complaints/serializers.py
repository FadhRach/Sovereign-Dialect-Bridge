from rest_framework import serializers
from .models import Complaint, Category, AdminNote, StatusHistory
from accounts.serializers import UserSummarySerializer

MIN_COMPLAINT_CHARS = 50
MIN_COMPLAINT_WORDS = 10


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
            "detected_dialect", "summary", "processing_stage", "latitude",
            "longitude", "created_at",
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
        cleaned = value.strip()
        if len(cleaned) < MIN_COMPLAINT_CHARS:
            raise serializers.ValidationError(
                f"Teks aduan minimal {MIN_COMPLAINT_CHARS} karakter."
            )
        if _count_words(cleaned) < MIN_COMPLAINT_WORDS:
            raise serializers.ValidationError(
                f"Teks aduan minimal {MIN_COMPLAINT_WORDS} kata agar konteks jelas."
            )
        return cleaned


def _count_words(text: str) -> int:
    """Hitung jumlah kata bermakna dari teks aduan."""
    import re

    return len(re.findall(r"\b\w+\b", text))


class ComplaintUpdateSerializer(serializers.Serializer):
    """Serializer untuk admin mengubah status + catatan aduan."""

    status = serializers.ChoiceField(choices=Complaint.STATUS_CHOICES, required=False)
    note = serializers.CharField(required=False, allow_blank=True)
    assigned_to = serializers.IntegerField(required=False, allow_null=True)


class ComplaintDeleteSerializer(serializers.Serializer):
    """Alasan admin saat menghapus aduan."""

    reason = serializers.CharField(min_length=10, max_length=500)

    def validate_reason(self, value):
        return value.strip()


class AdminSettingUpdateSerializer(serializers.Serializer):
    """Payload update runtime setting admin."""

    key = serializers.CharField(max_length=80)
    value = serializers.CharField(max_length=500, allow_blank=True)

    def validate_key(self, value):
        cleaned = value.strip().upper()
        if cleaned not in ADMIN_SETTING_DEFINITIONS:
            raise serializers.ValidationError("Setting tidak dikenal atau tidak boleh diedit.")
        return cleaned

    def validate(self, attrs):
        definition = ADMIN_SETTING_DEFINITIONS[attrs["key"]]
        value = attrs["value"].strip()
        setting_type = definition["type"]
        if setting_type == "boolean":
            normalized = value.lower()
            if normalized not in ("true", "false"):
                raise serializers.ValidationError({"value": "Isi boolean harus true atau false."})
            attrs["value"] = normalized
        elif setting_type == "choice":
            if value not in definition["choices"]:
                raise serializers.ValidationError({"value": "Pilihan model tidak valid."})
            attrs["value"] = value
        elif setting_type == "csv":
            items = [item.strip() for item in value.split(",") if item.strip()]
            invalid = [item for item in items if item not in definition["choices"]]
            if invalid:
                raise serializers.ValidationError({"value": f"Pilihan tidak valid: {', '.join(invalid)}."})
            attrs["value"] = ",".join(items)
        return attrs


ADMIN_SETTING_DEFINITIONS = {
    "NLP_ENABLED": {
        "type": "boolean",
        "default": "false",
        "label": "NLP aktif",
        "description": "Aktifkan model NLP berat. Jika false, pipeline memakai fallback ringan.",
    },
    "SUMMARIZER_MODEL": {
        "type": "choice",
        "default": "textrank",
        "choices": ["mt5", "indot5", "textrank", "ner", "first_sentences"],
        "label": "Model ringkasan utama",
        "description": "Model utama untuk membuat ringkasan aduan.",
    },
    "SUMMARIZER_FALLBACKS": {
        "type": "csv",
        "default": "ner,textrank,first_sentences",
        "choices": ["mt5", "indot5", "textrank", "ner", "first_sentences"],
        "label": "Fallback ringkasan",
        "description": "Urutan fallback saat model utama gagal atau belum siap.",
    },
    "WARMUP_SUMMARIZERS": {
        "type": "csv",
        "default": "",
        "choices": ["mt5", "indot5"],
        "label": "Warmup summarizer",
        "description": "Model neural yang dicoba diload saat startup jika NLP aktif.",
    },
    "ALLOW_EXTERNAL_TRANSLATION": {
        "type": "boolean",
        "default": "true",
        "label": "Fallback translasi eksternal",
        "description": "Izinkan fallback deep_translator/googletrans saat NLLB tidak cukup.",
    },
}
