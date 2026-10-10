import { snapshotFor, waitingSnapshot } from "./agents";
import type { TripApi } from "./client";
import type {
  AgentId,
  AgentStatus,
  ItineraryDay,
  ProgressSnapshot,
  Stop,
  Trip,
  TripRequest,
} from "./types";

/** A trip as `apps/api` sends it (`TripOut`). */
interface WireTrip {
  id: number;
  destination: string;
  days: number;
  budget_usd: number;
  interests: string[];
  created_at: string;
  status: Trip["status"];
  error: string | null;
  plan: { itinerary?: unknown };
  progress: { id: AgentId; status: AgentStatus }[] | null;
  itinerary: {
    label: string;
    stops: {
      time: string;
      title: string;
      detail: string;
      kind: Stop["kind"];
      state: Stop["state"];
      cost_usd: number | null;
    }[];
  }[];
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function fromWire(wire: WireTrip): Trip {
  const itinerary: ItineraryDay[] = wire.itinerary.map((day, d) => ({
    label: day.label,
    stops: day.stops.map((s, i) => ({
      id: `${wire.id}-${d}-${i}`,
      time: s.time,
      title: s.title,
      detail: s.detail,
      kind: s.kind,
      state: s.state,
      costUsd: s.cost_usd ?? undefined,
    })),
  }));
  return {
    id: wire.id,
    destination: wire.destination,
    dayCount: wire.days,
    budgetUsd: wire.budget_usd,
    interests: wire.interests,
    status: wire.status,
    createdAt: wire.created_at,
    itinerary,
    error: wire.error ?? undefined,
    notes: typeof wire.plan?.itinerary === "string" ? wire.plan.itinerary : undefined,
    agents: Object.fromEntries((wire.progress ?? []).map((p) => [p.id, p.status])),
  };
}

function describeFailure(status: number, body: unknown): string {
  const detail = (body as { detail?: unknown } | null)?.detail;
  if (status === 404) return typeof detail === "string" ? `${detail}.` : "Not found.";
  if (status === 422 && Array.isArray(detail)) {
    const first = detail[0] as { loc?: unknown[]; msg?: string } | undefined;
    const field = first?.loc?.filter((p) => typeof p === "string" && p !== "body").join(" ");
    return `The request was rejected${field ? ` (${field})` : ""}: ${
      first?.msg ?? "invalid value"
    }.`;
  }
  if (status === 503)
    return "Planning is not set up on this server yet. Ask the operator to add a Groq key.";
  if (status === 502 || status === 504)
    return "The server could not be reached. Try again in a moment.";
  return `The server had a problem (${status}). Try again in a moment.`;
}

export interface HttpClientOptions {
  /** Where the API lives, such as "/api" or "https://api.example.com". */
  baseUrl: string;
  fetchImpl?: typeof fetch;
  /** Delay between polls while a trip is planning, in milliseconds. */
  pollMs?: number;
}

export function createHttpClient({
  baseUrl,
  fetchImpl = (...args) => fetch(...args),
  pollMs = 1500,
}: HttpClientOptions): TripApi {
  const root = baseUrl.replace(/\/+$/, "");

  async function request<T>(path: string, init?: RequestInit): Promise<T> {
    let response: Response;
    try {
      response = await fetchImpl(`${root}${path}`, {
        ...init,
        headers: { Accept: "application/json", ...init?.headers },
      });
    } catch {
      throw new ApiError("Could not reach the server. Check your connection and try again.");
    }
    let body: unknown = null;
    try {
      body = await response.json();
    } catch {
      // Not JSON, for example an HTML error page from a proxy.
    }
    if (!response.ok) throw new ApiError(describeFailure(response.status, body), response.status);
    return body as T;
  }

  const getTrip = async (id: number) => fromWire(await request<WireTrip>(`/trips/${id}`));

  return {
    async listTrips() {
      return (await request<WireTrip[]>("/trips?limit=100")).map(fromWire);
    },
    getTrip,
    async createTrip(trip: TripRequest) {
      const wire = await request<WireTrip>("/trips?background=true", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          destination: trip.destination,
          days: trip.days,
          budget_usd: trip.budgetUsd,
          interests: trip.interests,
        }),
      });
      return fromWire(wire);
    },
    watchProgress(id, onUpdate) {
      let stopped = false;
      let timer: ReturnType<typeof setTimeout> | undefined;
      let failures = 0;
      let last: ProgressSnapshot | undefined;
      const tick = async () => {
        try {
          const trip = await getTrip(id);
          if (stopped) return;
          failures = 0;
          last = snapshotFor(trip);
          onUpdate(last);
          if (trip.status !== "planning") return;
        } catch (e) {
          if (stopped) return;
          // Ride out a blip, such as the API restarting, before giving up.
          if (++failures >= 3) {
            onUpdate({
              ...(last ?? waitingSnapshot()),
              error: e instanceof Error ? e.message : "Lost contact with the server.",
              retryable: true,
            });
            return;
          }
        }
        timer = setTimeout(tick, pollMs);
      };
      void tick();
      return () => {
        stopped = true;
        clearTimeout(timer);
      };
    },
  };
}
