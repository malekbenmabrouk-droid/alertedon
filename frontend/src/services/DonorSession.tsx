import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

// The backend has no authentication. The donor space therefore keeps the
// identity of the person using it for this browser tab only (sessionStorage),
// and never offers a way to browse other donors.
const KEY = "alertedon.moi";

interface DonorSession {
  donneurId: number | null;
  ouvrir: (id: number) => void;
  fermer: () => void;
}

const Ctx = createContext<DonorSession | null>(null);

function read(): number | null {
  try {
    const v = Number(sessionStorage.getItem(KEY));
    return Number.isInteger(v) && v > 0 ? v : null;
  } catch {
    return null;
  }
}

export function DonorSessionProvider({ children }: { children: ReactNode }) {
  const [donneurId, setId] = useState<number | null>(read);

  const ouvrir = useCallback((id: number) => {
    setId(id);
    try {
      sessionStorage.setItem(KEY, String(id));
    } catch {
      /* private mode: the session lives in memory */
    }
  }, []);

  const fermer = useCallback(() => {
    setId(null);
    try {
      sessionStorage.removeItem(KEY);
    } catch {
      /* ignore */
    }
  }, []);

  return <Ctx.Provider value={useMemo(() => ({ donneurId, ouvrir, fermer }), [donneurId, ouvrir, fermer])}>{children}</Ctx.Provider>;
}

export function useDonorSession() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useDonorSession must be used inside DonorSessionProvider");
  return v;
}
