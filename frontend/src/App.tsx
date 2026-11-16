import { HashRouter, Link, Navigate, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { ToastProvider } from "./components/Toasts";
import { EmptyState } from "./components/ui";
import { DataSourceProvider } from "./services/DataSourceProvider";
import { DonorSessionProvider } from "./services/DonorSession";
import type { AlerteDonApi } from "./services/client";
import { TourProvider } from "./features/tour/TourProvider";
import { DashboardPage } from "./features/dashboard/DashboardPage";
import { BesoinsPage } from "./features/besoins/BesoinsPage";
import { BesoinDetailPage } from "./features/besoins/BesoinDetailPage";
import { DonneursPage } from "./features/donneurs/DonneursPage";
import { EspaceDonneurPage } from "./features/espace-donneur/EspaceDonneurPage";
import { InscriptionPage } from "./features/espace-donneur/InscriptionPage";
import { ConnexionPage } from "./features/espace-donneur/ConnexionPage";
import { ValidationPage } from "./features/validation/ValidationPage";

function NotFound() {
  return (
    <div className="page">
      <EmptyState art="search" title="Cette page n'existe pas" action={<Link className="btn btn-secondary" to="/">Revenir à l'accueil</Link>} />
    </div>
  );
}

export function App({ api }: { api?: AlerteDonApi }) {
  return (
    <ToastProvider>
      <DataSourceProvider override={api}>
        <DonorSessionProvider>
        <HashRouter>
          <TourProvider>
            <Routes>
              <Route element={<Layout />}>
                <Route index element={<DashboardPage />} />
                <Route path="besoins" element={<BesoinsPage />} />
                <Route path="besoins/:id" element={<BesoinDetailPage />} />
                <Route path="donneurs" element={<DonneursPage />} />
                <Route path="donneur" element={<EspaceDonneurPage />} />
                <Route path="donneur/inscription" element={<InscriptionPage />} />
                <Route path="donneur/connexion" element={<ConnexionPage />} />
                <Route path="espace-donneur" element={<Navigate to="/donneur" replace />} />
                <Route path="validation" element={<ValidationPage />} />
                <Route path="*" element={<NotFound />} />
              </Route>
            </Routes>
          </TourProvider>
        </HashRouter>
        </DonorSessionProvider>
      </DataSourceProvider>
    </ToastProvider>
  );
}
