import { useEffect, useState } from "react";
import type { TripApi } from "../api/client";
import type { AgentStatus, ProgressSnapshot } from "../api/types";
import { LinkButton } from "../components/Button";
import { useAsync } from "../useAsync";
import { Sign, SignStack, type SignTone } from "../components/Sign";

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
  hold: "Needs you",
};

export function Progress({ api, id }: { api: TripApi; id: number }) {
  const trip = useAsync(() => api.getTrip(id), [api, id]);
  const [snapshot, setSnapshot] = useState<ProgressSnapshot | null>(null);

  const found = trip.status === "ready";
  useEffect(() => (found ? api.watchProgress(id, setSnapshot) : undefined), [api, id, found]);

  if (trip.status === "error")
    return (
      <>
        <p className="status status--error" role="alert">
          {trip.message}
        </p>
        <LinkButton href="#/trips">Back to your trips</LinkButton>
      </>
    );

  const working = snapshot?.agents.find((a) => a.status === "working");

  return (
    <>
      <h1>{snapshot?.complete ? "Your plan is ready" : "The crew is on it"}</h1>
      <p className="page__lede">
        Four agents plan your trip in turn. The reviewer can send the plan back for another pass.
      </p>
      <p className="visually-hidden" role="status">
        {snapshot?.complete ? "Plan ready" : working ? `${working.name} agent working` : ""}
      </p>
      <div>
        {snapshot ? (
          <SignStack label="Crew progress">
            {snapshot.agents.map((a) => (
              <li key={a.id}>
                <Sign
                  tone={TONE[a.status]}
                  arrow={a.status === "done" ? "✓" : "→"}
                  title={a.name}
                  detail={a.note}
                  trailing={LABEL[a.status]}
                />
              </li>
            ))}
          </SignStack>
        ) : (
          <p className="status">Starting the crew.</p>
        )}
      </div>
      {snapshot?.complete && <LinkButton href={`#/trips/${id}`}>See the itinerary</LinkButton>}
    </>
  );
}
