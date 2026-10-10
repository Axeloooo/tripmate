import { createHttpClient } from "./http";
import { MOCK_TRIPS, progressFrames } from "./mock";
import type { ProgressSnapshot, Trip, TripRequest } from "./types";

/** Same-origin path that nginx (or the Vite dev proxy) forwards to apps/api. */
export const DEFAULT_API_URL = "/api";

/**
 * Everything the UI needs from the backend. Screens depend on this interface only. `http.ts`
 * implements it against apps/api and `createMockClient` implements it on canned data.
 */
export interface TripApi {
  listTrips(): Promise<Trip[]>;
  getTrip(id: number): Promise<Trip>;
  createTrip(request: TripRequest): Promise<Trip>;
  /** Calls `onUpdate` with each progress frame. Returns a function that stops watching. */
  watchProgress(id: number, onUpdate: (snapshot: ProgressSnapshot) => void): () => void;
}

export interface MockClientOptions {
  /** Delay between progress frames, in milliseconds. */
  frameDelayMs?: number;
}

export function createMockClient({ frameDelayMs = 1100 }: MockClientOptions = {}): TripApi {
  const trips = MOCK_TRIPS.map((t) => ({ ...t }));
  let nextId = Math.max(...trips.map((t) => t.id)) + 1;

  return {
    async listTrips() {
      return [...trips].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },
    async getTrip(id) {
      const trip = trips.find((t) => t.id === id);
      if (!trip) throw new Error(`Trip ${id} was not found.`);
      return trip;
    },
    async createTrip(request) {
      // The mock reuses the Barcelona itinerary so a new request has something to show.
      const sample = MOCK_TRIPS[0];
      const trip: Trip = {
        ...sample,
        id: nextId++,
        destination: request.destination,
        dayCount: request.days,
        budgetUsd: request.budgetUsd,
        interests: request.interests,
        status: "planning",
        createdAt: new Date().toISOString(),
      };
      trips.push(trip);
      return trip;
    },
    watchProgress(id, onUpdate) {
      const frames = progressFrames();
      let i = 0;
      let timer: ReturnType<typeof setTimeout> | undefined;
      const step = () => {
        const snapshot = frames[i++];
        onUpdate(snapshot);
        if (snapshot.complete) {
          const trip = trips.find((t) => t.id === id);
          if (trip) {
            trip.status = "ready";
            if (trip.itinerary.length === 0) trip.itinerary = MOCK_TRIPS[0].itinerary;
          }
        } else {
          timer = setTimeout(step, frameDelayMs);
        }
      };
      timer = setTimeout(step, 0);
      return () => clearTimeout(timer);
    },
  };
}

/**
 * The one place that decides which implementation the app uses. The real API is the default.
 * The mock client is for development and tests only: set `VITE_CLIENT=mock` to use it.
 */
export function createApiClient(): TripApi {
  // Read straight off import.meta.env so a production build drops the mock client and its data.
  if (import.meta.env.VITE_CLIENT === "mock") return createMockClient();
  return createHttpClient({ baseUrl: import.meta.env.VITE_API_URL || DEFAULT_API_URL });
}
