from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.generics import ListCreateAPIView, DestroyAPIView

from .models import UserProfile, FavoriteTournament, FavoriteTeam, ViewHistory, Team
from .serializers_auth import (
    RegisterSerializer,
    LoginSerializer,
    ProfileSerializer,
    FavoriteTournamentSerializer,
    FavoriteTeamSerializer,
    ViewHistorySerializer,
)

User = get_user_model()


class RegisterView(APIView):
    def post(self, request):
        s = RegisterSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        user = s.save()

        token, _ = Token.objects.get_or_create(user=user)
        return Response(
            {"token": token.key, "username": user.username, "is_staff": user.is_staff},
            status=status.HTTP_201_CREATED,
        )


class LoginView(APIView):
    def post(self, request):
        s = LoginSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        user = s.validated_data["user"]

        token, _ = Token.objects.get_or_create(user=user)
        return Response(
            {"token": token.key, "username": user.username, "is_staff": user.is_staff},
            status=status.HTTP_200_OK,
        )


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        Token.objects.filter(user=request.user).delete()
        return Response({"ok": True})


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        profile, _ = UserProfile.objects.get_or_create(user=request.user)
        return Response(ProfileSerializer(profile).data)

    def patch(self, request):
        profile, _ = UserProfile.objects.get_or_create(user=request.user)
        s = ProfileSerializer(profile, data=request.data, partial=True)
        s.is_valid(raise_exception=True)
        s.save()
        return Response(s.data)


class FavoriteTournamentsView(ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = FavoriteTournamentSerializer

    def get_queryset(self):
        return FavoriteTournament.objects.filter(user=self.request.user).select_related("tournament")

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class FavoriteTournamentDeleteView(DestroyAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = FavoriteTournamentSerializer

    def get_queryset(self):
        return FavoriteTournament.objects.filter(user=self.request.user)


class FavoriteTeamsView(ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = FavoriteTeamSerializer

    def get_queryset(self):
        return FavoriteTeam.objects.filter(user=self.request.user).select_related("team")

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class FavoriteTeamDeleteView(DestroyAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = FavoriteTeamSerializer

    def get_queryset(self):
        return FavoriteTeam.objects.filter(user=self.request.user)


class ViewHistoryView(ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = ViewHistorySerializer

    def get_queryset(self):
        return ViewHistory.objects.filter(user=self.request.user).order_by("-viewed_at")[:50]

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


# --- Admin (API) ---
class AdminDashboardView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        pending_teams = Team.objects.filter(is_approved=False).count()
        return Response({"admin": request.user.username, "pending_teams": pending_teams})


class ApproveTeamView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request, team_id: int):
        team = Team.objects.get(pk=team_id)
        team.is_approved = True
        team.save(update_fields=["is_approved"])
        return Response({"ok": True, "team_id": team_id, "is_approved": True})

