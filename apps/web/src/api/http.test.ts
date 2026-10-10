import { ApiError, createHttpClient } from "./client";
import { toProgress, toTrip, type TripOut } from "./map";

const STOP = { time: "09:00", title: "Walk", detail: "", kind: "activity" as const };

function out(plan: TripOut["plan"], budget = 500): TripOut {
  return {
    id: 7,
    destination: "Kyoto",
    days: 2,
    budget_usd: budget,
    interests: ["tea"],
    created_at: "2026-10-01T00:00:00Z",
    plan,
  };
}

function reply(body: unknown, status = 200) {
  return vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status }));
}

describe("toTrip", () => {
  it("flags the stop that takes spending past the budget as the decision", () => {
    const trip = toTrip(
      out({
        status: "ready",
        days: [
          {
            label: "Day 1",
            stops: [
              { ...STOP, cost_usd: 300 },
              { ...STOP, cost_usd: 250 },
              { ...STOP, cost_usd: 100 },
            ],
          },
        ],
      }),
    );
    expect(trip.itinerary[0].stops.map((s) => s.state)).toEqual(["next", "decision", "next"]);
    expect(trip.itinerary[0].stops[1].costUsd).toBe(250);
  });

  it("keeps the raw itinerary when the agent's reply was not structured", () => {
    const trip = toTrip(out({ status: "ready", itinerary: "Day 1: Alfama", days: null }));
    expect(trip.itinerary).toEqual([]);
    expect(trip.itineraryText).toBe("Day 1: Alfama");
  });
});

describe("toProgress", () => {
  const planning = (completed: string[], current: string | null) =>
    toTrip(out({ status: "planning", progress: { completed, current } }));

  it("marks finished agents done and the current one working", () => {
    const { agents, complete } = toProgress(planning(["research_agent"], "itinerary_agent"));
    expect(agents.map((a) => a.status)).toEqual(["done", "working", "waiting", "waiting"]);
    expect(complete).toBe(false);
  });

  it("shows the itinerary agent reworking after a review", () => {
    const snapshot = toProgress(
      planning(
        ["research_agent", "itinerary_agent", "budget_agent", "reviewer_agent"],
        "itinerary_agent",
      ),
    );
    expect(snapshot.agents[1]).toMatchObject({ status: "working" });
    expect(snapshot.agents[1].note).toMatch(/after the review/i);
  });

  it("holds the working agent and reports why when planning failed", () => {
    const trip = toTrip(
      out({
        status: "failed",
        error: "Planning service unavailable",
        progress: { completed: ["research_agent"], current: "itinerary_agent" },
      }),
    );
    const snapshot = toProgress(trip);
    expect(snapshot.agents[1].status).toBe("hold");
    expect(snapshot.error).toBe("Planning service unavailable");
  });
});

describe("http client", () => {
  it("posts snake_case fields to the base url and maps the trip", async () => {
    const fetchImpl = reply(out({ status: "planning" }), 202);
    const api = createHttpClient({ baseUrl: "https://api.example/", fetchImpl });
    const trip = await api.createTrip({
      destination: "Kyoto",
      days: 2,
      budgetUsd: 500,
      interests: ["tea"],
    });
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe("https://api.example/trips");
    expect(JSON.parse(init.body)).toEqual({
      destination: "Kyoto",
      days: 2,
      budget_usd: 500,
      interests: ["tea"],
    });
    expect(trip).toMatchObject({ id: 7, status: "planning", dayCount: 2 });
  });

  it.each([
    [404, /not found/i],
    [503, /switched off/i],
    [500, /server hit a problem/i],
  ])("explains a %i response in plain words", async (status, message) => {
    const api = createHttpClient({ fetchImpl: reply({ detail: "x" }, status) });
    await expect(api.getTrip(1)).rejects.toThrow(message);
  });

  it("says so when the server cannot be reached", async () => {
    const api = createHttpClient({ fetchImpl: vi.fn().mockRejectedValue(new TypeError("fetch")) });
    await expect(api.listTrips()).rejects.toThrow(/can't reach/i);
  });

  it("polls until the plan is ready, then stops", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify(
            out({ status: "planning", progress: { completed: [], current: "research_agent" } }),
          ),
        ),
      )
      .mockResolvedValue(new Response(JSON.stringify(out({ status: "ready", days: null }))));
    const api = createHttpClient({ fetchImpl, pollMs: 1 });
    const frames: boolean[] = [];
    await new Promise<void>((resolve) => {
      api.watchProgress(7, (s) => {
        frames.push(s.complete);
        if (s.complete) resolve();
      });
    });
    expect(frames).toEqual([false, true]);
    await new Promise((r) => setTimeout(r, 10));
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("reports an error after repeated failures", async () => {
    const api = createHttpClient({
      fetchImpl: vi.fn().mockRejectedValue(new TypeError("fetch")),
      pollMs: 1,
    });
    const message = await new Promise<string>((resolve) => {
      api.watchProgress(7, () => undefined, resolve);
    });
    expect(message).toMatch(/can't reach/i);
  });

  it("is an ApiError carrying the status", async () => {
    const api = createHttpClient({ fetchImpl: reply({}, 404) });
    await expect(api.getTrip(1)).rejects.toBeInstanceOf(ApiError);
  });
});
