from django.utils import timezone
from django.db.models import Q, Count
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import SAFE_METHODS, BasePermission

from .models import Game, Tournament, Team, Player, Match, Standing, TournamentTeam
from .serializers import (
    GameSerializer,
    TournamentSerializer,
    TeamSerializer,
    PlayerSerializer,
    MatchSerializer,
    StandingSerializer,
    TournamentTeamSerializer,
    TournamentDetailSerializer,
)


class AdminOrReadOnly(BasePermission):
    """
    SAFE (GET/HEAD/OPTIONS) -> всем
    НЕ SAFE (POST/PUT/PATCH/DELETE) -> только staff
    """
    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True
        return bool(request.user and request.user.is_authenticated and request.user.is_staff)


def _q_status_iexact(field: str, values):
    q = Q()
    for v in values:
        q |= Q(**{f"{field}__iexact": v})
    return q


class GameViewSet(viewsets.ModelViewSet):
    queryset = Game.objects.all().order_by("title")
    serializer_class = GameSerializer
    permission_classes = [AdminOrReadOnly]


class TournamentViewSet(viewsets.ModelViewSet):
    serializer_class = TournamentSerializer
    queryset = Tournament.objects.select_related("game").all().order_by("-start_date", "-id")
    permission_classes = [AdminOrReadOnly]

    def get_queryset(self):
        qs = super().get_queryset()

        game_id = self.request.query_params.get("game_id")
        if game_id:
            qs = qs.filter(game_id=game_id)

        status_ = self.request.query_params.get("status")
        if status_:
            qs = qs.filter(status=status_)

        date_from = self.request.query_params.get("date_from")
        if date_from:
            qs = qs.filter(end_date__gte=date_from)

        date_to = self.request.query_params.get("date_to")
        if date_to:
            qs = qs.filter(start_date__lte=date_to)

        return qs

    @action(detail=False, methods=["get"], url_path="current")
    def current(self, request):
        today = timezone.localdate()

        current_statuses = [
            "running",
            "идёт", "идет",
            "ongoing", "in_progress", "active",
        ]

        qs = (
            Tournament.objects.select_related("game")
            .filter(
                (Q(start_date__lte=today) & Q(end_date__gte=today))
                | _q_status_iexact("status", current_statuses)
            )
            .distinct()
            .order_by("start_date", "id")
        )
        return Response(TournamentSerializer(qs, many=True).data)

    @action(detail=False, methods=["get"], url_path="upcoming")
    def upcoming(self, request):
        today = timezone.localdate()

        upcoming_statuses = [
            "registration",
            "регистрация",
            "upcoming", "soon",
        ]

        qs = (
            Tournament.objects.select_related("game")
            .filter(Q(start_date__gt=today) | _q_status_iexact("status", upcoming_statuses))
            .distinct()
            .order_by("start_date", "id")
        )
        return Response(TournamentSerializer(qs, many=True).data)

    @action(detail=True, methods=["get"], url_path="page")
    def page(self, request, pk=None):
        tournament = self.get_object()
        return Response(TournamentDetailSerializer(tournament).data)


class TeamViewSet(viewsets.ModelViewSet):
    queryset = Team.objects.all().order_by("name")
    serializer_class = TeamSerializer
    permission_classes = [AdminOrReadOnly]

    def get_queryset(self):
        qs = super().get_queryset()

        country = self.request.query_params.get("country")
        if country:
            qs = qs.filter(country__iexact=country)

        q = self.request.query_params.get("q")
        if q:
            qs = qs.filter(name__icontains=q)

        # /api/teams/?game=ID
        game_id = self.request.query_params.get("game")
        if game_id:
            tt_team_ids = TournamentTeam.objects.filter(
                tournament__game_id=game_id
            ).values_list("team_id", flat=True)

            team1_ids = Match.objects.filter(
                tournament__game_id=game_id
            ).values_list("team1_id", flat=True)

            team2_ids = Match.objects.filter(
                tournament__game_id=game_id
            ).values_list("team2_id", flat=True)

            match_team_ids = team1_ids.union(team2_ids)

            qs = qs.filter(Q(id__in=tt_team_ids) | Q(id__in=match_team_ids)).distinct()

        return qs

    @action(detail=True, methods=["get"], url_path="roster")
    def roster(self, request, pk=None):
        team = self.get_object()
        players = Player.objects.filter(team=team).order_by("nickname")
        return Response(PlayerSerializer(players, many=True).data)

    @action(detail=True, methods=["get"], url_path="current_tournaments")
    def current_tournaments(self, request, pk=None):
        """
        /api/teams/{id}/current_tournaments/
        ВАЖНО: УЧАСТИЕ берём:
        - через TournamentTeam (related_name у Tournament -> tournament_teams)
        - через матчи (matches__team1/team2)
        """
        team = self.get_object()
        today = timezone.localdate()

        # ✅ ВАЖНОЕ ИСПРАВЛЕНИЕ:
        # было "tournamentteam__team" (не существует),
        # должно быть "tournament_teams__team" потому что related_name="tournament_teams"
        tt_ids = Tournament.objects.filter(
            tournament_teams__team=team
        ).values_list("id", flat=True)

        match_ids = Tournament.objects.filter(
            Q(matches__team1=team) | Q(matches__team2=team)
        ).values_list("id", flat=True)

        tournament_ids = tt_ids.union(match_ids)

        qs = (
            Tournament.objects.select_related("game")
            .filter(id__in=tournament_ids)
            .filter(Q(end_date__gte=today) | Q(start_date__gte=today))
            .distinct()
            .order_by("start_date", "id")
        )

        data = [
            {
                "id": t.id,
                "name": t.name,
                "game": t.game_id,
                "game_title": t.game.title if t.game else None,
                "start_date": t.start_date,
                "end_date": t.end_date,
                "status": t.status,
                "prize_pool": t.prize_pool,
                "format": t.format,
            }
            for t in qs
        ]
        return Response(data)

    @action(detail=True, methods=["get"], url_path="history")
    def history(self, request, pk=None):
        team = self.get_object()

        qs = (
            Standing.objects.select_related("tournament", "tournament__game")
            .filter(team=team)
            .order_by("-tournament__start_date")
        )

        data = [
            {
                "tournament_id": s.tournament.id,
                "tournament_name": s.tournament.name,
                "game_title": s.tournament.game.title if s.tournament.game else None,
                "start_date": s.tournament.start_date,
                "end_date": s.tournament.end_date,
                "place": s.place,
            }
            for s in qs
        ]
        return Response({"team": team.name, "history": data})

    @action(detail=True, methods=["get"], url_path="recent_matches")
    def recent_matches(self, request, pk=None):
        team = self.get_object()
        limit = int(request.query_params.get("limit", 10))

        qs = (
            Match.objects.select_related("tournament", "team1", "team2")
            .filter(Q(team1=team) | Q(team2=team))
            .order_by("-match_date")[:limit]
        )

        data = []
        for m in qs:
            res = getattr(m, "result", None)
            score = None
            winner = None
            if res:
                score = f"{res.score_team1}:{res.score_team2}"
                winner = res.winner.name if res.winner else None

            data.append(
                {
                    "id": m.id,
                    "tournament_id": m.tournament_id,
                    "tournament_name": m.tournament.name if m.tournament else None,
                    "match_date": m.match_date,
                    "round": m.round,
                    "status": m.status,
                    "team1_id": m.team1_id,
                    "team1_name": m.team1.name if m.team1 else None,
                    "team2_id": m.team2_id,
                    "team2_name": m.team2.name if m.team2 else None,
                    "score": score,
                    "winner_name": winner,
                }
            )

        return Response({"team": team.name, "matches": data})


class PlayerViewSet(viewsets.ModelViewSet):
    queryset = Player.objects.select_related("team").all().order_by("nickname")
    serializer_class = PlayerSerializer
    permission_classes = [AdminOrReadOnly]


class MatchViewSet(viewsets.ModelViewSet):
    serializer_class = MatchSerializer
    queryset = Match.objects.select_related("tournament", "team1", "team2").all().order_by("match_date")
    permission_classes = [AdminOrReadOnly]

    def get_queryset(self):
        qs = super().get_queryset()

        tournament_id = self.request.query_params.get("tournament")
        if tournament_id:
            qs = qs.filter(tournament_id=tournament_id)

        team_id = self.request.query_params.get("team")
        if team_id:
            qs = qs.filter(Q(team1_id=team_id) | Q(team2_id=team_id))

        status = self.request.query_params.get("status")
        if status:
            qs = qs.filter(status=status)

        date_from = self.request.query_params.get("date_from")
        if date_from:
            qs = qs.filter(match_date__date__gte=date_from)

        date_to = self.request.query_params.get("date_to")
        if date_to:
            qs = qs.filter(match_date__date__lte=date_to)

        q = self.request.query_params.get("q")
        if q:
            qs = qs.filter(Q(team1__name__icontains=q) | Q(team2__name__icontains=q))

        return qs

    @action(detail=False, methods=["get"], url_path="upcoming")
    def upcoming(self, request):
        limit = int(request.query_params.get("limit", 20))
        now = timezone.now()

        scheduled_statuses = [
            "scheduled",
            "запланирован", "запланировано", "ожидается",
            "upcoming", "planned",
        ]

        qs = (
            Match.objects.select_related("tournament", "team1", "team2")
            .filter(match_date__gte=now)
            .filter(_q_status_iexact("status", scheduled_statuses) | Q(status__isnull=True) | Q(status=""))
            .order_by("match_date")[:limit]
        )

        return Response(MatchSerializer(qs, many=True).data)


class StandingViewSet(viewsets.ModelViewSet):
    queryset = Standing.objects.select_related("tournament", "team").all()
    serializer_class = StandingSerializer
    permission_classes = [AdminOrReadOnly]

    @action(detail=False, methods=["get"], url_path="by_tournament")
    def by_tournament(self, request):
        tournament_id = request.query_params.get("tournament_id")
        if not tournament_id:
            return Response({"error": "tournament_id is required"}, status=400)

        qs = self.get_queryset().filter(tournament_id=tournament_id).order_by("place")
        return Response(StandingSerializer(qs, many=True).data)


class TournamentTeamViewSet(viewsets.ModelViewSet):
    queryset = TournamentTeam.objects.select_related("tournament", "team").all()
    serializer_class = TournamentTeamSerializer
    permission_classes = [AdminOrReadOnly]

    @action(detail=False, methods=["get"], url_path="roster_by_tournament")
    def roster_by_tournament(self, request):
        tournament_id = request.query_params.get("tournament_id")
        if not tournament_id:
            return Response({"error": "tournament_id is required"}, status=400)

        tteams = self.get_queryset().filter(tournament_id=tournament_id)

        result = []
        for tt in tteams:
            players = tt.team.players.all().values("id", "nickname", "real_name", "role")
            result.append(
                {
                    "team_id": tt.team.id,
                    "team_name": tt.team.name,
                    "players": list(players),
                }
            )

        return Response(result)


class PopularTeamsReport(APIView):
    def get(self, request):
        limit = int(request.query_params.get("limit", 10))

        qs = (
            Team.objects
            .annotate(participations=Count("team_tournaments"))  # related_name у Team -> team_tournaments
            .order_by("-participations", "name")[:limit]
        )

        data = [
            {
                "id": t.id,
                "name": t.name,
                "country": t.country,
                "logo_url": t.logo_url,
                "participations": t.participations,
            }
            for t in qs
        ]
        return Response(data)


class TournamentsByGameReport(APIView):
    def get(self, request):
        limit = int(request.query_params.get("limit", 10))

        qs = (
            Game.objects
            .annotate(tournaments_count=Count("tournaments"))  # related_name у Game -> tournaments
            .order_by("-tournaments_count", "title")[:limit]
        )

        data = [
            {
                "id": g.id,
                "title": g.title,
                "genre": g.genre,
                "tournaments_count": g.tournaments_count,
            }
            for g in qs
        ]
        return Response(data)




# Create your views here.
