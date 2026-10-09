import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMockClient } from "./api/client";
import { App } from "./App";
import { Sign } from "./components/Sign";
import { PRODUCT_NAME } from "./config";
import { parseRoute } from "./router";

describe("router", () => {
  it("maps hashes to routes", () => {
    expect(parseRoute("")).toEqual({ name: "new" });
    expect(parseRoute("#/trips")).toEqual({ name: "trips" });
    expect(parseRoute("#/trips/412")).toEqual({ name: "itinerary", id: 412 });
    expect(parseRoute("#/trips/412/progress")).toEqual({ name: "progress", id: 412 });
    expect(parseRoute("#/nope")).toEqual({ name: "missing" });
  });
});

describe("Sign", () => {
  it("puts the time first and announces the tone", () => {
    render(<Sign time="13:00" tone="decision" title="Dinner" detail="$60 over budget" />);
    expect(screen.getByText("13:00")).toBeInTheDocument();
    expect(screen.getByText(/needs your decision/i)).toBeInTheDocument();
  });
});

describe("app", () => {
  beforeEach(() => {
    window.location.hash = "";
  });

  it("uses the configured product name", () => {
    render(<App client={createMockClient()} />);
    expect(screen.getByRole("link", { name: PRODUCT_NAME })).toBeInTheDocument();
  });

  it("validates the trip request before calling the client", async () => {
    const client = createMockClient();
    const create = vi.spyOn(client, "createTrip");
    render(<App client={client} />);
    await userEvent.click(screen.getByRole("button", { name: /plan my trip/i }));
    expect(await screen.findByText(/at least 2 characters/i)).toBeInTheDocument();
    expect(create).not.toHaveBeenCalled();
  });

  it("creates a trip and moves to the progress view", async () => {
    render(<App client={createMockClient({ frameDelayMs: 1 })} />);
    await userEvent.type(screen.getByLabelText("Destination"), "Lisbon");
    await userEvent.click(screen.getByRole("button", { name: /plan my trip/i }));
    expect(await screen.findByRole("heading", { name: /the crew is on it/i })).toBeInTheDocument();
    expect(await screen.findByRole("link", { name: /see the itinerary/i })).toBeInTheDocument();
  });

  it("lists trips and opens an itinerary with times first", async () => {
    window.location.hash = "#/trips/412";
    render(<App client={createMockClient()} />);
    const day = await screen.findByRole("region", { name: /day 1/i });
    const first = within(day).getAllByRole("listitem")[0];
    expect(within(first).getByText("07:10")).toBeInTheDocument();
    expect(screen.getByText(/1 stop needs your decision/i)).toBeInTheDocument();
  });

  it("shows trips on the list screen", async () => {
    window.location.hash = "#/trips";
    render(<App client={createMockClient()} />);
    expect(await screen.findByText("Kyoto")).toBeInTheDocument();
  });
});

describe("progress", () => {
  it("shows an error for an unknown trip", async () => {
    window.location.hash = "#/trips/999/progress";
    render(<App client={createMockClient()} />);
    expect(await screen.findByRole("alert")).toHaveTextContent(/not found/i);
  });
});
