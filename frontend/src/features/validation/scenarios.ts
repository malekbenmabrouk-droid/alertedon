import type { AlerteDonApi } from "../../services/client";
import { ApiError } from "../../services/http";
import { addDays, toIsoDate, toIsoLocal } from "../../lib/format";
import type { Besoin, Centre, Donneur, RapportAlerte } from "../../types/api";

export interface CheckResult {
  ok: boolean;
  expected: string;
  obtained: string;
}

export interface Scenario {
  id: string;
  uc: string;
  title: string;
  run: (ctx: Ctx) => Promise<CheckResult>;
}

/** Shared state between scenarios, which run in order. */
interface Ctx {
  api: AlerteDonApi;
  tag: string;
  centre?: Centre;
  oNeg?: Donneur;
  besoin?: Besoin;
  rapport?: RapportAlerte;
}

// An isolated area (Tataouine region) so that existing donors never interfere.
const ZONE = { lat: 32.93, lon: 10.45 };
const FAR = { lat: 33.92, lon: 8.13 }; // Tozeur, far from every centre

const expectError = async (p: Promise<unknown>, status: number): Promise<CheckResult> => {
  try {
    await p;
    return { ok: false, expected: `refus HTTP ${status}`, obtained: "accepté" };
  } catch (e) {
    if (e instanceof ApiError) {
      return { ok: e.status === status, expected: `refus HTTP ${status}`, obtained: `HTTP ${e.status} — ${e.message}` };
    }
    throw e;
  }
};

const LIBELLES: Record<string, string> = { hors_zone: "hors zone", non_eligible: "non éligible", alerte_recente: "déjà sollicité" };
const exclusText = (exclus: RapportAlerte["exclus"]) =>
  Object.entries(exclus).map(([k, n]) => `${n} ${LIBELLES[k] ?? k}`).join(", ") || "aucun";

const need = <T>(v: T | undefined, what: string): T => {
  if (v === undefined) throw new Error(`Étape précédente manquante : ${what}`);
  return v;
};

const phone = (tag: string, n: number) => `+216 7${n} ${tag.slice(-3)} ${String(100 + n).slice(-3)}`;

export const SCENARIOS: Scenario[] = [
  {
    id: "uc1-nominal", uc: "UC1", title: "Inscrire un donneur O− actif",
    async run(ctx) {
      ctx.centre = await ctx.api.creerCentre({ nom: `Centre de validation ${ctx.tag}`, latitude: ZONE.lat, longitude: ZONE.lon });
      ctx.oNeg = await ctx.api.inscrire({
        nom: `Validation O− ${ctx.tag}`, groupe_sanguin: "O-", latitude: ZONE.lat + 0.02, longitude: ZONE.lon,
        canal_prefere: "SMS", telephone: phone(ctx.tag, 1),
      });
      return { ok: ctx.oNeg.actif && ctx.oNeg.groupe_sanguin === "O-", expected: "donneur créé, actif, groupe O−", obtained: `n°${ctx.oNeg.id}, actif=${ctx.oNeg.actif}` };
    },
  },
  {
    id: "uc1-canal", uc: "UC1", title: "Refuser le canal SMS sans téléphone",
    run: (ctx) => expectError(ctx.api.inscrire({ nom: `Sans contact ${ctx.tag}`, groupe_sanguin: "A+", latitude: ZONE.lat, longitude: ZONE.lon, canal_prefere: "SMS" }), 422),
  },
  {
    id: "uc2-echeance", uc: "UC2", title: "Refuser une échéance passée",
    run: (ctx) => expectError(ctx.api.declarerBesoin({ centre_id: need(ctx.centre, "centre").id, groupe_sanguin: "A+", quantite: 1, echeance: toIsoDate(addDays(new Date(), -2)) }), 422),
  },
  {
    id: "uc3-ciblage", uc: "UC3", title: "Cibler un besoin A+ : compatibilité, zone et éligibilité",
    async run(ctx) {
      const centre = need(ctx.centre, "centre");
      const base = { latitude: ZONE.lat, longitude: ZONE.lon, canal_prefere: "SMS" as const };
      await ctx.api.inscrire({ ...base, nom: `Validation B+ ${ctx.tag}`, groupe_sanguin: "B+", telephone: phone(ctx.tag, 2) });
      await ctx.api.inscrire({ ...base, nom: `Validation A+ récent ${ctx.tag}`, groupe_sanguin: "A+", telephone: phone(ctx.tag, 3), date_dernier_don: toIsoDate(addDays(new Date(), -10)) });
      await ctx.api.inscrire({ ...base, latitude: FAR.lat, longitude: FAR.lon, nom: `Validation O+ loin ${ctx.tag}`, groupe_sanguin: "O+", telephone: phone(ctx.tag, 4) });
      const res = await ctx.api.declarerBesoin({ centre_id: centre.id, groupe_sanguin: "A+", quantite: 1, echeance: toIsoDate(addDays(new Date(), 3)) });
      ctx.besoin = res.besoin;
      ctx.rapport = res.alerte;
      const r = res.alerte;
      // On a real server, donors registered elsewhere also show up as "hors zone".
      const ok = r.envoyees === 1 && (r.exclus.non_eligible ?? 0) >= 1 && (r.exclus.hors_zone ?? 0) >= 1;
      return {
        ok,
        expected: "1 alerte (O−) ; exclus : au moins 1 non éligible et 1 hors zone ; B+ ignoré",
        obtained: `${r.envoyees} alerte(s) ; exclus : ${exclusText(r.exclus)}`,
      };
    },
  },
  {
    id: "uc3-idempotence", uc: "UC3", title: "Relancer le ciblage n'envoie pas de doublon",
    async run(ctx) {
      const r = await ctx.api.alerter(need(ctx.besoin, "besoin").id);
      return { ok: r.envoyees === 0 && r.deja_alertes === 1, expected: "0 nouvel envoi, 1 déjà alerté", obtained: `${r.envoyees} envoi(s), ${r.deja_alertes} déjà alerté(s)` };
    },
  },
  {
    id: "uc3-anti-relance", uc: "UC3", title: "Ne pas solliciter deux fois en 7 jours",
    async run(ctx) {
      const res = await ctx.api.declarerBesoin({ centre_id: need(ctx.centre, "centre").id, groupe_sanguin: "O-", quantite: 1, echeance: toIsoDate(addDays(new Date(), 3)) });
      const r = res.alerte;
      return { ok: r.envoyees === 0 && r.exclus.alerte_recente === 1, expected: "le donneur O− est exclu (alerte récente)", obtained: `${r.envoyees} envoi(s) ; exclus : ${exclusText(r.exclus)}` };
    },
  },
  {
    id: "uc4-accepter", uc: "UC4", title: "Accepter l'alerte avec un créneau",
    async run(ctx) {
      const d = need(ctx.oNeg, "donneur");
      const alerte = (await ctx.api.alertesDuBesoin(need(ctx.besoin, "besoin").id)).find((a) => a.donneur_id === d.id);
      if (!alerte) return { ok: false, expected: "une alerte pour le donneur O−", obtained: "aucune" };
      const creneau = addDays(new Date(), 1);
      creneau.setHours(9, 0, 0, 0);
      const a = await ctx.api.repondre(alerte.id, { donneur_id: d.id, accepte: true, creneau: toIsoLocal(creneau) });
      return { ok: a.statut === "ACCEPTEE", expected: "statut ACCEPTEE", obtained: `statut ${a.statut}` };
    },
  },
  {
    id: "uc4-double", uc: "UC4", title: "Refuser une seconde réponse",
    async run(ctx) {
      const d = need(ctx.oNeg, "donneur");
      const alerte = (await ctx.api.alertesDuBesoin(need(ctx.besoin, "besoin").id)).find((a) => a.donneur_id === d.id)!;
      return expectError(ctx.api.repondre(alerte.id, { donneur_id: d.id, accepte: false }), 409);
    },
  },
  {
    id: "uc5-don", uc: "UC5", title: "Enregistrer le don et clôturer le besoin",
    async run(ctx) {
      const res = await ctx.api.enregistrerDon({ donneur_id: need(ctx.oNeg, "donneur").id, centre_id: need(ctx.centre, "centre").id, besoin_id: need(ctx.besoin, "besoin").id, date_don: toIsoDate(new Date()) });
      return { ok: res.besoin?.statut === "CLOTURE", expected: "besoin CLOTURE (1/1 poche)", obtained: `besoin ${res.besoin?.statut} (${res.besoin?.quantite_collectee}/${res.besoin?.quantite})` };
    },
  },
  {
    id: "uc5-delai", uc: "UC5", title: "Refuser un second don le même jour",
    run: (ctx) => expectError(ctx.api.enregistrerDon({ donneur_id: need(ctx.oNeg, "donneur").id, centre_id: need(ctx.centre, "centre").id, date_don: toIsoDate(new Date()) }), 422),
  },
  {
    id: "uc6-suivi", uc: "UC6", title: "Le suivi reflète alertes, réponses et dons",
    async run(ctx) {
      const s = await ctx.api.suivre(need(ctx.besoin, "besoin").id);
      const ok = s.statut === "CLOTURE" && s.alertes_envoyees === 1 && s.acceptees === 1 && s.dons === 1 && s.progression === 1;
      return { ok, expected: "clos · 1 alerte · 1 acceptée · 1 don · 100 %", obtained: `${s.statut} · ${s.alertes_envoyees} alerte · ${s.acceptees} acceptée · ${s.dons} don · ${Math.round(s.progression * 100)} %` };
    },
  },
];

export interface RunEntry {
  scenario: Scenario;
  state: "pending" | "running" | "pass" | "fail";
  result?: CheckResult;
  error?: string;
  ms?: number;
}

export async function runScenarios(api: AlerteDonApi, onUpdate: (entries: RunEntry[]) => void): Promise<RunEntry[]> {
  const ctx: Ctx = { api, tag: Date.now().toString(36).toUpperCase() };
  const entries: RunEntry[] = SCENARIOS.map((scenario) => ({ scenario, state: "pending" }));
  const emit = () => onUpdate(entries.map((e) => ({ ...e })));
  for (const entry of entries) {
    entry.state = "running";
    emit();
    const t0 = performance.now();
    try {
      entry.result = await entry.scenario.run(ctx);
      entry.state = entry.result.ok ? "pass" : "fail";
    } catch (e) {
      entry.state = "fail";
      entry.error = e instanceof Error ? e.message : String(e);
    }
    entry.ms = Math.round(performance.now() - t0);
    emit();
  }
  return entries;
}
