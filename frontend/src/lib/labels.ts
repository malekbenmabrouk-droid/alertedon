import type { MotifExclusion, StatutAlerte, StatutBesoin } from "../types/api";
import { PARAMETRES } from "../domain/rules";

export type Tone = "neutral" | "ok" | "warn" | "danger" | "info" | "brand";

export const STATUT_ALERTE: Record<StatutAlerte, { label: string; tone: Tone }> = {
  A_ENVOYER: { label: "En file", tone: "neutral" },
  ENVOYEE: { label: "Prévenu, sans réponse", tone: "info" },
  ECHEC: { label: "Message non remis", tone: "danger" },
  ACCEPTEE: { label: "Vient donner", tone: "ok" },
  DECLINEE: { label: "Pas disponible", tone: "neutral" },
};

export const STATUT_BESOIN: Record<StatutBesoin, { label: string; tone: Tone }> = {
  OUVERT: { label: "En cours", tone: "brand" },
  CLOTURE: { label: "Couvert", tone: "ok" },
};

export const MOTIF: Record<MotifExclusion, { label: string; detail: string }> = {
  hors_zone: { label: "Trop loin", detail: `À plus de ${PARAMETRES.rayonKm} km du centre` },
  non_eligible: { label: "Don trop récent", detail: `Dernier don il y a moins de ${PARAMETRES.delaiEntreDonsJours} jours` },
  alerte_recente: { label: "Déjà sollicité", detail: `Prévenu pour un autre besoin il y a moins de ${PARAMETRES.delaiAntiRelanceJours} jours` },
};

export const UC_NOMS: Record<string, string> = {
  UC1: "S'inscrire comme donneur",
  UC2: "Déclarer un besoin urgent",
  UC3: "Alerter les donneurs ciblés",
  UC4: "Répondre à une alerte",
  UC5: "Enregistrer un don",
  UC6: "Suivre les besoins",
};
