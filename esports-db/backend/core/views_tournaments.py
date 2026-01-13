from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from .models import Tournament
from .serializers import TournamentSerializer, TournamentDetailSerializer


class TournamentListView(APIView):
    def get(self, request):
        qs = Tournament.objects.select_related("game").all().order_by("-start_date", "-id")

        game_id = request.query_params.get("game_id")
        if game_id:
            qs = qs.filter(game_id=game_id)

        t_status = request.query_params.get("status")
        if t_status:
            qs = qs.filter(status=t_status)

        date_from = request.query_params.get("date_from")
        if date_from:
            qs = qs.filter(end_date__gte=date_from)

        date_to = request.query_params.get("date_to")
        if date_to:
            qs = qs.filter(start_date__lte=date_to)

        return Response(TournamentSerializer(qs, many=True).data)


class TournamentDetailView(APIView):
    def get(self, request, tournament_id: int):
        try:
            t = Tournament.objects.select_related("game").get(id=tournament_id)
        except Tournament.DoesNotExist:
            return Response({"detail": "Tournament not found"}, status=status.HTTP_404_NOT_FOUND)

        return Response(TournamentDetailSerializer(t).data)
