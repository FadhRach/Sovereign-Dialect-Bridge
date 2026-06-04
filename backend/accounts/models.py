from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models


class CustomUserManager(BaseUserManager):
    """Manager untuk CustomUser dengan email sebagai auth field."""

    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError("Email wajib diisi")
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("role", "admin")
        return self.create_user(email, password, **extra_fields)


class CustomUser(AbstractBaseUser, PermissionsMixin):
    """
    User model dengan email sebagai username.
    Role: 'user' untuk warga, 'admin' untuk aparatur pemerintah.
    """

    ROLE_CHOICES = [("user", "User"), ("admin", "Admin")]
    PROVINCE_CHOICES = [
        ("Aceh", "Aceh"),
        ("Sumatera Utara", "Sumatera Utara"),
        ("Sumatera Barat", "Sumatera Barat"),
        ("Riau", "Riau"),
        ("Kepulauan Riau", "Kepulauan Riau"),
        ("Jambi", "Jambi"),
        ("Sumatera Selatan", "Sumatera Selatan"),
        ("Kepulauan Bangka Belitung", "Kepulauan Bangka Belitung"),
        ("Bengkulu", "Bengkulu"),
        ("Lampung", "Lampung"),
        ("DKI Jakarta", "DKI Jakarta"),
        ("Jawa Barat", "Jawa Barat"),
        ("Banten", "Banten"),
        ("Jawa Tengah", "Jawa Tengah"),
        ("DI Yogyakarta", "DI Yogyakarta"),
        ("Jawa Timur", "Jawa Timur"),
        ("Bali", "Bali"),
        ("Nusa Tenggara Barat", "Nusa Tenggara Barat"),
        ("Nusa Tenggara Timur", "Nusa Tenggara Timur"),
        ("Kalimantan Barat", "Kalimantan Barat"),
        ("Kalimantan Tengah", "Kalimantan Tengah"),
        ("Kalimantan Selatan", "Kalimantan Selatan"),
        ("Kalimantan Timur", "Kalimantan Timur"),
        ("Kalimantan Utara", "Kalimantan Utara"),
        ("Sulawesi Utara", "Sulawesi Utara"),
        ("Gorontalo", "Gorontalo"),
        ("Sulawesi Tengah", "Sulawesi Tengah"),
        ("Sulawesi Barat", "Sulawesi Barat"),
        ("Sulawesi Selatan", "Sulawesi Selatan"),
        ("Sulawesi Tenggara", "Sulawesi Tenggara"),
        ("Maluku", "Maluku"),
        ("Maluku Utara", "Maluku Utara"),
        ("Papua Barat", "Papua Barat"),
        ("Papua Barat Daya", "Papua Barat Daya"),
        ("Papua Tengah", "Papua Tengah"),
        ("Papua Pegunungan", "Papua Pegunungan"),
        ("Papua Selatan", "Papua Selatan"),
        ("Papua", "Papua"),
    ]

    full_name = models.CharField(max_length=150)
    email = models.EmailField(unique=True)
    phone = models.CharField(max_length=20)
    address_street = models.TextField(blank=True, null=True)
    address_kelurahan = models.CharField(max_length=100, blank=True, null=True)
    address_kecamatan = models.CharField(max_length=100, blank=True, null=True)
    address_city = models.CharField(max_length=100)
    address_province = models.CharField(max_length=50, choices=PROVINCE_CHOICES)
    address_postal_code = models.CharField(max_length=10, blank=True, null=True)
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default="user")
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    date_joined = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = CustomUserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["full_name", "phone", "address_city", "address_province"]

    def __str__(self):
        return self.email
