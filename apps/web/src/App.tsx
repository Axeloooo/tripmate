import { useEffect } from "react";
import { PRODUCT_NAME } from "./config";
import { Shell } from "./components/Shell";
import { LinkButton } from "./components/Button";
import { useRoute } from "./router";
import { Itinerary } from "./screens/Itinerary";
import { NewTrip } from "./screens/NewTrip";
import { Progress } from "./screens/Progress";
import { Trips } from "./screens/Trips";
import type { TripApi } from "./api/client";

export function App({ client: api }: { client: TripApi }) {
  const route = useRoute();

  useEffect(() => {
    const names: Record<string, string> = {
      new: "New trip",
      trips: "Your trips",
      itinerary: "Itinerary",
      progress: "Crew progress",
      missing: "Page not found",
    };
    document.title = `${names[route.name]} · ${PRODUCT_NAME}`;
    const h1 = document.querySelector<HTMLElement>("main h1");
    h1?.setAttribute("tabindex", "-1");
    h1?.focus();
  }, [route]);

  const section = route.name === "new" ? "new" : route.name === "missing" ? null : "trips";

  return (
    <Shell section={section}>
      {route.name === "new" && <NewTrip api={api} />}
      {route.name === "trips" && <Trips api={api} />}
      {route.name === "itinerary" && <Itinerary key={route.id} api={api} id={route.id} />}
      {route.name === "progress" && <Progress key={route.id} api={api} id={route.id} />}
      {route.name === "missing" && (
        <>
          <h1>No sign for this page</h1>
          <LinkButton href="#/">Back to the start</LinkButton>
        </>
      )}
    </Shell>
  );
}
