import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Field } from "../../components/Field";
import { Icon } from "../../components/Icon";
import { Button } from "../../components/ui";
import { useMutation } from "../../hooks/useMutation";
import { useApi } from "../../services/DataSourceProvider";
import { useDonorSession } from "../../services/DonorSession";
import { PARAMETRES, estCompatible } from "../../domain/rules";
import { PLACES } from "../../lib/places";
import { today } from "../../lib/format";
import { GROUPES, type Canal, type GroupeSanguin } from "../../types/api";

const PHONE = /^\+?[0-9 ]{8,20}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** UC1 — the donor registers himself. */
export function InscriptionPage() {
  const api = useApi();
  const navigate = useNavigate();
  const { ouvrir } = useDonorSession();
  const inscrire = useMutation(api.inscrire);

  const [nom, setNom] = useState("");
  const [groupe, setGroupe] = useState<GroupeSanguin | null>(null);
  const [canal, setCanal] = useState<Canal>("SMS");
  const [telephone, setTelephone] = useState("");
  const [email, setEmail] = useState("");
  const [place, setPlace] = useState("Tunis");
  const [lat, setLat] = useState("36.8065");
  const [lon, setLon] = useState("10.1815");
  const [jamais, setJamais] = useState(true);
  const [dernierDon, setDernierDon] = useState("");
  const [accord, setAccord] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const choosePlace = (nomLieu: string) => {
    setPlace(nomLieu);
    const p = PLACES.find((x) => x.nom === nomLieu);
    if (p) {
      setLat(String(p.lat));
      setLon(String(p.lon));
    }
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (nom.trim().length < 2) e.nom = "Indiquez votre nom et votre prénom.";
    if (!groupe) e.groupe = "Choisissez votre groupe. Il figure sur votre carte de donneur ou une analyse de sang.";
    if (canal === "SMS" && !PHONE.test(telephone.trim())) e.telephone = "Un numéro est nécessaire pour recevoir les alertes par SMS.";
    if (canal === "EMAIL" && !EMAIL.test(email.trim())) e.email = "Une adresse est nécessaire pour recevoir les alertes par e-mail.";
    if (telephone && !PHONE.test(telephone.trim())) e.telephone = "Format attendu : +216 20 000 000";
    if (email && !EMAIL.test(email.trim())) e.email = "Adresse e-mail invalide.";
    const la = Number(lat), lo = Number(lon);
    if (!Number.isFinite(la) || la < -90 || la > 90) e.lat = "Entre -90 et 90.";
    if (!Number.isFinite(lo) || lo < -180 || lo > 180) e.lon = "Entre -180 et 180.";
    if (!jamais && !dernierDon) e.dernierDon = "Indiquez la date, même approximative.";
    if (!jamais && dernierDon > today()) e.dernierDon = "Cette date est dans le futur.";
    if (!accord) e.accord = "Votre accord est nécessaire pour être prévenu.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (ev: FormEvent) => {
    ev.preventDefault();
    if (!validate() || !groupe) {
      document.querySelector<HTMLElement>("[aria-invalid='true'], .field .error")?.scrollIntoView({ block: "center" });
      return;
    }
    try {
      const d = await inscrire.run({
        nom: nom.trim(), groupe_sanguin: groupe, canal_prefere: canal,
        telephone: telephone.trim() || null, email: email.trim() || null,
        latitude: Number(lat), longitude: Number(lon), date_dernier_don: jamais ? null : dernierDon,
      });
      ouvrir(d.id);
      navigate("/donneur", { state: { bienvenue: true } });
    } catch {
      /* the server message is shown above the button */
    }
  };

  return (
    <div className="page">
      <div className="cols">
        <aside className="span-4 sticky-aside">
          <Link to="/donneur" className="text-link" style={{ color: "var(--ink-2)" }}><Icon name="arrowLeft" /> Espace donneur</Link>
          <div className="overline" style={{ marginTop: 32 }}>Devenir donneur</div>
          <h1 className="donor-title">Deux minutes pour <em>être prévenu</em> au bon moment.</h1>
          <ol className="steps" style={{ marginTop: 32 }}>
            <li><span><b>Vous vous inscrivez</b>Une seule fois, avec votre groupe et votre ville.</span></li>
            <li><span><b>Un centre proche manque de votre sang</b>Vous recevez un message, jamais plus d'une fois par semaine.</span></li>
            <li><span><b>Vous choisissez un moment</b>Ou vous répondez que vous n'êtes pas disponible.</span></li>
          </ol>
        </aside>

        <form className="span-8 form donor-form" onSubmit={submit} noValidate aria-labelledby="titre-inscription">
          <h2 id="titre-inscription" className="visually-hidden">Formulaire d'inscription</h2>

          <section className="form-step">
            <span className="num" aria-hidden="true">1</span>
            <div className="stack-4">
              <h3>Qui êtes-vous ?</h3>
              <Field label="Nom et prénom" error={errors.nom}>
                <input className="input" value={nom} onChange={(e) => setNom(e.target.value)} autoComplete="name" maxLength={100} />
              </Field>
            </div>
          </section>

          <section className="form-step">
            <span className="num" aria-hidden="true">2</span>
            <fieldset style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }} aria-describedby={errors.groupe ? "err-groupe" : undefined}>
              <legend><h3>Votre groupe sanguin</h3></legend>
              <div className="choice-grid">
                {GROUPES.map((g) => (
                  <label key={g} className="choice">
                    <input type="radio" name="groupe" value={g} checked={groupe === g} onChange={() => { setGroupe(g); setErrors((e) => ({ ...e, groupe: "" })); }} />
                    <span>{g}</span>
                  </label>
                ))}
              </div>
              {errors.groupe && <p className="field-error" id="err-groupe" role="alert">{errors.groupe}</p>}
              {groupe && (
                <div className="stack-2" style={{ marginTop: 16 }}>
                  <span className="xsmall muted">Votre sang peut aider les besoins de ces groupes :</span>
                  <ReceveursMatrix donneur={groupe} />
                </div>
              )}
            </fieldset>
          </section>

          <section className="form-step">
            <span className="num" aria-hidden="true">3</span>
            <div className="stack-4">
              <h3>Comment vous prévenir ?</h3>
              <div className="toggle" role="group" aria-label="Canal d'alerte" style={{ justifySelf: "start" }}>
                {(["SMS", "EMAIL"] as const).map((c) => (
                  <button key={c} type="button" aria-pressed={canal === c} onClick={() => setCanal(c)}>{c === "SMS" ? "Par SMS" : "Par e-mail"}</button>
                ))}
              </div>
              <div className="form-row">
                <Field label={canal === "SMS" ? "Téléphone" : "Téléphone (facultatif)"} error={errors.telephone}>
                  <input className="input" type="tel" inputMode="tel" placeholder="+216 20 000 000" value={telephone} onChange={(e) => setTelephone(e.target.value)} autoComplete="tel" />
                </Field>
                <Field label={canal === "EMAIL" ? "E-mail" : "E-mail (facultatif)"} error={errors.email}>
                  <input className="input" type="email" placeholder="nom@exemple.tn" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
                </Field>
              </div>
              <p className="xsmall muted">Ce contact sert aussi à retrouver votre espace. Un même numéro ou une même adresse ne peut être inscrit qu'une fois.</p>
            </div>
          </section>

          <section className="form-step">
            <span className="num" aria-hidden="true">4</span>
            <div className="stack-4">
              <h3>Où habitez-vous ?</h3>
              <Field label="Ville" help={`Vous serez prévenu pour les centres à moins de ${PARAMETRES.rayonKm} km.`}>
                <select className="select" value={place} onChange={(e) => choosePlace(e.target.value)} autoComplete="address-level2">
                  {PLACES.map((p) => <option key={p.nom}>{p.nom}</option>)}
                  <option value="autre">Autre lieu (coordonnées)</option>
                </select>
              </Field>
              {place === "autre" && (
                <div className="form-row">
                  <Field label="Latitude" error={errors.lat}><input className="input" inputMode="decimal" value={lat} onChange={(e) => setLat(e.target.value)} /></Field>
                  <Field label="Longitude" error={errors.lon}><input className="input" inputMode="decimal" value={lon} onChange={(e) => setLon(e.target.value)} /></Field>
                </div>
              )}
            </div>
          </section>

          <section className="form-step">
            <span className="num" aria-hidden="true">5</span>
            <div className="stack-4">
              <h3>Avez-vous déjà donné votre sang ?</h3>
              <div className="toggle" role="group" aria-label="Dernier don" style={{ justifySelf: "start" }}>
                <button type="button" aria-pressed={jamais} onClick={() => setJamais(true)}>Jamais</button>
                <button type="button" aria-pressed={!jamais} onClick={() => setJamais(false)}>Oui</button>
              </div>
              {!jamais && (
                <Field label="Date de votre dernier don" help={`Vous ne serez pas sollicité pendant ${PARAMETRES.delaiEntreDonsJours} jours après un don.`} error={errors.dernierDon}>
                  <input className="input" type="date" max={today()} value={dernierDon} onChange={(e) => setDernierDon(e.target.value)} style={{ maxWidth: 240 }} />
                </Field>
              )}
            </div>
          </section>

          <div className="consent">
            <label>
              <input type="checkbox" checked={accord} onChange={(e) => setAccord(e.target.checked)} aria-invalid={errors.accord ? true : undefined} aria-describedby="consent-help" />
              <span>J'accepte d'être prévenu lorsqu'un centre proche a besoin de mon groupe sanguin.</span>
            </label>
            <p id="consent-help" className="xsmall muted">
              Vos coordonnées servent uniquement à l'envoi des alertes. Le personnel des centres n'en voit qu'une version masquée.
            </p>
            {errors.accord && <p className="field-error" role="alert">{errors.accord}</p>}
          </div>

          {inscrire.error != null && (
            <div className="notice" data-tone="danger" role="alert">
              <Icon name="alert" />
              <span className="grow"><strong>Inscription impossible.</strong> {inscrire.error instanceof Error ? inscrire.error.message : ""}</span>
            </div>
          )}

          <div className="row wrap gap-4">
            <Button variant="primary" type="submit" loading={inscrire.pending} icon="heart">M'inscrire comme donneur</Button>
            <Link to="/donneur/connexion" className="text-link">J'ai déjà un espace</Link>
          </div>
        </form>
      </div>
    </div>
  );
}

/** Which needs this donor can help with: the receivers whose list includes `donneur`. */
function ReceveursMatrix({ donneur }: { donneur: GroupeSanguin }) {
  return (
    <div className="compat compact">
      <ul aria-label={`Besoins auxquels un donneur ${donneur} peut répondre`}>
        {GROUPES.map((g) => {
          const yes = estCompatible(donneur, g);
          return (
            <li key={g} data-on={yes}>
              <span className={`seal sm${yes ? "" : " ghost"}${g.length > 2 ? " long" : ""}`} aria-hidden="true">{g}</span>
              <span className="visually-hidden">{g} {yes ? "oui" : "non"}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
