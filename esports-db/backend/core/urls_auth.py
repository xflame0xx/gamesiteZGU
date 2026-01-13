from django.urls import path

from .views_auth import (
    RegisterView,
    LoginView,
    LogoutView,
    MeView,
    FavoriteTournamentsView,
    FavoriteTournamentDeleteView,
    FavoriteTeamsView,
    FavoriteTeamDeleteView,
    ViewHistoryView,
    AdminDashboardView,
    ApproveTeamView,
)

urlpatterns = [
    # auth
    path("auth/register/", RegisterView.as_view()),
    path("auth/login/", LoginView.as_view()),
    path("auth/logout/", LogoutView.as_view()),
    path("auth/me/", MeView.as_view()),

    # user cabinet
    path("me/favorites/tournaments/", FavoriteTournamentsView.as_view()),
    path("me/favorites/tournaments/<int:pk>/", FavoriteTournamentDeleteView.as_view()),
    path("me/favorites/teams/", FavoriteTeamsView.as_view()),
    path("me/favorites/teams/<int:pk>/", FavoriteTeamDeleteView.as_view()),
    path("me/history/", ViewHistoryView.as_view()),

    # admin cabinet
    path("admin/dashboard/", AdminDashboardView.as_view()),
    path("admin/teams/<int:team_id>/approve/", ApproveTeamView.as_view()),
]


