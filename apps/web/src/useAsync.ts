import { useCallback, useEffect, useState } from "react";

export type AsyncState<T> = (
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: T }
) & {
  /** Loads again, showing the loading state. */
  reload: () => void;
};

export function useAsync<T>(load: () => Promise<T>, deps: unknown[]): AsyncState<T> {
  const [state, setState] = useState<
    { status: "loading" } | { status: "error"; message: string } | { status: "ready"; data: T }
  >({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  const reload = useCallback(() => setAttempt((n) => n + 1), []);
  useEffect(() => {
    let live = true;
    setState({ status: "loading" });
    load().then(
      (data) => live && setState({ status: "ready", data }),
      (e: unknown) =>
        live && setState({ status: "error", message: e instanceof Error ? e.message : String(e) }),
    );
    return () => {
      live = false;
    };
  }, [...deps, attempt]);
  return { ...state, reload };
}
