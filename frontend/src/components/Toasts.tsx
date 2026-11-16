import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { Button } from "./ui";
import { Icon } from "./Icon";
import type { Tone } from "../lib/labels";

interface Toast {
  id: number;
  tone: Tone;
  title: string;
  description?: string;
}

type Push = (t: Omit<Toast, "id">) => void;

const ToastContext = createContext<Push>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const seq = useRef(0);

  const dismiss = useCallback((id: number) => setItems((xs) => xs.filter((x) => x.id !== id)), []);
  const push = useCallback<Push>(
    (t) => {
      const id = ++seq.current;
      setItems((xs) => [...xs.slice(-3), { ...t, id }]);
      setTimeout(() => dismiss(id), t.tone === "danger" ? 7000 : 4500);
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={useMemo(() => push, [push])}>
      {children}
      <div className="toasts" role="region" aria-label="Notifications" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className="toast" data-tone={t.tone} role={t.tone === "danger" ? "alert" : "status"}>
            <span className="mark" aria-hidden="true">
              <Icon name={t.tone === "ok" ? "check" : t.tone === "danger" || t.tone === "warn" ? "alert" : "heart"} size={14} />
            </span>
            <div>
              <strong>{t.title}</strong>
              {t.description && <p>{t.description}</p>}
            </div>
            <Button variant="quiet" size="sm" iconOnly icon="close" aria-label="Fermer la notification" onClick={() => dismiss(t.id)} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
