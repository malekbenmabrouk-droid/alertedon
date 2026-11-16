// Targeting rules, identical to app/domain/regles.py.
// Used by the demo data source and to explain exclusions in the UI.
import type { GroupeSanguin } from "../types/api";

export const COMPATIBILITE: Record<GroupeSanguin, readonly GroupeSanguin[]> = {
  "O-": ["O-"],
  "O+": ["O-", "O+"],
  "A-": ["O-", "A-"],
  "A+": ["O-", "O+", "A-", "A+"],
  "B-": ["O-", "B-"],
  "B+": ["O-", "O+", "B-", "B+"],
  "AB-": ["O-", "A-", "B-", "AB-"],
  "AB+": ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"],
};

export const PARAMETRES = {
  delaiEntreDonsJours: 56,
  delaiAntiRelanceJours: 7,
  rayonKm: 30,
  maxTentatives: 3,
  quantiteMax: 50,
} as const;

export const groupesCompatibles = (receveur: GroupeSanguin) => COMPATIBILITE[receveur];

export const estCompatible = (donneur: GroupeSanguin, receveur: GroupeSanguin) =>
  COMPATIBILITE[receveur].includes(donneur);

export function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dp = rad(lat2 - lat1);
  const dl = rad(lon2 - lon1);
  const h = Math.sin(dp / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dl / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

const JOUR_MS = 86_400_000;

/** Whole days between two YYYY-MM-DD dates (b - a). */
export function joursEntre(a: string, b: string): number {
  return Math.round((Date.parse(b) - Date.parse(a)) / JOUR_MS);
}

export function estEligible(dernierDon: string | null, aujourdhui: string, delai = PARAMETRES.delaiEntreDonsJours) {
  return dernierDon === null || joursEntre(dernierDon, aujourdhui) >= delai;
}

/** Date from which the donor can give again, or null if already eligible. */
export function prochaineEligibilite(dernierDon: string | null, aujourdhui: string): string | null {
  if (estEligible(dernierDon, aujourdhui) || dernierDon === null) return null;
  const d = new Date(Date.parse(dernierDon) + PARAMETRES.delaiEntreDonsJours * JOUR_MS);
  return d.toISOString().slice(0, 10);
}

export function alerteRecente(derniere: string | null, maintenant: Date, delai = PARAMETRES.delaiAntiRelanceJours) {
  return derniere !== null && maintenant.getTime() - Date.parse(derniere) < delai * JOUR_MS;
}
