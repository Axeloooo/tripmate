import pytest
from fastapi.testclient import TestClient
from langchain_core.language_models.fake_chat_models import FakeListChatModel

from app.config import Settings
from app.db import Trip, make_engine, make_session_factory
from app.main import create_app


def _settings(tmp_path, groq_api_key=None) -> Settings:
    return Settings(
        database_url=f"sqlite:///{tmp_path / 'test.db'}",
        groq_api_key=groq_api_key,
        groq_model="test-model",
    )


@pytest.fixture
def client(tmp_path):
    llm = FakeListChatModel(responses=["research", "itinerary", "budget", "APPROVE"])
    with TestClient(create_app(settings=_settings(tmp_path), llm=llm)) as test_client:
        yield test_client


def test_health(client):
    assert client.get("/health").json() == {"status": "ok"}


def test_create_then_fetch_trip(client):
    created = client.post(
        "/trips",
        json={"destination": "Kyoto", "days": 4, "budget_usd": 2000, "interests": ["temples"]},
    )

    assert created.status_code == 202
    body = created.json()
    assert body["destination"] == "Kyoto"
    assert body["plan"]["status"] == "planning"

    # The test client runs background tasks before returning, so planning has finished here.
    fetched = client.get(f"/trips/{body['id']}").json()
    assert fetched["plan"]["status"] == "ready"
    assert fetched["plan"]["itinerary"] == "itinerary"
    assert fetched["plan"]["approved"] is True
    assert fetched["plan"]["days"] is None
    assert fetched["plan"]["progress"]["current"] is None
    assert client.get("/trips").json()[0]["id"] == body["id"]


def test_structured_itinerary_is_exposed_as_days(tmp_path):
    itinerary = (
        '{"days": [{"label": "Day 1", "stops": [{"time": "09:30", "title": "Fushimi Inari", '
        '"detail": "Start early", "kind": "activity", "cost_usd": 0}]}]}'
    )
    llm = FakeListChatModel(responses=["research", itinerary, "budget", "APPROVE"])
    with TestClient(create_app(settings=_settings(tmp_path), llm=llm)) as test_client:
        trip_id = test_client.post(
            "/trips", json={"destination": "Kyoto", "days": 1, "budget_usd": 500}
        ).json()["id"]
        days = test_client.get(f"/trips/{trip_id}").json()["plan"]["days"]

    assert days[0]["label"] == "Day 1"
    assert days[0]["stops"][0]["title"] == "Fushimi Inari"
    assert days[0]["stops"][0]["cost_usd"] == 0


def test_cors_allows_only_configured_origins(tmp_path):
    settings = Settings(
        database_url=f"sqlite:///{tmp_path / 'test.db'}",
        groq_api_key=None,
        groq_model="test-model",
        cors_origins=("https://signposted.example",),
    )
    with TestClient(create_app(settings=settings)) as test_client:
        allowed = test_client.get("/health", headers={"Origin": "https://signposted.example"})
        other = test_client.get("/health", headers={"Origin": "https://evil.example"})

    assert allowed.headers["access-control-allow-origin"] == "https://signposted.example"
    assert "access-control-allow-origin" not in other.headers


def test_restart_marks_interrupted_trips_failed(tmp_path):
    settings = _settings(tmp_path)
    app = create_app(settings=settings)
    with TestClient(app):
        pass
    engine = make_engine(settings.database_url)
    with make_session_factory(engine)() as session:
        session.add(
            Trip(
                destination="Kyoto",
                days=2,
                budget_usd=800,
                interests=[],
                plan={"status": "planning", "progress": {"completed": [], "current": None}},
            )
        )
        session.commit()
    engine.dispose()

    with TestClient(create_app(settings=settings)) as test_client:
        plan = test_client.get("/trips/1").json()["plan"]

    assert plan["status"] == "failed"
    assert "interrupted" in plan["error"]


def test_unknown_trip_returns_404(client):
    assert client.get("/trips/999").status_code == 404


def test_invalid_request_is_rejected(client):
    response = client.post("/trips", json={"destination": "Kyoto", "days": 0, "budget_usd": 2000})

    assert response.status_code == 422


def test_planning_returns_503_without_groq_key(tmp_path):
    app = create_app(settings=_settings(tmp_path, groq_api_key=None))
    with TestClient(app) as test_client:
        response = test_client.post(
            "/trips", json={"destination": "Kyoto", "days": 2, "budget_usd": 800}
        )

    assert response.status_code == 503
    assert "GROQ_API_KEY" in response.json()["detail"]


class _FailingModel(FakeListChatModel):
    def _call(self, *args, **kwargs):
        raise RuntimeError("upstream down")


def test_planning_failure_marks_the_trip_failed(tmp_path):
    app = create_app(settings=_settings(tmp_path), llm=_FailingModel(responses=["x"]))
    with TestClient(app) as test_client:
        response = test_client.post(
            "/trips", json={"destination": "Kyoto", "days": 2, "budget_usd": 800}
        )
        plan = test_client.get(f"/trips/{response.json()['id']}").json()["plan"]

    assert response.status_code == 202
    assert plan["status"] == "failed"
    assert plan["error"] == "Planning service unavailable"


def test_overlong_interest_is_rejected(client):
    response = client.post(
        "/trips",
        json={"destination": "Kyoto", "days": 2, "budget_usd": 800, "interests": ["x" * 51]},
    )

    assert response.status_code == 422


def test_list_trips_respects_limit_and_offset(client):
    for _ in range(3):
        client.post("/trips", json={"destination": "Kyoto", "days": 2, "budget_usd": 800})
    ids = [trip["id"] for trip in client.get("/trips").json()]

    assert [t["id"] for t in client.get("/trips?limit=2").json()] == ids[:2]
    assert [t["id"] for t in client.get("/trips?limit=2&offset=2").json()] == ids[2:]
    assert client.get("/trips?limit=0").status_code == 422
    assert client.get("/trips?limit=101").status_code == 422
    assert client.get("/trips?offset=-1").status_code == 422
