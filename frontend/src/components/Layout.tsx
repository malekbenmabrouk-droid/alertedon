import { useEffect, useMemo, useState, type ReactNode } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Icon, type IconName } from "./Icon";
import { Button, EmptyState } from "./ui";
import { CommandPalette, type Command } from "./CommandPalette";
import { Dialog } from "./Dialog";
import { ErrorBoundary } from "./ErrorBoundary";
import { SourceSwitcher } from "./SourceSwitcher";
import { useHotkeys } from "../hooks/useHotkeys";
import { useOnline } from "../hooks/useOnline";
import { useTheme } from "../hooks/useTheme";
import { useDataSource } from "../services/DataSourceProvider";
import { useTour } from "../features/tour/TourProvider";

interface NavItem { to: string; label: string; short: string; icon: IconName; key: string; end?: boolean }

// Agent of the transfusion centre: UC2, UC3 (included), UC5, UC6, plus the donor registry and the validation report.
const NAV_CENTRE: NavItem[] = [
  { to: "/", label: "Aujourd'hui", short: "Aujourd'hui", icon: "overview", key: "o", end: true },
  { to: "/besoins", label: "Besoins", short: "Besoins", icon: "drop", key: "b" },
  { to: "/donneurs", label: "Donneurs", short: "Donneurs", icon: "users", key: "d" },
  { to: "/validation", label: "Validation", short: "Validation", icon: "shield", key: "v" },
];

// Donor: UC1 and UC4.
const NAV_DONNEUR: NavItem[] = [
  { to: "/donneur", label: "Mon espace", short: "Mon espace", icon: "inbox", key: "e", end: true },
];

const TITLES: [RegExp, string][] = [
  [/^\/besoins\/\d+/, "Besoin"],
  [/^\/besoins/, "Besoins"],
  [/^\/donneurs/, "Registre des donneurs"],
  [/^\/donneur\/inscription/, "Devenir donneur"],
  [/^\/donneur\/connexion/, "Retrouver mon espace"],
  [/^\/donneur/, "Espace donneur"],
  [/^\/validation/, "Validation"],
  [/^\/$/, "Aujourd'hui"],
];

export const isDonorPath = (path: string) => path === "/donneur" || path.startsWith("/donneur/");

const SHORTCUTS: [string[], string][] = [
  [["Ctrl", "K"], "Rechercher une action ou un écran"],
  [["N"], "Déclarer un besoin (espace centre)"],
  [["G", "O"], "Aujourd'hui"],
  [["G", "B"], "Besoins"],
  [["G", "D"], "Registre des donneurs"],
  [["G", "V"], "Validation"],
  [["G", "E"], "Espace donneur"],
  [["T"], "Thème clair ou sombre"],
  [["?"], "Cette aide"],
];

function Wordmark() {
  return (
    <NavLink to="/" className="wordmark" aria-label="AlerteDon, accueil">
      <svg width="22" height="28" viewBox="0 0 22 28" aria-hidden="true">
        <path d="M11 1C11 1 1.5 12.6 1.5 18.7a9.5 9.5 0 0 0 19 0C20.5 12.6 11 1 11 1Z" fill="var(--blood)" />
        <path d="M6.5 19.5h2.6l1.4-2.6 2 5 1.6-3.4h1.6" fill="none" stroke="var(--ink-on-color)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className="wordmark-name">Alerte<em>Don</em></span>
    </NavLink>
  );
}

export function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const online = useOnline();
  const { theme, toggle } = useTheme();
  const { api, kind, setKind, health } = useDataSource();
  const tour = useTour();
  const [palette, setPalette] = useState(false);
  const [help, setHelp] = useState(false);

  const donor = isDonorPath(location.pathname);
  const nav = donor ? NAV_DONNEUR : NAV_CENTRE;
  const title = TITLES.find(([re]) => re.test(location.pathname))?.[1] ?? "AlerteDon";
  useEffect(() => {
    document.title = `${title} · AlerteDon`;
    window.scrollTo({ top: 0 });
  }, [title, location.pathname]);

  const commands = useMemo<Command[]>(() => [
    ...NAV_CENTRE.map((n) => ({ id: `nav-${n.key}`, label: n.label, group: "Centre de transfusion", icon: n.icon, keys: ["G", n.key.toUpperCase()], run: () => navigate(n.to) })),
    { id: "new-besoin", label: "Déclarer un besoin urgent", group: "Centre de transfusion", icon: "plus", keys: ["N"], keywords: "uc2 alerte sang", run: () => navigate("/besoins?nouveau=1") },
    { id: "run-validation", label: "Valider les cas d'utilisation", group: "Centre de transfusion", icon: "shield", keywords: "tests scénarios", run: () => navigate("/validation") },
    { id: "nav-donneur", label: "Mon espace donneur", group: "Donneur", icon: "inbox", keys: ["G", "E"], run: () => navigate("/donneur") },
    { id: "devenir", label: "Devenir donneur", group: "Donneur", icon: "heart", keywords: "uc1 inscription s'inscrire", run: () => navigate("/donneur/inscription") },
    { id: "tour", label: "Visite guidée en deux minutes", group: "Aide", icon: "play", keywords: "démo découverte", run: tour.start },
    { id: "theme", label: theme === "dark" ? "Thème clair" : "Thème sombre", group: "Préférences", icon: theme === "dark" ? "sun" : "moon", keys: ["T"], run: toggle },
    { id: "source", label: kind === "demo" ? "Utiliser l'API FastAPI" : "Utiliser la démonstration", group: "Préférences", icon: "database", run: () => setKind(kind === "demo" ? "api" : "demo") },
    { id: "help", label: "Raccourcis clavier", group: "Préférences", icon: "keyboard", keys: ["?"], run: () => setHelp(true) },
  ], [navigate, tour.start, theme, toggle, kind, setKind]);

  useHotkeys({
    "mod+k": () => setPalette((p) => !p),
    n: () => !isDonorPath(location.pathname) && navigate("/besoins?nouveau=1"),
    t: toggle,
    "?": () => setHelp(true),
    ...Object.fromEntries([...NAV_CENTRE, ...NAV_DONNEUR].map((n) => [`g ${n.key}`, () => navigate(n.to)])),
  });

  let body: ReactNode = <Outlet />;
  if (!api) {
    body = (
      <div className="page" role="status" aria-label="Préparation des données">
        <EmptyState title="Préparation de la démonstration…">Les données d'exemple sont générées avec les règles du serveur.</EmptyState>
      </div>
    );
  } else if (kind === "api" && health === "down") {
    body = (
      <>
        <div className="page" style={{ paddingBottom: 0 }}>
          <div className="notice" data-tone="danger" role="alert">
            <Icon name="wifiOff" />
            <span className="grow">
              <strong>Le serveur ne répond pas.</strong> Lancez <code>python -m uvicorn app.main:app --reload</code> à la racine du dépôt, ou continuez avec la démonstration.
            </span>
            <Button size="sm" variant="ink" onClick={() => setKind("demo")}>Passer en démonstration</Button>
          </div>
        </div>
        <Outlet />
      </>
    );
  }

  return (
    <>
      <a className="skip-link" href="#contenu">Aller au contenu</a>
      {!online && (
        <div className="offline" role="status">
          <Icon name="wifiOff" size={14} /> Hors ligne. {kind === "demo" ? "La démonstration continue de fonctionner." : "Les appels au serveur échoueront jusqu'au retour du réseau."}
        </div>
      )}
      <header className="masthead">
        <div className="masthead-inner">
          <Wordmark />
          <nav className="space-switch" aria-label="Espace">
            <NavLink to="/" className={() => (donor ? "" : "active")} aria-current={donor ? undefined : "true"}>Centre de transfusion</NavLink>
            <NavLink to="/donneur" className={() => (donor ? "active" : "")} aria-current={donor ? "true" : undefined}>Donneur</NavLink>
          </nav>
          <nav className="mainnav" aria-label={donor ? "Navigation de l'espace donneur" : "Navigation du centre"}>
            {nav.map((n) => (
              <NavLink key={n.to} to={n.to} end={n.end}>{n.label}</NavLink>
            ))}
          </nav>
          <div className="masthead-tools">
            <SourceSwitcher />
            <Button variant="quiet" size="sm" iconOnly icon="search" aria-label="Rechercher (Ctrl K)" title="Rechercher (Ctrl K)" onClick={() => setPalette(true)} />
            <Button variant="quiet" size="sm" iconOnly icon={theme === "dark" ? "sun" : "moon"} aria-label={theme === "dark" ? "Thème clair" : "Thème sombre"} onClick={toggle} />
            <Button variant="quiet" size="sm" iconOnly icon="keyboard" aria-label="Raccourcis clavier" className="sm-hide" onClick={() => setHelp(true)} />
          </div>
        </div>
      </header>

      <main id="contenu" tabIndex={-1}>
        <ErrorBoundary resetKey={location.pathname}>{body}</ErrorBoundary>
      </main>

      <nav className="tabbar" aria-label="Navigation" style={{ gridTemplateColumns: `repeat(${nav.length + 1}, 1fr)` }}>
        {nav.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.end}>
            <Icon name={n.icon} size={20} />
            {n.short}
          </NavLink>
        ))}
        <NavLink to={donor ? "/" : "/donneur"} end>
          <Icon name={donor ? "overview" : "heart"} size={20} />
          {donor ? "Espace centre" : "Donneur"}
        </NavLink>
      </nav>

      <CommandPalette open={palette} onClose={() => setPalette(false)} commands={commands} />
      <Dialog open={help} onClose={() => setHelp(false)} title="Raccourcis clavier" description="Les raccourcis d'une touche sont désactivés pendant la saisie.">
        <dl className="dl" style={{ rowGap: 12 }}>
          {SHORTCUTS.map(([keys, label]) => (
            <div key={label} style={{ display: "contents" }}>
              <dt className="row" style={{ gap: 4 }}>{keys.map((k) => <kbd key={k}>{k}</kbd>)}</dt>
              <dd>{label}</dd>
            </div>
          ))}
        </dl>
      </Dialog>
    </>
  );
}
