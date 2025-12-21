Ниже —  **единый “шпаргалочный” список всех главных команд и запросов** , которые вы используете в этом проекте. Это можно сохранить как  **cheat-sheet** .

---

# 🧱 Docker / PostgreSQL

### Запуск базы данных

```powershell
docker compose -f docker/docker-compose.yml up -d
```

### Остановка базы

```powershell
docker compose -f docker/docker-compose.yml down
```

### Остановка с удалением данных (volume)

```powershell
docker compose -f docker/docker-compose.yml down -v
```

### Проверка, что контейнер работает

```powershell
docker ps
```

---

## Вход в PostgreSQL (через Docker)

### Подключение к БД `esports`

```powershell
docker exec -it esports_postgres psql -U admin -d esports
```

### Выход из psql

```sql
\q
```

---

## Основные команды psql (БД)

### Показать все таблицы

```sql
\dt
```

### Показать структуру таблицы

```sql
\d core_game
```

### Посмотреть все записи

```sql
SELECT * FROM core_game;
SELECT * FROM core_team;
SELECT * FROM core_tournament;
SELECT * FROM core_player;
SELECT * FROM core_match;
SELECT * FROM core_standing;
```

### Ограничить вывод

```sql
SELECT * FROM core_game LIMIT 5;
```

### Сортировка

```sql
SELECT * FROM core_tournament ORDER BY start_date DESC;
```

---

# 🧠 Django / Backend

### Активация виртуального окружения (Windows)

```powershell
.\.venv\Scripts\Activate.ps1
```

### Запуск сервера

```powershell
python manage.py runserver
```

### Создание миграций

```powershell
python manage.py makemigrations
```

### Применение миграций

```powershell
python manage.py migrate
```

### Создание суперпользователя

```powershell
python manage.py createsuperuser
```

### Django shell

```powershell
python manage.py shell
```

---

## Django shell (ORM-запросы)

### Импорт моделей

```python
from core.models import *
```

### Посмотреть данные

```python
Game.objects.all()
Team.objects.all()
Tournament.objects.all()
```

### Подсчёт записей

```python
Game.objects.count()
```

### Фильтрация

```python
Tournament.objects.filter(game__title="Dota 2")
```

### Получить один объект

```python
Game.objects.get(title="Dota 2")
```

---

# 🌐 Django Admin / API

### Админка

```
http://127.0.0.1:8000/admin/
```

### API эндпоинты

```
http://127.0.0.1:8000/api/games/
http://127.0.0.1:8000/api/teams/
http://127.0.0.1:8000/api/tournaments/
http://127.0.0.1:8000/api/matches/
http://127.0.0.1:8000/api/standings/
```

### Кастомные API

```
/api/matches/upcoming/
/api/teams/{id}/history/
/api/standings/by_tournament/?tournament_id=1
```

---

# 🔧 Диагностика

### Какая БД используется

```powershell
python manage.py shell -c "from django.db import connection; print(connection.vendor)"
```

### Проверка env контейнера

```powershell
docker inspect esports_postgres --format='{{range .Config.Env}}{{println .}}{{end}}'
```

---

# 📌 Мини-алгоритм работы (каждый день)

1️⃣ Запустить Docker

```powershell
docker compose -f docker/docker-compose.yml up -d
```

2️⃣ Активировать venv

```powershell
.\.venv\Scripts\Activate.ps1
```

3️⃣ Запустить Django

```powershell
python manage.py runserver
```

4️⃣ Работать через:

* `/admin`
* `/api/...`
* `psql`

---

## Хочешь — сделаем дальше:

* SQL JOIN-запросы под твой проект
* правильный порядок заполнения БД
* подключение frontend
* подготовку к защите/курсовой

Скажи, что дальше делаем.
