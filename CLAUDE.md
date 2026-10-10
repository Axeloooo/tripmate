# TripMate AI

Multi-agent trip planner: FastAPI + LangGraph (Groq) + PostgreSQL. Python 3.13.

## Layout

Monorepo. `apps/api` is the FastAPI backend (app code, tests, requirements, `pyproject.toml`, docker-compose, `.env.example`). `apps/web` is the Vite + React + TypeScript UI (Signposted terminal design, talks to `apps/api`), and `packages/` is reserved for shared code. Repo-wide tooling stays at the root: `package.json`, `.releaserc.json`, `.prettierrc`, `.pre-commit-config.yaml`, `.cz.toml` (commitizen), `.github/`, `.claude/`, `scripts/`.

## Commands

Root:

```bash
pre-commit install                  # installs pre-commit, commit-msg and pre-push hooks
npm install                         # prettier and semantic-release
npx prettier --write .
```

Web (run from `apps/web`): `npm install`, `npm run dev`, `npm test`, `npm run build`. Design tokens live in `src/styles/tokens.css`, the product name in `src/config.ts`, and all backend access behind `TripApi` in `src/api/client.ts` (HTTP by default; `VITE_USE_MOCK=true` serves sample data in dev only).

API (run from `apps/api`):

```bash
cd apps/api
python -m venv .venv && source .venv/bin/activate
pip install -r requirements-dev.txt
uvicorn app.main:app --reload
docker compose up -d db             # PostgreSQL on localhost:5432
pytest
black .
ruff check --fix .                  # lint only, never ruff format
mypy
```

## Architecture

All paths below are under `apps/api/`.

- `create_app` factory builds the FastAPI app; the LangGraph graph is built lazily on first use and cached.
- `POST /trips` returns 202 at once and plans in a background task; `plan.status` is `planning`, `ready` or `failed`, with `plan.progress` per agent. It returns 503 when no `GROQ_API_KEY` is set. A failed run is saved as `failed`, and trips still `planning` at startup are marked failed.
- The itinerary agent replies with JSON; `plan.days` holds the parsed stops, or null when the reply is unusable (the raw text stays in `plan.itinerary`). `CORS_ORIGINS` lists browser origins allowed to call the API directly.
- Graph: START -> research_agent -> itinerary_agent -> budget_agent -> reviewer_agent -> conditional edge back to itinerary_agent, or END. `MAX_REVIEW_ROUNDS` is 2.
- `TripState` is a `TypedDict` with `total=False`. `plan_trip` invokes the graph and shapes the result.
- Tests use `FakeListChatModel` and SQLite, so no API key or database is needed.

## Skills

The superpowers and frontend-design skills are vendored in `.claude/skills/` (see its README for sources and licenses). They are third-party: do not edit them or run formatters on them.

## Conventions

- Conventional Commits. Types and release effect: `feat` minor, `fix` and `infra` patch, `docs`, `chore`, `test`, `refactor`, `ci` no release. Breaking changes (`!`) are major. Enforced by commitizen (`.cz.toml`) locally and in CI.
- Branches: `feature|fix|docs|infra/short-description`, lowercase.
- Never commit directly to `main` or `devel`.
- Claude must never be author or co-author of a commit: no `Co-Authored-By` or `Claude-Session` trailers, and the git author and committer are the repository owner. A commit-msg hook enforces the trailer rule.
- Python is formatted with black and linted with ruff (line length 100). Do not use ruff-format.
- TypeScript, JS, JSON, Markdown and YAML are formatted with prettier.

## Release flow

1. Work on `feature/*` (or `fix/*`, `docs/*`, `infra/*`) and open a PR into `devel`. Squash-merge it; the PR title must be a valid conventional commit.
2. When ready to release, cut `release/YYYY-MM-DD` from `devel`, open a release PR into `main` and squash-merge it (not a merge commit: `devel` requires verified signatures, and GitHub signs squash commits).
3. `release.yml` runs semantic-release on `main`: tags `vX.Y.Z`, updates `CHANGELOG.md`, creates the GitHub release.
4. Squash-merge `main` back into `devel` (PR `main` -> `devel`, allowed by the branch-name check) to pick up the changelog commit. Do not use a merge commit: the changelog commit is made by the Actions bot and is unsigned, so a merge commit would carry it into `devel` and trip the verified-signature rule. The release commit has no `[skip ci]`; pushes made with `GITHUB_TOKEN` do not trigger workflows anyway.

The first release will be v1.0.0 unless a `v0.1.0` tag is pushed first. CI enforces conventional PR titles with `cz check` on the PR title (re-run on title edits).

If `main` is protected, the GitHub Actions bot must be allowed to bypass the protection (or use a PAT instead of `GITHUB_TOKEN`) so semantic-release can push the changelog commit.
