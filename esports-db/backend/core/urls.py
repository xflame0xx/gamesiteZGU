from rest_framework.routers import DefaultRouter
from .views import (
    GameViewSet, TournamentViewSet, TeamViewSet, PlayerViewSet,
    MatchViewSet, StandingViewSet, TournamentTeamViewSet
)

router = DefaultRouter()
router.register(r"games", GameViewSet)
router.register(r"tournaments", TournamentViewSet)
router.register(r"teams", TeamViewSet)
router.register(r"players", PlayerViewSet)
router.register(r"matches", MatchViewSet)
router.register(r"standings", StandingViewSet)
router.register(r"tournament-teams", TournamentTeamViewSet)

urlpatterns = router.urls
