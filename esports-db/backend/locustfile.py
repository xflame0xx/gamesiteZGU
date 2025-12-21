import random
from locust import HttpUser, task, between


class ApiUser(HttpUser):
    """
    Нагрузочный профиль:
    - больше всего запросов на "списки"
    - немного запросов на "детали"
    - немного на "аналитические" эндпоинты (если есть)
    """
    wait_time = between(0.2, 1.2)

    # Если ваш API начинается не с /api, поправьте.
    # Если у вас API на другом порту/хосте, задаётся через -H при запуске.
    API_PREFIX = "/api"

    @task(6)
    def games_list(self):
        self.client.get(f"{self.API_PREFIX}/games/")

    @task(6)
    def tournaments_list(self):
        self.client.get(f"{self.API_PREFIX}/tournaments/")

    @task(6)
    def matches_list(self):
        # Если у вас нет /matches/ — замените на существующий эндпоинт
        self.client.get(f"{self.API_PREFIX}/matches/")

    @task(3)
    def standings_list(self):
        self.client.get(f"{self.API_PREFIX}/standings/")

    @task(2)
    def upcoming_matches(self):
        # Если у вас есть кастомный эндпоинт upcoming:
        # self.client.get(f"{self.API_PREFIX}/matches/upcoming/")
        # Если нет — просто пропустите или оставьте matches_list
        self.client.get(f"{self.API_PREFIX}/matches/")

    @task(2)
    def team_detail(self):
        # Берём случайный id. Лучше, если у вас есть хотя бы 50+ команд.
        team_id = random.randint(1, 50)
        self.client.get(f"{self.API_PREFIX}/teams/{team_id}/")

    @task(1)
    def team_history(self):
        # Если history action существует:
        # /api/teams/{id}/history/
        team_id = random.randint(1, 50)
        self.client.get(f"{self.API_PREFIX}/teams/{team_id}/history/")
