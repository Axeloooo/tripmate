import { useMemo } from "react";
import { createApiClient } from "./api/client";
import { Shell } from "./components/Shell";
import { LinkButton } from "./components/Button";
import { useRoute } from "./router";
import { Itinerary } from "./screens/Itinerary";
import { NewTrip } from "./screens/NewTrip";
import { Progress } from "./screens/Progress";
import { Trips } from "./screens/Trips";
import type { TripApi } from "./api/client";

export function App({ client }: { client?: TripApi }) {
  const api = useMemo(() => client ?? createApiClient(), [client]);
  const route = useRoute();

  const section = route.name === "new" ? "new" : route.name === "missing" ? null : "trips";

  return (
    <Shell section={section}>
      {route.name === "new" && <NewTrip api={api} />}
      {route.name === "trips" && <Trips api={api} />}
      {route.name === "itinerary" && <Itinerary api={api} id={route.id} />}
      {route.name === "progress" && <Progress api={api} id={route.id} />}
      {route.name === "missing" && (
        <>
          <h1>No sign for this page</h1>
          <LinkButton href="#/">Back to the start</LinkButton>
        </>
      )}
    </Shell>
  );
}
