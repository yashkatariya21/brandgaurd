import os
from dataclasses import dataclass


@dataclass(frozen=True)
class Settings:
    database_url: str
    migration_database_url: str
    app_db_password: str
    jwt_secret: str
    jwt_ttl_minutes: int
    cors_origins: list


def _required(name: str) -> str:
    value = os.environ.get(name)
    if not value:
        raise RuntimeError(f"Missing required environment variable {name}")
    return value


def load_settings() -> Settings:
    secret = _required("JWT_SECRET")
    if len(secret) < 32:
        raise RuntimeError("JWT_SECRET must be at least 32 characters")
    return Settings(
        database_url=_required("DATABASE_URL"),
        migration_database_url=_required("MIGRATION_DATABASE_URL"),
        app_db_password=_required("APP_DB_PASSWORD"),
        jwt_secret=secret,
        jwt_ttl_minutes=int(os.environ.get("JWT_TTL_MINUTES", "60")),
        cors_origins=[o for o in os.environ.get("CORS_ORIGINS", "http://localhost:3000").split(",") if o],
    )
