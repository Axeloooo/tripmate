import type { ProgressSnapshot, Trip, TripRequest } from "./types";
import { toTrip, toProgress, type TripOut } from "./map";

/** Everything the UI needs from the backend. Screens depend on this interface only. */
export interface TripApi {
  listTrips(): Promise<Trip[]>;
  getTrip(id: number): Promise<Trip>;
  createTrip(request: TripRequest): Promise<Trip>;
  /**
   * Calls `onUpdate` with each progress frame until planning ends. Calls `onError` if the server
   * stops answering. Returns a function that stops watching.
   */
  watchProgress(
    id: number,
    onUpdate: (snapshot: ProgressSnapshot) => void,
    onError?: (message: string) => void,
  ): () => void;
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

export interface HttpClientOptions {
  /** Base URL with no trailing slash. */
  baseUrl?: string;
  fetchImpl?: typeof fetch;
  /** Time between progress polls, in milliseconds. */
  pollMs?: number;
}

const OFFLINE = "Can't reach the Signposted server. Check your connection and try again.";
const MAX_POLL_FAILURES = 3;

/** Turns a failed response into a sentence a traveller can act on. */
async function describeFailure(response: Response): Promise<ApiError> {
  let detail: unknown;
  try {
    detail = ((await response.json()) as { detail?: unknown }).detail;
  } catch {
    detail = undefined;
  }
  const status = response.status;
  if (status === 404) return new ApiError("This trip was not found.", status);
  if (status === 422)
    return new ApiError("The trip request was not accepted. Check the form.", 422);
  if (status === 503)
    return new ApiError("Planning is switched off on this server. Try again later.", status);
  if (typeof detail === "string" && status < 500) return new ApiError(detail, status);
  return new ApiError("The server hit a problem. Try again in a moment.", status);
}

export function createHttpClient({
  baseUrl = "/api",
  fetchImpl,
  pollMs = 1500,
}: HttpClientOptions = {}): TripApi {
  const base = baseUrl.replace(/\/+$/, "");

  async function request<T>(path: string, init?: RequestInit): Promise<T> {
    let response: Response;
    try {
      response = await (fetchImpl ?? fetch)(`${base}${path}`, {
        ...init,
        headers: { Accept: "application/json", "Content-Type": "application/json" },
      });
    } catch {
      throw new ApiError(OFFLINE);
    }
    if (!response.ok) throw await describeFailure(response);
    return (await response.json()) as T;
  }

  const getTrip = async (id: number) => toTrip(await request<TripOut>(`/trips/${id}`));

  return {
    async listTrips() {
      return (await request<TripOut[]>("/trips")).map(toTrip);
    },
    getTrip,
    async createTrip(req) {
      const body = JSON.stringify({
        destination: req.destination,
        days: req.days,
        budget_usd: req.budgetUsd,
        interests: req.interests,
      });
      return toTrip(await request<TripOut>("/trips", { method: "POST", body }));
    },
    watchProgress(id, onUpdate, onError) {
      let stopped = false;
      let failures = 0;
      let timer: ReturnType<typeof setTimeout> | undefined;
      const tick = async () => {
        try {
          const trip = await getTrip(id);
          if (stopped) return;
          failures = 0;
          const snapshot = toProgress(trip);
          onUpdate(snapshot);
          if (snapshot.complete || snapshot.error) return;
        } catch (e) {
          if (stopped) return;
          if (e instanceof ApiError && e.status !== undefined && e.status < 500) {
            onError?.(e.message);
            return;
          }
          if (++failures >= MAX_POLL_FAILURES) {
            onError?.(e instanceof Error ? e.message : OFFLINE);
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

/** The one place that decides which implementation the app uses. */
export async function createApiClient(): Promise<TripApi> {
  if (import.meta.env.VITE_USE_MOCK === "true") {
    // Dynamic, and behind a build-time constant, so production bundles carry no sample data.
    return (await import("./mock")).createMockClient();
  }
  return createHttpClient({ baseUrl: import.meta.env.VITE_API_URL || "/api" });
}
