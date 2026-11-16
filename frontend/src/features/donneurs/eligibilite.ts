import { PARAMETRES, estEligible, joursEntre, prochaineEligibilite } from "../../domain/rules";
import { today } from "../../lib/format";
import type { Donneur } from "../../types/api";

export function eligibilite(d: Pick<Donneur, "date_dernier_don">) {
  const t = today();
  const ok = estEligible(d.date_dernier_don, t);
  const depuis = d.date_dernier_don ? joursEntre(d.date_dernier_don, t) : null;
  return {
    ok,
    depuis: ok ? null : prochaineEligibilite(d.date_dernier_don, t),
    /** Days left before the next donation (0 when eligible). */
    reste: ok || depuis === null ? 0 : PARAMETRES.delaiEntreDonsJours - depuis,
    /** Share of the 56-day rest already done (1 when eligible). */
    avancement: ok || depuis === null ? 1 : depuis / PARAMETRES.delaiEntreDonsJours,
  };
}
