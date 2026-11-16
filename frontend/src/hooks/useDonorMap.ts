import { useQuery } from "./useQuery";
import { useApi } from "../services/DataSourceProvider";
import type { Alerte } from "../types/api";
import type { MapDonor } from "../components/viz/TunisiaMap";

/**
 * Donor dots for the map, coloured by their answer to the given alerts.
 * Returns null when the data source cannot expose positions (HTTP API).
 */
export function useDonorMap(alertes: Alerte[] | undefined) {
  const api = useApi();
  const q = useQuery(async () => (api.positionsDonneurs ? api.positionsDonneurs() : null), [api]);
  if (q.data === null) return null;
  const state = new Map<number, MapDonor["state"]>();
  for (const a of alertes ?? []) {
    if (a.statut === "ACCEPTEE") state.set(a.donneur_id, "accepted");
    else if (a.statut === "ENVOYEE" && state.get(a.donneur_id) !== "accepted") state.set(a.donneur_id, "alerted");
  }
  return (q.data ?? []).map((p) => ({ ...p, state: state.get(p.id) ?? "idle" }));
}
