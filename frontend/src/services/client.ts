import type {
  Alerte, Besoin, BesoinInput, Centre, CentreInput, Declaration, Donneur, DonInput,
  EnregistrementDon, InscriptionInput, RapportAlerte, ReponseInput, StatutBesoin, SuiviBesoin,
} from "../types/api";

export type SourceKind = "demo" | "api";

/** Single contract implemented by the live HTTP client and by the in-memory demo source. */
export interface AlerteDonApi {
  readonly kind: SourceKind;
  sante(): Promise<{ statut: string }>;

  listCentres(): Promise<Centre[]>;
  creerCentre(input: CentreInput): Promise<Centre>;

  listDonneurs(): Promise<Donneur[]>;
  getDonneur(id: number): Promise<Donneur>;
  inscrire(input: InscriptionInput): Promise<Donneur>;
  alertesDuDonneur(donneurId: number): Promise<Alerte[]>;

  declarerBesoin(input: BesoinInput): Promise<Declaration>;
  getBesoin(id: number): Promise<Besoin>;
  alerter(besoinId: number): Promise<RapportAlerte>;
  relancer(besoinId: number): Promise<RapportAlerte>;
  alertesDuBesoin(besoinId: number): Promise<Alerte[]>;

  repondre(alerteId: number, input: ReponseInput): Promise<Alerte>;
  enregistrerDon(input: DonInput): Promise<EnregistrementDon>;

  /**
   * Donor positions, for the map. The HTTP API does not expose them (only the demo
   * source does), so screens must treat this as optional.
   */
  positionsDonneurs?(): Promise<{ id: number; latitude: number; longitude: number }[]>;

  listSuivi(filtres?: { statut?: StatutBesoin; centre_id?: number }): Promise<SuiviBesoin[]>;
  suivre(besoinId: number): Promise<SuiviBesoin>;
}
