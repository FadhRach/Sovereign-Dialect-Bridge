"""
Smoke tests untuk auth flow: register, login, refresh, logout, profile.

Tujuan: memastikan happy-path tidak rusak setelah refactor.
Gunakan APIClient dari DRF, bukan Django test client biasa, agar JSON renderer aktif.
"""

from django.core.cache import cache
from django.test import TestCase, override_settings
from rest_framework import status
from rest_framework.test import APIClient

from .models import CustomUser


# Naikkan rate throttle tinggi supaya test tidak kena 429.
# AuthThrottle.scope = "auth" tetap perlu key 'auth' di rates dict.
THROTTLE_OFF = override_settings(
    REST_FRAMEWORK={
        "DEFAULT_AUTHENTICATION_CLASSES": (
            "rest_framework_simplejwt.authentication.JWTAuthentication",
        ),
        "DEFAULT_PERMISSION_CLASSES": (
            "rest_framework.permissions.IsAuthenticated",
        ),
        "DEFAULT_RENDERER_CLASSES": (
            "rest_framework.renderers.JSONRenderer",
        ),
        "DEFAULT_THROTTLE_RATES": {
            "anon": "10000/min",
            "user": "10000/min",
            "auth": "10000/min",
        },
    }
)


REGISTER_PAYLOAD = {
    "full_name": "Test User",
    "email": "test@example.com",
    "phone": "081234567890",
    "password": "TestPass123!",
    "password_confirm": "TestPass123!",
    "address_city": "Jakarta",
    "address_province": "DKI Jakarta",
}


@THROTTLE_OFF
class AuthFlowTests(TestCase):
    """Validasi end-to-end auth: register → login → refresh → profile → logout."""

    def setUp(self):
        cache.clear()
        self.client = APIClient()

    def _register(self, payload=None):
        return self.client.post("/api/auth/register/", payload or REGISTER_PAYLOAD, format="json")

    def _login(self, email="test@example.com", password="TestPass123!"):
        return self.client.post(
            "/api/auth/login/",
            {"email": email, "password": password},
            format="json",
        )

    def test_register_creates_user_and_returns_tokens(self):
        response = self._register()
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        body = response.json()
        self.assertTrue(body["success"])
        self.assertIn("access", body["data"])
        self.assertIn("refresh", body["data"])
        self.assertEqual(body["data"]["user"]["email"], "test@example.com")
        self.assertTrue(CustomUser.objects.filter(email="test@example.com").exists())

    def test_register_rejects_mismatched_password(self):
        payload = {**REGISTER_PAYLOAD, "password_confirm": "Wrong123!"}
        response = self._register(payload)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(response.json()["success"])

    def test_login_returns_tokens_on_valid_credentials(self):
        self._register()
        response = self._login()
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        body = response.json()
        self.assertTrue(body["success"])
        self.assertIn("access", body["data"])
        self.assertEqual(body["data"]["user"]["role"], "user")

    def test_login_rejects_invalid_credentials(self):
        self._register()
        response = self._login(password="wrong-password")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertFalse(response.json()["success"])

    def test_login_rejects_inactive_user(self):
        self._register()
        CustomUser.objects.filter(email="test@example.com").update(is_active=False)
        response = self._login()
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_token_refresh_returns_new_tokens(self):
        self._register()
        login_response = self._login()
        refresh = login_response.json()["data"]["refresh"]
        response = self.client.post(
            "/api/auth/token/refresh/",
            {"refresh": refresh},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        body = response.json()
        self.assertTrue(body["success"])
        self.assertIn("access", body["data"])

    def test_profile_returns_authenticated_user(self):
        self._register()
        login_response = self._login()
        access = login_response.json()["data"]["access"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")
        response = self.client.get("/api/auth/profile/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        body = response.json()
        self.assertEqual(body["data"]["email"], "test@example.com")
        self.assertEqual(body["data"]["address_city"], "Jakarta")

    def test_profile_rejects_anonymous_request(self):
        response = self.client.get("/api/auth/profile/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_logout_blacklists_refresh_token(self):
        self._register()
        login_response = self._login()
        tokens = login_response.json()["data"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")
        response = self.client.post(
            "/api/auth/logout/",
            {"refresh": tokens["refresh"]},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Refresh kedua kali harus gagal karena sudah ter-blacklist.
        replay = self.client.post(
            "/api/auth/token/refresh/",
            {"refresh": tokens["refresh"]},
            format="json",
        )
        self.assertEqual(replay.status_code, status.HTTP_401_UNAUTHORIZED)
