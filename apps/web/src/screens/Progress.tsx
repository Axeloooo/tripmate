import { useEffect, useState } from "react";
import type { TripApi } from "../api/client";
import type { AgentStatus, ProgressSnapshot } from "../api/types";
import { Button, LinkButton } from "../components/Button";
import { Sign, SignStack, type SignTone } from "../components/Sign";
import { useAsync } from "../useAsync";

const TONE: Record<AgentStatus, SignTone> = {
  waiting: "wait",
  working: "now",
  done: "done",
  hold: "decision",
};

const LABEL: Record<AgentStatus, string> = {
  waiting: "Waiting",
  working: "Working",
  done: "Done",
  hold: "Hold",
};

export function Progress({ api, id }: { api: TripApi; id: number }) {
  const trip = useAsync(() => api.getTrip(id), [api, id]);
  const [snapshot, setSnapshot] = useState<ProgressSnapshot | null>(null);

  const [watchError, setWatchError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  const found = trip.status === "ready";
  useEffect(() => {
    if (!found) return undefined;
    setWatchError(null);
    return api.watchProgress(id, setSnapshot, setWatchError);
  }, [api, id, found, attempt]);

  if (trip.status === "error")
    return (
      <div className="stack">
        <h1>No row for this trip</h1>
        <p className="status status--error" role="alert">
          {trip.message}
        </p>
        <div className="actions">
          <Button onClick={trip.reload}>Try again</Button>
          <LinkButton href="#/trips">Back to your trips</LinkButton>
        </div>
      </div>
    );

  const working = snapshot?.agents.find((a) => a.status === "working");

  return (
    <div className="stack">
      <header className="page__head">
        <h1>
          {snapshot?.complete
            ? "Your plan is ready"
            : snapshot?.error
              ? "The crew hit a hold"
              : "The crew is on it"}
        </h1>
        {found && (
          <p className="page__meta">
            Plan {trip.data.id} · {trip.data.destination}
          </p>
        )}
      </header>
      <p className="page__lede">
        Four agents plan your trip in turn. The reviewer can send the plan back for another pass.
      </p>
      <p className="visually-hidden" role="status">
        {snapshot?.complete ? "Plan ready" : working ? `${working.name} agent working` : ""}
      </p>
      {snapshot?.error && (
        <p className="status status--error" role="alert">
          {snapshot.error}
        </p>
      )}
      {watchError && (
        <>
          <p className="status status--error" role="alert">
            {watchError}
          </p>
          <div className="actions">
            <Button onClick={() => setAttempt((n) => n + 1)}>Try again</Button>
          </div>
        </>
      )}
      <div>
        {snapshot ? (
          <SignStack label="Crew progress" head={["Step", "Agent", "", "", "Status"]}>
            {snapshot.agents.map((a, i) => (
              <li key={a.id}>
                <Sign
                  gate={String(i + 1)}
                  tone={TONE[a.status]}
                  title={a.name}
                  detail={a.note}
                  status={LABEL[a.status]}
                  index={i}
                />
              </li>
            ))}
          </SignStack>
        ) : (
          <p className="status">Starting the crew.</p>
        )}
      </div>
      {snapshot?.complete && <LinkButton href={`#/trips/${id}`}>See the itinerary</LinkButton>}
      {snapshot?.error && <LinkButton href="#/">Plan it again</LinkButton>}
    </div>
  );
}
