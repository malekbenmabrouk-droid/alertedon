import { useMemo, useRef, useState } from "react";
import { Icon } from "../../components/Icon";
import { Button, PageIntro, SectionHead } from "../../components/ui";
import { useDataSource } from "../../services/DataSourceProvider";
import { MockApi } from "../../services/mockApi";
import { download } from "../../lib/csv";
import { today } from "../../lib/format";
import { UC_NOMS } from "../../lib/labels";
import { SCENARIOS, runScenarios, type RunEntry } from "./scenarios";
import { SUITE, SUITE_TOTAL } from "./suite";

const CI_URL = "https://github.com/malekbenmabrouk-droid/alertedon/actions";
const STATE_LABEL = { pending: "À exécuter", running: "En cours", pass: "Réussi", fail: "Échoué" } as const;

function Mark({ state }: { state: RunEntry["state"] }) {
  return (
    <span className="check-mark" data-state={state} role="img" aria-label={STATE_LABEL[state]}>
      {state === "pass" && <Icon name="check" size={12} />}
      {state === "fail" && <Icon name="x" size={12} />}
      {state === "running" && <Icon name="loader" size={14} className="spin" />}
    </span>
  );
}

export function ValidationPage() {
  const { api, kind, invalidate } = useDataSource();
  const [entries, setEntries] = useState<RunEntry[]>(() => SCENARIOS.map((scenario) => ({ scenario, state: "pending" })));
  const [running, setRunning] = useState(false);
  const [finishedAt, setFinishedAt] = useState<Date | null>(null);
  const [target, setTarget] = useState<"sandbox" | "source">("sandbox");
  const scoreRef = useRef<HTMLDivElement>(null);

  const passed = entries.filter((e) => e.state === "pass").length;
  const failed = entries.filter((e) => e.state === "fail").length;

  const run = async () => {
    if (!api) return;
    setRunning(true);
    setFinishedAt(null);
    // The sandbox is a fresh in-memory instance, so a run never touches the data on screen.
    await runScenarios(target === "sandbox" ? new MockApi() : api, setEntries);
    setRunning(false);
    setFinishedAt(new Date());
    if (target === "source") invalidate();
    scoreRef.current?.focus();
  };

  const exportReport = () =>
    download(`validation-alertedon-${today()}.json`, JSON.stringify({
      executeLe: finishedAt?.toISOString(),
      cible: target === "sandbox" ? "bac à sable" : kind === "api" ? "API FastAPI" : "démonstration",
      resume: { total: entries.length, reussis: passed, echoues: failed },
      scenarios: entries.map((e) => ({ id: e.scenario.id, uc: e.scenario.uc, titre: e.scenario.title, etat: e.state, duree_ms: e.ms, ...e.result, erreur: e.error })),
    }, null, 2), "application/json");

  const byUc = useMemo(() => {
    const groups = new Map<string, RunEntry[]>();
    for (const e of entries) groups.set(e.scenario.uc, [...(groups.get(e.scenario.uc) ?? []), e]);
    return [...groups.entries()];
  }, [entries]);

  const suiteByUc = useMemo(() => {
    const m = new Map<string, number>();
    for (const f of SUITE) m.set(f.uc, (m.get(f.uc) ?? 0) + f.tests.reduce((n, t) => n + t.cases, 0));
    return [...m.entries()].sort(([a], [b]) => (a.startsWith("UC") === b.startsWith("UC") ? a.localeCompare(b) : a.startsWith("UC") ? -1 : 1));
  }, []);
  const suiteMax = Math.max(...suiteByUc.map(([, n]) => n));

  const verdict = !finishedAt
    ? "Rejouez chaque cas d'utilisation, refus compris, et voyez ce qui est attendu et ce qui est obtenu."
    : failed
      ? `${failed} scénario${failed > 1 ? "s" : ""} ne donne${failed > 1 ? "nt" : ""} pas le résultat attendu. Le détail est ci-dessous.`
      : "Tous les cas d'utilisation se comportent comme prévu, y compris les refus.";

  return (
    <div className="page">
      <PageIntro
        overline="Validation"
        title={<>Ce que l'application <em>garantit</em></>}
        lede="Onze scénarios d'acceptation couvrent les six cas d'utilisation. Ils s'exécutent ici, dans l'ordre, chacun s'appuyant sur le précédent."
        actions={
          <>
            {finishedAt && <Button icon="download" onClick={exportReport}>Rapport JSON</Button>}
            <Button variant="primary" icon="play" onClick={run} loading={running} data-tour="valider">{finishedAt ? "Relancer" : "Lancer les scénarios"}</Button>
          </>
        }
      />

      <section aria-label="Résultat">
        <div className="score">
          <div ref={scoreRef} tabIndex={-1} aria-live="polite" className="big">
            {passed}<small>/{entries.length}</small>
          </div>
          <div>
            <p style={{ fontSize: "var(--t-17)", maxWidth: "52ch" }}>{verdict}</p>
            <div className="cells" aria-hidden="true">{entries.map((e) => <span key={e.scenario.id} data-state={e.state} title={e.scenario.title} />)}</div>
            <div className="row wrap gap-4" style={{ marginTop: 16 }}>
              <div className="toggle" role="group" aria-label="Où exécuter">
                <button type="button" aria-pressed={target === "sandbox"} onClick={() => setTarget("sandbox")} disabled={running}>Bac à sable</button>
                <button type="button" aria-pressed={target === "source"} onClick={() => setTarget("source")} disabled={running}>{kind === "api" ? "API réelle" : "Données de démonstration"}</button>
              </div>
              <span className="xsmall muted" style={{ flex: 1, minWidth: 220 }}>
                {target === "sandbox"
                  ? "Une instance vierge, avec les mêmes règles que le serveur. Vos données ne sont pas modifiées."
                  : kind === "api"
                    ? "Les scénarios écrivent dans la vraie base : un centre isolé et quelques donneurs nommés « Validation »."
                    : "Les scénarios s'ajoutent aux données de démonstration affichées ailleurs."}
              </span>
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="scenarios">
        <SectionHead id="scenarios" title="Scénarios d'acceptation" aside={finishedAt ? `Exécutés à ${finishedAt.toLocaleTimeString("fr-FR")}` : `${entries.length} prêts`} />
        {byUc.map(([uc, list]) => (
          <div key={uc} className="uc-block">
            <h3><span className="code">{uc}</span>{UC_NOMS[uc]}</h3>
            <ul>
              {list.map((e) => (
                <li key={e.scenario.id} className="check">
                  <Mark state={e.state} />
                  <div style={{ minWidth: 0 }}>
                    <div className="title">{e.scenario.title}</div>
                    {e.result && (
                      <dl className="vs">
                        <dt>Attendu</dt><dd>{e.result.expected}</dd>
                        <dt>Obtenu</dt><dd style={{ color: e.state === "fail" ? "var(--danger)" : undefined }}>{e.result.obtained}</dd>
                      </dl>
                    )}
                    {e.error && <dl className="vs"><dt>Erreur</dt><dd style={{ color: "var(--danger)" }}>{e.error}</dd></dl>}
                  </div>
                  <span className="ms">{e.ms != null ? `${e.ms} ms` : ""}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      <div className="cols">
        <section className="span-5" aria-labelledby="suite">
          <SectionHead id="suite" title="Côté serveur" aside={<a className="text-link" href={CI_URL} target="_blank" rel="noreferrer">Voir la CI <Icon name="arrowRight" /></a>} />
          <p className="small soft" style={{ marginBottom: 20 }}>{SUITE_TOTAL} tests pytest vérifient les mêmes règles à chaque envoi sur GitHub.</p>
          <ul className="suite-bars">
            {suiteByUc.map(([uc, n]) => (
              <li key={uc}>
                <span>{UC_NOMS[uc] ? `${uc} · ${UC_NOMS[uc].split(" ")[0]}` : uc}</span>
                <span className="track" aria-hidden="true"><span style={{ width: `${(n / suiteMax) * 100}%` }} /></span>
                <span className="right">{n}</span>
              </li>
            ))}
          </ul>
        </section>
        <section className="span-7" aria-labelledby="fichiers">
          <SectionHead id="fichiers" title="Fichiers de tests" aside={`${SUITE.length} fichiers`} />
          <ul className="files">
            {SUITE.map((f) => (
              <li key={f.file}>
                <details>
                  <summary><code>{f.file}</code><span className="muted">{f.uc} · {f.tests.reduce((n, t) => n + t.cases, 0)}</span></summary>
                  <ul className="xsmall muted" style={{ padding: "8px 0 4px 16px", listStyle: "disc" }}>
                    {f.tests.map((t) => <li key={t.name}><code>{t.name}</code>{t.cases > 1 ? ` ×${t.cases}` : ""}</li>)}
                  </ul>
                </details>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
