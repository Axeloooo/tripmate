import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMockClient, type TripApi } from "./api/client";
import { MOCK_TRIPS } from "./api/mock";
import type { Trip } from "./api/types";
import { App } from "./App";

function clientWith(overrides: Partial<TripApi>): TripApi {
  return { ...createMockClient(), ...overrides };
}

const ready = MOCK_TRIPS[0];

describe("screen states", () => {
  it("shows an empty state with a way to plan a trip", async () => {
    window.location.hash = "#/trips";
    render(<App client={clientWith({ listTrips: async () => [] })} />);
    expect(await screen.findByText(/no trips yet/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /plan a trip/i })).toHaveAttribute("href", "#/");
  });

  it("shows a loading state, then an error that can be retried", async () => {
    window.location.hash = "#/trips";
    const listTrips = vi
      .fn<TripApi["listTrips"]>()
      .mockRejectedValueOnce(new Error("Could not reach the server."))
      .mockResolvedValueOnce([ready]);
    render(<App client={clientWith({ listTrips })} />);
    expect(screen.getByText(/loading your trips/i)).toBeInTheDocument();
    expect(await screen.findByRole("alert")).toHaveTextContent(/could not reach the server/i);
    await userEvent.click(screen.getByRole("button", { name: /try again/i }));
    expect(await screen.findByText("Barcelona")).toBeInTheDocument();
  });

  it("labels failed trips and sends them to the progress screen", async () => {
    window.location.hash = "#/trips";
    const failed: Trip = {
      ...ready,
      id: 9,
      status: "failed",
      error: "Planning service unavailable",
    };
    render(<App client={clientWith({ listTrips: async () => [failed] })} />);
    const row = await screen.findByRole("link", { name: /trip 9/i });
    expect(row).toHaveAttribute("href", "#/trips/9/progress");
    expect(row).toHaveTextContent("Failed");
  });

  it("explains an itinerary that is still planning", async () => {
    window.location.hash = "#/trips/9";
    const planning: Trip = { ...ready, id: 9, status: "planning", itinerary: [] };
    render(<App client={clientWith({ getTrip: async () => planning })} />);
    expect(await screen.findByText(/still planning/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /watch the crew/i })).toBeInTheDocument();
  });

  it("shows why planning failed on the itinerary and progress screens", async () => {
    const failed: Trip = {
      ...ready,
      id: 9,
      status: "failed",
      error: "Planning service unavailable",
      itinerary: [],
    };
    const api = clientWith({
      getTrip: async () => failed,
      watchProgress: (_id, onUpdate) => {
        onUpdate({
          complete: false,
          error: "Planning service unavailable",
          retryable: false,
          agents: [],
        });
        return () => {};
      },
    });
    window.location.hash = "#/trips/9";
    const { unmount } = render(<App client={api} />);
    expect(await screen.findByRole("alert")).toHaveTextContent(/planning service unavailable/i);
    unmount();

    window.location.hash = "#/trips/9/progress";
    render(<App client={api} />);
    expect(await screen.findByRole("heading", { name: /hit a problem/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /plan another trip/i })).toBeInTheDocument();
  });

  it("falls back to the agent's text when it cannot be laid out", async () => {
    window.location.hash = "#/trips/9";
    const unparsed: Trip = { ...ready, id: 9, itinerary: [], notes: "Wander around the old town." };
    render(<App client={clientWith({ getTrip: async () => unparsed })} />);
    expect(await screen.findByText(/wander around the old town/i)).toBeInTheDocument();
  });

  it("shows a lost connection on the progress screen and retries", async () => {
    window.location.hash = "#/trips/9/progress";
    const planning: Trip = { ...ready, id: 9, status: "planning", itinerary: [] };
    const watchProgress = vi
      .fn<TripApi["watchProgress"]>()
      .mockImplementationOnce((_id, onUpdate) => {
        onUpdate({
          complete: false,
          error: "Could not reach the server.",
          retryable: true,
          agents: [],
        });
        return () => {};
      })
      .mockImplementation((_id, onUpdate) => {
        onUpdate({ complete: true, agents: [] });
        return () => {};
      });
    render(<App client={clientWith({ getTrip: async () => planning, watchProgress })} />);
    expect(await screen.findByRole("alert")).toHaveTextContent(/could not reach/i);
    await userEvent.click(screen.getByRole("button", { name: /try again/i }));
    expect(await screen.findByRole("heading", { name: /plan is ready/i })).toBeInTheDocument();
  });

  it("shows an error when creating a trip fails", async () => {
    window.location.hash = "#/";
    const createTrip = vi
      .fn()
      .mockRejectedValue(new Error("Planning is not set up on this server yet."));
    render(<App client={clientWith({ createTrip })} />);
    await userEvent.type(screen.getByLabelText("Destination"), "Lisbon");
    await userEvent.click(screen.getByRole("button", { name: /plan my trip/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/not set up/i);
    expect(screen.getByRole("button", { name: /plan my trip/i })).toBeEnabled();
  });
});
