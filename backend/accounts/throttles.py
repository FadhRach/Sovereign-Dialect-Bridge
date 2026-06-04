"""Custom throttle classes untuk endpoint sensitif (login/register)."""

from rest_framework.throttling import AnonRateThrottle


class AuthThrottle(AnonRateThrottle):
    """Batasi login/register agar tahan brute-force. Rate diatur di settings.DEFAULT_THROTTLE_RATES['auth']."""

    scope = "auth"
