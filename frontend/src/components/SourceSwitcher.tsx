import { useEffect, useRef, useState } from "react";
import { Button } from "./ui";
import { useDataSource, API_BASE_URL } from "../services/DataSourceProvider";
import { useToast } from "./Toasts";

export function SourceSwitcher() {
  const { kind, setKind, health, checkHealth, resetDemo } = useDataSource();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const led = kind === "demo" || health === "ok" ? "ok" : health === "down" ? "down" : "unknown";
  const label = kind === "demo" ? "Démonstration" : health === "down" ? "API injoignable" : "API";

  return (
    <div className="relative" ref={ref}>
      <button type="button" className="source-pill" aria-expanded={open} aria-haspopup="dialog" onClick={() => setOpen((o) => !o)}>
        <span className="led" data-state={led} aria-hidden="true" />
        <span className="visually-hidden">Source des données :</span>
        {label}
      </button>
      {open && (
        <div className="popover" role="dialog" aria-label="Source des données">
          <div className="stack-4">
            <div className="overline">Source des données</div>
            <div className="toggle" role="group" aria-label="Source des données" style={{ width: "100%" }}>
              <button type="button" style={{ flex: 1 }} aria-pressed={kind === "demo"} onClick={() => setKind("demo")}>Démonstration</button>
              <button type="button" style={{ flex: 1 }} aria-pressed={kind === "api"} onClick={() => setKind("api")}>API FastAPI</button>
            </div>
            {kind === "demo" ? (
              <>
                <p className="small soft">Des données d'exemple vivent dans votre navigateur et suivent les mêmes règles que le serveur. Rien n'est enregistré.</p>
                <Button size="sm" icon="refresh" onClick={async () => { await resetDemo(); toast({ tone: "info", title: "Démonstration réinitialisée" }); setOpen(false); }}>
                  Repartir de zéro
                </Button>
              </>
            ) : (
              <>
                <p className="small soft">
                  Requêtes envoyées à <code>{API_BASE_URL}</code>.
                  {health === "down" && " Le serveur ne répond pas : lancez uvicorn puis vérifiez."}
                </p>
                <Button size="sm" icon="refresh" onClick={() => void checkHealth()}>Vérifier la connexion</Button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
