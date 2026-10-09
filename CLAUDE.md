# TripMate AI

Multi-agent trip planner: FastAPI + LangGraph (Groq) + PostgreSQL. Python 3.13.

## Commands

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements-dev.txt
pre-commit install                  # installs pre-commit, commit-msg and pre-push hooks
npm install                         # prettier and semantic-release
uvicorn app.main:app --reload
docker compose up -d db             # PostgreSQL on localhost:5432
pytest
black .
ruff check --fix .                  # lint only, never ruff format
mypy
npx prettier --write .
```

## Architecture

- `create_app` factory builds the FastAPI app; the LangGraph graph is built lazily on first use and cached.
- Planning returns 503 when no `GROQ_API_KEY` is set and 502 when planning fails.
- Graph: START -> research_agent -> itinerary_agent -> budget_agent -> reviewer_agent -> conditional edge back to itinerary_agent, or END. `MAX_REVIEW_ROUNDS` is 2.
- `TripState` is a `TypedDict` with `total=False`. `plan_trip` invokes the graph and shapes the result.
- Tests use `FakeListChatModel` and SQLite, so no API key or database is needed.

## Conventions

- Conventional Commits. Types and release effect: `feat` minor, `fix` and `infra` patch, `docs`, `chore`, `test`, `refactor`, `ci` no release. Breaking changes (`!`) are major. Enforced by commitizen (`pyproject.toml`) locally and in CI.
- Branches: `feature|fix|docs|infra/short-description`, lowercase.
- Never commit directly to `main` or `devel`.
- Python is formatted with black and linted with ruff (line length 100). Do not use ruff-format.
- TypeScript, JS, JSON, Markdown and YAML are formatted with prettier.

## Release flow

1. Work on `feature/*` (or `fix/*`, `docs/*`, `infra/*`) and open a PR into `devel`.
2. When ready to release, open a release PR `devel` -> `main` and merge it with a MERGE COMMIT, not squash, so the conventional commits reach `main`.
3. `release.yml` runs semantic-release on `main`: tags `vX.Y.Z`, updates `CHANGELOG.md`, creates the GitHub release.
4. Merge `main` back into `devel` to pick up the changelog commit.

The first release will be v1.0.0 unless a `v0.1.0` tag is pushed first. If PRs into `devel` are squash-merged, the PR title must be a valid conventional commit.
