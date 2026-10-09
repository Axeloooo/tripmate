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

const ARROW: Record<Stop["kind"], string> = {
  flight: "↑",
  transit: "→",
  food: "→",
  stay: "↗",
  activity: "→",
};

export function Itinerary({ api, id }: { api: TripApi; id: number }) {
  const trip = useAsync(() => api.getTrip(id), [api, id]);

  if (trip.status === "loading") return <p className="status">Loading your trip.</p>;
  if (trip.status === "error")
    return (
      <>
        <p className="status status--error" role="alert">
          {trip.message}
        </p>
        <LinkButton href="#/trips">Back to your trips</LinkButton>
      </>
    );

  const { data } = trip;
  const spent = data.itinerary
    .flatMap((d) => d.stops)
    .reduce((sum, s) => sum + (s.costUsd ?? 0), 0);
  const decisions = data.itinerary
    .flatMap((d) => d.stops)
    .filter((s) => s.state === "decision").length;

  return (
    <>
      <h1>{data.destination}</h1>
      <p className="page__lede">
        {data.dayCount} days · {formatUsd(data.budgetUsd)} budget
        {data.interests.length > 0 && ` · ${data.interests.join(", ")}`}
      </p>
      {data.itinerary.length === 0 ? (
        <>
          <p className="status">The crew is still planning this trip.</p>
          <LinkButton href={`#/trips/${data.id}/progress`}>Watch the crew</LinkButton>
        </>
      ) : (
        <>
          <BudgetBar spentUsd={spent} budgetUsd={data.budgetUsd} />
          {decisions > 0 && (
            <p className="status">
              {decisions === 1 ? "1 stop needs" : `${decisions} stops need`} your decision. Look for
              the red edge.
            </p>
          )}
          {data.itinerary.map((day, i) => (
            <section key={i} aria-labelledby={`day-${i}`}>
              <h2 className="day-label" id={`day-${i}`}>
                {day.label}
              </h2>
              <SignStack label={day.label}>
                {day.stops.map((s) => (
                  <li key={s.id}>
                    <Sign
                      time={s.time}
                      arrow={ARROW[s.kind]}
                      tone={TONE[s.state]}
                      title={s.title}
                      detail={s.detail}
                      trailing={s.costUsd !== undefined ? formatUsd(s.costUsd) : undefined}
                    />
                  </li>
                ))}
              </SignStack>
            </section>
          ))}
        </>
      )}
    </>
  );
}
