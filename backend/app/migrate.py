"""Apply db/migrations/*.sql in order, then (re)apply grants and set the app role password."""
from pathlib import Path

import psycopg
from psycopg import sql

from .core.config import load_settings

DB_DIR = Path(__file__).resolve().parents[2] / "db"


def run() -> None:
    s = load_settings()
    with psycopg.connect(s.migration_database_url, autocommit=True) as conn:
        conn.execute(
            "CREATE TABLE IF NOT EXISTS schema_migrations (filename text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())"
        )
        done = {r[0] for r in conn.execute("SELECT filename FROM schema_migrations")}
        for f in sorted((DB_DIR / "migrations").glob("*.sql")):
            if f.name in done:
                continue
            with conn.transaction():
                conn.execute(f.read_text())
                conn.execute("INSERT INTO schema_migrations (filename) VALUES (%s)", (f.name,))
            print("applied", f.name)
        conn.execute(sql.SQL("ALTER ROLE brandguard_app WITH LOGIN PASSWORD {}").format(sql.Literal(s.app_db_password)))
        conn.execute((DB_DIR / "grants.sql").read_text())
    print("migrations up to date")


if __name__ == "__main__":
    run()
