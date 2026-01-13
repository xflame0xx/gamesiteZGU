from django.db import models
from django.conf import settings

class Game(models.Model):
    title = models.CharField(max_length=120, unique=True)
    genre = models.CharField(max_length=80)

    def __str__(self):
        return self.title


class Tournament(models.Model):
    STATUS_CHOICES = [
        ("registration", "регистрация"),
        ("running", "идёт"),
        ("finished", "завершён"),
    ]

    FORMAT_CHOICES = [
        ("playoff", "плей-офф"),
        ("groups", "групповая стадия"),
        ("mixed", "смешанный"),
    ]

    name = models.CharField(max_length=160)
    game = models.ForeignKey(Game, on_delete=models.CASCADE, related_name="tournaments")
    start_date = models.DateField()
    end_date = models.DateField()
    prize_pool = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    format = models.CharField(max_length=20, choices=FORMAT_CHOICES, default="playoff")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="registration")

    def __str__(self):
        return f"{self.name} ({self.game.title})"


class Team(models.Model):
    name = models.CharField(max_length=120, unique=True)
    logo_url = models.URLField(blank=True, null=True)
    country = models.CharField(max_length=80)
    
    is_approved = models.BooleanField(default=True)

    def __str__(self):
        return self.name


class Player(models.Model):
    nickname = models.CharField(max_length=80, unique=True)
    real_name = models.CharField(max_length=120, blank=True, null=True)
    team = models.ForeignKey(Team, on_delete=models.SET_NULL, null=True, related_name="players")
    role = models.CharField(max_length=80)

    def __str__(self):
        return self.nickname


class TournamentTeam(models.Model):
    tournament = models.ForeignKey(Tournament, on_delete=models.CASCADE, related_name="tournament_teams")
    team = models.ForeignKey(Team, on_delete=models.CASCADE, related_name="team_tournaments")

    class Meta:
        unique_together = ("tournament", "team")

    def __str__(self):
        return f"{self.team.name} @ {self.tournament.name}"


class Match(models.Model):
    STATUS_CHOICES = [
        ("scheduled", "запланирован"),
        ("finished", "завершён"),
        ("canceled", "отменён"),
    ]

    tournament = models.ForeignKey(Tournament, on_delete=models.CASCADE, related_name="matches")
    team1 = models.ForeignKey(Team, on_delete=models.CASCADE, related_name="matches_as_team1")
    team2 = models.ForeignKey(Team, on_delete=models.CASCADE, related_name="matches_as_team2")
    match_date = models.DateTimeField()
    round = models.CharField(max_length=80)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="scheduled")

    def __str__(self):
        return f"{self.tournament.name}: {self.team1.name} vs {self.team2.name}"


class MatchResult(models.Model):
    match = models.OneToOneField(Match, on_delete=models.CASCADE, related_name="result")
    winner = models.ForeignKey(Team, on_delete=models.SET_NULL, null=True, related_name="wins")
    score_team1 = models.IntegerField(default=0)
    score_team2 = models.IntegerField(default=0)
    details = models.URLField(blank=True, null=True)

    def __str__(self):
        return f"Result for match {self.match_id}"


class Standing(models.Model):
    tournament = models.ForeignKey(Tournament, on_delete=models.CASCADE, related_name="standings")
    team = models.ForeignKey(Team, on_delete=models.CASCADE, related_name="standings")
    place = models.IntegerField()

    class Meta:
        unique_together = ("tournament", "team")
        ordering = ["place"]

    def __str__(self):
        return f"{self.tournament.name}: {self.team.name} place {self.place}"

class UserProfile(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="profile")
    bio = models.TextField(blank=True, default="")
    avatar_url = models.URLField(blank=True, default="")

    def __str__(self):
        return f"Profile({self.user.username})"


class FavoriteTournament(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="favorite_tournaments")
    tournament = models.ForeignKey("core.Tournament", on_delete=models.CASCADE, related_name="favorited_by")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("user", "tournament")


class FavoriteTeam(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="favorite_teams")
    team = models.ForeignKey("core.Team", on_delete=models.CASCADE, related_name="favorited_by")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("user", "team")


class ViewHistory(models.Model):
    ITEM_TYPES = [
        ("tournament", "Tournament"),
        ("team", "Team"),
        ("game", "Game"),
        ("match", "Match"),
    ]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="view_history")
    item_type = models.CharField(max_length=20, choices=ITEM_TYPES)
    item_id = models.PositiveIntegerField()
    viewed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=["user", "item_type", "viewed_at"]),
        ]
class TeamApplication(models.Model):
    STATUS_CHOICES = [
        ("pending", "ожидает"),
        ("approved", "одобрена"),
        ("rejected", "отклонена"),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="team_applications",
    )
    tournament = models.ForeignKey(
        "core.Tournament",
        on_delete=models.CASCADE,
        related_name="team_applications",
    )

    # данные заявки (можно расширять)
    team_name = models.CharField(max_length=120)
    country = models.CharField(max_length=80, blank=True, default="")
    logo_url = models.URLField(blank=True, null=True)


    roster_json = models.JSONField(blank=True, default=list)

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    admin_comment = models.TextField(blank=True, default="")

    created_at = models.DateTimeField(auto_now_add=True)
    decided_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["tournament", "status"]),
            models.Index(fields=["user", "created_at"]),
        ]

    def __str__(self):
        return f"Application({self.team_name} -> {self.tournament.name}, {self.status})"

class TeamRegistrationRequest(models.Model):
    STATUS_CHOICES = [
        ("pending", "ожидает"),
        ("approved", "одобрено"),
        ("rejected", "отклонено"),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="team_requests",
    )
    tournament = models.ForeignKey(
        "core.Tournament",
        on_delete=models.CASCADE,
        related_name="team_requests",
    )

    # Анкета / данные команды
    team_name = models.CharField(max_length=120)
    country = models.CharField(max_length=80, blank=True, default="")
    logo_url = models.URLField(blank=True, null=True)

    # Состав (просто JSON, чтобы не плодить таблицы заявок)
    # Пример: [{"nickname":"n1","real_name":"","role":"captain"}, ...]
    roster = models.JSONField(default=list, blank=True)

    comment = models.TextField(blank=True, default="")

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    admin_comment = models.TextField(blank=True, default="")

    created_at = models.DateTimeField(auto_now_add=True)
    decided_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["tournament", "status", "created_at"]),
            models.Index(fields=["user", "created_at"]),
        ]

    def __str__(self):
        return f"Req({self.team_name}) -> {self.tournament_id} [{self.status}]"
