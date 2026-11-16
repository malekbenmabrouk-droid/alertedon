import type { AlerteDonApi } from "./client";
import { ApiError } from "./http";
import {
  PARAMETRES, alerteRecente, distanceKm, estCompatible, estEligible, groupesCompatibles,
} from "../domain/rules";
import {
  GROUPES, type Alerte, type Besoin, type Centre, type Don, type Donneur, type GroupeSanguin,
  type MotifExclusion, type RapportAlerte, type SuiviBesoin,
} from "../types/api";
import { toIsoDate, toIsoLocal } from "../lib/format";

interface DonneurRow extends Donneur {
  latitude: number;
  longitude: number;
}

export interface MockState {
  centres: Centre[];
  donneurs: DonneurRow[];
  besoins: Besoin[];
  alertes: Alerte[];
  dons: Don[];
}

export interface MockOptions {
  /** Simulated network latency in ms (0 in tests). */
  latency?: number;
  /** Clock, injectable to build a consistent history. */
  now?: () => Date;
  /** Contacts whose notifications fail on the first attempt (transient outage). */
  flakyContacts?: Iterable<string>;
}

type SeqKey = "centre" | "donneur" | "besoin" | "alerte" | "don";

const notFound = (what: string, id: number) => new ApiError(`${what} ${id} introuvable`, 404);
const rule = (msg: string) => new ApiError(msg, 422);
const conflict = (msg: string) => new ApiError(msg, 409);

const clone = <T>(v: T): T => structuredClone(v);
const isGroupe = (g: string): g is GroupeSanguin => (GROUPES as readonly string[]).includes(g);

/** In-memory data source that reproduces the backend rules (services/*.py). */
export class MockApi implements AlerteDonApi {
  readonly kind = "demo" as const;
  state: MockState = { centres: [], donneurs: [], besoins: [], alertes: [], dons: [] };
  now: () => Date;
  latency: number;
  private flaky: Set<string>;
  private seq: Record<SeqKey, number> = { centre: 0, donneur: 0, besoin: 0, alerte: 0, don: 0 };

  constructor(options: MockOptions = {}) {
    this.latency = options.latency ?? 0;
    this.now = options.now ?? (() => new Date());
    this.flaky = new Set(options.flakyContacts ?? []);
    // Callers pass methods around unbound (e.g. useMutation(api.inscrire)), like the plain-object live client.
    const self = this as unknown as Record<string, unknown>;
    for (const key of Object.getOwnPropertyNames(MockApi.prototype)) {
      const value = self[key];
      if (key !== "constructor" && typeof value === "function") self[key] = value.bind(this);
    }
  }

  private async respond<T>(fn: () => T): Promise<T> {
    if (this.latency) {
      await new Promise((r) => setTimeout(r, this.latency * (0.6 + Math.random() * 0.8)));
    }
    return clone(fn());
  }

  private next(kind: SeqKey) {
    this.seq[kind] += 1;
    return this.seq[kind];
  }

  private centre(id: number) {
    const c = this.state.centres.find((x) => x.id === id);
    if (!c) throw notFound("Centre", id);
    return c;
  }
  private donneur(id: number) {
    const d = this.state.donneurs.find((x) => x.id === id);
    if (!d) throw notFound("Donneur", id);
    return d;
  }
  private besoin(id: number) {
    const b = this.state.besoins.find((x) => x.id === id);
    if (!b) throw notFound("Besoin", id);
    return b;
  }
  private alerte(id: number) {
    const a = this.state.alertes.find((x) => x.id === id);
    if (!a) throw notFound("Alerte", id);
    return a;
  }
  private publicDonneur({ latitude: _lat, longitude: _lon, ...rest }: DonneurRow): Donneur {
    return rest;
  }

  sante() {
    return this.respond(() => ({ statut: "ok" }));
  }

  // --- Centres -------------------------------------------------------------
  listCentres() {
    return this.respond(() => this.state.centres);
  }
  creerCentre(input: { nom: string; latitude: number; longitude: number }) {
    return this.respond(() => {
      if (this.state.centres.some((c) => c.nom === input.nom)) throw conflict(`Le centre « ${input.nom} » existe déjà`);
      const c: Centre = { id: this.next("centre"), ...input };
      this.state.centres.push(c);
      return c;
    });
  }

  positionsDonneurs() {
    return this.respond(() => this.state.donneurs.map(({ id, latitude, longitude }) => ({ id, latitude, longitude })));
  }

  // --- UC1 -----------------------------------------------------------------
  listDonneurs() {
    return this.respond(() => this.state.donneurs.map((d) => this.publicDonneur(d)));
  }
  getDonneur(id: number) {
    return this.respond(() => this.publicDonneur(this.donneur(id)));
  }
  inscrire(input: Parameters<AlerteDonApi["inscrire"]>[0]) {
    return this.respond(() => {
      const nom = input.nom.trim();
      if (nom.length < 2) throw rule("nom : au moins 2 caractères");
      if (!isGroupe(input.groupe_sanguin)) throw rule(`Groupe sanguin inconnu : ${input.groupe_sanguin}`);
      if (input.canal_prefere === "SMS" && !input.telephone) throw rule("Un numéro de téléphone est requis pour le canal SMS");
      if (input.canal_prefere === "EMAIL" && !input.email) throw rule("Une adresse e-mail est requise pour le canal EMAIL");
      if (input.date_dernier_don && input.date_dernier_don > toIsoDate(this.now())) {
        throw rule("La date du dernier don ne peut pas être dans le futur");
      }
      const dup = this.state.donneurs.some(
        (d) => (input.telephone && d.telephone === input.telephone) || (input.email && d.email === input.email),
      );
      if (dup) throw conflict("Un donneur est déjà inscrit avec ce téléphone ou cet e-mail");
      const row: DonneurRow = {
        id: this.next("donneur"), nom, groupe_sanguin: input.groupe_sanguin,
        canal_prefere: input.canal_prefere, telephone: input.telephone || null, email: input.email || null,
        date_dernier_don: input.date_dernier_don || null, actif: true,
        latitude: input.latitude, longitude: input.longitude,
      };
      this.state.donneurs.push(row);
      return this.publicDonneur(row);
    });
  }
  alertesDuDonneur(id: number) {
    return this.respond(() => {
      this.donneur(id);
      return this.state.alertes.filter((a) => a.donneur_id === id).sort((a, b) => b.id - a.id);
    });
  }

  // --- UC2 (+ include UC3) --------------------------------------------------
  declarerBesoin(input: Parameters<AlerteDonApi["declarerBesoin"]>[0]) {
    return this.respond(() => {
      this.centre(input.centre_id);
      if (!isGroupe(input.groupe_sanguin)) throw rule(`Groupe sanguin inconnu : ${input.groupe_sanguin}`);
      if (input.quantite < 1 || input.quantite > PARAMETRES.quantiteMax) {
        throw rule(`La quantité doit être comprise entre 1 et ${PARAMETRES.quantiteMax} poches`);
      }
      if (input.echeance < toIsoDate(this.now())) throw rule("L'échéance ne peut pas être dans le passé");
      const besoin: Besoin = {
        id: this.next("besoin"), centre_id: input.centre_id, groupe_sanguin: input.groupe_sanguin,
        quantite: input.quantite, quantite_collectee: 0, echeance: input.echeance,
        statut: "OUVERT", cree_le: toIsoLocal(this.now()),
      };
      this.state.besoins.push(besoin);
      return { besoin, alerte: this.alerterSync(besoin.id) };
    });
  }
  getBesoin(id: number) {
    return this.respond(() => this.besoin(id));
  }

  // --- UC3 -----------------------------------------------------------------
  private besoinOuvert(id: number) {
    const b = this.besoin(id);
    if (b.statut !== "OUVERT") throw conflict(`Le besoin ${id} est clôturé`);
    return b;
  }

  private derniereAlerteHorsBesoin(donneurId: number, besoinId: number): string | null {
    const dates = this.state.alertes
      .filter((a) => a.donneur_id === donneurId && a.besoin_id !== besoinId && a.envoyee_le
        && (a.statut === "ENVOYEE" || a.statut === "ACCEPTEE" || a.statut === "DECLINEE"))
      .map((a) => a.envoyee_le as string)
      .sort();
    return dates.at(-1) ?? null;
  }

  private envoyer(alerte: Alerte, donneur: DonneurRow, rapport: RapportAlerte) {
    alerte.tentatives += 1;
    const contact = donneur.canal_prefere === "EMAIL" ? donneur.email : donneur.telephone;
    if (contact && this.flaky.has(contact) && alerte.tentatives === 1) {
      alerte.statut = "ECHEC";
      rapport.echecs += 1;
      return;
    }
    alerte.statut = "ENVOYEE";
    alerte.envoyee_le = toIsoLocal(this.now());
    rapport.envoyees += 1;
  }

  private alerterSync(besoinId: number): RapportAlerte {
    const besoin = this.besoinOuvert(besoinId);
    const centre = this.centre(besoin.centre_id);
    const now = this.now();
    const groupes = groupesCompatibles(besoin.groupe_sanguin);
    const exclus: Partial<Record<MotifExclusion, number>> = {};
    const bump = (m: MotifExclusion) => (exclus[m] = (exclus[m] ?? 0) + 1);
    const retenus = this.state.donneurs
      .filter((d) => d.actif && groupes.includes(d.groupe_sanguin))
      .sort((a, b) => a.id - b.id)
      .filter((d) => {
        if (distanceKm(d.latitude, d.longitude, centre.latitude, centre.longitude) > PARAMETRES.rayonKm) return bump("hors_zone"), false;
        if (!estEligible(d.date_dernier_don, toIsoDate(now))) return bump("non_eligible"), false;
        if (alerteRecente(this.derniereAlerteHorsBesoin(d.id, besoin.id), now)) return bump("alerte_recente"), false;
        return true;
      });
    const rapport: RapportAlerte = { besoin_id: besoin.id, cibles: retenus.length, envoyees: 0, echecs: 0, deja_alertes: 0, exclus };
    for (const d of retenus) {
      if (this.state.alertes.some((a) => a.besoin_id === besoin.id && a.donneur_id === d.id)) {
        rapport.deja_alertes += 1;
        continue;
      }
      const alerte: Alerte = {
        id: this.next("alerte"), besoin_id: besoin.id, donneur_id: d.id, statut: "A_ENVOYER",
        tentatives: 0, envoyee_le: null, repondue_le: null, creneau: null,
      };
      this.state.alertes.push(alerte);
      this.envoyer(alerte, d, rapport);
    }
    return rapport;
  }

  alerter(besoinId: number) {
    return this.respond(() => this.alerterSync(besoinId));
  }
  relancer(besoinId: number) {
    return this.respond(() => {
      const besoin = this.besoinOuvert(besoinId);
      const rapport: RapportAlerte = { besoin_id: besoin.id, cibles: 0, envoyees: 0, echecs: 0, deja_alertes: 0, exclus: {} };
      for (const a of this.state.alertes) {
        if (a.besoin_id === besoin.id && a.statut === "ECHEC" && a.tentatives < PARAMETRES.maxTentatives) {
          rapport.cibles += 1;
          this.envoyer(a, this.donneur(a.donneur_id), rapport);
        }
      }
      return rapport;
    });
  }
  alertesDuBesoin(besoinId: number) {
    return this.respond(() => {
      this.besoin(besoinId);
      return this.state.alertes.filter((a) => a.besoin_id === besoinId).sort((a, b) => a.id - b.id);
    });
  }

  // --- UC4 -----------------------------------------------------------------
  repondre(alerteId: number, input: Parameters<AlerteDonApi["repondre"]>[1]) {
    return this.respond(() => {
      const a = this.alerte(alerteId);
      if (a.donneur_id !== input.donneur_id) throw rule("Cette alerte n'est pas adressée à ce donneur");
      if (a.statut !== "ENVOYEE") throw conflict(`Impossible de répondre : alerte au statut ${a.statut}`);
      const besoin = this.besoin(a.besoin_id);
      if (besoin.statut !== "OUVERT") throw conflict("Le besoin est déjà couvert, merci !");
      const now = this.now();
      if (input.accepte) {
        if (!input.creneau) throw rule("Un créneau est requis pour accepter");
        const creneau = new Date(input.creneau);
        const limite = new Date(`${besoin.echeance}T23:59:59.999`);
        if (creneau < now || creneau > limite) throw rule("Le créneau doit être entre maintenant et l'échéance du besoin");
        a.statut = "ACCEPTEE";
        a.creneau = input.creneau;
      } else {
        a.statut = "DECLINEE";
        a.creneau = null;
      }
      a.repondue_le = toIsoLocal(now);
      return a;
    });
  }

  // --- UC5 -----------------------------------------------------------------
  enregistrerDon(input: Parameters<AlerteDonApi["enregistrerDon"]>[0]) {
    return this.respond(() => {
      const donneur = this.donneur(input.donneur_id);
      this.centre(input.centre_id);
      const volume = input.volume_ml ?? 450;
      if (volume < 200 || volume > 500) throw rule("volume_ml : doit être compris entre 200 et 500");
      if (input.date_don > toIsoDate(this.now())) throw rule("La date du don ne peut pas être dans le futur");
      if (!estEligible(donneur.date_dernier_don, input.date_don)) {
        throw rule(`Délai minimal de ${PARAMETRES.delaiEntreDonsJours} jours entre deux dons non respecté`);
      }
      let besoin: Besoin | null = null;
      if (input.besoin_id != null) {
        besoin = this.besoin(input.besoin_id);
        if (besoin.statut !== "OUVERT") throw conflict("Le besoin est déjà clôturé");
        if (besoin.centre_id !== input.centre_id) throw rule("Le don doit être fait dans le centre du besoin");
        if (!estCompatible(donneur.groupe_sanguin, besoin.groupe_sanguin)) throw rule("Groupe du donneur incompatible avec le besoin");
      }
      const don: Don = {
        id: this.next("don"), donneur_id: donneur.id, centre_id: input.centre_id,
        besoin_id: input.besoin_id ?? null, date_don: input.date_don, volume_ml: volume,
      };
      this.state.dons.push(don);
      donneur.date_dernier_don = input.date_don;
      if (besoin) {
        besoin.quantite_collectee += 1;
        if (besoin.quantite_collectee >= besoin.quantite) besoin.statut = "CLOTURE";
      }
      return { don, besoin };
    });
  }

  // --- UC6 -----------------------------------------------------------------
  private suiviSync(b: Besoin): SuiviBesoin {
    const count = (s: Alerte["statut"]) => this.state.alertes.filter((a) => a.besoin_id === b.id && a.statut === s).length;
    const envoyee = count("ENVOYEE"), acceptee = count("ACCEPTEE"), declinee = count("DECLINEE");
    const recues = envoyee + acceptee + declinee;
    return {
      besoin_id: b.id, centre: this.centre(b.centre_id).nom, groupe_sanguin: b.groupe_sanguin,
      statut: b.statut, echeance: b.echeance, quantite: b.quantite, quantite_collectee: b.quantite_collectee,
      alertes_envoyees: recues, alertes_en_echec: count("ECHEC"), acceptees: acceptee, declinees: declinee,
      sans_reponse: envoyee, dons: this.state.dons.filter((d) => d.besoin_id === b.id).length,
      taux_reponse: recues ? Math.round(((acceptee + declinee) / recues) * 100) / 100 : 0,
      progression: Math.round((b.quantite_collectee / b.quantite) * 100) / 100,
    };
  }
  listSuivi(filtres: { statut?: Besoin["statut"]; centre_id?: number } = {}) {
    return this.respond(() =>
      this.state.besoins
        .filter((b) => (!filtres.statut || b.statut === filtres.statut) && (!filtres.centre_id || b.centre_id === filtres.centre_id))
        .sort((a, b) => a.echeance.localeCompare(b.echeance) || a.id - b.id)
        .map((b) => this.suiviSync(b)),
    );
  }
  suivre(id: number) {
    return this.respond(() => this.suiviSync(this.besoin(id)));
  }
}

