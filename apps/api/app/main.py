import logging
from collections.abc import Iterator
from contextlib import asynccontextmanager
from typing import Any

from fastapi import BackgroundTasks, Depends, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from langchain_core.language_models import BaseChatModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.agents.graph import build_graph, plan_trip
from app.config import Settings
from app.db import Base, Trip, make_engine, make_session_factory
from app.llm import build_llm
from app.schemas import TripOut, TripRequest

PLANNING_FAILED = "Planning service unavailable"
INTERRUPTED = "Planning was interrupted by a restart. Plan the trip again."


def create_app(settings: Settings | None = None, llm: BaseChatModel | None = None) -> FastAPI:
    settings = settings or Settings.from_env()
    engine = make_engine(settings.database_url)
    session_factory = make_session_factory(engine)
    graph_cache: dict[str, Any] = {}

    @asynccontextmanager
    async def lifespan(_app: FastAPI):
        Base.metadata.create_all(engine)
        _fail_interrupted_trips()
        yield
        engine.dispose()

    app = FastAPI(title="TripMate AI", version="0.1.0", lifespan=lifespan)
    if settings.cors_origins:
        app.add_middleware(
            CORSMiddleware,
            allow_origins=list(settings.cors_origins),
            allow_methods=["GET", "POST"],
            allow_headers=["Content-Type"],
        )

    def _save_plan(trip_id: int, plan: dict[str, Any]) -> None:
        with session_factory() as session:
            trip = session.get(Trip, trip_id)
            if trip is not None:
                trip.plan = plan
                session.commit()

    def _fail_interrupted_trips() -> None:
        """A restart kills in-flight planning; mark those trips failed instead of leaving them."""
        with session_factory() as session:
            for trip in session.scalars(select(Trip)):
                if trip.plan.get("status") == "planning":
                    trip.plan = {**trip.plan, "status": "failed", "error": INTERRUPTED}
            session.commit()

    def run_planning(trip_id: int, graph: Any, request: TripRequest) -> None:
        progress: dict[str, Any] = {"completed": [], "current": "research_agent"}

        def on_progress(completed: list[str], current: str | None) -> None:
            progress.update(completed=completed, current=current)
            _save_plan(trip_id, {"status": "planning", "progress": dict(progress)})

        try:
            plan = plan_trip(
                graph,
                destination=request.destination,
                days=request.days,
                budget_usd=request.budget_usd,
                interests=request.interests,
                on_progress=on_progress,
            )
        except Exception:
            logging.getLogger(__name__).exception("Trip planning failed")
            _save_plan(
                trip_id,
                {"status": "failed", "error": PLANNING_FAILED, "progress": dict(progress)},
            )
            return
        _save_plan(trip_id, {"status": "ready", **plan, "progress": dict(progress)})

    def get_graph():
        if "graph" not in graph_cache:
            try:
                model = llm or build_llm(settings)
            except RuntimeError as exc:
                raise HTTPException(status_code=503, detail=str(exc)) from exc
            graph_cache["graph"] = build_graph(model)
        return graph_cache["graph"]

    def get_session() -> Iterator[Session]:
        with session_factory() as session:
            yield session

    @app.get("/health")
    def health() -> dict[str, str]:
        return {"status": "ok"}

    @app.post("/trips", response_model=TripOut, status_code=202)
    def create_trip(
        request: TripRequest,
        background: BackgroundTasks,
        graph=Depends(get_graph),
        session: Session = Depends(get_session),
    ) -> Trip:
        """Starts planning and returns at once. Poll `GET /trips/{id}` for `plan.status`."""
        trip = Trip(
            destination=request.destination,
            days=request.days,
            budget_usd=request.budget_usd,
            interests=request.interests,
            plan={"status": "planning", "progress": {"completed": [], "current": "research_agent"}},
        )
        session.add(trip)
        session.commit()
        session.refresh(trip)
        background.add_task(run_planning, trip.id, graph, request)
        return trip

    @app.get("/trips", response_model=list[TripOut])
    def list_trips(
        limit: int = Query(50, ge=1, le=100),
        offset: int = Query(0, ge=0),
        session: Session = Depends(get_session),
    ) -> list[Trip]:
        stmt = select(Trip).order_by(Trip.id.desc()).limit(limit).offset(offset)
        return list(session.scalars(stmt))

    @app.get("/trips/{trip_id}", response_model=TripOut)
    def get_trip(trip_id: int, session: Session = Depends(get_session)) -> Trip:
        trip = session.get(Trip, trip_id)
        if trip is None:
            raise HTTPException(status_code=404, detail="Trip not found")
        return trip

    return app


app = create_app()
