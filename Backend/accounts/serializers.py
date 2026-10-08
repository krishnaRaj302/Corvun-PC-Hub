from rest_framework import serializers

from .models import User,Address
from .validators import validate_password


class SignupSerializer(serializers.Serializer):
    full_name = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)
    confirm_password = serializers.CharField(write_only=True)
    terms_accepted = serializers.BooleanField()

    #Email validation
    def validate_email(self, value):
        email = value.strip().lower()
        if User.objects.filter(email=email).exists():
            raise serializers.ValidationError(
                "Email already exists."
            )
        return email

    #Password validation
    def validate_password(self, value):
        if not validate_password(value):
            raise serializers.ValidationError(
                "Password must contain at least 8 characters, "
                "uppercase, lowercase, number and special character."
            )

        return value

    #Confirm password
    def validate(self, data):
        if data["password"] != data["confirm_password"]:
            raise serializers.ValidationError({
                "confirm_password": "Passwords do not match."
            })

        if not data["terms_accepted"]:
            raise serializers.ValidationError({
                "terms_accepted": "You must accept the Terms of Service and Privacy Policy."
            })

        return data


    def create(self, validated_data):

        validated_data.pop("confirm_password")
        validated_data.pop("terms_accepted")

        user = User.objects.create_user(
            email=validated_data["email"],
            password=validated_data["password"],
            full_name=validated_data["full_name"]
        )

        return user

class AddressSerializer(serializers.ModelSerializer):
    # Serializer for user addresses
    class Meta:
        model = Address
        fields = [
            "id",
            "user",
            "label",
            "full_name",
            "phone",
            "alternative_phone",
            "address_line1",
            "address_line2",
            "city",
            "state",
            "postal_code",
            "country",
            "is_default",
            "created_at",
            "updated_at",
        ]

        # User and timestamps are managed by the backend
        read_only_fields = [
            "id",
            "user",
            "created_at",
            "updated_at",
        ]