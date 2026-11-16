import { Link } from "react-router-dom";
import { Icon } from "../../components/Icon";
import { BloodDrop } from "../../components/viz/BloodDrop";
import { PARAMETRES } from "../../domain/rules";

/** Entry of the donor space for someone who is not identified yet. */
export function AccueilDonneur({ notice }: { notice?: string }) {
  return (
    <div className="page">
      {notice && <div className="notice" role="status"><Icon name="alert" /><span className="grow">{notice}</span></div>}
      <section className="donor-welcome" aria-labelledby="accueil-donneur">
        <div>
          <div className="overline">Espace donneur</div>
          <h1 id="accueil-donneur" className="donor-title big">Votre sang peut aider <em>près de chez vous</em>, au moment où il manque.</h1>
          <p className="lede soft" style={{ marginTop: 20, maxWidth: "52ch" }}>
            Inscrivez-vous une fois. Vous serez prévenu seulement quand un centre à moins de {PARAMETRES.rayonKm} km a besoin d'un sang compatible avec le vôtre, et jamais pendant les {PARAMETRES.delaiEntreDonsJours} jours qui suivent un don.
          </p>
          <div className="row wrap gap-4" style={{ marginTop: 32 }}>
            <Link to="/donneur/inscription" className="btn btn-primary"><Icon name="heart" /> Devenir donneur</Link>
            <Link to="/donneur/connexion" className="btn btn-secondary">J'ai déjà un espace</Link>
          </div>
        </div>
        <BloodDrop value={0.62} size={170} label="Illustration" />
      </section>
      <ol className="steps donor-steps">
        <li><span><b>Je m'inscris</b>Groupe, ville, et comment me prévenir.</span></li>
        <li><span><b>Je suis prévenu</b>Un message quand un centre proche manque de mon sang.</span></li>
        <li><span><b>Je réponds</b>Je choisis un moment pour venir, ou je décline.</span></li>
      </ol>
    </div>
  );
}
