import type { AgentProgress, ProgressSnapshot, Trip } from "./types";

/** The four agents in the order they run, with what each does in the traveller's words. */
export const AGENTS: Omit<AgentProgress, "status">[] = [
  { id: "research", name: "Research", note: "Finds flights, stays and places to eat" },
  { id: "itinerary", name: "Itinerary", note: "Orders the days and sets the times" },
  { id: "budget", name: "Budget", note: "Prices every stop against your limit" },
  { id: "reviewer", name: "Reviewer", note: "Checks the plan and sends it back if it falls short" },
];

/** What the progress screen shows for a trip, from its status and per-agent state. */
export function snapshotFor(trip: Trip): ProgressSnapshot {
  const ready = trip.status === "ready";
  return {
    complete: ready,
    error: trip.status === "failed" ? trip.error ?? "Planning failed." : undefined,
    retryable: false,
    agents: AGENTS.map((a) => ({
      ...a,
      status: ready ? "done" : trip.agents?.[a.id] ?? "waiting",
    })),
  };
}

/** Every agent waiting: what the progress screen shows before the first answer arrives. */
export function waitingSnapshot(): ProgressSnapshot {
  return { complete: false, agents: AGENTS.map((a) => ({ ...a, status: "waiting" })) };
}
