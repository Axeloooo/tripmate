import pytest
from fastapi.testclient import TestClient
from langchain_core.language_models.fake_chat_models import FakeListChatModel

from app.config import Settings
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

    assert created.status_code == 201
    body = created.json()
    assert body["destination"] == "Kyoto"
    assert body["plan"]["itinerary"] == "itinerary"
    assert body["plan"]["approved"] is True

    assert client.get(f"/trips/{body['id']}").json()["id"] == body["id"]
    assert client.get("/trips").json()[0]["id"] == body["id"]


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


def test_planning_failure_returns_502(tmp_path):
    app = create_app(settings=_settings(tmp_path), llm=_FailingModel(responses=["x"]))
    with TestClient(app) as test_client:
        response = test_client.post(
            "/trips", json={"destination": "Kyoto", "days": 2, "budget_usd": 800}
        )

    assert response.status_code == 502
    assert response.json()["detail"] == "Planning service unavailable"


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


ITINERARY = "Day 1: Arrival\n09:00 | activity | Old town walk | Free tour | 30\n"
TRIP = {"destination": "Kyoto", "days": 2, "budget_usd": 800}


@pytest.fixture
def planner_client(tmp_path):
    llm = FakeListChatModel(responses=["research", ITINERARY, "budget", "APPROVE"])
    with TestClient(create_app(settings=_settings(tmp_path), llm=llm)) as test_client:
        yield test_client


def test_trip_includes_parsed_itinerary(planner_client):
    body = planner_client.post("/trips", json=TRIP).json()

    assert body["status"] == "ready"
    assert body["progress"] == [
        {"id": "research", "status": "done"},
        {"id": "itinerary", "status": "done"},
        {"id": "budget", "status": "done"},
        {"id": "reviewer", "status": "done"},
    ]
    assert body["itinerary"] == [
        {
            "label": "Day 1, Arrival",
            "stops": [
                {
                    "time": "09:00",
                    "title": "Old town walk",
                    "detail": "Free tour",
                    "kind": "activity",
                    "state": "next",
                    "cost_usd": 30,
                }
            ],
        }
    ]


def test_background_planning_returns_202_then_completes(planner_client):
    created = planner_client.post("/trips?background=true", json=TRIP)

    assert created.status_code == 202
    assert created.json()["status"] == "planning"
    assert created.json()["progress"][0] == {"id": "research", "status": "working"}
    # The test client finishes background tasks before returning.
    done = planner_client.get(f"/trips/{created.json()['id']}").json()
    assert done["status"] == "ready"
    assert done["plan"]["approved"] is True
    assert done["itinerary"][0]["stops"][0]["title"] == "Old town walk"


def test_background_planning_records_each_agent_step(tmp_path):
    seen: list[list[dict]] = []
    llm = FakeListChatModel(responses=["research", ITINERARY, "budget", "APPROVE"])
    app = create_app(settings=_settings(tmp_path), llm=llm)
    from app import main

    original = main.advance

    def spy(progress, node, state):
        result = original(progress, node, state)
        seen.append(result)
        return result

    main.advance = spy
    try:
        with TestClient(app) as test_client:
            test_client.post("/trips?background=true", json=TRIP)
    finally:
        main.advance = original

    assert [[a["status"] for a in step] for step in seen] == [
        ["done", "working", "waiting", "waiting"],
        ["done", "done", "working", "waiting"],
        ["done", "done", "done", "working"],
        ["done", "done", "done", "done"],
    ]


def test_background_planning_survives_a_review_round(tmp_path):
    llm = FakeListChatModel(
        responses=["r", ITINERARY, "b", "REVISE: too packed", ITINERARY, "b2", "APPROVE"]
    )
    with TestClient(create_app(settings=_settings(tmp_path), llm=llm)) as test_client:
        body = test_client.post("/trips?background=true", json=TRIP).json()
        done = test_client.get(f"/trips/{body['id']}").json()

    assert done["status"] == "ready"
    assert done["plan"]["review_rounds"] == 2


def test_background_failure_marks_trip_failed(tmp_path):
    app = create_app(settings=_settings(tmp_path), llm=_FailingModel(responses=["x"]))
    with TestClient(app) as test_client:
        created = test_client.post("/trips?background=true", json=TRIP)
        failed = test_client.get(f"/trips/{created.json()['id']}").json()

    assert created.status_code == 202
    assert failed["status"] == "failed"
    assert failed["error"] == "Planning service unavailable"
    assert failed["progress"][0] == {"id": "research", "status": "hold"}
    assert failed["itinerary"] == []


def test_background_planning_still_returns_503_without_groq_key(tmp_path):
    app = create_app(settings=_settings(tmp_path, groq_api_key=None))
    with TestClient(app) as test_client:
        response = test_client.post("/trips?background=true", json=TRIP)

        assert response.status_code == 503
        assert test_client.get("/trips").json() == []


def test_restart_fails_trips_left_in_planning(tmp_path):
    settings = _settings(tmp_path)
    llm = FakeListChatModel(responses=["x"])
    with TestClient(create_app(settings=settings, llm=llm)) as first:
        from app.db import Trip, make_engine, make_session_factory

        factory = make_session_factory(make_engine(settings.database_url))
        with factory() as session:
            session.add(
                Trip(
                    destination="Oslo",
                    days=2,
                    budget_usd=500,
                    interests=[],
                    plan={},
                    status="planning",
                )
            )
            session.commit()
        assert first.get("/trips").json()[0]["status"] == "planning"

    with TestClient(create_app(settings=settings, llm=llm)) as second:
        trip = second.get("/trips").json()[0]

    assert trip["status"] == "failed"
    assert "restart" in trip["error"]


def test_created_at_is_utc(client):
    created = client.post("/trips", json=TRIP).json()

    assert created["created_at"].endswith(("Z", "+00:00"))


def test_database_from_an_older_version_gains_new_columns(tmp_path):
    import sqlalchemy as sa

    settings = _settings(tmp_path)
    engine = sa.create_engine(settings.database_url)
    with engine.begin() as conn:
        conn.execute(
            sa.text(
                "CREATE TABLE trips (id INTEGER PRIMARY KEY, destination VARCHAR(200), "
                "days INTEGER, budget_usd INTEGER, interests JSON, plan JSON, "
                "created_at DATETIME DEFAULT CURRENT_TIMESTAMP)"
            )
        )
        conn.execute(
            sa.text(
                "INSERT INTO trips (destination, days, budget_usd, interests, plan) "
                "VALUES ('Rome', 3, 900, '[]', '{}')"
            )
        )
    engine.dispose()

    with TestClient(create_app(settings=settings)) as test_client:
        trips = test_client.get("/trips").json()

    assert trips[0]["destination"] == "Rome"
    assert trips[0]["status"] == "ready"


def test_cors_allows_only_configured_origins(tmp_path):
    settings = Settings(
        database_url=f"sqlite:///{tmp_path / 'cors.db'}",
        groq_api_key=None,
        groq_model="m",
        cors_origins=("https://app.example.com",),
    )
    with TestClient(create_app(settings=settings)) as test_client:
        allowed = test_client.get("/health", headers={"Origin": "https://app.example.com"})
        denied = test_client.get("/health", headers={"Origin": "https://evil.example.com"})
        preflight = test_client.options(
            "/trips",
            headers={
                "Origin": "https://app.example.com",
                "Access-Control-Request-Method": "POST",
                "Access-Control-Request-Headers": "content-type",
            },
        )

    assert allowed.headers["access-control-allow-origin"] == "https://app.example.com"
    assert "access-control-allow-origin" not in denied.headers
    assert preflight.status_code == 200


def test_no_cors_headers_by_default(client):
    response = client.get("/health", headers={"Origin": "https://app.example.com"})

    assert "access-control-allow-origin" not in response.headers


def test_cors_origins_env_is_parsed():
    from app.config import parse_origins

    assert parse_origins(" https://a.com/ ,https://b.com,, ") == ("https://a.com", "https://b.com")
    assert parse_origins(None) == ()
