import { MOCK_TRIPS, progressFrames } from "./mock";
import type { ProgressSnapshot, Trip, TripRequest } from "./types";

/**
 * Everything the UI needs from the backend. Screens depend on this interface only, so wiring
 * apps/api later means writing one more implementation and changing `createApiClient`.
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
  const trips = [...MOCK_TRIPS];
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
          if (trip) trip.status = "ready";
        } else {
          timer = setTimeout(step, frameDelayMs);
        }
      };
      timer = setTimeout(step, 0);
      return () => clearTimeout(timer);
    },
  };
}

/** The one place that decides which implementation the app uses. */
export function createApiClient(): TripApi {
  return createMockClient();
}
