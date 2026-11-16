import { MOTIF } from "../../lib/labels";
import type { MotifExclusion, RapportAlerte } from "../../types/api";

/**
 * The targeting run as a sieve: compatible donors on top, each rule removes
 * some, and what remains is notified.
 */
export function TargetingReport({ rapport }: { rapport: RapportAlerte }) {
  const exclus = Object.entries(rapport.exclus) as [MotifExclusion, number][];
  const candidats = rapport.cibles + exclus.reduce((s, [, n]) => s + n, 0);
  const max = Math.max(candidats, 1);
  const w = (n: number) => `${Math.max((n / max) * 100, n ? 2 : 0)}%`;

  const Row = ({ k, label, hint, n }: { k?: string; label: string; hint?: string; n: number }) => (
    <li className="sieve-row" data-k={k}>
      <span className="lbl">{label}{hint && <small>{hint}</small>}</span>
      <span className="n">{n}</span>
      <span className="bar" aria-hidden="true"><span style={{ width: w(n) }} /></span>
    </li>
  );

  return (
    <ol className="sieve" aria-label="Rapport de ciblage">
      <Row label="Groupes compatibles" hint="Donneurs actifs dont le sang convient" n={candidats} />
      {exclus.map(([m, n]) => <Row key={m} k="out" label={`Écartés · ${MOTIF[m].label.toLowerCase()}`} hint={MOTIF[m].detail} n={n} />)}
      <li className="sieve-sep" aria-hidden="true" />
      <Row k="kept" label="Retenus" n={rapport.cibles} />
      <Row k="sent" label="Prévenus" hint="Message acheminé par SMS ou e-mail" n={rapport.envoyees} />
      {rapport.deja_alertes > 0 && <Row k="out" label="Déjà prévenus" hint="Une seule alerte par donneur et par besoin" n={rapport.deja_alertes} />}
      {rapport.echecs > 0 && <Row k="fail" label="Échecs d'envoi" hint="Relance possible, trois tentatives au plus" n={rapport.echecs} />}
    </ol>
  );
}
