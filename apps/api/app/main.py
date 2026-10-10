import logging
from collections.abc import Iterator
from contextlib import asynccontextmanager
from typing import Any

from fastapi import BackgroundTasks, Depends, FastAPI, HTTPException, Query, Response
from fastapi.middleware.cors import CORSMiddleware
from langchain_core.language_models import BaseChatModel
from sqlalchemy import select, update
from sqlalchemy.orm import Session, sessionmaker

from app.agents.graph import build_graph, plan_trip
from app.agents.progress import advance, finished_progress, hold_working, initial_progress
from app.agents.state import TripState
from app.config import Settings
from app.db import Trip, init_db, make_engine, make_session_factory
from app.llm import build_llm
from app.schemas import TripOut, TripRequest

logger = logging.getLogger(__name__)

PLANNING_FAILED = "Planning service unavailable"
INTERRUPTED = "Planning was interrupted by a server restart"


def create_app(settings: Settings | None = None, llm: BaseChatModel | None = None) -> FastAPI:
    settings = settings or Settings.from_env()
    engine = make_engine(settings.database_url)
    session_factory = make_session_factory(engine)
    graph_cache: dict[str, Any] = {}

    @asynccontextmanager
    async def lifespan(_app: FastAPI):
        init_db(engine)
        # Planning runs inside this process, so a trip still planning at startup was cut off.
        with session_factory() as session:
            session.execute(
                update(Trip)
                .where(Trip.status == "planning")
                .values(status="failed", error=INTERRUPTED)
            )
            session.commit()
        yield
        engine.dispose()

    app = FastAPI(title="TripMate AI", version="0.1.0", lifespan=lifespan)
    if settings.cors_origins:
        app.add_middleware(
            CORSMiddleware,
            allow_origins=list(settings.cors_origins),
            allow_methods=["GET", "POST", "OPTIONS"],
            allow_headers=["Content-Type"],
        )

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

    @app.post("/trips", response_model=TripOut, status_code=201)
    def create_trip(
        request: TripRequest,
        response: Response,
        background_tasks: BackgroundTasks,
        background: bool = Query(
            False,
            description="Return 202 at once with status 'planning' and plan in the background. "
            "Poll GET /trips/{id} for progress. Planning failures then show as status 'failed'.",
        ),
        graph=Depends(get_graph),
        session: Session = Depends(get_session),
    ) -> Trip:
        if background:
            trip = Trip(
                destination=request.destination,
                days=request.days,
                budget_usd=request.budget_usd,
                interests=request.interests,
                plan={},
                status="planning",
                progress=initial_progress(),
            )
            session.add(trip)
            session.commit()
            session.refresh(trip)
            response.status_code = 202
            background_tasks.add_task(_plan_in_background, session_factory, graph, trip.id, request)
            return trip

        try:
            plan = plan_trip(
                graph,
                destination=request.destination,
                days=request.days,
                budget_usd=request.budget_usd,
                interests=request.interests,
            )
        except Exception as exc:
            logger.exception("Trip planning failed")
            raise HTTPException(status_code=502, detail=PLANNING_FAILED) from exc
        trip = Trip(
            destination=request.destination,
            days=request.days,
            budget_usd=request.budget_usd,
            interests=request.interests,
            plan=plan,
            status="ready",
            progress=finished_progress(),
        )
        session.add(trip)
        session.commit()
        session.refresh(trip)
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


def _plan_in_background(
    session_factory: sessionmaker, graph: Any, trip_id: int, request: TripRequest
) -> None:
    """Plan a trip and record each agent's progress on its row. Never raises."""
    with session_factory() as session:
        trip = session.get(Trip, trip_id)
        if trip is None:
            return

        def on_step(node: str, state: TripState) -> None:
            trip.progress = advance(trip.progress or initial_progress(), node, state)
            session.commit()

        try:
            plan = plan_trip(
                graph,
                destination=request.destination,
                days=request.days,
                budget_usd=request.budget_usd,
                interests=request.interests,
                on_step=on_step,
            )
        except Exception:
            logger.exception("Trip planning failed")
            session.rollback()
            trip.status = "failed"
            trip.error = PLANNING_FAILED
            trip.progress = hold_working(trip.progress or initial_progress())
        else:
            trip.plan = plan
            trip.status = "ready"
            trip.progress = finished_progress()
        session.commit()


app = create_app()
