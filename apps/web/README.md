# Signposted Web

Vite + React + TypeScript UI for TripMate, in the Signposted departures-board design: a black board, amber split-flap times, green for on time, red for a hold. It talks to `apps/api` over HTTP.

## Run

```bash
# terminal 1: the API (see apps/api/README.md), on :8000
cd apps/api && uvicorn app.main:app --reload

# terminal 2
cd apps/web
npm install
npm run dev      # http://localhost:5173, forwards /api to http://localhost:8000
npm test         # Vitest + Testing Library
npm run build    # typecheck, then production build into dist/
```

`npm run dev` and `npm run preview` forward `/api/*` to the API (prefix stripped). Point them elsewhere with `DEV_API_TARGET=http://host:port`. To work on the UI with no API, run `VITE_USE_MOCK=true npm run dev`: sample trips, no network. Production builds never include the sample data.

## Screens

| Route                  | Screen                                                                         |
| ---------------------- | ------------------------------------------------------------------------------ |
| `#/`                   | Trip request form                                                              |
| `#/trips`              | Trip list (Ready, Planning or Failed)                                          |
| `#/trips/:id`          | Itinerary board, times first, budget bar, crew notes                           |
| `#/trips/:id/progress` | Live crew progress (research, itinerary, budget, reviewer), polled every 1.5 s |

Every screen has loading, error (with a retry) and empty states. A trip whose planning failed shows the reason and a link to plan it again. If the model's itinerary cannot be parsed into stops, the board is replaced by the plain text.

## Configuration

| Variable         | Where              | Meaning                                                                                                         |
| ---------------- | ------------------ | --------------------------------------------------------------------------------------------------------------- |
| `VITE_API_URL`   | build time         | Where the browser sends API calls. Default `/api` (same origin, proxied). Absolute URL for a separate API host. |
| `VITE_USE_MOCK`  | dev only           | `true` serves built-in sample trips.                                                                            |
| `DEV_API_TARGET` | dev server         | Where `/api` is forwarded by `npm run dev` / `preview`. Default `http://localhost:8000`.                        |
| `API_UPSTREAM`   | container run time | Where the nginx image forwards `/api`. Default `http://api:8000`.                                               |

`VITE_*` values are baked into the bundle at build time, so changing one means rebuilding.

## Deploy

### Whole stack with Docker Compose

From the repository root:

```bash
cp apps/api/.env.example .env     # set GROQ_API_KEY
docker compose up --build         # UI on http://localhost:8080
```

This starts PostgreSQL, the API and the web image. The web container serves the static build with nginx and proxies `/api/` to the API, so the browser sees one origin and CORS is not involved.

### Web image alone

```bash
docker build -t signposted-web apps/web
docker run -p 8080:80 -e API_UPSTREAM=https://api.example.com signposted-web
```

`GET /healthz` answers `ok` for load-balancer checks.

### Static host (Vercel, Netlify, S3 and similar)

Routes are hash-based, so no rewrite rules are needed. Set the project root to `apps/web`, build command `npm run build`, output directory `dist`, and the build variable `VITE_API_URL` to the API's public URL. Then add the site's origin to the API's `CORS_ORIGINS`, for example `CORS_ORIGINS=https://signposted.example.com`.

### The API

`apps/api/Dockerfile` builds the API image. Run it with `GROQ_API_KEY`, `DATABASE_URL` (PostgreSQL) and, for a separately hosted UI, `CORS_ORIGINS`. The API has no authentication or rate limiting yet, so put it behind something that does before exposing it publicly.

## Where things live

- `src/styles/tokens.css`: palette, type scale, spacing. Change the look here.
- `src/config.ts`: the product name and tagline. Also update `<title>` in `index.html` if you rename.
- `src/components/`: `Sign`, `Button`, `TextField`, `BudgetBar`, `Shell`.
- `src/api/client.ts`: the `TripApi` interface and the HTTP client. `src/api/map.ts` turns API trips into UI types (including which stop is a budget HOLD). `src/api/mock.ts` is sample data for dev and tests only.

Code here is formatted with prettier (configured at the repository root).
