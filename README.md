# TripMate AI

Multi-agent travel planner. A LangGraph pipeline of Groq-backed agents (research, itinerary, budget, reviewer) builds a trip plan, FastAPI serves it, and PostgreSQL stores it.

The reviewer can send the itinerary back to the planner for up to two review rounds.

## Run locally

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
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
pytest
```

Tests use a fake chat model and SQLite, so they need no API key or database.
