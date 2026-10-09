# TripMate API

FastAPI + LangGraph service that plans trips with Groq-backed agents (research, itinerary, budget, reviewer) and stores them in PostgreSQL. The reviewer can send the itinerary back to the planner for up to two review rounds.

All commands below run from `apps/api`.

## Run locally

```bash
cd apps/api
python -m venv .venv && source .venv/bin/activate
pip install -r requirements-dev.txt
cp .env.example .env        # add your GROQ_API_KEY
docker compose up -d db     # PostgreSQL on localhost:5432
uvicorn app.main:app --reload
```

## API

- `GET /health`
- `POST /trips` with `{"destination": "Lisbon", "days": 3, "budget_usd": 1500, "interests": ["food"]}`
- `GET /trips`, `GET /trips/{id}`

Planning returns 503 until `GROQ_API_KEY` is set. Interactive docs are at `/docs`.

## Tests

```bash
cd apps/api
pytest
```

Tests use a fake chat model and SQLite, so they need no API key or database.
