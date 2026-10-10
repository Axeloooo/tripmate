import { createApiClient } from "./client";
import { createHttpClient } from "./http";
import type { ProgressSnapshot } from "./types";

const wireTrip = {
  id: 7,
  destination: "Lisbon",
  days: 3,
  budget_usd: 900,
  interests: ["food"],
  created_at: "2026-10-02T09:12:00Z",
  status: "ready",
  error: null,
  plan: { itinerary: "Day 1: Arrival" },
  progress: [
    { id: "research", status: "done" },
    { id: "itinerary", status: "done" },
    { id: "budget", status: "done" },
    { id: "reviewer", status: "done" },
  ],
  itinerary: [
    {
      label: "Day 1, Arrival",
      stops: [
        {
          time: "09:00",
          title: "Old town walk",
          detail: "Free tour",
          kind: "activity",
          state: "decision",
          cost_usd: 30,
        },
        { time: "13:00", title: "Lunch", detail: "", kind: "food", state: "next", cost_usd: null },
      ],
    },
  ],
};

function respond(status: number, body: unknown) {
  return new Response(typeof body === "string" ? body : JSON.stringify(body), { status });
}

function clientWith(fetchImpl: typeof fetch, pollMs = 1) {
  return createHttpClient({ baseUrl: "/api/", fetchImpl, pollMs });
}

describe("http client", () => {
  it("maps the API's trip to the UI's trip", async () => {
    const fetchImpl = vi.fn(async () => respond(200, wireTrip));
    const trip = await clientWith(fetchImpl).getTrip(7);

    expect(fetchImpl).toHaveBeenCalledWith("/api/trips/7", expect.anything());
    expect(trip).toMatchObject({ id: 7, dayCount: 3, budgetUsd: 900, status: "ready" });
    expect(trip.itinerary[0].stops[0]).toMatchObject({
      id: "7-0-0",
      costUsd: 30,
      state: "decision",
    });
    expect(trip.itinerary[0].stops[1].costUsd).toBeUndefined();
    expect(trip.notes).toBe("Day 1: Arrival");
  });

  it("lists trips", async () => {
    const fetchImpl = vi.fn(async () => respond(200, [wireTrip]));
    const trips = await clientWith(fetchImpl).listTrips();

    expect(trips.map((t) => t.destination)).toEqual(["Lisbon"]);
    expect(fetchImpl).toHaveBeenCalledWith("/api/trips?limit=100", expect.anything());
  });

  it("creates a trip in the background with snake_case fields", async () => {
    const fetchImpl = vi.fn(async () => respond(202, { ...wireTrip, status: "planning" }));
    const trip = await clientWith(fetchImpl).createTrip({
      destination: "Lisbon",
      days: 3,
      budgetUsd: 900,
      interests: ["food"],
    });

    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/api/trips?background=true");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({
      destination: "Lisbon",
      days: 3,
      budget_usd: 900,
      interests: ["food"],
    });
    expect(trip.status).toBe("planning");
  });

  it.each([
    [404, { detail: "Trip not found" }, /trip not found/i],
    [503, { detail: "GROQ_API_KEY is not set" }, /not set up/i],
    [502, "<html>Bad gateway</html>", /could not be reached/i],
    [500, { detail: "boom" }, /problem \(500\)/i],
    [422, { detail: [{ loc: ["body", "days"], msg: "too big" }] }, /days.*too big/i],
  ])("explains a %i response", async (status, body, message) => {
    const fetchImpl = vi.fn(async () => respond(status, body));
    await expect(clientWith(fetchImpl).getTrip(1)).rejects.toThrow(message);
  });

  it("explains a network failure", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new TypeError("Failed to fetch");
    });
    await expect(clientWith(fetchImpl).listTrips()).rejects.toThrow(/could not reach the server/i);
  });

  it("polls until the trip is ready", async () => {
    const replies = [
      { ...wireTrip, status: "planning", progress: [{ id: "research", status: "working" }] },
      wireTrip,
    ];
    const fetchImpl = vi.fn(async () => respond(200, replies.shift() ?? wireTrip));
    const seen: ProgressSnapshot[] = [];
    await new Promise<void>((resolve) => {
      clientWith(fetchImpl).watchProgress(7, (s) => {
        seen.push(s);
        if (s.complete) resolve();
      });
    });

    expect(seen[0].agents.map((a) => a.status)).toEqual([
      "working",
      "waiting",
      "waiting",
      "waiting",
    ]);
    expect(seen[1].complete).toBe(true);
  });

  it("reports a failed trip without retrying", async () => {
    const fetchImpl = vi.fn(async () =>
      respond(200, { ...wireTrip, status: "failed", error: "Planning service unavailable" }),
    );
    const seen: ProgressSnapshot[] = [];
    clientWith(fetchImpl).watchProgress(7, (s) => seen.push(s));
    await vi.waitFor(() => expect(seen).toHaveLength(1));

    expect(seen[0]).toMatchObject({ error: "Planning service unavailable", retryable: false });
    await new Promise((r) => setTimeout(r, 20));
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("gives up after repeated connection failures and offers a retry", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new TypeError("offline");
    });
    const seen: ProgressSnapshot[] = [];
    clientWith(fetchImpl).watchProgress(7, (s) => seen.push(s));
    await vi.waitFor(() => expect(seen).toHaveLength(1));

    expect(fetchImpl).toHaveBeenCalledTimes(3);
    expect(seen[0]).toMatchObject({ retryable: true });
    expect(seen[0].error).toMatch(/could not reach/i);
  });

  it("stops polling when the watcher is cancelled", async () => {
    const fetchImpl = vi.fn(async () => respond(200, { ...wireTrip, status: "planning" }));
    const stop = clientWith(fetchImpl).watchProgress(7, () => {});
    await vi.waitFor(() => expect(fetchImpl).toHaveBeenCalled());
    stop();
    const calls = fetchImpl.mock.calls.length;
    await new Promise((r) => setTimeout(r, 20));
    expect(fetchImpl.mock.calls.length).toBeLessThanOrEqual(calls + 1);
  });
});

describe("createApiClient", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("uses the real API at /api by default", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(respond(200, []));
    await createApiClient().listTrips();
    expect(fetchSpy).toHaveBeenCalledWith("/api/trips?limit=100", expect.anything());
  });

  it("honours VITE_API_URL", async () => {
    vi.stubEnv("VITE_API_URL", "https://api.example.com");
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(respond(200, []));
    await createApiClient().listTrips();
    expect(fetchSpy).toHaveBeenCalledWith(
      "https://api.example.com/trips?limit=100",
      expect.anything(),
    );
  });

  it("uses mock data only when VITE_CLIENT=mock", async () => {
    vi.stubEnv("VITE_CLIENT", "mock");
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const trips = await createApiClient().listTrips();
    expect(trips.length).toBeGreaterThan(0);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
