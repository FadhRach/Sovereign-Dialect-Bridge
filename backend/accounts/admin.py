"""Registrasi CustomUser ke Django admin agar superuser bisa mengelola via /admin/."""

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import CustomUser


@admin.register(CustomUser)
class CustomUserAdmin(UserAdmin):
    """Admin config untuk CustomUser dengan email sebagai username."""

    model = CustomUser
    ordering = ("-date_joined",)
    list_display = ("email", "full_name", "role", "address_city", "is_active", "date_joined")
    list_filter = ("role", "is_active", "address_province")
    search_fields = ("email", "full_name", "phone", "address_city")
    readonly_fields = ("date_joined", "updated_at", "last_login")

    fieldsets = (
        ("Identitas", {"fields": ("email", "password", "full_name", "phone")}),
        (
            "Alamat",
            {
                "fields": (
                    "address_street",
                    "address_kelurahan",
                    "address_kecamatan",
                    "address_city",
                    "address_province",
                    "address_postal_code",
                )
            },
        ),
        ("Role & Status", {"fields": ("role", "is_active", "is_staff", "is_superuser", "groups", "user_permissions")}),
        ("Timestamp", {"fields": ("date_joined", "updated_at", "last_login")}),
    )

    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": (
                    "email",
                    "full_name",
                    "phone",
                    "address_city",
                    "address_province",
                    "role",
                    "password1",
                    "password2",
                ),
            },
        ),
    )
