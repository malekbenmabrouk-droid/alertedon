import { Status } from "../../components/ui";
import { STATUT_BESOIN } from "../../lib/labels";
import { formatDate } from "../../lib/format";
import { joursAvant } from "./time";
import type { StatutBesoin, SuiviBesoin } from "../../types/api";

export function StatutBesoin({ statut }: { statut: StatutBesoin }) {
  const s = STATUT_BESOIN[statut];
  return <Status tone={statut === "OUVERT" ? "pulse" : s.tone}>{s.label}</Status>;
}

/** Human countdown: "dans 2 jours", "aujourd'hui", "dépassée". */
export function delai(date: string): { text: string; urgent: boolean; past: boolean } {
  const j = joursAvant(date);
  if (j < 0) return { text: "échéance dépassée", urgent: true, past: true };
  if (j === 0) return { text: "aujourd'hui", urgent: true, past: false };
  if (j === 1) return { text: "demain", urgent: true, past: false };
  return { text: `dans ${j} jours`, urgent: j <= 2, past: false };
}

export function Echeance({ date, statut }: { date: string; statut: StatutBesoin }) {
  const d = delai(date);
  return (
    <div>
      <div className="primary" style={{ fontWeight: 500 }}>{formatDate(date)}</div>
      {statut === "OUVERT" && (
        <div className="secondary">
          {d.urgent ? <span className="tag" data-tone="urgent">{d.text}</span> : d.text}
        </div>
      )}
    </div>
  );
}

/** Answers split: accepted, declined, still waiting, failed sends. */
export function Reponses({ s }: { s: SuiviBesoin }) {
  const total = s.alertes_envoyees + s.alertes_en_echec || 1;
  const w = (n: number) => `${(n / total) * 100}%`;
  return (
    <div>
      <div className="stack-bar" role="img" aria-label={`${s.acceptees} acceptées, ${s.declinees} déclinées, ${s.sans_reponse} sans réponse, ${s.alertes_en_echec} en échec`}>
        <span className="acc" style={{ width: w(s.acceptees) }} />
        <span className="dec" style={{ width: w(s.declinees) }} />
        <span className="wait" style={{ width: w(s.sans_reponse) }} />
        <span className="fail" style={{ width: w(s.alertes_en_echec) }} />
      </div>
      <div className="secondary">
        {s.acceptees} oui · {s.declinees} non · {s.sans_reponse} en attente
        {s.alertes_en_echec > 0 && <span style={{ color: "var(--danger)" }}> · {s.alertes_en_echec} échec</span>}
      </div>
    </div>
  );
}
