import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Dialog } from "../../components/Dialog";
import { Field } from "../../components/Field";
import { Icon } from "../../components/Icon";
import { Button, EmptyState, ErrorState, SectionHead, Seal, Skeleton, Status } from "../../components/ui";
import { Ring } from "../../components/viz/Ring";
import { useToast } from "../../components/Toasts";
import { useLookups } from "../../hooks/useLookups";
import { useMutation } from "../../hooks/useMutation";
import { useQuery } from "../../hooks/useQuery";
import { useApi } from "../../services/DataSourceProvider";
import { useDonorSession } from "../../services/DonorSession";
import { maskEmail, maskPhone } from "../../lib/privacy";
import { AccueilDonneur } from "./AccueilDonneur";
import { STATUT_ALERTE } from "../../lib/labels";
import { addDays, formatDate, formatDateTime, formatRelative, toIsoLocal } from "../../lib/format";
import { eligibilite } from "../donneurs/eligibilite";
import { delai } from "../besoins/shared";
import type { Alerte, Besoin } from "../../types/api";

interface AlerteVue extends Alerte {
  besoin: Besoin | null;
}

const dayFmt = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "short" });

/** Up to six slots (9 h and 14 h) between now and the end of the deadline day. */
function creneaux(echeance: string) {
  const now = new Date();
  const limit = new Date(`${echeance}T23:59:59`);
  const out: { day: string; hour: string; value: string }[] = [];
  for (let i = 0; i < 7 && out.length < 6; i += 1) {
    for (const h of [9, 14]) {
      const d = addDays(now, i);
      d.setHours(h, 0, 0, 0);
      if (d > now && d <= limit && out.length < 6) out.push({ day: dayFmt.format(d), hour: `${h} h 00`, value: toIsoLocal(d).slice(0, 16) });
    }
  }
  return out;
}

export function EspaceDonneurPage() {
  const api = useApi();
  const toast = useToast();
  const { donneurs, centre, loading: lookLoading } = useLookups();
  const { donneurId: sessionId, fermer } = useDonorSession();
  const location = useLocation();
  const navigate = useNavigate();
  const bienvenue = (location.state as { bienvenue?: boolean } | null)?.bienvenue === true;
  const donneurId = sessionId ?? 0;
  const donneur = donneurs.find((d) => d.id === donneurId);

  const alertes = useQuery(async (): Promise<AlerteVue[]> => {
    if (!donneurId) return [];
    const list = await api.alertesDuDonneur(donneurId);
    const ids = [...new Set(list.map((a) => a.besoin_id))];
    const found = await Promise.all(ids.map((id) => api.getBesoin(id).catch(() => null)));
    const besoins = new Map(found.filter((b): b is Besoin => b !== null).map((b) => [b.id, b]));
    return list.map((a) => ({ ...a, besoin: besoins.get(a.besoin_id) ?? null }));
  }, [api, donneurId]);

  const repondre = useMutation((alerteId: number, accepte: boolean, creneau?: string) =>
    api.repondre(alerteId, { donneur_id: donneurId, accepte, creneau: creneau ? `${creneau}:00` : null }));

  const [acceptant, setAcceptant] = useState<AlerteVue | null>(null);
  const [creneau, setCreneau] = useState("");
  const [creneauErr, setCreneauErr] = useState<string | null>(null);

  const aTraiter = useMemo(() => (alertes.data ?? []).filter((a) => a.statut === "ENVOYEE" && a.besoin?.statut === "OUVERT"), [alertes.data]);
  const historique = useMemo(() => (alertes.data ?? []).filter((a) => !aTraiter.includes(a)), [alertes.data, aTraiter]);

  const decline = async (a: AlerteVue) => {
    try {
      await repondre.run(a.id, false);
      toast({ tone: "info", title: "C'est noté, merci de votre réponse", description: "Le centre sait qu'il ne doit pas compter sur vous cette fois." });
    } catch (e) {
      toast({ tone: "danger", title: "Réponse impossible", description: e instanceof Error ? e.message : undefined });
    }
  };

  const confirm = async () => {
    if (!acceptant) return;
    if (!creneau) return setCreneauErr("Choisissez un moment pour venir.");
    try {
      await repondre.run(acceptant.id, true, creneau);
      toast({ tone: "ok", title: "Merci, votre rendez-vous est pris", description: `${formatDateTime(creneau)} au ${centre.get(acceptant.besoin?.centre_id ?? 0)?.nom ?? "centre"}.` });
      setAcceptant(null);
    } catch (e) {
      setCreneauErr(e instanceof Error ? e.message : "Ce moment n'est pas possible.");
    }
  };

  const openAccept = (a: AlerteVue) => {
    setAcceptant(a);
    setCreneau(a.besoin ? creneaux(a.besoin.echeance)[0]?.value ?? "" : "");
    setCreneauErr(null);
  };

  if (!sessionId) return <AccueilDonneur />;
  if (!lookLoading && !donneur && donneurs.length > 0) {
    // The stored identity does not exist in this data source (e.g. after switching source).
    return <AccueilDonneur notice="Votre espace n'a pas été trouvé dans cette source de données. Identifiez-vous à nouveau." />;
  }

  const sortir = () => {
    fermer();
    navigate("/donneur");
  };

  const e = donneur ? eligibilite(donneur) : null;
  const prenom = donneur?.nom.split(" ")[0] ?? "";

  return (
    <div className="page">
      <div className="cols">
        <aside className="span-4 profile sticky-aside" aria-label="Profil du donneur">
          <div className="overline">Mon espace</div>
          {donneur ? (
            <>
              <h1 style={{ marginTop: 12 }}>Bonjour <em>{prenom}</em>.</h1>
              <div className="identity">
                <Ring value={e?.avancement ?? 0} size={112} tone={e?.ok ? "blood" : "ink"}
                  label={e?.ok ? "Vous pouvez donner" : `Encore ${e?.reste} jours de repos`}>
                  {e?.ok ? <><b>Prêt</b><small>à donner</small></> : <><b>J−{e?.reste}</b><small>de repos</small></>}
                </Ring>
                <Seal groupe={donneur.groupe_sanguin} size="lg" />
              </div>
              <dl className="dl" style={{ marginTop: 28 }}>
                <dt>Dernier don</dt><dd>{donneur.date_dernier_don ? formatDate(donneur.date_dernier_don) : "Aucun pour l'instant"}</dd>
                <dt>Prochain don</dt><dd>{e?.ok ? "Possible dès maintenant" : `À partir du ${formatDate(e?.depuis)}`}</dd>
                <dt>Prévenu par</dt><dd>{donneur.canal_prefere === "EMAIL" ? `e-mail · ${maskEmail(donneur.email)}` : `SMS · ${maskPhone(donneur.telephone)}`}</dd>
              </dl>
            </>
          ) : <Skeleton width="80%" height={48} />}
          <div className="row wrap gap-4" style={{ marginTop: 32 }}>
            <button type="button" className="text-link" onClick={sortir}>Se déconnecter</button>
          </div>
        </aside>

        <div className="span-8 stack-10">
          {bienvenue && (
            <div className="notice" data-tone="ok" role="status">
              <Icon name="check" />
              <span className="grow"><strong>Merci, vous êtes inscrit.</strong> Vous serez prévenu dès qu'un centre proche aura besoin de votre sang.</span>
            </div>
          )}
          <section aria-labelledby="demandes" data-tour="espace">
            <SectionHead id="demandes" title={aTraiter.length ? (aTraiter.length > 1 ? `${aTraiter.length} centres ont besoin de vous` : "Un centre a besoin de vous") : "Vos alertes"} />
            {alertes.loading && !alertes.data ? (
              <div className="letter"><div className="stack-4"><Skeleton width="30%" /><Skeleton width="70%" height={26} /><Skeleton /></div></div>
            ) : alertes.error ? (
              <ErrorState error={alertes.error} onRetry={alertes.reload} />
            ) : aTraiter.length === 0 ? (
              <EmptyState art="letter" title="Rien à faire pour l'instant">
                Vous serez prévenu seulement si un centre proche manque d'un sang compatible avec le vôtre, et si vous pouvez donner.
              </EmptyState>
            ) : (
              <div>
                {aTraiter.map((a) => {
                  const c = centre.get(a.besoin?.centre_id ?? 0);
                  const d = a.besoin ? delai(a.besoin.echeance) : null;
                  const reste = a.besoin ? a.besoin.quantite - a.besoin.quantite_collectee : 0;
                  return (
                    <article key={a.id} className="letter" aria-labelledby={`l${a.id}`}>
                      <div className="from"><span>{c?.nom ?? "Centre de transfusion"}</span><span>reçu {a.envoyee_le ? formatRelative(a.envoyee_le) : ""}</span></div>
                      <h3 id={`l${a.id}`}>Nous avons besoin de sang <em>{a.besoin?.groupe_sanguin}</em>{d ? `, ${d.text === "aujourd'hui" ? "aujourd'hui" : `avant le ${formatDate(a.besoin!.echeance)}`}` : ""}.</h3>
                      <p>
                        Votre groupe {donneur?.groupe_sanguin} est compatible et vous habitez à moins de 30 km. Il reste {reste} poche{reste > 1 ? "s" : ""} à réunir.
                        Si vous pouvez venir, choisissez un moment : le centre vous attendra.
                      </p>
                      <div className="actions">
                        <Button variant="primary" icon="heart" onClick={() => openAccept(a)}>Je viens donner</Button>
                        <Button onClick={() => decline(a)} disabled={repondre.pending}>Pas cette fois</Button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          <section aria-labelledby="historique">
            <SectionHead id="historique" title="Historique" />
            {historique.length === 0 ? (
              <p className="small muted">Vos réponses passées apparaîtront ici.</p>
            ) : (
              <ol className="timeline">
                {historique.map((a) => (
                  <li key={a.id}>
                    <span className="dot" data-tone={STATUT_ALERTE[a.statut].tone} />
                    <span className="what">
                      {centre.get(a.besoin?.centre_id ?? 0)?.nom ?? "Centre"} · sang {a.besoin?.groupe_sanguin}{" "}
                      <Status tone={STATUT_ALERTE[a.statut].tone}>{STATUT_ALERTE[a.statut].label}</Status>
                      {a.creneau && <span> · rendez-vous le {formatDateTime(a.creneau)}</span>}
                      {a.statut === "ENVOYEE" && a.besoin?.statut === "CLOTURE" && <span> · besoin couvert entre-temps</span>}
                    </span>
                    <time dateTime={a.repondue_le ?? a.envoyee_le ?? undefined}>{formatDate(a.repondue_le ?? a.envoyee_le)}</time>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>
      </div>

      <Dialog
        open={acceptant !== null}
        onClose={() => setAcceptant(null)}
        title="Quand pouvez-vous venir ?"
        description={acceptant?.besoin ? `${centre.get(acceptant.besoin.centre_id)?.nom ?? "Le centre"}, jusqu'au ${formatDate(acceptant.besoin.echeance)} inclus.` : undefined}
        footer={
          <>
            <Button variant="quiet" onClick={() => setAcceptant(null)}>Annuler</Button>
            <Button variant="primary" onClick={confirm} loading={repondre.pending} icon="check">Confirmer ma venue</Button>
          </>
        }
      >
        <div className="form">
          {acceptant?.besoin && (
            <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
              <legend className="visually-hidden">Moments proposés</legend>
              <div className="slots">
                {creneaux(acceptant.besoin.echeance).map((s) => (
                  <label key={s.value} className="slot">
                    <input type="radio" name="creneau" value={s.value} checked={creneau === s.value} onChange={() => { setCreneau(s.value); setCreneauErr(null); }} />
                    <span><b>{s.hour}</b>{s.day}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          )}
          <Field label="Un autre moment" error={creneauErr}>
            <input className="input" type="datetime-local" value={creneau} onChange={(ev) => { setCreneau(ev.target.value); setCreneauErr(null); }} />
          </Field>
          <p className="xsmall muted"><Icon name="clock" size={12} style={{ display: "inline", verticalAlign: "-2px" }} /> Comptez environ une heure sur place, dont dix minutes de prélèvement.</p>
        </div>
      </Dialog>
    </div>
  );
}
