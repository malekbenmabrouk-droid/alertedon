import { useMemo } from "react";
import { useQuery } from "./useQuery";
import { useApi } from "../services/DataSourceProvider";
import type { Centre, Donneur } from "../types/api";

/** Centres and donors, indexed by id, for screens that only hold foreign keys. */
export function useLookups() {
  const api = useApi();
  const q = useQuery(async () => {
    const [centres, donneurs] = await Promise.all([api.listCentres(), api.listDonneurs()]);
    return { centres, donneurs };
  }, [api]);

  return useMemo(() => {
    const centres = q.data?.centres ?? [];
    const donneurs = q.data?.donneurs ?? [];
    return {
      centres,
      donneurs,
      centre: new Map<number, Centre>(centres.map((c) => [c.id, c])),
      donneur: new Map<number, Donneur>(donneurs.map((d) => [d.id, d])),
      loading: q.loading,
      error: q.error,
      reload: q.reload,
    };
  }, [q.data, q.loading, q.error, q.reload]);
}
