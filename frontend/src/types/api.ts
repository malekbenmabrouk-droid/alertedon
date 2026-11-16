// Contracts mirrored from the FastAPI schemas (app/api/*.py).

export const GROUPES = ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"] as const;
export type GroupeSanguin = (typeof GROUPES)[number];

export type Canal = "SMS" | "EMAIL";
export type StatutBesoin = "OUVERT" | "CLOTURE";
export type StatutAlerte = "A_ENVOYER" | "ENVOYEE" | "ECHEC" | "ACCEPTEE" | "DECLINEE";
export type MotifExclusion = "hors_zone" | "non_eligible" | "alerte_recente";

export interface Centre {
  id: number;
  nom: string;
  latitude: number;
  longitude: number;
}

export interface CentreInput {
  nom: string;
  latitude: number;
  longitude: number;
}

export interface Donneur {
  id: number;
  nom: string;
  groupe_sanguin: GroupeSanguin;
  canal_prefere: Canal;
  telephone: string | null;
  email: string | null;
  date_dernier_don: string | null; // YYYY-MM-DD
  actif: boolean;
}

export interface InscriptionInput {
  nom: string;
  groupe_sanguin: GroupeSanguin;
  latitude: number;
  longitude: number;
  canal_prefere: Canal;
  telephone?: string | null;
  email?: string | null;
  date_dernier_don?: string | null;
}

export interface Besoin {
  id: number;
  centre_id: number;
  groupe_sanguin: GroupeSanguin;
  quantite: number;
  quantite_collectee: number;
  echeance: string;
  statut: StatutBesoin;
  cree_le: string;
}

export interface BesoinInput {
  centre_id: number;
  groupe_sanguin: GroupeSanguin;
  quantite: number;
  echeance: string;
}

export interface RapportAlerte {
  besoin_id: number;
  cibles: number;
  envoyees: number;
  echecs: number;
  deja_alertes: number;
  exclus: Partial<Record<MotifExclusion, number>>;
}

export interface Declaration {
  besoin: Besoin;
  alerte: RapportAlerte;
}

export interface Alerte {
  id: number;
  besoin_id: number;
  donneur_id: number;
  statut: StatutAlerte;
  tentatives: number;
  envoyee_le: string | null;
  repondue_le: string | null;
  creneau: string | null;
}

export interface ReponseInput {
  donneur_id: number;
  accepte: boolean;
  creneau?: string | null;
}

export interface DonInput {
  donneur_id: number;
  centre_id: number;
  date_don: string;
  besoin_id?: number | null;
  volume_ml?: number;
}

export interface Don {
  id: number;
  donneur_id: number;
  centre_id: number;
  besoin_id: number | null;
  date_don: string;
  volume_ml: number;
}

export interface EnregistrementDon {
  don: Don;
  besoin: Besoin | null;
}

export interface SuiviBesoin {
  besoin_id: number;
  centre: string;
  groupe_sanguin: GroupeSanguin;
  statut: StatutBesoin;
  echeance: string;
  quantite: number;
  quantite_collectee: number;
  alertes_envoyees: number;
  alertes_en_echec: number;
  acceptees: number;
  declinees: number;
  sans_reponse: number;
  dons: number;
  taux_reponse: number;
  progression: number;
}
