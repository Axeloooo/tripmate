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
