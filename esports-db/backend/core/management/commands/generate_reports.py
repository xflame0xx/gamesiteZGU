import os
from pathlib import Path

import pandas as pd
import matplotlib.pyplot as plt

from django.core.management.base import BaseCommand
from django.db import connection


SQL_TOURNAMENTS_BY_GAME = """
SELECT g.title AS game, COUNT(*) AS tournaments_count
FROM core_tournament t
JOIN core_game g ON g.id = t.game_id
GROUP BY g.title
ORDER BY tournaments_count DESC;
"""

class Command(BaseCommand):
    help = "Generate аналитические отчёты (CSV + PNG) на основе данных PostgreSQL"

    def handle(self, *args, **options):
        base_dir = Path(__file__).resolve().parents[4]  # backend/
        out_dir = base_dir / "reports_output"
        out_dir.mkdir(exist_ok=True)

        # 1) Получаем данные из БД
        with connection.cursor() as cursor:
            cursor.execute(SQL_TOURNAMENTS_BY_GAME)
            rows = cursor.fetchall()
            cols = [desc[0] for desc in cursor.description]

        df = pd.DataFrame(rows, columns=cols)

        # 2) CSV
        csv_path = out_dir / "tournaments_by_game.csv"
        df.to_csv(csv_path, index=False)

        # 3) PNG chart
        png_path = out_dir / "tournaments_by_game.png"
        plt.figure()
        plt.bar(df["game"], df["tournaments_count"])
        plt.xticks(rotation=30, ha="right")
        plt.tight_layout()
        plt.savefig(png_path, dpi=150)

        self.stdout.write(self.style.SUCCESS(f"Saved: {csv_path}"))
        self.stdout.write(self.style.SUCCESS(f"Saved: {png_path}"))
