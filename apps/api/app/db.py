from datetime import datetime

from sqlalchemy import JSON, DateTime, String, create_engine, func, inspect, text
from sqlalchemy.engine import Engine
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, sessionmaker


class Base(DeclarativeBase):
    pass


class Trip(Base):
    __tablename__ = "trips"

    id: Mapped[int] = mapped_column(primary_key=True)
    destination: Mapped[str] = mapped_column(String(200))
    days: Mapped[int]
    budget_usd: Mapped[int]
    interests: Mapped[list[str]] = mapped_column(JSON)
    plan: Mapped[dict] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    # planning | ready | failed
    status: Mapped[str] = mapped_column(String(16), default="ready", server_default="ready")
    progress: Mapped[list[dict[str, str]] | None] = mapped_column(JSON, nullable=True)
    error: Mapped[str | None] = mapped_column(String(500), nullable=True)


def make_engine(url: str) -> Engine:
    connect_args = {"check_same_thread": False} if url.startswith("sqlite") else {}
    return create_engine(url, pool_pre_ping=True, connect_args=connect_args)


def make_session_factory(engine: Engine) -> sessionmaker:
    return sessionmaker(bind=engine, expire_on_commit=False)


def init_db(engine: Engine) -> None:
    """Create tables, and add columns that databases created by an older version lack."""
    Base.metadata.create_all(engine)
    existing = {c["name"] for c in inspect(engine).get_columns(Trip.__tablename__)}
    additions = {
        "status": "VARCHAR(16) NOT NULL DEFAULT 'ready'",
        "progress": "JSON",
        "error": "VARCHAR(500)",
    }
    with engine.begin() as conn:
        for name, ddl in additions.items():
            if name not in existing:
                conn.execute(text(f"ALTER TABLE {Trip.__tablename__} ADD COLUMN {name} {ddl}"))
