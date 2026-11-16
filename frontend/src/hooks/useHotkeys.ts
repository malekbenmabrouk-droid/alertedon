import { useEffect, useRef } from "react";

export type HotkeyMap = Record<string, (e: KeyboardEvent) => void>;

const isTyping = (t: EventTarget | null) =>
  t instanceof HTMLElement && (t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName));

/**
 * Keys: "mod+k" (Ctrl or Cmd), single keys ("n", "?", "/"), and two-key
 * sequences like "g b". Single keys are ignored while typing in a field.
 */
export function useHotkeys(map: HotkeyMap) {
  const mapRef = useRef(map);
  mapRef.current = map;

  useEffect(() => {
    let pending: string | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const onKey = (e: KeyboardEvent) => {
      const m = mapRef.current;
      const key = e.key.toLowerCase();
      if ((e.ctrlKey || e.metaKey) && m[`mod+${key}`]) {
        e.preventDefault();
        m[`mod+${key}`]!(e);
        return;
      }
      if (e.ctrlKey || e.metaKey || e.altKey || isTyping(e.target)) return;
      if (document.querySelector('[role="dialog"]')) return;

      if (pending) {
        const combo = m[`${pending} ${key}`];
        pending = null;
        clearTimeout(timer);
        if (combo) {
          e.preventDefault();
          combo(e);
          return;
        }
      }
      if (Object.keys(m).some((k) => k.startsWith(`${key} `))) {
        pending = key;
        timer = setTimeout(() => (pending = null), 900);
        return;
      }
      const single = m[e.key] ?? m[key];
      if (single) {
        e.preventDefault();
        single(e);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      clearTimeout(timer);
    };
  }, []);
}
