from django.contrib import admin
from django.http import JsonResponse
from django.urls import path, include


def healthcheck(_request):
    """Endpoint ringan untuk uptime monitor / Docker HEALTHCHECK."""
    return JsonResponse({"status": "ok"})


urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/auth/", include("accounts.urls")),
    path("api/", include("complaints.urls")),
    path("health/", healthcheck),
]
