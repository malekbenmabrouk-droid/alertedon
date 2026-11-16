import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { DataTable, type Column } from "../../components/DataTable";
import { Icon } from "../../components/Icon";
import { Avatar, Button, EmptyState, ErrorState, PageIntro, SectionHead, Seal, SkeletonRows, Status } from "../../components/ui";
import { Ring } from "../../components/viz/Ring";
import { useLookups } from "../../hooks/useLookups";
import { useDataSource } from "../../services/DataSourceProvider";
import { maskEmail, maskPhone } from "../../lib/privacy";
import { formatDate, plural, today } from "../../lib/format";
import { download, toCsv } from "../../lib/csv";
import { GROUPES, type Donneur, type GroupeSanguin } from "../../types/api";
import { eligibilite } from "./eligibilite";

type Elig = "tous" | "eligibles" | "repos";

function Distribution({ donneurs, active, onPick }: { donneurs: Donneur[]; active: GroupeSanguin | ""; onPick: (g: GroupeSanguin | "") => void }) {
  const stats = GROUPES.map((g) => {
    const list = donneurs.filter((d) => d.groupe_sanguin === g);
    return { g, total: list.length, ready: list.filter((d) => eligibilite(d).ok).length };
  });
  const max = Math.max(1, ...stats.map((s) => s.total));
  return (
    <div className="dist" role="group" aria-label="Donneurs par groupe sanguin">
      {stats.map((s) => (
        <button
          key={s.g}
          type="button"
          className="dist-col"
          aria-pressed={active === s.g}
          aria-label={`${s.g} : ${s.total} donneurs, ${s.ready} prêts à donner`}
          onClick={() => onPick(active === s.g ? "" : s.g)}
          style={{ border: 0, background: "none", padding: 0, cursor: "pointer", opacity: active && active !== s.g ? 0.4 : 1, transition: "opacity 200ms" }}
        >
          <span className="n">{s.total}</span>
          <span className="bars" style={{ height: `${(s.total / max) * 100}%` }}>
            <span className="ready" style={{ height: `${s.total ? (s.ready / s.total) * 100 : 0}%` }} />
            <span className="wait" style={{ height: `${s.total ? ((s.total - s.ready) / s.total) * 100 : 0}%` }} />
          </span>
          <span className="g">{s.g}</span>
        </button>
      ))}
    </div>
  );
}

export function DonneursPage() {
  const { donneurs, loading, error, reload } = useLookups();
  const { kind } = useDataSource();
  const [q, setQ] = useState("");
  const [groupe, setGroupe] = useState<GroupeSanguin | "">("");
  const [elig, setElig] = useState<Elig>("tous");

  const prets = donneurs.filter((d) => eligibilite(d).ok).length;
  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return donneurs.filter((d) => {
      if (groupe && d.groupe_sanguin !== groupe) return false;
      const ok = eligibilite(d).ok;
      if (elig === "eligibles" && !ok) return false;
      if (elig === "repos" && ok) return false;
      // Search by name or number only: contacts are not searchable by staff.
      return !needle || [d.nom, String(d.id)].some((v) => v.toLowerCase().includes(needle));
    });
  }, [donneurs, q, groupe, elig]);

  const columns: Column<Donneur>[] = [
    {
      key: "nom", header: "Donneur", sortValue: (d) => d.nom,
      cell: (d) => (
        <div className="row gap-3">
          <Avatar name={d.nom} />
          <div style={{ minWidth: 0 }}>
            <div className="primary truncate" title={d.nom}>{d.nom}</div>
            <div className="secondary">n°{d.id}</div>
          </div>
        </div>
      ),
    },
    { key: "groupe", header: "Groupe", cell: (d) => <Seal groupe={d.groupe_sanguin} size="sm" />, sortValue: (d) => GROUPES.indexOf(d.groupe_sanguin) },
    {
      key: "contact", header: "Prévenu par", hideOnMobile: true, cell: (d) => (
        <div>
          <div className="row small"><Icon name={d.canal_prefere === "EMAIL" ? "mail" : "phone"} size={14} />{d.canal_prefere === "EMAIL" ? "E-mail" : "SMS"}</div>
          <div className="secondary truncate">{d.canal_prefere === "EMAIL" ? maskEmail(d.email) : maskPhone(d.telephone)}</div>
        </div>
      ),
    },
    { key: "don", header: "Dernier don", className: "nowrap", hideOnMobile: true, cell: (d) => <span className="small">{d.date_dernier_don ? formatDate(d.date_dernier_don) : "Jamais"}</span>, sortValue: (d) => d.date_dernier_don ?? "" },
    {
      key: "elig", header: "Peut donner", sortValue: (d) => eligibilite(d).reste,
      cell: (d) => {
        const e = eligibilite(d);
        return e.ok ? <Status tone="ok">Oui</Status> : <Status>Dans {e.reste} j</Status>;
      },
    },
  ];

  const exportCsv = () => download(`donneurs-${today()}.csv`, toCsv(rows, [
    { header: "N°", value: (d) => d.id },
    { header: "Nom", value: (d) => d.nom },
    { header: "Groupe", value: (d) => d.groupe_sanguin },
    { header: "Canal", value: (d) => d.canal_prefere },
    { header: "Dernier don", value: (d) => d.date_dernier_don },
    { header: "Peut donner", value: (d) => (eligibilite(d).ok ? "oui" : "non") },
  ]));

  const filtered = !!q || !!groupe || elig !== "tous";

  return (
    <div className="page">
      <PageIntro
        overline="Centre de transfusion · consultation"
        title="Registre des donneurs"
        lede="Celles et ceux qui se sont inscrits pour être prévenus. Les donneurs s'inscrivent eux-mêmes depuis l'espace Donneur ; ici, le centre consulte qui peut répondre à un besoin."
        actions={<Button icon="download" onClick={exportCsv} disabled={!rows.length}>Exporter</Button>}
      />

      <div className="cols">
        <aside className="span-4 stack-10 sticky-aside" aria-label="Répartition des donneurs">
          <section>
            <SectionHead title="Par groupe" aside={groupe ? <button type="button" className="text-link" onClick={() => setGroupe("")}>Tous</button> : "Cliquez pour filtrer"} />
            <Distribution donneurs={donneurs} active={groupe} onPick={setGroupe} />
            <div className="legend" style={{ marginTop: 14 }}>
              <span><i style={{ background: "var(--blood)", borderRadius: 2 }} /> Peut donner</span>
              <span><i style={{ background: "var(--blush-2)", borderRadius: 2 }} /> Au repos</span>
            </div>
          </section>
          <section>
            <SectionHead title="Prêts à donner" />
            <div className="ready-block">
              <Ring value={donneurs.length ? prets / donneurs.length : 0} size={104} label={`${prets} donneurs sur ${donneurs.length} peuvent donner`}>
                <b>{prets}</b>
                <span className="xsmall muted">sur {donneurs.length}</span>
              </Ring>
              <p className="small soft">Un donneur se repose 56 jours entre deux dons de sang total. Pendant ce temps, il ne reçoit aucune alerte.</p>
            </div>
          </section>
        </aside>

        <section className="span-8" aria-label="Liste des donneurs">
          <div className="toolbar">
            <div className="tabs" role="group" aria-label="Disponibilité">
              {([["tous", "Tous"], ["eligibles", "Peuvent donner"], ["repos", "Au repos"]] as const).map(([k, l]) => (
                <button key={k} type="button" aria-pressed={elig === k} onClick={() => setElig(k)}>{l}</button>
              ))}
            </div>
            <span className="grow" />
            <div className="search">
              <Icon name="search" />
              <input className="input" type="search" placeholder="Nom ou numéro de donneur…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Rechercher un donneur" />
            </div>
          </div>
          {kind === "api" && loading && <p className="xsmall muted" style={{ marginBottom: 12 }}>L'API ne liste pas les donneurs : ils sont lus un à un, cela peut prendre quelques secondes.</p>}
          {loading && !donneurs.length ? <SkeletonRows cols={5} /> : error ? <ErrorState error={error} onRetry={reload} /> : (
            <>
              <DataTable
                caption="Donneurs inscrits"
                rows={rows}
                columns={columns}
                rowKey={(d) => d.id}
                initialSort={{ key: "nom", dir: "asc" }}
                empty={filtered ? (
                  <EmptyState art="search" title="Personne ne correspond" action={<Button size="sm" onClick={() => { setQ(""); setGroupe(""); setElig("tous"); }}>Tout afficher</Button>} />
                ) : (
                  <EmptyState art="people" title="Aucun donneur inscrit pour l'instant" action={<Link className="btn btn-secondary" to="/donneur/inscription">Ouvrir la page d'inscription</Link>}>
                    Les donneurs s'inscrivent eux-mêmes depuis l'espace Donneur. Partagez cette page autour de vous.
                  </EmptyState>
                )}
              />
              {rows.length > 0 && (
                <div className="ledger-foot">
                  <span>{plural(rows.length, "donneur")}{filtered ? ` sur ${donneurs.length}` : ""}</span>
                  <span className="sm-hide">Coordonnées masquées : les alertes sont envoyées par le système</span>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
