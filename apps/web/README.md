# Signposted Web

Vite + React + TypeScript UI for TripMate, in the Signposted departures-board design: a black board, amber split-flap times, green for on time, red for a hold. It talks to `apps/api`.

## Run

Start the API first (see [apps/api/README.md](../api/README.md)), then:

```bash
cd apps/web
npm install
npm run dev      # http://localhost:5173, forwards /api to http://localhost:8000
npm run typecheck
npm test         # Vitest + Testing Library
npm run build    # typecheck, then production build into dist/
npm run preview  # serves dist/ with the same /api forwarding
```

To work on the UI without a backend, run `VITE_CLIENT=mock npm run dev`. The mock client is never the default and is left out of production builds.

## Configuration

Vite reads these when it starts or builds (see `.env.example`; put local values in `.env.local`).

| Variable        | Default                 | Purpose                                                                                                                                                                           |
| --------------- | ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `VITE_API_URL`  | `/api`                  | Where the browser finds the API. A path on the same origin, or a full URL such as `https://api.example.com` (add the origin to the API's `CORS_ORIGINS`). Baked in at build time. |
| `VITE_CLIENT`   | unset                   | `mock` uses canned data instead of the API.                                                                                                                                       |
| `DEV_API_PROXY` | `http://localhost:8000` | Where `npm run dev` and `npm run preview` forward `/api`. Not part of the bundle.                                                                                                 |

## Screens

Every screen has a loading, an error (with Try again) and, where it applies, an empty state.

| Route                  | Screen                                                                                                 |
| ---------------------- | ------------------------------------------------------------------------------------------------------ |
| `#/`                   | Trip request form. Submits `POST /trips?background=true`, then opens the progress screen.              |
| `#/trips`              | Trip list from `GET /trips`, with a Ready, Planning or Failed status per trip.                         |
| `#/trips/:id`          | Itinerary as a board, times first, budget bar. A stop that pushes the total over budget is a red HOLD. |
| `#/trips/:id/progress` | The four agents (research, itinerary, budget, reviewer), polling `GET /trips/:id` every 1.5 seconds.   |

## Where things live

- `src/styles/tokens.css`: palette, type scale, spacing. Change the look here.
- `src/config.ts`: the product name and tagline. Also update `<title>` in `index.html` if you rename.
- `src/components/`: `Sign`, `Button`, `TextField`, `BudgetBar`, `LoadError`, `Shell`.
- `src/api/client.ts`: the `TripApi` interface and `createApiClient`, which picks the implementation. Screens import nothing else from the backend side.
- `src/api/http.ts`: the client for `apps/api`: maps `TripOut` to the `Trip` type, turns failures into messages, and polls for progress.
- `src/api/mock.ts`: canned data for `VITE_CLIENT=mock` and tests.

## Docker

```bash
docker build -t tripmate-web apps/web
docker run --rm -p 8080:80 -e API_UPSTREAM=http://host.docker.internal:8000 tripmate-web
```

The image builds with Node, then serves `dist/` with nginx: unknown paths fall back to `index.html`, `/assets/*` is cached for good, `/healthz` answers 200, and `/api/*` is forwarded to `API_UPSTREAM` (with the `/api` prefix removed). `API_UPSTREAM` is read when the container starts; it defaults to `http://api:8000`, the service name in the root `docker-compose.yml`. Pass `--build-arg VITE_API_URL=https://api.example.com` to call an API on another origin instead of the proxy.

Code here is formatted with prettier (configured at the repository root).
