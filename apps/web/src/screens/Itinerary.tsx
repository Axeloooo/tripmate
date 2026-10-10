import type { CSSProperties } from "react";
import type { TripApi } from "../api/client";
import type { StopState } from "../api/types";
import { BudgetBar } from "../components/BudgetBar";
import { LinkButton } from "../components/Button";
import { Sign, type SignTone } from "../components/Sign";
import { formatUsd } from "../lib";
import { useAsync } from "../useAsync";

const TONE: Record<StopState, SignTone> = {
  done: "done",
  now: "now",
  next: "default",
  decision: "decision",
};

export function Itinerary({ api, id }: { api: TripApi; id: number }) {
  const trip = useAsync(() => api.getTrip(id), [api, id]);

  if (trip.status === "loading") return <p className="status">Loading your trip.</p>;
  if (trip.status === "error")
    return (
      <div className="stack">
        <h1>No sign for this page</h1>
        <p className="status status--error" role="alert">
          {trip.message}
        </p>
        <LinkButton href="#/trips">Back to your trips</LinkButton>
      </div>
    );

  const { data } = trip;
  const stops = data.itinerary.flatMap((d) => d.stops);
  const spent = stops.reduce((sum, s) => sum + (s.costUsd ?? 0), 0);
  const decisions = stops.filter((s) => s.state === "decision").length;

  return (
    <div className="split">
      <header className="page__head">
        <h1>{data.destination}</h1>
        <p className="page__meta">
          {data.dayCount} days · {formatUsd(data.budgetUsd)} budget
          {data.interests.length > 0 && ` · ${data.interests.join(", ")}`}
        </p>
      </header>
      <div className="split__main stack">
        {data.itinerary.length === 0 ? (
          <>
            <p className="status">The crew is still planning this trip.</p>
            <LinkButton href={`#/trips/${data.id}/progress`}>Watch the crew</LinkButton>
          </>
        ) : (
          data.itinerary.map((day, i) => (
            <section key={i} aria-labelledby={`day-${i}`} className="day">
              <h2 className="day__label" id={`day-${i}`}>
                {day.label}
              </h2>
              <ul className="sign-stack route" aria-label={day.label}>
                {day.stops.map((s, n) => (
                  <li
                    key={s.id}
                    className={`route__stop route__stop--${s.state}`}
                    style={{ "--i": n } as CSSProperties}
                  >
                    <Sign
                      time={s.time}
                      icon={s.kind}
                      tone={TONE[s.state]}
                      title={s.title}
                      detail={s.detail}
                      trailing={s.costUsd !== undefined ? formatUsd(s.costUsd) : undefined}
                    />
                    {s.state === "now" && <span className="route__here">You are here</span>}
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}
      </div>
      {data.itinerary.length > 0 && (
        <aside className="split__aside" aria-label="Budget and decisions">
          <BudgetBar spentUsd={spent} budgetUsd={data.budgetUsd} />
          {decisions > 0 && (
            <Sign
              tone="decision"
              title={`${
                decisions === 1 ? "1 stop needs" : `${decisions} stops need`
              } your decision.`}
              detail="Look for the red edge."
            />
          )}
        </aside>
      )}
    </div>
  );
}
