"""Permission classes untuk membatasi akses endpoint berdasarkan role."""

from rest_framework.permissions import BasePermission


class IsAdminUser(BasePermission):
    """Izinkan akses hanya untuk user dengan role 'admin'."""

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == "admin")


class IsOwnerOrAdmin(BasePermission):
    """Izinkan akses jika user adalah pemilik resource (field `user`) atau admin."""

    def has_object_permission(self, request, view, obj):
        if not (request.user and request.user.is_authenticated):
            return False
        if request.user.role == "admin":
            return True
        owner = getattr(obj, "user", None)
        return owner is not None and owner == request.user
