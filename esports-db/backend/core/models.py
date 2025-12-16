from django.db import models


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


# Create your models here.
