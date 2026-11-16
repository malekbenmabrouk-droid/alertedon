import type { RapportAlerte } from "../types/api";

// The API returns the targeting report only in the response of the call that
// produced it. Keep the latest one per need for the session so the detail view
// can explain who was excluded and why.
const store = new Map<string, RapportAlerte>();

export const reports = {
  save(source: string, r: RapportAlerte) {
    store.set(`${source}:${r.besoin_id}`, r);
  },
  get(source: string, besoinId: number) {
    return store.get(`${source}:${besoinId}`) ?? null;
  },
};
