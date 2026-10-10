import { useEffect, useState } from "react";
import type { TripApi } from "../api/client";
import type { AgentStatus, ProgressSnapshot } from "../api/types";
import { LinkButton } from "../components/Button";
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

  const found = trip.status === "ready";
  useEffect(() => (found ? api.watchProgress(id, setSnapshot) : undefined), [api, id, found]);

  if (trip.status === "error")
    return (
      <div className="stack">
        <h1>No row for this trip</h1>
        <p className="status status--error" role="alert">
          {trip.message}
        </p>
        <LinkButton href="#/trips">Back to your trips</LinkButton>
      </div>
    );

  const working = snapshot?.agents.find((a) => a.status === "working");

  return (
    <div className="stack">
      <header className="page__head">
        <h1>{snapshot?.complete ? "Your plan is ready" : "The crew is on it"}</h1>
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
    </div>
  );
}
