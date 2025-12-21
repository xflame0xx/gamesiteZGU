import os
import subprocess
from datetime import datetime
from pathlib import Path

from django.core.management.base import BaseCommand
from django.conf import settings

class Command(BaseCommand):
    help = "Create PostgreSQL backup using pg_dump inside Docker container"

    def handle(self, *args, **options):
        container = os.getenv("PG_DOCKER_CONTAINER", "esports_postgres")

        db = settings.DATABASES["default"]["NAME"]
        user = settings.DATABASES["default"]["USER"]

        # куда сохраняем на хосте (в папку backend/backups)
        base_dir = Path(settings.BASE_DIR)
        out_dir = base_dir / "backups"
        out_dir.mkdir(exist_ok=True)

        ts = datetime.now().strftime("%Y%m%d_%H%M%S")
        out_file = out_dir / f"{db}_{ts}.backup"

        # 1) делаем бэкап внутри контейнера
        tmp_path = f"/tmp/{db}_{ts}.backup"
        cmd_dump = [
            "docker", "exec", "-t", container,
            "pg_dump", "-U", user, "-d", db, "-F", "c", "-f", tmp_path
        ]

        # 2) копируем файл на хост
        cmd_cp = [
            "docker", "cp",
            f"{container}:{tmp_path}",
            str(out_file)
        ]

        self.stdout.write(f"Running: {' '.join(cmd_dump)}")
        subprocess.check_call(cmd_dump)

        self.stdout.write(f"Running: {' '.join(cmd_cp)}")
        subprocess.check_call(cmd_cp)

        self.stdout.write(self.style.SUCCESS(f"Backup saved to: {out_file}"))
