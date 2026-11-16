// Backend test suite (tests/ in the repository), listed so the UI can show what the CI checks.
// Regenerate when tests are added: one entry per test function, with its parametrized cases.

export interface SuiteFile {
  file: string;
  uc: string;
  kind: "unitaire" | "intégration";
  tests: { name: string; cases: number }[];
}

export const SUITE: SuiteFile[] = [
  { file: "tests/integration/test_api_besoins.py", uc: "UC2", kind: "intégration", tests: [{ name: "test_declarer_un_besoin_alerte_les_donneurs_cibles", cases: 1 }, { name: "test_centre_inconnu", cases: 1 }, { name: "test_echeance_passee_refusee", cases: 1 }, { name: "test_quantite_trop_grande_refusee", cases: 1 }] },
  { file: "tests/integration/test_api_donneurs.py", uc: "UC1", kind: "intégration", tests: [{ name: "test_inscription_via_api", cases: 1 }, { name: "test_groupe_inconnu_rejete_par_la_validation", cases: 1 }, { name: "test_donneur_introuvable", cases: 1 }] },
  { file: "tests/integration/test_scenario_nominal.py", uc: "Scénario nominal", kind: "intégration", tests: [{ name: "test_scenario_nominal_de_bout_en_bout", cases: 1 }] },
  { file: "tests/integration/test_uc3_bout_en_bout.py", uc: "UC3", kind: "intégration", tests: [{ name: "test_route_alerter_les_donneurs_cibles", cases: 1 }, { name: "test_besoin_inconnu", cases: 1 }] },
  { file: "tests/integration/test_uc4_api.py", uc: "UC4", kind: "intégration", tests: [{ name: "test_le_donneur_consulte_puis_accepte_son_alerte", cases: 1 }, { name: "test_alerte_inconnue", cases: 1 }] },
  { file: "tests/integration/test_uc5_api.py", uc: "UC5", kind: "intégration", tests: [{ name: "test_apres_un_don_le_donneur_n_est_plus_cible", cases: 1 }, { name: "test_volume_hors_bornes", cases: 1 }] },
  { file: "tests/integration/test_uc6_api.py", uc: "UC6", kind: "intégration", tests: [{ name: "test_tableau_de_suivi", cases: 1 }, { name: "test_statut_invalide", cases: 1 }] },
  { file: "tests/test_sante.py", uc: "Socle", kind: "unitaire", tests: [{ name: "test_l_api_repond", cases: 1 }] },
  { file: "tests/unit/test_alerte_service.py", uc: "UC3", kind: "unitaire", tests: [{ name: "test_premier_test_ci_o_neg_eligible_alerte_et_donneur_alerte_il_y_a_2_jours_exclu", cases: 1 }, { name: "test_exclut_incompatibles_hors_zone_et_non_eligibles", cases: 1 }, { name: "test_idempotence_aucun_doublon_si_on_relance_le_ciblage", cases: 1 }, { name: "test_echec_de_notification_puis_relance_reussie", cases: 1 }, { name: "test_relance_bornee_par_le_nombre_max_de_tentatives", cases: 1 }, { name: "test_besoin_cloture_ne_peut_plus_alerter", cases: 1 }] },
  { file: "tests/unit/test_don_service.py", uc: "UC5", kind: "unitaire", tests: [{ name: "test_don_met_a_jour_la_date_du_dernier_don", cases: 1 }, { name: "test_objectif_atteint_cloture_le_besoin", cases: 1 }, { name: "test_delai_entre_deux_dons_non_respecte", cases: 1 }, { name: "test_delai_parametrable", cases: 1 }, { name: "test_groupe_incompatible_avec_le_besoin", cases: 1 }, { name: "test_besoin_deja_cloture", cases: 1 }, { name: "test_don_dans_le_futur_refuse", cases: 1 }] },
  { file: "tests/unit/test_email_gateway.py", uc: "Notification", kind: "unitaire", tests: [{ name: "test_envoie_un_email", cases: 1 }, { name: "test_sms_delegue_au_canal_de_repli", cases: 1 }, { name: "test_panne_smtp_devient_un_echec_de_notification", cases: 1 }] },
  { file: "tests/unit/test_inscription_service.py", uc: "UC1", kind: "unitaire", tests: [{ name: "test_inscription_nominale_cree_un_donneur_actif", cases: 1 }, { name: "test_canal_sms_sans_telephone_est_refuse", cases: 1 }, { name: "test_canal_email_exige_une_adresse", cases: 1 }, { name: "test_date_de_dernier_don_future_refusee", cases: 1 }, { name: "test_double_inscription_meme_telephone_refusee", cases: 1 }] },
  { file: "tests/unit/test_regles.py", uc: "UC3", kind: "unitaire", tests: [{ name: "test_groupes_compatibles", cases: 4 }, { name: "test_o_negatif_est_donneur_universel", cases: 1 }, { name: "test_groupe_inconnu", cases: 1 }, { name: "test_distance_tunis_ariana_et_sfax", cases: 1 }, { name: "test_eligibilite", cases: 3 }, { name: "test_alerte_recente", cases: 1 }] },
  { file: "tests/unit/test_reponse_service.py", uc: "UC4", kind: "unitaire", tests: [{ name: "test_accepter_avec_un_creneau", cases: 1 }, { name: "test_decliner", cases: 1 }, { name: "test_accepter_sans_creneau_refuse", cases: 1 }, { name: "test_creneau_apres_echeance_refuse", cases: 1 }, { name: "test_un_autre_donneur_ne_peut_pas_repondre", cases: 1 }, { name: "test_on_ne_repond_pas_deux_fois", cases: 1 }, { name: "test_besoin_deja_couvert", cases: 1 }] },
  { file: "tests/unit/test_suivi_service.py", uc: "UC6", kind: "unitaire", tests: [{ name: "test_indicateurs_du_besoin", cases: 1 }, { name: "test_filtre_par_statut", cases: 1 }, { name: "test_besoin_inconnu", cases: 1 }] },
];

export const SUITE_TOTAL = SUITE.reduce((n, f) => n + f.tests.reduce((m, t) => m + t.cases, 0), 0);
