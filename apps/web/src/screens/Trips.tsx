import type { CSSProperties } from "react";
import type { TripApi } from "../api/client";
import { LinkButton } from "../components/Button";
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
          <div className="board board--trips">
            <div className="trow trow--head" aria-hidden="true">
              <span>Trip</span>
              <span>Destination</span>
              <span>Days</span>
              <span>Budget</span>
              <span>Created</span>
              <span>Status</span>
            </div>
            <ul className="board__rows" aria-label="Trips">
              {trips.data.map((t, n) => {
                const ready = t.status === "ready";
                return (
                  <li key={t.id}>
                    <a
                      className={`trow trow--link${ready ? "" : " trow--wait"}`}
                      href={ready ? `#/trips/${t.id}` : `#/trips/${t.id}/progress`}
                    >
                      <span className="flaps" aria-hidden="true">
                        {String(t.id)
                          .split("")
                          .map((ch, i) => (
                            <span
                              className="flap"
                              key={i}
                              style={{ "--flip": `${n * 90 + i * 40}ms` } as CSSProperties}
                            >
                              {ch}
                            </span>
                          ))}
                      </span>
                      <span className="trow__dest">
                        <span className="visually-hidden">Trip {t.id}. </span>
                        {t.destination}
                      </span>
                      <span className="trow__days">{t.dayCount} days</span>
                      <span className="trow__budget">{formatUsd(t.budgetUsd)}</span>
                      <span className="trow__date">{formatDate(t.createdAt)}</span>
                      <span className="trow__status">{ready ? "Ready" : "Planning"}</span>
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
