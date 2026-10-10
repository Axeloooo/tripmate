import type { ReactElement } from "react";

export type PictogramName =
  | "flight"
  | "transit"
  | "food"
  | "stay"
  | "activity"
  | "research"
  | "itinerary"
  | "budget"
  | "reviewer"
  | "decision"
  | "trip";

const PATHS: Record<PictogramName, ReactElement> = {
  flight: (
    <path d="M12 2.5v6l9 5.5v2.5l-9-2.5v5l2.5 2V22L12 21l-2.5 1v-1.5l2.5-2v-5l-9 2.5V14l9-5.5v-6Z" />
  ),
  transit: (
    <>
      <rect x="4" y="3.5" width="16" height="14" rx="2" />
      <path d="M4 11h16M8 21v-3.5M16 21v-3.5" />
      <circle cx="8" cy="14.5" r=".6" />
      <circle cx="16" cy="14.5" r=".6" />
    </>
  ),
  food: <path d="M7 3v8M4 3v5a3 3 0 0 0 6 0V3M7 11v10M17 21V3c-2.5 1.5-3.5 4.5-3.5 8H17" />,
  stay: <path d="M3 19V5M3 15h18v4M21 15v-3a3 3 0 0 0-3-3h-7v6M6.5 11.5h.01" />,
  activity: (
    <path d="M3 8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4V8Zm11-2v12" />
  ),
  research: (
    <>
      <circle cx="10.5" cy="10.5" r="6" />
      <path d="m15 15 6 6" />
    </>
  ),
  itinerary: <path d="M4 6h16M4 12h16M4 18h10" />,
  budget: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M15 9.5c-.6-1-1.7-1.5-3-1.5-1.7 0-3 .9-3 2.2 0 3 6 1.5 6 4.3 0 1.3-1.3 2.2-3 2.2-1.3 0-2.4-.5-3-1.5M12 6v2M12 16v2" />
    </>
  ),
  reviewer: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m8 12.5 3 3 5-6" />
    </>
  ),
  decision: <path d="M9 9a3 3 0 1 1 4.5 2.6c-1 .6-1.5 1.2-1.5 2.4M12 18v.01" />,
  trip: (
    <>
      <path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21Z" />
      <circle cx="12" cy="9.5" r="2.5" />
    </>
  ),
};

/** Stroke-only 24px pictograms, drawn like the symbols on terminal signage. */
export function Pictogram({ name }: { name: PictogramName }) {
  return (
    <svg
      className="pictogram"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.25"
      strokeLinecap="square"
      strokeLinejoin="miter"
      aria-hidden="true"
    >
      {PATHS[name]}
    </svg>
  );
}

export function ArrowGlyph({ direction = "right" }: { direction?: "right" | "up" }) {
  return (
    <svg
      className={`arrow arrow--${direction}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="square"
      aria-hidden="true"
    >
      {direction === "right" ? (
        <path d="M4 12h15M13 6l6 6-6 6" />
      ) : (
        <path d="M12 20V5M6 11l6-6 6 6" />
      )}
    </svg>
  );
}
