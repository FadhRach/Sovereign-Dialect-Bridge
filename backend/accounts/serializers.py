from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from .models import CustomUser


class RegisterSerializer(serializers.ModelSerializer):
    """Serializer untuk registrasi user baru."""

    password = serializers.CharField(write_only=True, validators=[validate_password])
    password_confirm = serializers.CharField(write_only=True)

    class Meta:
        model = CustomUser
        fields = [
            "full_name", "email", "phone", "password", "password_confirm",
            "address_street", "address_kelurahan", "address_kecamatan",
            "address_city", "address_province", "address_postal_code",
        ]

    def validate(self, attrs):
        if attrs["password"] != attrs.pop("password_confirm"):
            raise serializers.ValidationError({"password": "Password tidak cocok."})
        return attrs

    def create(self, validated_data):
        return CustomUser.objects.create_user(**validated_data)


class UserSummarySerializer(serializers.ModelSerializer):
    """Serializer ringkas untuk payload JWT dan response auth."""

    class Meta:
        model = CustomUser
        fields = ["id", "email", "full_name", "role"]


class ProfileSerializer(serializers.ModelSerializer):
    """Serializer lengkap untuk profile user."""

    class Meta:
        model = CustomUser
        fields = [
            "id", "full_name", "email", "phone", "role",
            "address_street", "address_kelurahan", "address_kecamatan",
            "address_city", "address_province", "address_postal_code",
            "date_joined", "updated_at",
        ]
        read_only_fields = ["id", "email", "role", "date_joined", "updated_at"]


class ChangePasswordSerializer(serializers.Serializer):
    """Serializer untuk ganti password."""

    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, validators=[validate_password])
    new_password_confirm = serializers.CharField(write_only=True)

    def validate(self, attrs):
        if attrs["new_password"] != attrs["new_password_confirm"]:
            raise serializers.ValidationError({"new_password": "Password baru tidak cocok."})
        return attrs
