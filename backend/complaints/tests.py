from unittest.mock import patch
from django.core.cache import cache
from django.test import TestCase, override_settings
from rest_framework.test import APIClient
from accounts.models import CustomUser
from .models import Complaint, Category, KeepAlive


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


@override_settings(KEEPALIVE_SECRET="s3cret")
class KeepAliveTests(TestCase):
    URL = "/api/system/keepalive/"

    def setUp(self):
        cache.clear()  # counter throttle DRF tersimpan di cache, jangan bocor antar test

    def test_rejects_missing_or_wrong_secret(self):
        c = APIClient()
        self.assertEqual(c.post(self.URL).status_code, 403)
        self.assertEqual(c.post(self.URL, HTTP_X_KEEPALIVE_SECRET="nope").status_code, 403)
        self.assertEqual(KeepAlive.objects.count(), 0)

    @override_settings(KEEPALIVE_SECRET="")
    def test_disabled_when_secret_unset(self):
        self.assertEqual(APIClient().post(self.URL, HTTP_X_KEEPALIVE_SECRET="").status_code, 403)

    def test_inserts_row_and_prunes_old_ones(self):
        c = APIClient()
        with patch("complaints.views.KeepAliveView.KEEP_ROWS", 3):
            for _ in range(5):
                res = c.post(self.URL, HTTP_X_KEEPALIVE_SECRET="s3cret")
                self.assertEqual(res.status_code, 200)
        self.assertEqual(KeepAlive.objects.count(), 3)


# TODO: tambah test untuk submit aduan, filter, update status, map endpoint
