from django.contrib import admin
from .models import (
    Game, Tournament, Team, Player,
    TournamentTeam, Match, MatchResult, Standing
)

@admin.register(Game)
class GameAdmin(admin.ModelAdmin):
    search_fields = ("title",)
    list_display = ("id", "title", "genre")


@admin.register(Tournament)
class TournamentAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "game", "start_date", "end_date", "prize_pool", "format", "status")
    list_filter = ("game", "status", "format")
    search_fields = ("name",)


@admin.register(Team)
class TeamAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "country")
    search_fields = ("name",)
    list_filter = ("country",)


@admin.register(Player)
class PlayerAdmin(admin.ModelAdmin):
    list_display = ("id", "nickname", "real_name", "team", "role")
    search_fields = ("nickname", "real_name")
    list_filter = ("role", "team")


@admin.register(TournamentTeam)
class TournamentTeamAdmin(admin.ModelAdmin):
    list_display = ("tournament", "team")
    list_filter = ("tournament", "team")


@admin.register(Match)
class MatchAdmin(admin.ModelAdmin):
    list_display = ("id", "tournament", "team1", "team2", "match_date", "round", "status")
    list_filter = ("tournament", "status", "round")
    search_fields = ("tournament__name", "team1__name", "team2__name")


@admin.register(MatchResult)
class MatchResultAdmin(admin.ModelAdmin):
    list_display = ("match", "winner", "score_team1", "score_team2")


@admin.register(Standing)
class StandingAdmin(admin.ModelAdmin):
    list_display = ("tournament", "team", "place")
    list_filter = ("tournament",)


# Register your models here.
