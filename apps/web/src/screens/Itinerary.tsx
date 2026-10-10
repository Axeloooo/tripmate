import type { TripApi } from "../api/client";
import type { Stop, StopState } from "../api/types";
import { BudgetBar } from "../components/BudgetBar";
import { LinkButton } from "../components/Button";
import { Sign, SignStack, type SignTone } from "../components/Sign";
import { formatUsd } from "../lib";
import { useAsync } from "../useAsync";

const TONE: Record<StopState, SignTone> = {
  done: "done",
  now: "now",
  next: "default",
  decision: "decision",
};

const CHECKED_BY: Record<Stop["kind"], string> = {
  flight: "Flights",
  transit: "Flights",
  food: "Food",
  stay: "Stays",
  activity: "Activities",
};

export function Itinerary({ api, id }: { api: TripApi; id: number }) {
  const trip = useAsync(() => api.getTrip(id), [api, id]);

  if (trip.status === "loading") return <p className="status">Loading your trip.</p>;
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

  const { data } = trip;
  const stops = data.itinerary.flatMap((d) => d.stops);
  const spent = stops.reduce((sum, s) => sum + (s.costUsd ?? 0), 0);
  const decisions = stops.filter((s) => s.state === "decision").length;

  return (
    <div className="stack">
      <header className="page__head">
        <h1>{data.destination}</h1>
        <p className="page__meta">
          {data.dayCount} days · {formatUsd(data.budgetUsd)} budget
          {data.interests.length > 0 && ` · ${data.interests.join(", ")}`}
        </p>
      </header>
      {data.itinerary.length === 0 ? (
        <>
          <p className="status">The crew is still planning this trip.</p>
          <LinkButton href={`#/trips/${data.id}/progress`}>Watch the crew</LinkButton>
        </>
      ) : (
        <>
          <BudgetBar spentUsd={spent} budgetUsd={data.budgetUsd} />
          {decisions > 0 && (
            <p className="notice">
              {decisions === 1 ? "1 stop needs" : `${decisions} stops need`} your decision. Look for
              the red HOLD.
            </p>
          )}
          {data.itinerary.map((day, i) => (
            <section key={i} aria-labelledby={`day-${i}`} className="day">
              <h2 className="day__label" id={`day-${i}`}>
                {day.label}
              </h2>
              <SignStack label={day.label} head>
                {day.stops.map((s, n) => (
                  <li key={s.id}>
                    <Sign
                      time={s.time}
                      tone={TONE[s.state]}
                      title={s.title}
                      detail={s.detail}
                      by={s.state === "decision" ? "Budget" : CHECKED_BY[s.kind]}
                      trailing={s.costUsd !== undefined ? formatUsd(s.costUsd) : undefined}
                      index={n + i * 5}
                    />
                  </li>
                ))}
              </SignStack>
            </section>
          ))}
        </>
      )}
    </div>
  );
}
