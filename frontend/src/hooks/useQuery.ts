import { useCallback, useEffect, useRef, useState } from "react";
import { useDataSource } from "../services/DataSourceProvider";

export interface QueryState<T> {
  data: T | undefined;
  error: unknown;
  loading: boolean;
  reload: () => void;
}

/**
 * Minimal async loader. Refetches when `deps` change or when any mutation
 * bumps the data-source revision, and ignores stale responses.
 */
export function useQuery<T>(fn: () => Promise<T>, deps: readonly unknown[] = []): QueryState<T> {
  const { revision } = useDataSource();
  const [state, setState] = useState<{ data?: T; error: unknown; loading: boolean }>({ error: null, loading: true });
  const [tick, setTick] = useState(0);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  useEffect(() => {
    let alive = true;
    setState((s) => ({ ...s, loading: true, error: null }));
    fnRef
      .current()
      .then((data) => alive && setState({ data, error: null, loading: false }))
      .catch((error: unknown) => alive && setState((s) => ({ data: s.data, error, loading: false })));
    return () => {
      alive = false;
    };
  }, [revision, tick, ...deps]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { data: state.data, error: state.error, loading: state.loading, reload };
}
