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

export type TripStatus = "planning" | "ready" | "failed";

export interface Trip {
  id: number;
  destination: string;
  dayCount: number;
  budgetUsd: number;
  interests: string[];
  status: TripStatus;
  createdAt: string;
  itinerary: ItineraryDay[];
  /** Why planning failed. Set when `status` is "failed". */
  error?: string;
  /** The itinerary as the agent wrote it. Shown when it could not be laid out as a board. */
  notes?: string;
  /** Where each agent is, while the trip is planning. */
  agents?: Partial<Record<AgentId, AgentStatus>>;
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
  /** Set when planning failed or the trip could not be fetched. */
  error?: string;
  /** True when trying again can help, such as a lost connection. False when planning failed. */
  retryable?: boolean;
}
