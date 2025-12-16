from django.utils import timezone
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Game, Tournament, Team, Player, Match, Standing, TournamentTeam
from .serializers import (
    GameSerializer, TournamentSerializer, TeamSerializer, PlayerSerializer,
    MatchSerializer, StandingSerializer, TournamentTeamSerializer
)


class GameViewSet(viewsets.ModelViewSet):
    queryset = Game.objects.all().order_by("title")
    serializer_class = GameSerializer


class TournamentViewSet(viewsets.ModelViewSet):
    queryset = Tournament.objects.select_related("game").all().order_by("-start_date")
    serializer_class = TournamentSerializer

    @action(detail=False, methods=["get"])
    def by_game_title(self, request):
        # /api/tournaments/by_game_title/?title=Dota%202
        title = request.query_params.get("title", "")
        qs = self.get_queryset().filter(game__title__iexact=title)
        return Response(TournamentSerializer(qs, many=True).data)


class TeamViewSet(viewsets.ModelViewSet):
    queryset = Team.objects.all().order_by("name")
    serializer_class = TeamSerializer

    @action(detail=True, methods=["get"])
    def history(self, request, pk=None):
        # /api/teams/{id}/history/
        team = self.get_object()
        standings = Standing.objects.select_related("tournament").filter(team=team).order_by("-tournament__start_date")
        data = [
            {
                "tournament_id": s.tournament.id,
                "tournament_name": s.tournament.name,
                "start_date": s.tournament.start_date,
                "end_date": s.tournament.end_date,
                "place": s.place,
            }
            for s in standings
        ]
        return Response({"team": team.name, "history": data})


class PlayerViewSet(viewsets.ModelViewSet):
    queryset = Player.objects.select_related("team").all().order_by("nickname")
    serializer_class = PlayerSerializer


class MatchViewSet(viewsets.ModelViewSet):
    queryset = Match.objects.select_related("tournament", "team1", "team2").all().order_by("match_date")
    serializer_class = MatchSerializer

    @action(detail=False, methods=["get"], url_path="upcoming")
    def upcoming(self, request):
        # /api/matches/upcoming/
        now = timezone.now()
        qs = self.get_queryset().filter(match_date__gte=now, status="scheduled").order_by("match_date")[:20]
        return Response(MatchSerializer(qs, many=True).data)

    @action(detail=False, methods=["get"], url_path="final_winner")
    def final_winner(self, request):
        # /api/matches/final_winner/?tournament_id=1
        tournament_id = request.query_params.get("tournament_id")
        if not tournament_id:
            return Response({"error": "tournament_id is required"}, status=400)

        qs = self.get_queryset().filter(tournament_id=tournament_id, round__iexact="финал", status="finished")
        match = qs.first()
        if not match or not hasattr(match, "result") or not match.result.winner:
            return Response({"winner": None})

        return Response({
            "match_id": match.id,
            "winner_id": match.result.winner.id,
            "winner_name": match.result.winner.name,
            "score_team1": match.result.score_team1,
            "score_team2": match.result.score_team2,
        })


class StandingViewSet(viewsets.ModelViewSet):
    queryset = Standing.objects.select_related("tournament", "team").all()
    serializer_class = StandingSerializer

    @action(detail=False, methods=["get"], url_path="by_tournament")
    def by_tournament(self, request):
        # /api/standings/by_tournament/?tournament_id=1
        tournament_id = request.query_params.get("tournament_id")
        if not tournament_id:
            return Response({"error": "tournament_id is required"}, status=400)

        qs = self.get_queryset().filter(tournament_id=tournament_id).order_by("place")
        return Response(StandingSerializer(qs, many=True).data)


class TournamentTeamViewSet(viewsets.ModelViewSet):
    queryset = TournamentTeam.objects.select_related("tournament", "team").all()
    serializer_class = TournamentTeamSerializer

    @action(detail=False, methods=["get"], url_path="roster_by_tournament")
    def roster_by_tournament(self, request):
        # /api/tournament-teams/roster_by_tournament/?tournament_id=1
        tournament_id = request.query_params.get("tournament_id")
        if not tournament_id:
            return Response({"error": "tournament_id is required"}, status=400)

        tteams = self.get_queryset().filter(tournament_id=tournament_id)
        result = []
        for tt in tteams:
            players = tt.team.players.all().values("id", "nickname", "real_name", "role")
            result.append({
                "team_id": tt.team.id,
                "team_name": tt.team.name,
                "players": list(players)
            })
        return Response(result)


# Create your views here.
