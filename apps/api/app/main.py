import logging
from collections.abc import Iterator
from contextlib import asynccontextmanager
from typing import Any

from fastapi import Depends, FastAPI, HTTPException, Query
from langchain_core.language_models import BaseChatModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.agents.graph import build_graph, plan_trip
from app.config import Settings
from app.db import Base, Trip, make_engine, make_session_factory
from app.llm import build_llm
from app.schemas import TripOut, TripRequest


def create_app(settings: Settings | None = None, llm: BaseChatModel | None = None) -> FastAPI:
    settings = settings or Settings.from_env()
    engine = make_engine(settings.database_url)
    session_factory = make_session_factory(engine)
    graph_cache: dict[str, Any] = {}

    @asynccontextmanager
    async def lifespan(_app: FastAPI):
        Base.metadata.create_all(engine)
        yield
        engine.dispose()

    app = FastAPI(title="TripMate AI", version="0.1.0", lifespan=lifespan)

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
        graph=Depends(get_graph),
        session: Session = Depends(get_session),
    ) -> Trip:
        try:
            plan = plan_trip(
                graph,
                destination=request.destination,
                days=request.days,
                budget_usd=request.budget_usd,
                interests=request.interests,
            )
        except Exception as exc:
            logging.getLogger(__name__).exception("Trip planning failed")
            raise HTTPException(status_code=502, detail="Planning service unavailable") from exc
        trip = Trip(
            destination=request.destination,
            days=request.days,
            budget_usd=request.budget_usd,
            interests=request.interests,
            plan=plan,
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


app = create_app()
