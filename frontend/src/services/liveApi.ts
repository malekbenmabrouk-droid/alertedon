import type { AlerteDonApi } from "./client";
import { ApiError, createHttp, type HttpOptions } from "./http";
import type { Centre, Donneur } from "../types/api";

/**
 * The backend exposes no list endpoint for donors and centres, only GET /{id}.
 * Ids are sequential, so we read them in small batches until a run of 404s.
 */
async function probeIds<T>(fetchOne: (id: number) => Promise<T>, max = 400, batch = 10): Promise<T[]> {
  const found: T[] = [];
  let misses = 0;
  for (let start = 1; start <= max && misses < 3; start += batch) {
    const ids = Array.from({ length: batch }, (_, i) => start + i);
    const results = await Promise.all(
      ids.map((id) =>
        fetchOne(id).catch((e: unknown) => {
          if (e instanceof ApiError && e.isNotFound) return null;
          throw e;
        }),
      ),
    );
    for (const r of results) {
      if (r === null) misses += 1;
      else {
        misses = 0;
        found.push(r);
      }
    }
  }
  return found;
}

export function createLiveApi(options: HttpOptions): AlerteDonApi {
  const http = createHttp(options);
  const get = <T>(p: string) => http<T>("GET", p);
  const post = <T>(p: string, body?: unknown) => http<T>("POST", p, body ?? {});

  return {
    kind: "api",
    sante: () => get("/sante"),

    listCentres: () => probeIds((id) => get<Centre>(`/centres/${id}`)),
    creerCentre: (input) => post("/centres", input),

    listDonneurs: () => probeIds((id) => get<Donneur>(`/donneurs/${id}`)),
    getDonneur: (id) => get(`/donneurs/${id}`),
    inscrire: (input) => post("/donneurs", input),
    alertesDuDonneur: (id) => get(`/donneurs/${id}/alertes`),

    declarerBesoin: (input) => post("/besoins", input),
    getBesoin: (id) => get(`/besoins/${id}`),
    alerter: (id) => post(`/besoins/${id}/alertes`),
    relancer: (id) => post(`/besoins/${id}/alertes/relance`),
    alertesDuBesoin: (id) => get(`/besoins/${id}/alertes`),

    repondre: (alerteId, input) => post(`/alertes/${alerteId}/reponse`, input),
    enregistrerDon: (input) => post("/dons", input),

    listSuivi: (filtres = {}) => {
      const q = new URLSearchParams();
      if (filtres.statut) q.set("statut", filtres.statut);
      if (filtres.centre_id) q.set("centre_id", String(filtres.centre_id));
      const qs = q.toString();
      return get(`/suivi/besoins${qs ? `?${qs}` : ""}`);
    },
    suivre: (id) => get(`/suivi/besoins/${id}`),
  };
}
