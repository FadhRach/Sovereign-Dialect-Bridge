from django.test import TestCase
from rest_framework.test import APIClient
from accounts.models import CustomUser
from .models import Complaint, Category


class ComplaintTestCase(TestCase):
    """Base test case dengan helper untuk buat user dan aduan."""

    def setUp(self):
        self.client = APIClient()
        self.user = CustomUser.objects.create_user(
            email="warga@example.com",
            password="TestPass123!",
            full_name="Warga Test",
            phone="081234567890",
            address_city="Bandung",
            address_province="Jawa Barat",
        )
        self.admin = CustomUser.objects.create_user(
            email="admin@example.com",
            password="AdminPass123!",
            full_name="Admin Test",
            phone="081234567891",
            address_city="Bandung",
            address_province="Jawa Barat",
            role="admin",
        )

    def authenticate_as(self, user):
        self.client.force_authenticate(user=user)


# TODO: tambah test untuk submit aduan, filter, update status, map endpoint
