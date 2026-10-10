import type {
  AgentId,
  AgentProgress,
  ItineraryDay,
  ProgressSnapshot,
  Stop,
  StopKind,
  Trip,
  TripStatus,
} from "./types";

/** The JSON apps/api returns for a trip (see `TripOut` in apps/api/app/schemas.py). */
export interface TripOut {
  id: number;
  destination: string;
  days: number;
  budget_usd: number;
  interests: string[];
  created_at: string;
  plan: Plan;
}

interface PlanDay {
  label: string;
  stops: { time: string; title: string; detail: string; kind: StopKind; cost_usd: number | null }[];
}

interface Plan {
  /** Missing on trips saved before planning ran in the background. */
  status?: TripStatus;
  error?: string;
  progress?: { completed: string[]; current: string | null };
  research?: string;
  itinerary?: string;
  days?: PlanDay[] | null;
  budget?: string;
  review?: string;
  approved?: boolean;
  review_rounds?: number;
}

/**
 * The plan only says what each stop costs, so the board derives its states: the stop that takes
 * the running total past the budget is the one the traveller has to decide on.
 */
function toDays(days: NonNullable<Plan["days"]>, budgetUsd: number): ItineraryDay[] {
  let spent = 0;
  let flagged = false;
  return days.map((day, d) => ({
    label: day.label,
    stops: day.stops.map((s, n): Stop => {
      spent += s.cost_usd ?? 0;
      const over = !flagged && spent > budgetUsd;
      if (over) flagged = true;
      return {
        id: `${d}-${n}`,
        time: s.time,
        title: s.title,
        detail: s.detail,
        kind: s.kind,
        state: over ? "decision" : "next",
        costUsd: s.cost_usd ?? undefined,
      };
    }),
  }));
}

export function toTrip(out: TripOut): Trip {
  const { plan } = out;
  const status: TripStatus = plan.status ?? (plan.itinerary ? "ready" : "planning");
  const itinerary = plan.days ? toDays(plan.days, out.budget_usd) : [];
  return {
    id: out.id,
    destination: out.destination,
    dayCount: out.days,
    budgetUsd: out.budget_usd,
    interests: out.interests,
    status,
    createdAt: out.created_at,
    itinerary,
    itineraryText: status === "ready" && itinerary.length === 0 ? plan.itinerary : undefined,
    researchNotes: plan.research,
    budgetNotes: plan.budget,
    review:
      plan.review === undefined
        ? undefined
        : { approved: plan.approved ?? false, text: plan.review, rounds: plan.review_rounds ?? 1 },
    error: plan.error,
    progress: plan.progress,
  };
}

const AGENTS: { id: AgentId; node: string; name: string; note: string }[] = [
  {
    id: "research",
    node: "research_agent",
    name: "Research",
    note: "Finds flights, stays and places to eat",
  },
  {
    id: "itinerary",
    node: "itinerary_agent",
    name: "Itinerary",
    note: "Orders the days and sets the times",
  },
  {
    id: "budget",
    node: "budget_agent",
    name: "Budget",
    note: "Prices every stop against your limit",
  },
  {
    id: "reviewer",
    node: "reviewer_agent",
    name: "Reviewer",
    note: "Checks the plan and sends it back if it falls short",
  },
];

export function toProgress(trip: Trip): ProgressSnapshot {
  const done = new Set(trip.progress?.completed ?? []);
  const current = trip.progress?.current ?? null;
  const rounds = trip.progress?.completed.filter((n) => n === "reviewer_agent").length ?? 0;
  const agents = AGENTS.map((a): AgentProgress => {
    let status: AgentProgress["status"] = "waiting";
    let note = a.note;
    if (trip.status === "ready" || (done.has(a.node) && current !== a.node)) status = "done";
    if (trip.status !== "ready" && current === a.node) {
      status = "working";
      if (rounds > 0 && a.id === "itinerary") note = "Reworking the plan after the review";
    }
    if (trip.status === "failed" && current === a.node) status = "hold";
    return { id: a.id, name: a.name, note, status };
  });
  if (trip.status === "failed") {
    // A failure can land before any agent is marked current; hold the first one that is not done.
    if (!agents.some((a) => a.status === "hold")) {
      const stuck = agents.find((a) => a.status !== "done");
      if (stuck) stuck.status = "hold";
    }
  }
  return {
    agents,
    complete: trip.status === "ready",
    error: trip.status === "failed" ? trip.error ?? "Planning failed." : undefined,
  };
}
