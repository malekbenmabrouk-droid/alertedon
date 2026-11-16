import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog } from "../../components/Dialog";
import { Field } from "../../components/Field";
import { Button } from "../../components/ui";
import { CompatMatrix } from "../../components/viz/CompatMatrix";
import { useToast } from "../../components/Toasts";
import { useMutation } from "../../hooks/useMutation";
import { useLookups } from "../../hooks/useLookups";
import { useApi, useDataSource } from "../../services/DataSourceProvider";
import { reports } from "../../services/reports";
import { PARAMETRES, groupesCompatibles } from "../../domain/rules";
import { addDays, formatDate, plural, toIsoDate, today } from "../../lib/format";
import { GROUPES, type GroupeSanguin } from "../../types/api";

interface Props {
  open: boolean;
  onClose: () => void;
  preset?: { centreNom?: string };
}

export function DeclarerBesoinDialog({ open, onClose, preset }: Props) {
  const api = useApi();
  const { kind } = useDataSource();
  const { centres } = useLookups();
  const toast = useToast();
  const navigate = useNavigate();
  const declarer = useMutation(api.declarerBesoin);

  const [centreId, setCentreId] = useState<number | "">("");
  const [groupe, setGroupe] = useState<GroupeSanguin>("A+");
  const [quantite, setQuantite] = useState("2");
  const [echeance, setEcheance] = useState(toIsoDate(addDays(new Date(), 3)));
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    const fromPreset = centres.find((c) => c.nom === preset?.centreNom);
    setCentreId(fromPreset?.id ?? centres[0]?.id ?? "");
    setGroupe("A+");
    setQuantite("2");
    setEcheance(toIsoDate(addDays(new Date(), 3)));
    setErrors({});
    declarer.reset();
    // Reset only when the sheet opens.
  }, [open]);

  // Centres may arrive after the sheet opened (direct link, slow API): pick one then,
  // so the select never shows a centre that the form state does not hold.
  useEffect(() => {
    if (!open || centreId !== "" || centres.length === 0) return;
    const fromPreset = centres.find((c) => c.nom === preset?.centreNom);
    setCentreId(fromPreset?.id ?? centres[0]?.id ?? "");
  }, [open, centres, centreId, preset?.centreNom]);

  const centre = centres.find((c) => c.id === centreId);

  const validate = () => {
    const e: Record<string, string> = {};
    if (centreId === "") e.centre = "Choisissez le centre qui manque de sang.";
    const q = Number(quantite);
    if (!Number.isInteger(q) || q < 1 || q > PARAMETRES.quantiteMax) e.quantite = `Entre 1 et ${PARAMETRES.quantiteMax} poches.`;
    if (!echeance) e.echeance = "Indiquez une date.";
    else if (echeance < today()) e.echeance = "Cette date est déjà passée.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (ev: FormEvent) => {
    ev.preventDefault();
    if (!validate() || centreId === "") return;
    try {
      const res = await declarer.run({ centre_id: centreId, groupe_sanguin: groupe, quantite: Number(quantite), echeance });
      reports.save(kind, res.alerte);
      toast({
        tone: res.alerte.envoyees ? (res.alerte.echecs ? "warn" : "ok") : "warn",
        title: res.alerte.envoyees ? `${plural(res.alerte.envoyees, "donneur prévenu", "donneurs prévenus")}` : "Besoin déclaré, personne n'a pu être prévenu",
        description: res.alerte.envoyees
          ? `Besoin n°${res.besoin.id} enregistré${res.alerte.echecs ? `, ${plural(res.alerte.echecs, "message non remis", "messages non remis")}` : ""}.`
          : "Aucun donneur compatible, proche et disponible pour le moment.",
      });
      onClose();
      navigate(`/besoins/${res.besoin.id}`);
    } catch {
      /* message shown in the sheet */
    }
  };

  return (
    <Dialog
      variant="sheet"
      open={open}
      onClose={onClose}
      title="Déclarer un besoin urgent"
      description="Les donneurs concernés sont prévenus dès l'enregistrement."
      footer={
        <>
          <Button variant="quiet" onClick={onClose}>Annuler</Button>
          <Button variant="primary" type="submit" form="form-besoin" loading={declarer.pending} icon="send">Déclarer et prévenir</Button>
        </>
      }
    >
      <form id="form-besoin" className="form" onSubmit={submit} noValidate>
        <div className="form-step">
          <span className="num" aria-hidden="true">1</span>
          <div>
            <h3>Où manque-t-il du sang ?</h3>
            <Field label="Centre de transfusion" error={errors.centre}>
              <select className="select" value={centreId} onChange={(e) => setCentreId(e.target.value ? Number(e.target.value) : "")} data-autofocus>
                {(centres.length === 0 || centreId === "") && <option value="">{centres.length === 0 ? "Chargement des centres…" : "Choisir un centre"}</option>}
                {centres.map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}
              </select>
            </Field>
          </div>
        </div>

        <div className="form-step">
          <span className="num" aria-hidden="true">2</span>
          <fieldset style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
            <legend><h3 style={{ marginTop: 3 }}>Quel groupe sanguin ?</h3></legend>
            <div className="choice-grid">
              {GROUPES.map((g) => (
                <label key={g} className="choice">
                  <input type="radio" name="groupe" value={g} checked={groupe === g} onChange={() => setGroupe(g)} />
                  <span>{g}</span>
                </label>
              ))}
            </div>
            <div className="stack-2" style={{ marginTop: 16 }}>
              <span className="xsmall muted">Peuvent donner pour {groupe} :</span>
              <CompatMatrix receveur={groupe} compact />
            </div>
          </fieldset>
        </div>

        <div className="form-step">
          <span className="num" aria-hidden="true">3</span>
          <div>
            <h3>Combien, et pour quand ?</h3>
            <div className="form-row">
              <Field label="Poches nécessaires" error={errors.quantite}>
                <input className="input" type="number" inputMode="numeric" min={1} max={PARAMETRES.quantiteMax} value={quantite} onChange={(e) => setQuantite(e.target.value)} />
              </Field>
              <Field label="Au plus tard le" error={errors.echeance}>
                <input className="input" type="date" min={today()} value={echeance} onChange={(e) => setEcheance(e.target.value)} />
              </Field>
            </div>
          </div>
        </div>

        <div className="notice" data-tone="blush">
          <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 1.8C5.6 5.1 3.8 7.4 3.8 9.8a4.2 4.2 0 0 0 8.4 0C12.2 7.4 10.4 5.1 8 1.8z" fill="var(--blood)" /></svg>
          <span className="grow">
            Seront prévenus les donneurs <b>{groupesCompatibles(groupe).join(", ")}</b> à moins de {PARAMETRES.rayonKm} km
            {centre ? ` du ${centre.nom}` : ""}, qui n'ont pas donné depuis {PARAMETRES.delaiEntreDonsJours} jours ni été sollicités cette semaine.
            {echeance && echeance >= today() ? ` Ils pourront venir jusqu'au ${formatDate(echeance)}.` : ""}
          </span>
        </div>

        {declarer.error != null && (
          <div className="notice" data-tone="danger" role="alert">
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="7" fill="currentColor" /></svg>
            <span className="grow"><strong>Le serveur a refusé la déclaration.</strong> {declarer.error instanceof Error ? declarer.error.message : ""}</span>
          </div>
        )}
      </form>
    </Dialog>
  );
}
