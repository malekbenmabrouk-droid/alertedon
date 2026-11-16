import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { DataTable, type Column } from "../../components/DataTable";
import { Icon } from "../../components/Icon";
import { Button, EmptyState, ErrorState, Meter, PageIntro, Seal, SkeletonRows } from "../../components/ui";
import { useQuery } from "../../hooks/useQuery";
import { useApi } from "../../services/DataSourceProvider";
import { download, toCsv } from "../../lib/csv";
import { plural, today } from "../../lib/format";
import { GROUPES, type StatutBesoin, type SuiviBesoin } from "../../types/api";
import { DeclarerBesoinDialog } from "./DeclarerBesoinDialog";
import { Echeance, Reponses, StatutBesoin as StatutCell } from "./shared";

type Filtre = "tous" | StatutBesoin;

export function BesoinsPage() {
  const api = useApi();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const suivi = useQuery(() => api.listSuivi(), [api]);
  const [statut, setStatut] = useState<Filtre>("tous");
  const [q, setQ] = useState("");
  const centre = params.get("centre") ?? "";
  const open = params.get("nouveau") === "1";

  const setCentre = (c: string) => setParams(c ? { centre: c } : {});
  const all = suivi.data ?? [];
  const centres = useMemo(() => [...new Set(all.map((b) => b.centre))].sort(), [all]);
  const count = (s: Filtre) => all.filter((b) => (s === "tous" || b.statut === s) && (!centre || b.centre === centre)).length;
  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return all.filter((b) =>
      (statut === "tous" || b.statut === statut) &&
      (!centre || b.centre === centre) &&
      (!needle || `${b.besoin_id} ${b.centre} ${b.groupe_sanguin}`.toLowerCase().includes(needle)));
  }, [all, statut, centre, q]);

  const columns: Column<SuiviBesoin>[] = [
    {
      key: "besoin", header: "Besoin", sortValue: (b) => GROUPES.indexOf(b.groupe_sanguin),
      cell: (b) => (
        <div className="row gap-3">
          <Seal groupe={b.groupe_sanguin} />
          <div style={{ minWidth: 0 }}>
            <div className="primary truncate">{b.centre}</div>
            <div className="secondary">Besoin n°{b.besoin_id}</div>
          </div>
        </div>
      ),
    },
    { key: "echeance", header: "Échéance", className: "nowrap", cell: (b) => <Echeance date={b.echeance} statut={b.statut} />, sortValue: (b) => b.echeance },
    {
      key: "collecte", header: "Collecte", sortValue: (b) => b.progression,
      cell: (b) => (
        <div>
          <Meter value={b.progression} label={`Besoin ${b.besoin_id} : ${b.quantite_collectee} poches sur ${b.quantite}`} />
          <div className="secondary">{b.quantite_collectee} sur {b.quantite} poches</div>
        </div>
      ),
    },
    { key: "reponses", header: "Réponses", hideOnMobile: true, cell: (b) => <Reponses s={b} />, sortValue: (b) => b.taux_reponse },
    { key: "statut", header: "État", hideOnMobile: true, cell: (b) => <StatutCell statut={b.statut} />, sortValue: (b) => b.statut },
  ];

  const exportCsv = () =>
    download(`besoins-${today()}.csv`, toCsv(rows, [
      { header: "N°", value: (b) => b.besoin_id },
      { header: "Centre", value: (b) => b.centre },
      { header: "Groupe", value: (b) => b.groupe_sanguin },
      { header: "Statut", value: (b) => b.statut },
      { header: "Échéance", value: (b) => b.echeance },
      { header: "Demandé", value: (b) => b.quantite },
      { header: "Collecté", value: (b) => b.quantite_collectee },
      { header: "Prévenus", value: (b) => b.alertes_envoyees },
      { header: "Échecs d'envoi", value: (b) => b.alertes_en_echec },
      { header: "Acceptées", value: (b) => b.acceptees },
      { header: "Déclinées", value: (b) => b.declinees },
      { header: "Sans réponse", value: (b) => b.sans_reponse },
      { header: "Dons", value: (b) => b.dons },
      { header: "Taux de réponse", value: (b) => b.taux_reponse },
    ]));

  const filtered = statut !== "tous" || !!centre || !!q;

  return (
    <div className="page">
      <PageIntro
        overline="Déclarer · suivre"
        title="Besoins"
        lede="Chaque besoin déclaré prévient aussitôt les donneurs compatibles et proches. Suivez ici leurs réponses et la collecte, poche par poche."
        actions={
          <>
            <Button icon="download" onClick={exportCsv} disabled={!rows.length}>Exporter</Button>
            <Button variant="primary" icon="plus" shortcut="N" onClick={() => setParams({ nouveau: "1" })} data-tour="declarer">Déclarer un besoin</Button>
          </>
        }
      />

      <section aria-label="Liste des besoins">
        <div className="toolbar">
          <div className="tabs" role="group" aria-label="Filtrer par état">
            {([["tous", "Tous"], ["OUVERT", "En cours"], ["CLOTURE", "Couverts"]] as const).map(([k, l]) => (
              <button key={k} type="button" aria-pressed={statut === k} onClick={() => setStatut(k)}>
                {l}<span className="count">{suivi.data ? count(k) : ""}</span>
              </button>
            ))}
          </div>
          <span className="grow" />
          <div className="search">
            <Icon name="search" />
            <input className="input" type="search" placeholder="Centre, groupe, numéro…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Rechercher un besoin" />
          </div>
          <select className="select compact" value={centre} onChange={(e) => setCentre(e.target.value)} aria-label="Filtrer par centre">
            <option value="">Tous les centres</option>
            {centres.map((c) => <option key={c}>{c}</option>)}
          </select>
          <Button variant="quiet" size="sm" iconOnly icon="refresh" onClick={suivi.reload} loading={suivi.loading && !!suivi.data} aria-label="Actualiser" title="Actualiser" />
        </div>

        {suivi.loading && !suivi.data ? (
          <SkeletonRows cols={5} />
        ) : suivi.error ? (
          <ErrorState error={suivi.error} onRetry={suivi.reload} />
        ) : (
          <>
            <DataTable
              caption="Besoins et leur suivi"
              rows={rows}
              columns={columns}
              rowKey={(b) => b.besoin_id}
              onRowClick={(b) => navigate(`/besoins/${b.besoin_id}`)}
              rowLabel={(b) => `Besoin ${b.besoin_id}, ${b.groupe_sanguin}, ${b.centre}`}
              initialSort={{ key: "echeance", dir: "asc" }}
              empty={
                filtered ? (
                  <EmptyState art="search" title="Rien ne correspond" action={<Button size="sm" onClick={() => { setStatut("tous"); setCentre(""); setQ(""); }}>Tout afficher</Button>}>
                    Aucun besoin pour ces filtres.
                  </EmptyState>
                ) : (
                  <EmptyState art="drop" title="Aucun besoin déclaré" action={<Button variant="primary" icon="plus" onClick={() => setParams({ nouveau: "1" })}>Déclarer un besoin</Button>}>
                    Un besoin précise le groupe manquant, le nombre de poches et l'échéance.
                  </EmptyState>
                )
              }
            />
            {rows.length > 0 && (
              <div className="ledger-foot">
                <span>{plural(rows.length, "besoin")}{filtered ? ` sur ${all.length}` : ""}</span>
                <span className="sm-hide">Cliquez sur un en-tête pour trier · Entrée pour ouvrir</span>
              </div>
            )}
          </>
        )}
      </section>
      <DeclarerBesoinDialog open={open} onClose={() => setParams(centre ? { centre } : {})} preset={centre ? { centreNom: centre } : undefined} />
    </div>
  );
}
