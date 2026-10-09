import type { AgentProgress, ProgressSnapshot, Trip } from "./types";

export const MOCK_TRIPS: Trip[] = [
  {
    id: 412,
    destination: "Barcelona",
    dayCount: 3,
    budgetUsd: 900,
    interests: ["food", "architecture"],
    status: "ready",
    createdAt: "2026-10-02T09:12:00Z",
    itinerary: [
      {
        label: "Day 1, arrival",
        stops: [
          {
            id: "s1",
            time: "07:10",
            title: "Flight VY8461 to Barcelona",
            detail: "Lisbon, gate 24 · seat 14A, bag included",
            kind: "flight",
            state: "done",
            costUsd: 148,
          },
          {
            id: "s2",
            time: "09:45",
            title: "Aerobus to Plaça Catalunya",
            detail: "Stop outside T1 · every 10 min · 35 min ride",
            kind: "transit",
            state: "done",
            costUsd: 7,
          },
          {
            id: "s3",
            time: "13:00",
            title: "Lunch at Bar Cañete",
            detail: "8 min walk · table held for 4",
            kind: "food",
            state: "now",
            costUsd: 96,
          },
          {
            id: "s4",
            time: "15:00",
            title: "Check in at Hotel Brummell",
            detail: "2 nights · paid",
            kind: "stay",
            state: "next",
            costUsd: 290,
          },
          {
            id: "s5",
            time: "20:30",
            title: "Dinner at Disfrutar",
            detail: "$60 over budget · your call",
            kind: "food",
            state: "decision",
            costUsd: 260,
          },
        ],
      },
      {
        label: "Day 2",
        stops: [
          {
            id: "s6",
            time: "10:00",
            title: "Sagrada Família",
            detail: "Timed entry · audio guide included",
            kind: "activity",
            state: "next",
            costUsd: 52,
          },
          {
            id: "s7",
            time: "14:00",
            title: "Lunch at La Boqueria",
            detail: "Counter seating · no booking needed",
            kind: "food",
            state: "next",
            costUsd: 40,
          },
        ],
      },
    ],
  },
  {
    id: 407,
    destination: "Kyoto",
    dayCount: 5,
    budgetUsd: 2400,
    interests: ["temples", "tea", "walking"],
    status: "ready",
    createdAt: "2026-09-21T16:40:00Z",
    itinerary: [
      {
        label: "Day 1",
        stops: [
          {
            id: "k1",
            time: "08:30",
            title: "Fushimi Inari, lower gates",
            detail: "Start early to beat the crowds · 40 min",
            kind: "activity",
            state: "next",
          },
        ],
      },
    ],
  },
  {
    id: 399,
    destination: "Oaxaca",
    dayCount: 4,
    budgetUsd: 1200,
    interests: ["markets", "mezcal"],
    status: "planning",
    createdAt: "2026-09-12T11:05:00Z",
    itinerary: [],
  },
];

const AGENTS: Omit<AgentProgress, "status">[] = [
  { id: "research", name: "Research", note: "Finds flights, stays and places to eat" },
  { id: "itinerary", name: "Itinerary", note: "Orders the days and sets the times" },
  { id: "budget", name: "Budget", note: "Prices every stop against your limit" },
  { id: "reviewer", name: "Reviewer", note: "Checks the plan and sends it back if it falls short" },
];

/** Progress frames, in order. The last frame is the finished plan. */
export function progressFrames(): ProgressSnapshot[] {
  const frame = (working: number, complete = false): ProgressSnapshot => ({
    complete,
    agents: AGENTS.map((a, i) => ({
      ...a,
      status: complete || i < working ? "done" : i === working ? "working" : "waiting",
    })),
  });
  return [frame(0), frame(1), frame(2), frame(3), frame(4, true)];
}
