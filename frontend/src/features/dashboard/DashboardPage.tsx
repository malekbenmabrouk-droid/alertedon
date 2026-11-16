import { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Icon } from "../../components/Icon";
import { Button, EmptyState, ErrorState, SectionHead, Seal, Skeleton } from "../../components/ui";
import { BloodDrop } from "../../components/viz/BloodDrop";
import { TunisiaMap, type MapCentre } from "../../components/viz/TunisiaMap";
import { useDonorMap } from "../../hooks/useDonorMap";
import { useLookups } from "../../hooks/useLookups";
import { useQuery } from "../../hooks/useQuery";
import { useApi } from "../../services/DataSourceProvider";
import { PARAMETRES } from "../../domain/rules";
import { formatDate, formatRelative, plural } from "../../lib/format";
import type { Alerte, SuiviBesoin } from "../../types/api";
import { delai } from "../besoins/shared";
import { joursAvant } from "../besoins/time";
import { useTour } from "../tour/TourProvider";

const NOMBRES = ["Aucun", "Un", "Deux", "Trois", "Quatre", "Cinq", "Six", "Sept", "Huit", "Neuf", "Dix"];
const enLettres = (n: number) => NOMBRES[n] ?? String(n);

export function DashboardPage() {
  const api = useApi();
  const navigate = useNavigate();
  const tour = useTour();
  const lookups = useLookups();
  const data = useQuery(async () => {
    const suivi = await api.listSuivi();
    const alertes = (await Promise.all(suivi.map((s) => api.alertesDuBesoin(s.besoin_id)))).flat();
    return { suivi, alertes };
  }, [api]);

  const suivi = data.data?.suivi ?? [];
  const ouverts = suivi.filter((b) => b.statut === "OUVERT").sort((a, b) => a.echeance.localeCompare(b.echeance));
  const ouvertsIds = new Set(ouverts.map((b) => b.besoin_id));
  const alertesOuvertes = (data.data?.alertes ?? []).filter((a) => ouvertsIds.has(a.besoin_id));
  const donors = useDonorMap(alertesOuvertes);

  const k = useMemo(() => {
    const recues = suivi.reduce((n, b) => n + b.alertes_envoyees, 0);
    const reponses = suivi.reduce((n, b) => n + b.acceptees + b.declinees, 0);
    return {
      recues,
      acceptees: suivi.reduce((n, b) => n + b.acceptees, 0),
      taux: recues ? reponses / recues : 0,
      collecte: suivi.reduce((n, b) => n + b.quantite_collectee, 0),
      demande: suivi.reduce((n, b) => n + b.quantite, 0),
      echecs: suivi.reduce((n, b) => n + b.alertes_en_echec, 0),
      prevenusOuverts: ouverts.reduce((n, b) => n + b.alertes_envoyees, 0),
      manquent: ouverts.reduce((n, b) => n + b.quantite - b.quantite_collectee, 0),
    };
  }, [suivi, ouverts]);

  const centres: MapCentre[] = lookups.centres.map((c) => {
    const mine = ouverts.filter((b) => b.centre === c.nom);
    return { ...c, ouverts: mine.length, urgent: mine.some((b) => joursAvant(b.echeance) <= 2) };
  });

  const feed = useMemo(() => {
    const nom = (a: Alerte) => lookups.donneur.get(a.donneur_id)?.nom ?? `Donneur n°${a.donneur_id}`;
    const items: { key: string; at: string; tone?: string; who: string; text: string; href: string; when: string }[] = [];
    for (const a of data.data?.alertes ?? []) {
      if (a.statut === "ECHEC") {
        items.push({ key: `e${a.id}`, at: "9999", tone: "danger", who: nom(a), text: "n'a pas reçu le message", href: `/besoins/${a.besoin_id}`, when: "à relancer" });
      } else if (a.repondue_le) {
        items.push({ key: `r${a.id}`, at: a.repondue_le, tone: a.statut === "ACCEPTEE" ? "ok" : undefined, who: nom(a), text: a.statut === "ACCEPTEE" ? "vient donner" : "n'est pas disponible", href: `/besoins/${a.besoin_id}`, when: formatRelative(a.repondue_le) });
      }
    }
    return items.sort((x, y) => y.at.localeCompare(x.at)).slice(0, 6);
  }, [data.data, lookups.donneur]);

  if (data.error) return <div className="page"><ErrorState error={data.error} onRetry={data.reload} /></div>;
  const loading = !data.data;
  const top: SuiviBesoin | undefined = ouverts[0];
  const today = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long" }).format(new Date());

  return (
    <div className="page">
      <section className="hero" aria-labelledby="hero-title">
        <div>
          <div className="overline">{today}</div>
          <h1 id="hero-title">
            {loading ? <Skeleton width="80%" height={56} /> : ouverts.length === 0 ? (
              <>Aucun besoin en attente. <em>Les réserves tiennent.</em></>
            ) : (
              <><em>{enLettres(ouverts.length)}</em> {ouverts.length > 1 ? "besoins attendent" : "besoin attend"} des donneurs aujourd'hui.</>
            )}
          </h1>
          {!loading && (
            <p className="lede">
              {ouverts.length > 0 ? (
                <><b>{plural(k.prevenusOuverts, "donneur prévenu", "donneurs prévenus")}</b> pour ces besoins, il manque encore <b>{plural(k.manquent, "poche")}</b>. Au total, {plural(k.collecte, "poche collectée", "poches collectées")} sur {k.demande}.</>
              ) : (
                <>Les {plural(suivi.length, "besoin déclaré", "besoins déclarés")} sont couverts. Déclarez un nouveau besoin dès qu'un groupe vient à manquer.</>
              )}
            </p>
          )}
          <div className="actions">
            <Button variant="primary" icon="plus" shortcut="N" onClick={() => navigate("/besoins?nouveau=1")}>Déclarer un besoin</Button>
            <button type="button" className="text-link" onClick={tour.start}>Découvrir en deux minutes <Icon name="arrowRight" /></button>
          </div>
        </div>

        {loading ? (
          <div className="spotlight"><Skeleton width={110} height={140} /><div className="stack-4"><Skeleton width="60%" /><Skeleton /><Skeleton width="40%" /></div></div>
        ) : top ? (
          <Link to={`/besoins/${top.besoin_id}`} className="spotlight" data-tour="kpis" aria-label={`Besoin le plus urgent : ${top.groupe_sanguin} au ${top.centre}`}>
            <BloodDrop value={top.progression} size={108} label="Poches collectées" />
            <div>
              <div className="overline">Le plus urgent · {delai(top.echeance).text}</div>
              <h2>Sang <span style={{ color: "var(--blood)" }}>{top.groupe_sanguin}</span> pour le {top.centre}</h2>
              <div className="facts">
                <span><b>{top.quantite_collectee} / {top.quantite}</b> poches collectées</span>
                <span><b>{top.alertes_envoyees}</b> prévenus · <b>{top.acceptees}</b> en route</span>
                <span>Avant le {formatDate(top.echeance)}</span>
              </div>
              <span className="text-link more">Ouvrir le besoin <Icon name="arrowRight" /></span>
            </div>
          </Link>
        ) : (
          <div className="spotlight" data-tour="kpis">
            <BloodDrop value={1} size={96} label="Besoins couverts" />
            <div><div className="overline">Tout est couvert</div><h2>Merci aux donneurs.</h2></div>
          </div>
        )}
      </section>

      <dl className="figures" aria-label="Chiffres clés">
        <div className="figure">
          <dt>Donneurs prévenus</dt>
          <dd>{loading ? <Skeleton width={60} height={40} /> : k.recues}</dd>
          <div className={`note${k.echecs ? " alert" : ""}`}>{k.echecs ? `${plural(k.echecs, "message non remis", "messages non remis")}` : "Tous les messages sont remis"}</div>
        </div>
        <div className="figure">
          <dt>Ont répondu</dt>
          <dd>{loading ? <Skeleton width={60} height={40} /> : <>{Math.round(k.taux * 100)}<small> %</small></>}</dd>
          <div className="note">{k.acceptees} viennent donner</div>
        </div>
        <div className="figure">
          <dt>Poches collectées</dt>
          <dd>{loading ? <Skeleton width={60} height={40} /> : <>{k.collecte}<small> / {k.demande}</small></>}</dd>
          <div className="note">Sur l'ensemble des besoins</div>
        </div>
        <div className="figure">
          <dt>Donneurs inscrits</dt>
          <dd>{lookups.loading && !lookups.donneurs.length ? <Skeleton width={60} height={40} /> : lookups.donneurs.length}</dd>
          <div className="note">Dans {plural(lookups.centres.length, "zone de centre", "zones de centres")}</div>
        </div>
      </dl>

      <div className="cols">
        <div className="span-7 stack-10">
          <section aria-labelledby="fil">
            <SectionHead id="fil" title="Dernières réponses" />
            {loading ? (
              <div className="stack-4">{[1, 2, 3].map((i) => <Skeleton key={i} height={20} />)}</div>
            ) : feed.length === 0 ? (
              <p className="small muted">Aucune réponse pour l'instant. Elles apparaîtront ici dès qu'un donneur répond.</p>
            ) : (
              <ul className="feed">
                {feed.map((f) => (
                  <li key={f.key}>
                    <span className="avatar" data-tone={f.tone} aria-hidden="true">{f.who.split(" ").map((p) => p[0]).slice(0, 2).join("")}</span>
                    <Link to={f.href}><b>{f.who}</b> {f.text}</Link>
                    <span className="when" style={f.tone === "danger" ? { color: "var(--danger)" } : undefined}>{f.when}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-labelledby="regles">
            <SectionHead id="regles" title="Qui reçoit une alerte ?" />
            <ol className="steps">
              <li><span><b>Un sang compatible</b>Pour un besoin A+, les donneurs O−, O+, A− et A+ sont concernés.</span></li>
              <li><span><b>À moins de {PARAMETRES.rayonKm} km</b>Seuls les donneurs proches du centre sont prévenus.</span></li>
              <li><span><b>En mesure de donner</b>Au moins {PARAMETRES.delaiEntreDonsJours} jours depuis le dernier don.</span></li>
              <li><span><b>Pas sollicité récemment</b>Pas plus d'une alerte tous les {PARAMETRES.delaiAntiRelanceJours} jours.</span></li>
            </ol>
          </section>
        </div>
        <section className="span-5" aria-labelledby="carte">
          <SectionHead id="carte" title="Où le sang manque" aside={`Nord et Sahel · zones de ${PARAMETRES.rayonKm} km`} />
          <TunisiaMap
            title="Carte des centres de transfusion et des donneurs"
            centres={centres}
            donors={donors ?? []}
            onSelectCentre={(c) => navigate(`/besoins?centre=${encodeURIComponent(c.nom)}`)}
          />
          <div className="legend" style={{ marginTop: 12 }}>
            <span><i data-k="centre" /> Centre avec un besoin</span>
            <span><i data-k="zone" /> Zone d'alerte</span>
            {donors && <><span><i data-k="alerted" /> Prévenu</span><span><i data-k="accepted" /> Vient donner</span><span><i /> Donneur</span></>}
          </div>
          {!donors && <p className="xsmall muted" style={{ marginTop: 8 }}>L'API ne publie pas la position des donneurs : seuls les centres sont placés.</p>}
        </section>
      </div>

      <section aria-labelledby="ouverts">
        <SectionHead id="ouverts" title="Besoins en cours" aside={<Link to="/besoins" className="text-link">Tous les besoins <Icon name="arrowRight" /></Link>} />
        {loading ? <Skeleton height={80} /> : ouverts.length === 0 ? (
          <EmptyState art="drop" title="Aucun besoin en cours" action={<Button variant="primary" icon="plus" onClick={() => navigate("/besoins?nouveau=1")}>Déclarer un besoin</Button>}>
            Quand un groupe manque, déclarez-le : les donneurs compatibles et proches sont prévenus aussitôt.
          </EmptyState>
        ) : (
          <div className="needs-strip">
            {ouverts.map((b) => {
              const d = delai(b.echeance);
              return (
                <Link key={b.besoin_id} to={`/besoins/${b.besoin_id}`} className="need-tile">
                  <BloodDrop value={b.progression} size={48} label={`Besoin ${b.besoin_id}`} />
                  <div>
                    <div className="row"><Seal groupe={b.groupe_sanguin} size="sm" /><h3>{b.centre}</h3></div>
                    <p style={{ marginTop: 6 }}>{b.quantite_collectee}/{b.quantite} poches · {d.urgent ? <span style={{ color: "var(--blood-ink)", fontWeight: 600 }}>{d.text}</span> : d.text}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
