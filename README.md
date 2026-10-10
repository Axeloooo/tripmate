# TripMate AI

Multi-agent travel planner. A LangGraph pipeline of Groq-backed agents (research, itinerary, budget, reviewer) builds a trip plan, FastAPI serves it, and PostgreSQL stores it.

## Layout

| Path        | Contents                                                                                  |
| ----------- | ----------------------------------------------------------------------------------------- |
| `apps/api`  | FastAPI + LangGraph backend (see [apps/api/README.md](apps/api/README.md))                |
| `apps/web`  | Signposted React + TypeScript UI templates (see [apps/web/README.md](apps/web/README.md)) |
| `packages/` | Reserved for code shared between apps                                                     |
| `scripts/`  | Git hook helper scripts                                                                   |
| `.github/`  | CI workflows (PR checks, release)                                                         |

To run the API locally, see [apps/api/README.md](apps/api/README.md).

## Contributing

```bash
pip install -r apps/api/requirements-dev.txt
npm install
pre-commit install
```

- Branch from `devel` as `feature|fix|docs|infra/short-description`; open PRs into `devel`.
- Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/) with types `feat`, `fix`, `docs`, `infra`, `chore`, `test`, `refactor`, `ci`. `feat` bumps the minor version, `fix` and `infra` the patch version.
- Python is formatted with `black` and linted with `ruff check`; other files with `prettier`. Type checking uses `mypy`. Python tooling is configured in `apps/api/pyproject.toml`; commit message rules live in `.cz.toml`.
- Releases are cut from a `release/YYYY-MM-DD` branch through a squash-merged PR from `devel` into `main`; CI tags the version and updates `CHANGELOG.md`; merge `main` back into `devel` afterwards. PR titles must be conventional commits.
