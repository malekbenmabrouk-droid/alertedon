import { beforeEach, describe, expect, it } from "vitest";
import { MockApi } from "./mockApi";
import { ApiError } from "./http";
import { addDays, toIsoDate } from "../lib/format";

const TUNIS = { latitude: 36.8065, longitude: 10.1815 };
const ARIANA = { latitude: 36.8625, longitude: 10.1956 };
const SFAX = { latitude: 34.7406, longitude: 10.7603 };
const inThreeDays = () => toIsoDate(addDays(new Date(), 3));

describe("MockApi behaves like the backend", () => {
  let api: MockApi;
  let centreId: number;

  beforeEach(async () => {
    api = new MockApi({ flakyContacts: ["+216 99 000 000"] });
    centreId = (await api.creerCentre({ nom: "CNTS Tunis", ...TUNIS })).id;
  });

  const donneur = (groupe: "O-" | "A+" | "B+", lieu = ARIANA, extra: Record<string, unknown> = {}) =>
    api.inscrire({ nom: `D ${groupe} ${Math.random()}`, groupe_sanguin: groupe, canal_prefere: "SMS", telephone: `+216 2${Math.floor(Math.random() * 1e7)}`, ...lieu, ...extra });

  it("targets compatible, nearby and eligible donors only", async () => {
    await donneur("O-");
    await donneur("B+");
    await donneur("A+", SFAX);
    await donneur("A+", ARIANA, { date_dernier_don: toIsoDate(addDays(new Date(), -10)) });
    const { alerte } = await api.declarerBesoin({ centre_id: centreId, groupe_sanguin: "A+", quantite: 1, echeance: inThreeDays() });
    expect(alerte).toMatchObject({ envoyees: 1, exclus: { hors_zone: 1, non_eligible: 1 } });
  });

  it("never alerts the same donor twice for a need", async () => {
    await donneur("O-");
    const { besoin } = await api.declarerBesoin({ centre_id: centreId, groupe_sanguin: "O-", quantite: 1, echeance: inThreeDays() });
    await expect(api.alerter(besoin.id)).resolves.toMatchObject({ envoyees: 0, deja_alertes: 1 });
  });

  it("records a failed send and succeeds on retry", async () => {
    await donneur("O-", ARIANA, { telephone: "+216 99 000 000" });
    const { besoin, alerte } = await api.declarerBesoin({ centre_id: centreId, groupe_sanguin: "O-", quantite: 1, echeance: inThreeDays() });
    expect(alerte.echecs).toBe(1);
    await expect(api.relancer(besoin.id)).resolves.toMatchObject({ envoyees: 1 });
  });

  it("closes the need when the goal is reached and refuses a second donation", async () => {
    const d = await donneur("O-");
    const { besoin } = await api.declarerBesoin({ centre_id: centreId, groupe_sanguin: "A+", quantite: 1, echeance: inThreeDays() });
    const res = await api.enregistrerDon({ donneur_id: d.id, centre_id: centreId, besoin_id: besoin.id, date_don: toIsoDate(new Date()) });
    expect(res.besoin?.statut).toBe("CLOTURE");
    const err = await api.enregistrerDon({ donneur_id: d.id, centre_id: centreId, date_don: toIsoDate(new Date()) }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).status).toBe(422);
  });

  it("returns copies so callers cannot mutate the store", async () => {
    const d = await donneur("O-");
    d.nom = "changé";
    expect((await api.getDonneur(d.id)).nom).not.toBe("changé");
  });
});
