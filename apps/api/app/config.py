import os
from dataclasses import dataclass

from dotenv import load_dotenv

DEFAULT_DATABASE_URL = "postgresql+psycopg://tripmate:tripmate@localhost:5432/tripmate"
DEFAULT_GROQ_MODEL = "llama-3.3-70b-versatile"


def parse_origins(value: str | None) -> tuple[str, ...]:
    """Comma separated origins, without trailing slashes. Empty means no CORS headers."""
    return tuple(o.strip().rstrip("/") for o in (value or "").split(",") if o.strip())


@dataclass(frozen=True)
class Settings:
    database_url: str
    groq_api_key: str | None
    groq_model: str
    cors_origins: tuple[str, ...] = ()

    @classmethod
    def from_env(cls) -> "Settings":
        load_dotenv()
        return cls(
            database_url=os.getenv("DATABASE_URL", DEFAULT_DATABASE_URL),
            groq_api_key=os.getenv("GROQ_API_KEY") or None,
            groq_model=os.getenv("GROQ_MODEL", DEFAULT_GROQ_MODEL),
            cors_origins=parse_origins(os.getenv("CORS_ORIGINS")),
        )
