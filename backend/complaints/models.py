from django.db import models
from django.conf import settings


class Category(models.Model):
    """Kategori aduan (Infrastruktur, Kesehatan, dll)."""

    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True, null=True)
    icon = models.CharField(max_length=20, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name


class Complaint(models.Model):
    """Model utama untuk aduan warga."""

    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("in_review", "In Review"),
        ("resolved", "Resolved"),
        ("rejected", "Rejected"),
    ]
    URGENCY_CHOICES = [
        ("low", "Low"),
        ("medium", "Medium"),
        ("high", "High"),
        ("critical", "Critical"),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="complaints"
    )
    category = models.ForeignKey(
        Category, on_delete=models.SET_NULL, null=True, blank=True, related_name="complaints"
    )
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="assigned_complaints"
    )

    # Input dari user
    original_text = models.TextField()
    photo_url = models.URLField(max_length=500, blank=True, null=True)
    wilayah = models.CharField(max_length=200)
    latitude = models.FloatField(blank=True, null=True)
    longitude = models.FloatField(blank=True, null=True)

    # Hasil NLP — diisi background thread setelah submit
    detected_dialect = models.CharField(max_length=10, default="xx")
    translated_text = models.TextField(blank=True, null=True)
    summary = models.TextField(blank=True, null=True)
    named_entities = models.JSONField(default=list)
    keywords = models.JSONField(default=list)
    urgency_level = models.CharField(max_length=10, choices=URGENCY_CHOICES, default="medium")
    nlp_confidence = models.FloatField(default=0.0)

    # Status dan tracking
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default="pending")
    resolution_note = models.TextField(blank=True, null=True)
    resolved_at = models.DateTimeField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["status"]),
            models.Index(fields=["urgency_level"]),
            models.Index(fields=["detected_dialect"]),
            models.Index(fields=["created_at"]),
            models.Index(fields=["user"]),
        ]

    def __str__(self):
        return f"Complaint #{self.id} — {self.wilayah} [{self.status}]"


class AdminNote(models.Model):
    """Catatan admin saat menangani aduan."""

    complaint = models.ForeignKey(Complaint, on_delete=models.CASCADE, related_name="admin_notes")
    admin = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="admin_notes"
    )
    note = models.TextField()
    status_change = models.CharField(max_length=15, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Note on Complaint #{self.complaint_id} by {self.admin}"


class StatusHistory(models.Model):
    """Riwayat perubahan status aduan."""

    complaint = models.ForeignKey(Complaint, on_delete=models.CASCADE, related_name="status_history")
    old_status = models.CharField(max_length=15)
    new_status = models.CharField(max_length=15)
    changed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="status_changes"
    )
    note = models.TextField(blank=True, null=True)
    changed_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Complaint #{self.complaint_id}: {self.old_status} → {self.new_status}"
