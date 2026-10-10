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
  status: TripStatus;
  createdAt: string;
  itinerary: ItineraryDay[];
  /** Set when the itinerary agent's reply could not be read as stops; shown as plain text. */
  itineraryText?: string;
  researchNotes?: string;
  budgetNotes?: string;
  review?: { approved: boolean; text: string; rounds: number };
  /** Which agents have finished and which is working now, while the plan is being made. */
  progress?: { completed: string[]; current: string | null };
  /** Why planning failed, when `status` is "failed". */
  error?: string;
}

export type TripStatus = "planning" | "ready" | "failed";

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
  /** Set when planning stopped without a plan. */
  error?: string;
}
