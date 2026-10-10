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
- `POST /trips` with `{"destination": "Lisbon", "days": 3, "budget_usd": 1500, "interests": ["food"]}` plans the trip and returns it with status 201 once the agents finish.
- `POST /trips?background=true` returns 202 at once with `status: "planning"` and plans in the background. The web app uses this form.
- `GET /trips`, `GET /trips/{id}`. A trip has `status` (`planning`, `ready` or `failed`), `error`, `progress` (the status of each agent: `waiting`, `working`, `done` or `hold`) and `itinerary` (the itinerary text parsed into days and stops). Poll `GET /trips/{id}` to follow a background run.

Planning returns 503 until `GROQ_API_KEY` is set, for both forms. A planning failure returns 502 for the plain form; with `background=true` the trip ends as `failed` with an `error`. Interactive docs are at `/docs`.

Planning runs inside the API process, so run one uvicorn worker. Trips still `planning` when the server starts are marked `failed`. Tables are created at startup, and columns added by newer versions are added to an existing `trips` table.

## Configuration

| Variable       | Default                                                          | Purpose                                                                                      |
| -------------- | ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `GROQ_API_KEY` | unset                                                            | Groq key for the agents. Planning returns 503 without it.                                    |
| `GROQ_MODEL`   | `llama-3.3-70b-versatile`                                        | Groq model name.                                                                             |
| `DATABASE_URL` | `postgresql+psycopg://tripmate:tripmate@localhost:5432/tripmate` | SQLAlchemy URL. SQLite URLs work for trying it out.                                          |
| `CORS_ORIGINS` | empty                                                            | Comma separated origins allowed to call the API from a browser. Empty sends no CORS headers. |

The web app calls `/api` on its own origin and nginx forwards it here, so `CORS_ORIGINS` is only needed when the web app is served from a different origin and built with `VITE_API_URL` pointing at the API.

## Docker

```bash
cd apps/api
docker build -t tripmate-api .
docker run --rm -p 8000:8000 --env-file .env tripmate-api
```

To run the database, API and web app together, use the `docker-compose.yml` at the repository root.

## Tests

```bash
cd apps/api
pytest
```

Tests use a fake chat model and SQLite, so they need no API key or database.
