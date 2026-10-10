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
- `POST /trips` with `{"destination": "Lisbon", "days": 3, "budget_usd": 1500, "interests": ["food"]}` returns `202` with the new trip straight away and plans in the background.
- `GET /trips`, `GET /trips/{id}`: poll a trip until `plan.status` is `ready` or `failed`. While `planning`, `plan.progress` lists the agents that finished and the one working now. A ready plan carries `plan.days` (structured stops, or `null` if the model's reply could not be parsed) beside the raw `research`, `itinerary`, `budget` and `review` text. A failed plan carries `plan.error`.

Planning returns 503 until `GROQ_API_KEY` is set. A restart marks any trip still `planning` as `failed`. Set `CORS_ORIGINS` (comma-separated) only if a browser calls the API from another origin; behind the web proxy it is not needed. Interactive docs are at `/docs`.

## Tests

```bash
cd apps/api
pytest
```

Tests use a fake chat model and SQLite, so they need no API key or database.
