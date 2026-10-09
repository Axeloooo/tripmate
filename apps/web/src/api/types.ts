export type StopKind = "flight" | "transit" | "food" | "stay" | "activity";

/** `decision` means the crew needs the traveller's call before the plan can settle. */
export type StopState = "done" | "now" | "next" | "decision";

export interface Stop {
  id: string;
  /** 24-hour "HH:MM" */
  time: string;
  title: string;
  detail: string;
  kind: StopKind;
  state: StopState;
  costUsd?: number;
}

export interface ItineraryDay {
  label: string;
  stops: Stop[];
}

export interface Trip {
  id: number;
  destination: string;
  dayCount: number;
  budgetUsd: number;
  interests: string[];
  status: "planning" | "ready";
  createdAt: string;
  itinerary: ItineraryDay[];
}

export interface TripRequest {
  destination: string;
  days: number;
  budgetUsd: number;
  interests: string[];
}

export type AgentId = "research" | "itinerary" | "budget" | "reviewer";
export type AgentStatus = "waiting" | "working" | "done" | "hold";

export interface AgentProgress {
  id: AgentId;
  name: string;
  /** What the agent is doing, or did, in the traveller's words. */
  note: string;
  status: AgentStatus;
}

export interface ProgressSnapshot {
  agents: AgentProgress[];
  complete: boolean;
}
