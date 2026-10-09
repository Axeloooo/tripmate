import { useEffect, useState } from "react";

export type Route =
  | { name: "new" }
  | { name: "trips" }
  | { name: "itinerary"; id: number }
  | { name: "progress"; id: number }
  | { name: "missing" };

export function parseRoute(hash: string): Route {
  const path = hash.replace(/^#\/?/, "").replace(/\/$/, "");
  if (path === "") return { name: "new" };
  if (path === "trips") return { name: "trips" };
  const match = /^trips\/(\d+)(\/progress)?$/.exec(path);
  if (match) {
    const id = Number(match[1]);
    return match[2] ? { name: "progress", id } : { name: "itinerary", id };
  }
  return { name: "missing" };
}

export function useRoute(): Route {
  const [route, setRoute] = useState(() => parseRoute(window.location.hash));
  useEffect(() => {
    const onChange = () => setRoute(parseRoute(window.location.hash));
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  return route;
}

export function navigate(path: string): void {
  window.location.hash = path;
}
