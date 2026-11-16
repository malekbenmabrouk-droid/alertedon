import { COMPATIBILITE } from "../../domain/rules";
import { GROUPES, type GroupeSanguin } from "../../types/api";

/** The eight groups, the donors who can give to `receveur` are filled. */
export function CompatMatrix({ receveur, compact }: { receveur: GroupeSanguin; compact?: boolean }) {
  const ok = COMPATIBILITE[receveur];
  return (
    <div className={`compat${compact ? " compact" : ""}`}>
      <ul aria-label={`Groupes pouvant donner pour ${receveur}`}>
        {GROUPES.map((g) => {
          const yes = ok.includes(g);
          return (
            <li key={g} data-on={yes}>
              <span className={`seal${compact ? " sm" : ""}${yes ? "" : " ghost"}${g.length > 2 ? " long" : ""}`} aria-hidden="true">{g}</span>
              <span className="visually-hidden">{g} {yes ? "compatible" : "incompatible"}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
