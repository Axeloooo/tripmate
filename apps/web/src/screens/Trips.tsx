import type { TripApi } from "../api/client";
import { LinkButton } from "../components/Button";
import { ArrowGlyph } from "../components/Pictogram";
import { formatDate, formatUsd } from "../lib";
import { useAsync } from "../useAsync";

export function Trips({ api }: { api: TripApi }) {
  const trips = useAsync(() => api.listTrips(), [api]);

  return (
    <div className="stack">
      <header className="page__head">
        <h1>Your trips</h1>
        {trips.status === "ready" && trips.data.length > 0 && (
          <p className="page__meta">
            {trips.data.length} {trips.data.length === 1 ? "trip" : "trips"}
          </p>
        )}
      </header>
      {trips.status === "loading" && <p className="status">Loading your trips.</p>}
      {trips.status === "error" && (
        <p className="status status--error" role="alert">
          {trips.message}
        </p>
      )}
      {trips.status === "ready" &&
        (trips.data.length === 0 ? (
          <>
            <p className="page__lede">No trips yet. Tell the crew where you want to go.</p>
            <LinkButton href="#/">Plan a trip</LinkButton>
          </>
        ) : (
          <div className="board">
            <div className="board__head" aria-hidden="true">
              <span>Gate</span>
              <span>Destination</span>
              <span>Days</span>
              <span>Budget</span>
              <span>Status</span>
              <span>Created</span>
              <span />
            </div>
            <ul className="board__rows" aria-label="Trips">
              {trips.data.map((t) => {
                const ready = t.status === "ready";
                return (
                  <li key={t.id}>
                    <a
                      className="board__row"
                      href={ready ? `#/trips/${t.id}` : `#/trips/${t.id}/progress`}
                    >
                      <span className="gate">{t.id}</span>
                      <span className="board__dest">{t.destination}</span>
                      <span className="board__days">{t.dayCount} days</span>
                      <span className="board__budget">{formatUsd(t.budgetUsd)}</span>
                      <span className={`pill${ready ? "" : " pill--wait"}`}>
                        {ready ? "Ready" : "Crew is planning"}
                      </span>
                      <span className="board__date">{formatDate(t.createdAt)}</span>
                      <span className="board__go">
                        <ArrowGlyph />
                      </span>
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
    </div>
  );
}
