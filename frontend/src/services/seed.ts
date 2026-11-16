import { MockApi } from "./mockApi";
import { reports } from "./reports";
import { addDays, toIsoDate, toIsoLocal } from "../lib/format";
import type { Canal, GroupeSanguin } from "../types/api";

type Lieu = readonly [number, number];
const L = {
  tunis: [36.8065, 10.1815], ariana: [36.8625, 10.1956], marsa: [36.8782, 10.3247],
  bardo: [36.8092, 10.1406], benArous: [36.7531, 10.2189], manouba: [36.8101, 10.0956],
  menzah: [36.84, 10.17], carthage: [36.8528, 10.3233], bizerte: [37.2744, 9.8739],
  nabeul: [36.4561, 10.7376], sfax: [34.7406, 10.7603], sakiet: [34.8, 10.73],
  sousse: [35.8256, 10.636], hammamSousse: [35.8609, 10.5952], monastir: [35.7643, 10.8113],
} satisfies Record<string, Lieu>;

interface SeedDonneur {
  nom: string;
  groupe: GroupeSanguin;
  lieu: Lieu;
  /** Days before "today" of the last donation, or null if never. */
  dernierDon: number | null;
  canal?: Canal;
}

const DONNEURS: SeedDonneur[] = [
  { nom: "Amine Trabelsi", groupe: "O-", lieu: L.ariana, dernierDon: null },
  { nom: "Sarra Ben Ali", groupe: "A+", lieu: L.menzah, dernierDon: 140 },
  { nom: "Yassine Gharbi", groupe: "O+", lieu: L.tunis, dernierDon: 15 },
  { nom: "Ines Mansouri", groupe: "A-", lieu: L.marsa, dernierDon: 200, canal: "EMAIL" },
  { nom: "Karim Jlassi", groupe: "B+", lieu: L.bardo, dernierDon: null },
  { nom: "Rania Ayari", groupe: "A+", lieu: L.sfax, dernierDon: null },
  { nom: "Mehdi Bouzid", groupe: "O-", lieu: L.benArous, dernierDon: 90 },
  { nom: "Nour Hamdi", groupe: "AB-", lieu: L.sousse, dernierDon: null, canal: "EMAIL" },
  { nom: "Hela Chaabane", groupe: "A+", lieu: L.carthage, dernierDon: 70 },
  { nom: "Oussama Kefi", groupe: "O+", lieu: L.manouba, dernierDon: null },
  { nom: "Leila Ferchichi", groupe: "B-", lieu: L.sakiet, dernierDon: 120 },
  { nom: "Walid Saidi", groupe: "B+", lieu: L.sfax, dernierDon: 30 },
  { nom: "Asma Riahi", groupe: "O-", lieu: L.hammamSousse, dernierDon: 65, canal: "EMAIL" },
  { nom: "Fares Mejri", groupe: "A-", lieu: L.monastir, dernierDon: null },
  { nom: "Imen Dridi", groupe: "O+", lieu: L.bizerte, dernierDon: null },
  { nom: "Skander Ben Salah", groupe: "AB+", lieu: L.ariana, dernierDon: 400 },
  { nom: "Mariem Kchaou", groupe: "O+", lieu: L.sfax, dernierDon: 75 },
  { nom: "Tarek Zouari", groupe: "A+", lieu: L.nabeul, dernierDon: null },
  { nom: "Salma Toumi", groupe: "O-", lieu: L.marsa, dernierDon: 58 },
  { nom: "Bilel Hammami", groupe: "B-", lieu: L.sousse, dernierDon: null, canal: "EMAIL" },
  { nom: "Yosra Belhaj", groupe: "A-", lieu: L.benArous, dernierDon: 25 },
  { nom: "Anis Masmoudi", groupe: "O+", lieu: L.sakiet, dernierDon: null },
];

const slug = (nom: string) =>
  nom.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z]+/g, ".").replace(/^\.|\.$/g, "");

/**
 * Builds a demo dataset by replaying real operations through the same rules as the backend,
 * with the clock moved back in time. Every status shown in the UI is therefore reachable.
 */
export async function createSeededMock(latency = 280): Promise<MockApi> {
  const today = new Date();
  today.setHours(10, 0, 0, 0);
  let clock = today;
  const at = (days: number, hours = 9) => {
    const d = addDays(today, days);
    d.setHours(hours, 12, 0, 0);
    clock = d;
  };

  const flakyPhone = "+216 98 410 233";
  const api = new MockApi({ latency: 0, now: () => clock, flakyContacts: [flakyPhone] });

  at(-30);
  const tunis = await api.creerCentre({ nom: "CNTS Tunis", latitude: L.tunis[0], longitude: L.tunis[1] });
  const sfax = await api.creerCentre({ nom: "CRTS Sfax", latitude: L.sfax[0], longitude: L.sfax[1] });
  const sousse = await api.creerCentre({ nom: "CRTS Sousse", latitude: L.sousse[0], longitude: L.sousse[1] });

  // Donors registered after their last donation (the most recent one is 15 days old).
  at(-14);
  for (const [i, d] of DONNEURS.entries()) {
    const canal = d.canal ?? "SMS";
    const phone = i === 8 ? flakyPhone : `+216 ${20 + (i % 7) * 10} ${String(100 + i * 37).padStart(3, "0")} ${String(400 + i * 53).slice(-3)}`;
    await api.inscrire({
      nom: d.nom, groupe_sanguin: d.groupe, latitude: d.lieu[0], longitude: d.lieu[1], canal_prefere: canal,
      telephone: canal === "SMS" ? phone : null,
      email: canal === "EMAIL" ? `${slug(d.nom)}@exemple.tn` : null,
      date_dernier_don: d.dernierDon === null ? null : toIsoDate(addDays(today, -d.dernierDon)),
    });
  }

  // B1 — covered need, O- at CNTS Tunis, twelve days ago.
  at(-12);
  const d1 = await api.declarerBesoin({ centre_id: tunis.id, groupe_sanguin: "O-", quantite: 1, echeance: toIsoDate(addDays(today, -9)) });
  const b1 = d1.besoin;
  const a1 = await api.alertesDuBesoin(b1.id);
  at(-12, 11);
  const first = a1.find((a) => a.statut === "ENVOYEE");
  if (first) {
    await api.repondre(first.id, { donneur_id: first.donneur_id, accepte: true, creneau: toIsoLocal(addDays(clock, 1)) });
    at(-11, 10);
    await api.enregistrerDon({ donneur_id: first.donneur_id, centre_id: tunis.id, besoin_id: b1.id, date_don: toIsoDate(clock) });
  }

  // B2 — B+ at CRTS Sfax, three days ago, partly answered.
  at(-3);
  const d2 = await api.declarerBesoin({ centre_id: sfax.id, groupe_sanguin: "B+", quantite: 3, echeance: toIsoDate(addDays(today, 4)) });
  const b2 = d2.besoin;
  const a2 = await api.alertesDuBesoin(b2.id);
  at(-3, 14);
  if (a2[0]) await api.repondre(a2[0].id, { donneur_id: a2[0].donneur_id, accepte: true, creneau: toIsoLocal(addDays(today, 1)) });
  if (a2[1]) await api.repondre(a2[1].id, { donneur_id: a2[1].donneur_id, accepte: false });

  // B3 — A+ at CNTS Tunis, yesterday; one SMS failed (transient outage).
  at(-1, 8);
  const d3 = await api.declarerBesoin({ centre_id: tunis.id, groupe_sanguin: "A+", quantite: 4, echeance: toIsoDate(addDays(today, 5)) });
  const b3 = d3.besoin;
  const a3 = (await api.alertesDuBesoin(b3.id)).filter((a) => a.statut === "ENVOYEE");
  at(-1, 12);
  if (a3[0]) await api.repondre(a3[0].id, { donneur_id: a3[0].donneur_id, accepte: true, creneau: toIsoLocal(addDays(today, 0)) });
  if (a3[1]) await api.repondre(a3[1].id, { donneur_id: a3[1].donneur_id, accepte: false });
  if (a3[0]) {
    at(-1, 16);
    await api.enregistrerDon({ donneur_id: a3[0].donneur_id, centre_id: tunis.id, besoin_id: b3.id, date_don: toIsoDate(clock) });
  }

  // B4 — AB- at CRTS Sousse, this morning, no answers yet.
  at(0, 7);
  const d4 = await api.declarerBesoin({ centre_id: sousse.id, groupe_sanguin: "AB-", quantite: 2, echeance: toIsoDate(addDays(today, 2)) });

  // Keep the targeting reports, as the screens would after a declaration.
  for (const d of [d1, d2, d3, d4]) reports.save("demo", d.alerte);

  api.now = () => new Date();
  api.latency = latency;
  return api;
}
