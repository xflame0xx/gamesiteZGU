from django.contrib.auth import authenticate, get_user_model
from rest_framework import serializers

from .models import UserProfile, FavoriteTournament, FavoriteTeam, ViewHistory

User = get_user_model()


class RegisterSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    email = serializers.EmailField(required=False, allow_blank=True)
    password = serializers.CharField(min_length=8, write_only=True)

    def validate_username(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("Этот username уже занят.")
        return value

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data["username"],
            email=validated_data.get("email", ""),
            password=validated_data["password"],
        )
        return user


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        user = authenticate(username=attrs["username"], password=attrs["password"])
        if not user:
            raise serializers.ValidationError("Неверный логин или пароль.")
        if not user.is_active:
            raise serializers.ValidationError("Пользователь отключён.")
        attrs["user"] = user
        return attrs


class ProfileSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username", read_only=True)
    email = serializers.EmailField(source="user.email", read_only=True)
    is_staff = serializers.BooleanField(source="user.is_staff", read_only=True)
    is_superuser = serializers.BooleanField(source="user.is_superuser", read_only=True)

    class Meta:
        model = UserProfile
        fields = ["username", "email", "is_staff", "is_superuser", "bio", "avatar_url"]


class FavoriteTournamentSerializer(serializers.ModelSerializer):
    tournament_name = serializers.CharField(source="tournament.name", read_only=True)

    class Meta:
        model = FavoriteTournament
        fields = ["id", "tournament", "tournament_name", "created_at"]


class FavoriteTeamSerializer(serializers.ModelSerializer):
    team_name = serializers.CharField(source="team.name", read_only=True)

    class Meta:
        model = FavoriteTeam
        fields = ["id", "team", "team_name", "created_at"]


class ViewHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = ViewHistory
        fields = ["id", "item_type", "item_id", "viewed_at"]