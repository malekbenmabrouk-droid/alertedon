import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Field } from "../../components/Field";
import { Icon } from "../../components/Icon";
import { Button } from "../../components/ui";
import { useApi, useDataSource } from "../../services/DataSourceProvider";
import { useDonorSession } from "../../services/DonorSession";
import { emailKey, phoneKey } from "../../lib/privacy";

/**
 * Find one's own donor space from the contact given at registration.
 * The answer is the same whether the contact is unknown or mistyped, so the
 * page cannot be used to check who is registered.
 */
export function ConnexionPage() {
  const api = useApi();
  const { kind } = useDataSource();
  const navigate = useNavigate();
  const { ouvrir } = useDonorSession();
  const [contact, setContact] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const submit = async (ev: FormEvent) => {
    ev.preventDefault();
    const value = contact.trim();
    if (!value) return setError("Indiquez le téléphone ou l'e-mail donné à l'inscription.");
    setPending(true);
    setError(null);
    try {
      const all = await api.listDonneurs();
      const isEmail = value.includes("@");
      const me = all.find((d) =>
        isEmail ? d.email && emailKey(d.email) === emailKey(value) : d.telephone && phoneKey(d.telephone) === phoneKey(value) && phoneKey(value).length >= 8,
      );
      if (!me) {
        setError("Aucun espace ne correspond à ce contact. Vérifiez la saisie, ou inscrivez-vous.");
        return;
      }
      ouvrir(me.id);
      navigate("/donneur");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Recherche impossible pour le moment.");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="page narrow">
      <Link to="/donneur" className="text-link" style={{ color: "var(--ink-2)" }}><Icon name="arrowLeft" /> Espace donneur</Link>
      <div>
        <div className="overline">Espace donneur</div>
        <h1 className="donor-title" style={{ marginTop: 12 }}>Retrouver <em>mon espace</em></h1>
        <p className="lede soft" style={{ marginTop: 12 }}>Le contact que vous avez donné à l'inscription suffit.</p>
      </div>
      <form className="form" onSubmit={submit} noValidate>
        <Field label="Téléphone ou e-mail" error={error}>
          <input className="input" value={contact} onChange={(e) => { setContact(e.target.value); setError(null); }} autoComplete="username" placeholder="+216 20 000 000 ou nom@exemple.tn" data-autofocus />
        </Field>
        <div className="row wrap gap-4">
          <Button variant="primary" type="submit" loading={pending} iconRight="arrowRight">Ouvrir mon espace</Button>
          <Link to="/donneur/inscription" className="text-link">Je ne suis pas encore inscrit</Link>
        </div>
      </form>
      {kind === "demo" && (
        <p className="xsmall muted">Démonstration : essayez <button type="button" className="text-link xsmall" onClick={() => setContact("+216 20 100 400")}>+216 20 100 400</button> (un donneur fictif).</p>
      )}
      <p className="xsmall muted">Sur un ordinateur partagé, pensez à vous déconnecter. La session se ferme aussi à la fermeture de l'onglet.</p>
    </div>
  );
}
