import { useCallback, useState } from "react";
import { useDataSource } from "../services/DataSourceProvider";

/** Runs a write call, then invalidates every query so screens stay in sync. */
export function useMutation<A extends unknown[], R>(fn: (...args: A) => Promise<R>) {
  const { invalidate } = useDataSource();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const run = useCallback(
    async (...args: A): Promise<R> => {
      setPending(true);
      setError(null);
      try {
        const result = await fn(...args);
        invalidate();
        return result;
      } catch (e) {
        setError(e);
        throw e;
      } finally {
        setPending(false);
      }
    },
    [fn, invalidate],
  );

  return { run, pending, error, reset: () => setError(null) };
}
