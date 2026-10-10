# TripMate AI

Multi-agent travel planner. A LangGraph pipeline of Groq-backed agents (research, itinerary, budget, reviewer) builds a trip plan, FastAPI serves it, and PostgreSQL stores it.

## Layout

| Path        | Contents                                                                                          |
| ----------- | ------------------------------------------------------------------------------------------------- |
| `apps/api`  | FastAPI + LangGraph backend (see [apps/api/README.md](apps/api/README.md))                        |
| `apps/web`  | Signposted React + TypeScript UI, wired to the API (see [apps/web/README.md](apps/web/README.md)) |
| `packages/` | Reserved for code shared between apps                                                             |
| `scripts/`  | Git hook helper scripts                                                                           |
| `.github/`  | CI workflows (PR checks, release)                                                                 |

To run the API locally, see [apps/api/README.md](apps/api/README.md).

## Run everything with Docker

```bash
cp .env.example .env        # add your GROQ_API_KEY
docker compose up --build   # PostgreSQL + API + web
```

Open http://localhost:8080. The `web` container serves the built app with nginx and forwards `/api/*` to the API, so the browser only ever talks to one origin and no CORS setup is needed. Without a `GROQ_API_KEY` everything starts, but planning a trip answers 503 and the app says planning is not set up.

## Configuration

| Variable            | Used by       | Default                   | Purpose                                                                                                |
| ------------------- | ------------- | ------------------------- | ------------------------------------------------------------------------------------------------------ |
| `GROQ_API_KEY`      | API           | unset                     | Groq key for the agents. Planning returns 503 without it.                                              |
| `GROQ_MODEL`        | API           | `llama-3.3-70b-versatile` | Groq model name.                                                                                       |
| `DATABASE_URL`      | API           | local PostgreSQL          | SQLAlchemy URL. Compose sets it for the bundled database.                                              |
| `CORS_ORIGINS`      | API           | empty                     | Comma separated browser origins allowed to call the API directly. Only needed without the nginx proxy. |
| `API_UPSTREAM`      | web container | `http://api:8000`         | Where nginx forwards `/api/*`. Read when the container starts. No trailing slash.                      |
| `VITE_API_URL`      | web build     | `/api`                    | Where the browser finds the API. Baked into the bundle at build time.                                  |
| `VITE_CLIENT`       | web build     | unset                     | `mock` swaps the API for canned data. Development and tests only.                                      |
| `POSTGRES_PASSWORD` | compose       | `tripmate`                | Password for the bundled PostgreSQL.                                                                   |
| `WEB_PORT`          | compose       | `8080`                    | Host port for the web app.                                                                             |

Each app has its own example file: [`.env.example`](.env.example) (compose), [`apps/api/.env.example`](apps/api/.env.example) and [`apps/web/.env.example`](apps/web/.env.example).

## Deploying

Both apps build to container images, so any host that runs containers works.

1. Build and run `apps/api` (`apps/api/Dockerfile`) with `DATABASE_URL` pointing at a managed PostgreSQL, and `GROQ_API_KEY` set. Run one instance and one worker: planning runs inside the API process.
2. Build and run `apps/web` (`apps/web/Dockerfile`) with `API_UPSTREAM` set to the API's internal URL, for example `http://tripmate-api:8000`. Expose port 80 over HTTPS through your platform's load balancer.
3. Check `GET /healthz` on the web container (nginx) and `GET /api/health` (API, through the proxy).

To host the web app on a different origin from the API (a static host, say), build it with `VITE_API_URL=https://api.example.com` and list the web origin in the API's `CORS_ORIGINS`. The web app uses hash routes, so a static host needs no rewrite rules.

## Contributing

```bash
pip install -r apps/api/requirements-dev.txt
npm install
pre-commit install
```

- Branch from `devel` as `feature|fix|docs|infra/short-description`; open PRs into `devel`.
- Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/) with types `feat`, `fix`, `docs`, `infra`, `chore`, `test`, `refactor`, `ci`. `feat` bumps the minor version, `fix` and `infra` the patch version.
- Python is formatted with `black` and linted with `ruff check`; other files with `prettier`. Type checking uses `mypy`. Python tooling is configured in `apps/api/pyproject.toml`; commit message rules live in `.cz.toml`.
- Releases are cut from a `release/YYYY-MM-DD` branch through a squash-merged PR from `devel` into `main`; CI tags the version and updates `CHANGELOG.md`; squash-merge `main` back into `devel` afterwards (a merge commit would carry the unsigned changelog commit, which `devel` rejects). PR titles must be conventional commits.
