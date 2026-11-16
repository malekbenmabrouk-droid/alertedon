import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "../../components/ui";
import { useToast } from "../../components/Toasts";
import { useDataSource } from "../../services/DataSourceProvider";
import { useDonorSession } from "../../services/DonorSession";
import { reports } from "../../services/reports";
import { addDays, toIsoDate, toIsoLocal } from "../../lib/format";

interface TourState {
  besoinId?: number;
  donneurId?: number;
}

interface Step {
  title: string;
  body: string;
  route: (s: TourState) => string;
  target?: string;
  action?: { label: string; run: (s: TourState) => Promise<TourState> };
}

const TourCtx = createContext<{ start: () => void; active: boolean }>({ start: () => {}, active: false });
export const useTour = () => useContext(TourCtx);

export function TourProvider({ children }: { children: ReactNode }) {
  const { api, kind, invalidate, resetDemo } = useDataSource();
  const donorSession = useDonorSession();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const [index, setIndex] = useState<number | null>(null);
  const [state, setState] = useState<TourState>({});
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<Set<number>>(new Set());

  const steps = useMemo<Step[]>(() => [
    {
      title: "Aujourd'hui",
      body: "La page d'accueil dit en une phrase ce qui manque, et met en avant le besoin le plus urgent.",
      route: () => "/",
      target: "kpis",
    },
    {
      title: "Déclarer un besoin",
      body: "Le CNTS Tunis manque de sang B+. Le déclarer prévient aussitôt les bons donneurs.",
      route: () => "/besoins",
      target: "declarer",
      action: {
        label: "Déclarer 2 poches B+ à Tunis",
        run: async (s) => {
          const centres = await api!.listCentres();
          const centre = centres.find((c) => c.nom.includes("Tunis")) ?? centres[0];
          if (!centre) throw new Error("Aucun centre disponible.");
          const res = await api!.declarerBesoin({ centre_id: centre.id, groupe_sanguin: "B+", quantite: 2, echeance: toIsoDate(addDays(new Date(), 3)) });
          reports.save(kind, res.alerte);
          const alertes = await api!.alertesDuBesoin(res.besoin.id);
          const first = alertes.find((a) => a.statut === "ENVOYEE");
          if (!first) {
            throw new Error("Aucun donneur n'a pu être alerté (tous déjà sollicités ou non éligibles). Réinitialisez la démo puis relancez la visite.");
          }
          // Step into the alerted donor's shoes for the next step (demo session for this tab).
          donorSession.ouvrir(first.donneur_id);
          return { ...s, besoinId: res.besoin.id, donneurId: first.donneur_id };
        },
      },
    },
    {
      title: "Pourquoi ces donneurs",
      body: "Sang compatible, à moins de 30 km, en mesure de donner : chaque donneur écarté l'est pour une raison visible.",
      route: (s) => (s.besoinId ? `/besoins/${s.besoinId}` : "/besoins"),
      target: "rapport",
    },
    {
      title: "Côté donneur",
      body: "Dans l'espace Donneur, la personne prévenue voit un message personnel et choisit le moment de sa venue.",
      route: () => "/donneur",
      target: "espace",
      action: {
        label: "Accepter pour demain 9 h",
        run: async (s) => {
          if (!s.besoinId || !s.donneurId) throw new Error("Aucun donneur n'a été alerté pour ce besoin.");
          const alerte = (await api!.alertesDuBesoin(s.besoinId)).find((a) => a.donneur_id === s.donneurId);
          if (!alerte) throw new Error("Alerte introuvable.");
          const d = addDays(new Date(), 1);
          d.setHours(9, 0, 0, 0);
          await api!.repondre(alerte.id, { donneur_id: s.donneurId, accepte: true, creneau: toIsoLocal(d) });
          return s;
        },
      },
    },
    {
      title: "Le don, puis la collecte",
      body: "Le don remplit la goutte. Le donneur se repose 56 jours ; à 2 poches sur 2, le besoin se ferme.",
      route: (s) => (s.besoinId ? `/besoins/${s.besoinId}` : "/besoins"),
      action: {
        label: "Enregistrer son don aujourd'hui",
        run: async (s) => {
          if (!s.besoinId || !s.donneurId) throw new Error("Aucun don à enregistrer.");
          const b = await api!.getBesoin(s.besoinId);
          await api!.enregistrerDon({ donneur_id: s.donneurId, centre_id: b.centre_id, besoin_id: b.id, date_don: toIsoDate(new Date()) });
          return s;
        },
      },
    },
    {
      title: "La preuve",
      body: "Onze scénarios rejouent les six cas d'utilisation, refus compris, et montrent attendu et obtenu.",
      route: () => "/validation",
      target: "valider",
    },
  ], [api, kind, donorSession]);

  const step = index === null ? null : steps[index];

  useEffect(() => {
    if (!step) return;
    const path = step.route(state);
    if (`${location.pathname}${location.search}` !== path) navigate(path);
  }, [index]); // Navigate only when the step changes.

  useEffect(() => {
    if (!step?.target) return;
    let el: HTMLElement | null = null;
    const t = setTimeout(() => {
      el = document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`);
      if (!el) return;
      el.dataset.tourHighlight = "true";
      el.scrollIntoView({ block: "center", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    }, 350);
    return () => {
      clearTimeout(t);
      if (el) delete el.dataset.tourHighlight;
    };
  }, [step, location.pathname]);

  const start = useCallback(async () => {
    // The tour declares a need and expects donors to be alerted. Starting from a fresh
    // demo dataset avoids the anti-relance rule excluding everyone after earlier tries.
    if (kind === "demo") await resetDemo();
    setState({});
    setDone(new Set());
    setIndex(0);
  }, [kind, resetDemo]);
  const close = () => setIndex(null);
  const go = (i: number) => setIndex(Math.max(0, Math.min(steps.length - 1, i)));

  const act = async () => {
    if (!step?.action || index === null) return;
    setBusy(true);
    try {
      const next = await step.action.run(state);
      setState(next);
      invalidate();
      setDone((d) => new Set(d).add(index));
      if (index < steps.length - 1) {
        setIndex(index + 1);
        navigate(steps[index + 1]!.route(next));
      }
    } catch (e) {
      toast({ tone: "danger", title: "Étape impossible", description: e instanceof Error ? e.message : undefined });
    } finally {
      setBusy(false);
    }
  };

  return (
    <TourCtx.Provider value={{ start: () => void start(), active: index !== null }}>
      {children}
      {step && index !== null && (
        <aside className="tour" role="dialog" aria-modal="false" aria-labelledby="tour-title">
          <div className="step-num" aria-hidden="true">{index + 1}<small>/{steps.length}</small></div>
          <div>
            <h3 id="tour-title">{step.title}</h3>
            <p>{step.body}</p>
            <div className="row-actions">
              <div className="progress-dots" aria-label={`Étape ${index + 1} sur ${steps.length}`} role="img">
                {steps.map((_, i) => <span key={i} data-on={i <= index} />)}
              </div>
              <div className="row">
                {index > 0 && <Button variant="quiet" size="sm" onClick={() => go(index - 1)}>Retour</Button>}
                {step.action && !done.has(index) ? (
                  <>
                    <Button variant="quiet" size="sm" onClick={() => go(index + 1)} disabled={busy}>Passer</Button>
                    <Button variant="primary" size="sm" onClick={act} loading={busy}>{step.action.label}</Button>
                  </>
                ) : index < steps.length - 1 ? (
                  <Button variant="primary" size="sm" onClick={() => go(index + 1)}>Continuer</Button>
                ) : (
                  <Button variant="primary" size="sm" onClick={close}>Terminer</Button>
                )}
              </div>
            </div>
          </div>
          <Button className="close" variant="quiet" size="sm" iconOnly icon="close" aria-label="Quitter la visite" onClick={close} />
        </aside>
      )}
    </TourCtx.Provider>
  );
}
