import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { DataTable, type Column } from "../../components/DataTable";
import { Icon } from "../../components/Icon";
import { Avatar, Button, EmptyState, ErrorState, SectionHead, Skeleton, SkeletonRows, Status } from "../../components/ui";
import { BloodDrop } from "../../components/viz/BloodDrop";
import { CompatMatrix } from "../../components/viz/CompatMatrix";
import { TunisiaMap } from "../../components/viz/TunisiaMap";
import { useToast } from "../../components/Toasts";
import { useDonorMap } from "../../hooks/useDonorMap";
import { useLookups } from "../../hooks/useLookups";
import { useMutation } from "../../hooks/useMutation";
import { useQuery } from "../../hooks/useQuery";
import { useApi, useDataSource } from "../../services/DataSourceProvider";
import { reports } from "../../services/reports";
import { PARAMETRES } from "../../domain/rules";
import { STATUT_ALERTE } from "../../lib/labels";
import { formatDate, formatDateTime, formatShort, plural, today } from "../../lib/format";
import { download, toCsv } from "../../lib/csv";
import type { Alerte, RapportAlerte } from "../../types/api";
import { EnregistrerDonDialog, type DonPreset } from "./EnregistrerDonDialog";
import { StatutBesoin, delai } from "./shared";
import { TargetingReport } from "./TargetingReport";

export function BesoinDetailPage() {
  const id = Number(useParams().id);
  const api = useApi();
  const { kind } = useDataSource();
  const toast = useToast();
  const lookups = useLookups();
  const data = useQuery(async () => {
    const [besoin, suivi, alertes] = await Promise.all([api.getBesoin(id), api.suivre(id), api.alertesDuBesoin(id)]);
    return { besoin, suivi, alertes };
  }, [api, id]);
  const donors = useDonorMap(data.data?.alertes);
  const [rapport, setRapport] = useState<RapportAlerte | null>(() => reports.get(kind, id));
  const [donPreset, setDonPreset] = useState<DonPreset | null>(null);
  const recibler = useMutation(api.alerter);
  const relancer = useMutation(api.relancer);

  const run = async (which: "cibler" | "relancer") => {
    try {
      const r = which === "cibler" ? await recibler.run(id) : await relancer.run(id);
      if (which === "cibler") {
        reports.save(kind, r);
        setRapport(r);
      }
      toast({
        tone: r.echecs ? "warn" : "ok",
        title: which === "cibler" ? (r.envoyees ? `${plural(r.envoyees, "nouveau donneur prévenu", "nouveaux donneurs prévenus")}` : "Personne de plus à prévenir") : `${plural(r.envoyees, "message remis", "messages remis")}`,
        description: which === "cibler" ? `${r.deja_alertes} déjà prévenus ne reçoivent pas de second message.` : r.echecs ? `${r.echecs} toujours non remis.` : undefined,
      });
    } catch (e) {
      toast({ tone: "danger", title: "Action refusée", description: e instanceof Error ? e.message : undefined });
    }
  };

  if (!Number.isInteger(id) || id < 1) {
    return <div className="page"><EmptyState art="search" title="Ce besoin n'existe pas" action={<Link className="btn btn-secondary" to="/besoins">Voir les besoins</Link>} /></div>;
  }
  if (data.error) {
    const notFound = (data.error as { status?: number }).status === 404;
    return (
      <div className="page">
        {notFound ? (
          <EmptyState art="search" title={`Le besoin n°${id} est introuvable`} action={<Link className="btn btn-secondary" to="/besoins">Voir les besoins</Link>}>
            Il a peut-être été créé avec une autre source de données.
          </EmptyState>
        ) : <ErrorState error={data.error} onRetry={data.reload} />}
      </div>
    );
  }
  if (!data.data) {
    return (
      <div className="page" role="status" aria-label="Chargement du besoin">
        <div className="need-hero"><Skeleton width={150} height={190} /><div className="stack-4"><Skeleton width="30%" /><Skeleton width="70%" height={48} /><Skeleton width="50%" /></div></div>
        <SkeletonRows rows={4} cols={5} />
      </div>
    );
  }

  const { besoin, suivi, alertes } = data.data;
  const centre = lookups.centre.get(besoin.centre_id);
  const ouvert = besoin.statut === "OUVERT";
  const d = delai(besoin.echeance);
  const relancables = alertes.filter((a) => a.statut === "ECHEC" && a.tentatives < PARAMETRES.maxTentatives).length;
  // The API has no list of donations per need: a donor who gave on or after
  // accepting has a last-donation date at least equal to the answer date.
  const aDonne = (a: Alerte) => {
    const dernier = lookups.donneur.get(a.donneur_id)?.date_dernier_don;
    return !!dernier && !!a.repondue_le && dernier >= a.repondue_le.slice(0, 10);
  };
  const nom = (a: Alerte) => lookups.donneur.get(a.donneur_id)?.nom ?? `Donneur n°${a.donneur_id}`;

  const columns: Column<Alerte>[] = [
    {
      key: "donneur", header: "Donneur", sortValue: (a) => nom(a),
      cell: (a) => {
        const dn = lookups.donneur.get(a.donneur_id);
        return (
          <div className="who">
            <Avatar name={nom(a)} />
            <div style={{ minWidth: 0 }}>
              <span className="primary truncate" style={{ display: "block" }}>{nom(a)}</span>
              <div className="secondary">{dn ? `Groupe ${dn.groupe_sanguin}` : ""}</div>
            </div>
          </div>
        );
      },
    },
    { key: "statut", header: "Réponse", cell: (a) => <Status tone={STATUT_ALERTE[a.statut].tone}>{STATUT_ALERTE[a.statut].label}</Status>, sortValue: (a) => a.statut },
    { key: "recue", header: "Prévenu", className: "nowrap", hideOnMobile: true, cell: (a) => <span className="small" title={formatDateTime(a.envoyee_le)}>{a.envoyee_le ? formatShort(a.envoyee_le) : `${a.tentatives} essai${a.tentatives > 1 ? "s" : ""}`}</span>, sortValue: (a) => a.envoyee_le ?? "" },
    { key: "creneau", header: "Rendez-vous", className: "nowrap", hideOnMobile: true, cell: (a) => a.creneau ? <span className="small strong">{formatShort(a.creneau)}</span> : <span className="small muted">—</span>, sortValue: (a) => a.creneau ?? "" },
    {
      key: "action", header: "", align: "right",
      cell: (a) => {
        if (a.statut !== "ACCEPTEE") return null;
        if (aDonne(a)) return <span className="tag" data-tone="ok">Don fait</span>;
        return ouvert ? <Button size="sm" onClick={() => setDonPreset({ donneur_id: a.donneur_id, centre_id: besoin.centre_id, besoin_id: besoin.id })}>Don reçu</Button> : null;
      },
    },
  ];

  const journal = [
    { at: besoin.cree_le, tone: "brand", what: <>Besoin déclaré <span>· {besoin.quantite} poches</span></>, w: 0 },
    ...alertes.filter((a) => a.envoyee_le).map((a) => ({ at: a.envoyee_le!, tone: "info", what: <>{nom(a)} <span>prévenu</span></>, w: 1 })),
    ...alertes.filter((a) => a.repondue_le).map((a) => ({ at: a.repondue_le!, tone: a.statut === "ACCEPTEE" ? "ok" : "neutral", what: <>{nom(a)} <span>{a.statut === "ACCEPTEE" ? "vient donner" : "n'est pas disponible"}</span></>, w: 2 })),
  ].sort((x, y) => y.at.localeCompare(x.at) || y.w - x.w);

  const exportCsv = () =>
    download(`besoin-${besoin.id}-${today()}.csv`, toCsv(alertes, [
      { header: "Alerte", value: (a) => a.id },
      { header: "Donneur", value: (a) => nom(a) },
      { header: "Statut", value: (a) => a.statut },
      { header: "Tentatives", value: (a) => a.tentatives },
      { header: "Prévenu le", value: (a) => a.envoyee_le },
      { header: "Répondu le", value: (a) => a.repondue_le },
      { header: "Rendez-vous", value: (a) => a.creneau },
    ]));

  return (
    <div className="page">
      <nav aria-label="Fil d'Ariane">
        <Link to="/besoins" className="text-link" style={{ color: "var(--ink-2)" }}><Icon name="arrowLeft" /> Tous les besoins</Link>
      </nav>

      <section className="need-hero" aria-labelledby="titre-besoin">
        <div className="drop-figure">
          <BloodDrop value={suivi.progression} size={150} label="Collecte" />
          <div className="big">{suivi.quantite_collectee}<small> / {suivi.quantite} poches</small></div>
        </div>
        <div>
          <div className="row gap-3"><span className="overline">Besoin n°{besoin.id}</span><StatutBesoin statut={besoin.statut} /></div>
          <h1 id="titre-besoin">Sang <em>{besoin.groupe_sanguin}</em> pour le {centre?.nom ?? suivi.centre}</h1>
          <div className="meta">
            <span><Icon name="calendar" /> Avant le {formatDate(besoin.echeance)}{ouvert && <> · <b style={{ color: d.urgent ? "var(--blood-ink)" : undefined }}>{d.text}</b></>}</span>
            <span><Icon name="clock" /> Déclaré le {formatDateTime(besoin.cree_le)}</span>
          </div>
          <div className="targets">
            <span className="xsmall muted">Donneurs concernés</span>
            <CompatMatrix receveur={besoin.groupe_sanguin} compact />
          </div>
          {ouvert && (
            <div className="actions">
              <Button variant="primary" icon="plus" onClick={() => setDonPreset({ centre_id: besoin.centre_id, besoin_id: besoin.id })}>Enregistrer un don</Button>
              {relancables > 0 && <Button icon="refresh" onClick={() => run("relancer")} loading={relancer.pending} data-tour="relancer">Renvoyer {plural(relancables, "message")}</Button>}
              <Button variant="quiet" icon="send" onClick={() => run("cibler")} loading={recibler.pending} title="Prévient les nouveaux donneurs devenus éligibles, sans doublon">Chercher d'autres donneurs</Button>
            </div>
          )}
        </div>
      </section>

      {!ouvert && (
        <div className="notice" data-tone="ok" role="status">
          <Icon name="check" />
          <span className="grow"><strong>Objectif atteint.</strong> Le besoin est couvert : plus aucune alerte ne part, et les donneurs qui répondent encore sont remerciés.</span>
        </div>
      )}

      <dl className="figures" aria-label="Indicateurs du besoin">
        <div className="figure"><dt>Donneurs prévenus</dt><dd>{suivi.alertes_envoyees}</dd><div className={`note${suivi.alertes_en_echec ? " alert" : ""}`}>{suivi.alertes_en_echec ? `${suivi.alertes_en_echec} message non remis` : "Tous les messages remis"}</div></div>
        <div className="figure"><dt>Viennent donner</dt><dd>{suivi.acceptees}</dd><div className="note">{suivi.declinees} indisponibles</div></div>
        <div className="figure"><dt>Sans réponse</dt><dd>{suivi.sans_reponse}</dd><div className="note">Taux de réponse {Math.round(suivi.taux_reponse * 100)} %</div></div>
        <div className="figure"><dt>Dons reçus</dt><dd>{suivi.dons}</dd><div className="note">{suivi.statut === "CLOTURE" ? "Objectif atteint" : `Encore ${plural(Math.max(suivi.quantite - suivi.quantite_collectee, 0), "poche")}`}</div></div>
      </dl>

      <div className="cols">
        <section className="span-7 roster" aria-labelledby="prevenus">
          <SectionHead id="prevenus" title="Les donneurs prévenus" aside={<button type="button" className="text-link" onClick={exportCsv} disabled={!alertes.length}><Icon name="download" /> CSV</button>} />
          <DataTable
            caption="Donneurs prévenus pour ce besoin"
            rows={alertes}
            columns={columns}
            rowKey={(a) => a.id}
            initialSort={{ key: "statut", dir: "asc" }}
            empty={
              <EmptyState art="people" title="Personne n'a encore été prévenu">
                Aucun donneur compatible, proche et disponible au moment de la déclaration. Inscrivez des donneurs, puis cherchez-en d'autres depuis cette page.
              </EmptyState>
            }
          />
          <div style={{ marginTop: 40 }}>
            <SectionHead title="Journal" />
            <ol className="timeline">
              {journal.slice(0, 10).map((t, i) => (
                <li key={`${t.at}-${i}`}>
                  <span className="dot" data-tone={t.tone} />
                  <span className="what">{t.what}</span>
                  <time dateTime={t.at}>{formatShort(t.at)}</time>
                </li>
              ))}
            </ol>
            {journal.length > 10 && <p className="xsmall muted">et {journal.length - 10} événements plus anciens</p>}
          </div>
        </section>

        <div className="span-5 stack-10">
          <section aria-labelledby="pourquoi" data-tour="rapport">
            <SectionHead id="pourquoi" title="Pourquoi ces donneurs" />
            {rapport ? (
              <TargetingReport rapport={rapport} />
            ) : (
              <p className="small soft">
                Le détail du tri est fourni au moment de l'envoi.{" "}
                {ouvert ? <>Lancez <button type="button" className="text-link" onClick={() => run("cibler")}>une nouvelle recherche</button> pour l'afficher : personne ne sera prévenu deux fois.</> : "Ce besoin est couvert."}
              </p>
            )}
          </section>

          {centre && (
            <section aria-labelledby="zone">
              <SectionHead id="zone" title="La zone d'alerte" aside={`${PARAMETRES.rayonKm} km`} />
              <TunisiaMap
                title={`Zone de ${PARAMETRES.rayonKm} km autour du ${centre.nom}`}
                centres={[{ ...centre, ouverts: ouvert ? 1 : 0, urgent: ouvert && d.urgent }]}
                donors={donors ?? []}
                focus={{ latitude: centre.latitude, longitude: centre.longitude, span: 0.42 }}
              />
              <div className="legend" style={{ marginTop: 12 }}>
                {donors ? <><span><i data-k="alerted" /> Prévenu</span><span><i data-k="accepted" /> Vient donner</span><span><i /> Autre donneur</span></> : <span>Positions des donneurs non publiées par l'API.</span>}
              </div>
            </section>
          )}
        </div>
      </div>

      <EnregistrerDonDialog open={donPreset !== null} onClose={() => setDonPreset(null)} preset={donPreset ?? undefined} />
    </div>
  );
}
