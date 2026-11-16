import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { AlerteDonApi, SourceKind } from "./client";
import { createLiveApi } from "./liveApi";
import { createSeededMock } from "./seed";

const KEY = "alertedon.source";
export const API_BASE_URL: string = import.meta.env.VITE_API_BASE_URL || "/api";

type Health = "unknown" | "ok" | "down";

interface DataSourceValue {
  api: AlerteDonApi | null;
  kind: SourceKind;
  setKind: (k: SourceKind) => void;
  health: Health;
  checkHealth: () => Promise<void>;
  /** Bumped after each write so every query refetches. */
  revision: number;
  invalidate: () => void;
  resetDemo: () => Promise<void>;
}

const Ctx = createContext<DataSourceValue | null>(null);

function initialKind(): SourceKind {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === "demo" || saved === "api") return saved;
  } catch {
    /* ignore */
  }
  return import.meta.env.VITE_DEFAULT_SOURCE === "api" ? "api" : "demo";
}

export function DataSourceProvider({ children, override }: { children: ReactNode; override?: AlerteDonApi }) {
  const [kind, setKindState] = useState<SourceKind>(override?.kind ?? initialKind);
  const [demo, setDemo] = useState<AlerteDonApi | null>(null);
  const [revision, setRevision] = useState(0);
  const [health, setHealth] = useState<Health>("unknown");

  const live = useMemo(() => createLiveApi({ baseUrl: API_BASE_URL }), []);

  useEffect(() => {
    if (override || kind !== "demo" || demo) return;
    let alive = true;
    createSeededMock().then((api) => alive && setDemo(api));
    return () => {
      alive = false;
    };
  }, [kind, demo, override]);

  const api = override ?? (kind === "demo" ? demo : live);

  const checkHealth = useCallback(async () => {
    if (!api) return;
    try {
      await api.sante();
      setHealth("ok");
    } catch {
      setHealth("down");
    }
  }, [api]);

  useEffect(() => {
    setHealth("unknown");
    void checkHealth();
  }, [checkHealth]);

  const setKind = useCallback((k: SourceKind) => {
    setKindState(k);
    setRevision((r) => r + 1);
    try {
      localStorage.setItem(KEY, k);
    } catch {
      /* ignore */
    }
  }, []);

  const invalidate = useCallback(() => setRevision((r) => r + 1), []);

  const resetDemo = useCallback(async () => {
    setDemo(await createSeededMock());
    setRevision((r) => r + 1);
  }, []);

  const value = useMemo<DataSourceValue>(
    () => ({ api, kind: override?.kind ?? kind, setKind, health, checkHealth, revision, invalidate, resetDemo }),
    [api, kind, override, setKind, health, checkHealth, revision, invalidate, resetDemo],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useDataSource() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useDataSource must be used inside DataSourceProvider");
  return v;
}

/** Returns the active API; screens are only rendered once it is ready. */
export function useApi(): AlerteDonApi {
  const { api } = useDataSource();
  if (!api) throw new Error("Data source not ready");
  return api;
}
