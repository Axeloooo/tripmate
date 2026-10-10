# Signposted Web

Vite + React + TypeScript UI templates for TripMate, in the Signposted departures-board design: a black board, amber split-flap times, green for on time, red for a hold. Everything runs on mock data until the API is wired in.

## Run

```bash
cd apps/web
npm install
npm run dev      # http://localhost:5173
npm test         # Vitest + Testing Library
npm run build    # typecheck, then production build
```

## Screens

| Route                  | Screen                                                       |
| ---------------------- | ------------------------------------------------------------ |
| `#/`                   | Trip request form                                            |
| `#/trips`              | Trip list                                                    |
| `#/trips/:id`          | Itinerary as a board, times first, budget bar                |
| `#/trips/:id/progress` | Agents progress view (research, itinerary, budget, reviewer) |

## Where things live

- `src/styles/tokens.css`: palette, type scale, spacing. Change the look here.
- `src/config.ts`: the product name and tagline. Also update `<title>` in `index.html` if you rename.
- `src/components/`: `Sign`, `Button`, `TextField`, `BudgetBar`, `Shell`.
- `src/api/client.ts`: the `TripApi` interface and the mock client. Screens import nothing else from the backend side.

## Wiring to `apps/api`

Add a second `TripApi` implementation that calls `POST /trips`, `GET /trips` and `GET /trips/{id}` (see `apps/api/app/schemas.py`), map `TripOut` to the `Trip` type in `src/api/types.ts`, and return it from `createApiClient` when `VITE_API_URL` is set. The API has no progress stream yet, so `watchProgress` needs a polling or streaming endpoint.

Code here is formatted with prettier (configured at the repository root).
