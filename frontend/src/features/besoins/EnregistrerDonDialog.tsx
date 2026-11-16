import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Dialog } from "../../components/Dialog";
import { Field } from "../../components/Field";
import { Button, Seal } from "../../components/ui";
import { useToast } from "../../components/Toasts";
import { useMutation } from "../../hooks/useMutation";
import { useLookups } from "../../hooks/useLookups";
import { useQuery } from "../../hooks/useQuery";
import { useApi } from "../../services/DataSourceProvider";
import { estCompatible, estEligible, prochaineEligibilite } from "../../domain/rules";
import { formatDate, today } from "../../lib/format";

export interface DonPreset {
  donneur_id?: number;
  centre_id?: number;
  besoin_id?: number;
}

export function EnregistrerDonDialog({ open, onClose, preset }: { open: boolean; onClose: () => void; preset?: DonPreset }) {
  const api = useApi();
  const toast = useToast();
  const { donneurs, centres } = useLookups();
  const ouverts = useQuery(() => api.listSuivi({ statut: "OUVERT" }), [api, open]);
  const enregistrer = useMutation(api.enregistrerDon);

  const [donneurId, setDonneurId] = useState<number | "">("");
  const [centreId, setCentreId] = useState<number | "">("");
  const [besoinId, setBesoinId] = useState<number | "">("");
  const [date, setDate] = useState(today());
  const [volume, setVolume] = useState("450");
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    setDonneurId(preset?.donneur_id ?? "");
    setCentreId(preset?.centre_id ?? centres[0]?.id ?? "");
    setBesoinId(preset?.besoin_id ?? "");
    setDate(today());
    setVolume("450");
    setErrors({});
    enregistrer.reset();
    // Reset only when the sheet opens.
  }, [open]);

  const centreNom = centreId === "" ? null : centres.find((c) => c.id === centreId)?.nom;
  const besoinsDuCentre = useMemo(() => (ouverts.data ?? []).filter((b) => centreNom && b.centre === centreNom), [ouverts.data, centreNom]);
  const besoin = besoinsDuCentre.find((b) => b.besoin_id === besoinId);
  const donneur = donneurs.find((d) => d.id === donneurId);

  const checks: { ok: boolean; text: string }[] = [];
  if (donneur) {
    checks.push(estEligible(donneur.date_dernier_don, date)
      ? { ok: true, text: donneur.date_dernier_don ? `Dernier don le ${formatDate(donneur.date_dernier_don)} : délai respecté.` : "Premier don." }
      : { ok: false, text: `Dernier don le ${formatDate(donneur.date_dernier_don)} : possible à partir du ${formatDate(prochaineEligibilite(donneur.date_dernier_don, date))}.` });
    if (besoin) {
      checks.push(estCompatible(donneur.groupe_sanguin, besoin.groupe_sanguin)
        ? { ok: true, text: `Un donneur ${donneur.groupe_sanguin} peut donner pour un besoin ${besoin.groupe_sanguin}.` }
        : { ok: false, text: `Un donneur ${donneur.groupe_sanguin} ne peut pas donner pour un besoin ${besoin.groupe_sanguin}.` });
    }
  }

  const submit = async (ev: FormEvent) => {
    ev.preventDefault();
    const e: Record<string, string> = {};
    if (donneurId === "") e.donneur = "Choisissez le donneur.";
    if (centreId === "") e.centre = "Choisissez le centre.";
    if (!date) e.date = "Indiquez la date du don.";
    else if (date > today()) e.date = "Un don s'enregistre une fois réalisé.";
    const v = Number(volume);
    if (!Number.isInteger(v) || v < 200 || v > 500) e.volume = "Entre 200 et 500 ml.";
    setErrors(e);
    if (Object.keys(e).length || donneurId === "" || centreId === "") return;
    try {
      const res = await enregistrer.run({ donneur_id: donneurId, centre_id: centreId, date_don: date, volume_ml: v, besoin_id: besoinId === "" ? null : besoinId });
      const b = res.besoin;
      toast({
        tone: "ok",
        title: b?.statut === "CLOTURE" ? "Besoin couvert, merci !" : "Don enregistré",
        description: b ? `${b.quantite_collectee} poche${b.quantite_collectee > 1 ? "s" : ""} sur ${b.quantite} pour le besoin n°${b.id}.` : "La date du dernier don du donneur est mise à jour.",
      });
      onClose();
    } catch {
      /* message shown in the sheet */
    }
  };

  return (
    <Dialog
      variant="sheet"
      open={open}
      onClose={onClose}
      title="Enregistrer un don"
      description="Le donneur ne sera plus sollicité pendant 56 jours, et la collecte du besoin avance."
      footer={
        <>
          <Button variant="quiet" onClick={onClose}>Annuler</Button>
          <Button variant="primary" type="submit" form="form-don" loading={enregistrer.pending} icon="check">Enregistrer</Button>
        </>
      }
    >
      <form id="form-don" className="form" onSubmit={submit} noValidate>
        <Field label="Donneur" error={errors.donneur}>
          <select className="select" value={donneurId} onChange={(e) => setDonneurId(e.target.value ? Number(e.target.value) : "")} data-autofocus>
            <option value="">Choisir…</option>
            {donneurs.map((d) => <option key={d.id} value={d.id}>{d.nom} · {d.groupe_sanguin}</option>)}
          </select>
        </Field>
        <div className="form-row">
          <Field label="Centre" error={errors.centre}>
            <select className="select" value={centreId} onChange={(e) => { setCentreId(e.target.value ? Number(e.target.value) : ""); setBesoinId(""); }}>
              {centres.map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}
            </select>
          </Field>
          <Field label="Pour le besoin" help={besoinsDuCentre.length ? "Facultatif" : "Aucun besoin en cours ici"}>
            <select className="select" value={besoinId} onChange={(e) => setBesoinId(e.target.value ? Number(e.target.value) : "")}>
              <option value="">Don spontané</option>
              {besoinsDuCentre.map((b) => <option key={b.besoin_id} value={b.besoin_id}>{b.groupe_sanguin} · n°{b.besoin_id} · {b.quantite_collectee}/{b.quantite}</option>)}
            </select>
          </Field>
        </div>
        <div className="form-row">
          <Field label="Date du don" error={errors.date}>
            <input className="input" type="date" max={today()} value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="Volume prélevé (ml)" error={errors.volume}>
            <input className="input" type="number" min={200} max={500} step={10} value={volume} onChange={(e) => setVolume(e.target.value)} />
          </Field>
        </div>
        {donneur && (
          <div className="notice" data-tone={checks.every((c) => c.ok) ? "ok" : "warn"} aria-live="polite">
            <Seal groupe={donneur.groupe_sanguin} size="sm" />
            <ul className="grow stack-2">
              {checks.map((c) => <li key={c.text}>{c.ok ? "✓ " : "✕ "}{c.text}</li>)}
            </ul>
          </div>
        )}
        {enregistrer.error != null && (
          <div className="notice" data-tone="danger" role="alert">
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="7" fill="currentColor" /></svg>
            <span className="grow"><strong>Don refusé.</strong> {enregistrer.error instanceof Error ? enregistrer.error.message : ""}</span>
          </div>
        )}
      </form>
    </Dialog>
  );
}
