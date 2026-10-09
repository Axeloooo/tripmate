import type { TripApi } from "../api/client";
import { LinkButton } from "../components/Button";
import { Sign, SignStack } from "../components/Sign";
import { formatDate, formatUsd } from "../lib";
import { useAsync } from "../useAsync";

export function Trips({ api }: { api: TripApi }) {
  const trips = useAsync(() => api.listTrips(), [api]);

  return (
    <>
      <h1>Your trips</h1>
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
          <SignStack label="Trips">
            {trips.data.map((t) => (
              <li key={t.id}>
                <Sign
                  href={t.status === "ready" ? `#/trips/${t.id}` : `#/trips/${t.id}/progress`}
                  title={t.destination}
                  detail={`${t.dayCount} days · ${formatUsd(t.budgetUsd)} · ${
                    t.status === "ready" ? "Ready" : "Crew is planning"
                  }`}
                  trailing={formatDate(t.createdAt)}
                  tone={t.status === "ready" ? "default" : "wait"}
                />
              </li>
            ))}
          </SignStack>
        ))}
    </>
  );
}
