from rest_framework import serializers
from .models import Game, Tournament, Team, Player, Match, MatchResult, Standing, TournamentTeam


class GameSerializer(serializers.ModelSerializer):
    class Meta:
        model = Game
        fields = ["id", "title", "genre"]


class TournamentSerializer(serializers.ModelSerializer):
    game_title = serializers.CharField(source="game.title", read_only=True)

    class Meta:
        model = Tournament
        fields = [
            "id", "name", "game", "game_title",
            "start_date", "end_date", "prize_pool", "format", "status"
        ]


class TeamSerializer(serializers.ModelSerializer):
    class Meta:
        model = Team
        fields = ["id", "name", "logo_url", "country"]


class PlayerSerializer(serializers.ModelSerializer):
    team_name = serializers.CharField(source="team.name", read_only=True)

    class Meta:
        model = Player
        fields = ["id", "nickname", "real_name", "team", "team_name", "role"]


class MatchResultSerializer(serializers.ModelSerializer):
    winner_name = serializers.CharField(source="winner.name", read_only=True)

    class Meta:
        model = MatchResult
        fields = ["match", "winner", "winner_name", "score_team1", "score_team2", "details"]


class MatchSerializer(serializers.ModelSerializer):
    tournament_name = serializers.CharField(source="tournament.name", read_only=True)
    team1_name = serializers.CharField(source="team1.name", read_only=True)
    team2_name = serializers.CharField(source="team2.name", read_only=True)
    result = MatchResultSerializer(read_only=True)

    class Meta:
        model = Match
        fields = [
            "id", "tournament", "tournament_name",
            "team1", "team1_name",
            "team2", "team2_name",
            "match_date", "round", "status",
            "result",
        ]


class StandingSerializer(serializers.ModelSerializer):
    team_name = serializers.CharField(source="team.name", read_only=True)

    class Meta:
        model = Standing
        fields = ["id", "tournament", "team", "team_name", "place"]


class TournamentTeamSerializer(serializers.ModelSerializer):
    team_name = serializers.CharField(source="team.name", read_only=True)
    tournament_name = serializers.CharField(source="tournament.name", read_only=True)

    class Meta:
        model = TournamentTeam
        fields = ["tournament", "tournament_name", "team", "team_name"]
