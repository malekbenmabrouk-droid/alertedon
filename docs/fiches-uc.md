# Fiches des cas d'utilisation — AlerteDon

Paramètres métier (modifiables, voir `app/config.py`) : délai entre deux dons **56 jours**, anti-relance **7 jours**, rayon **30 km**, **3** tentatives d'envoi au maximum.

---

## UC1 — S'inscrire comme donneur
| Élément | Contenu |
|---|---|
| Acteur principal | Donneur |
| Préconditions | Aucune |
| Postconditions | Un donneur actif existe et peut être ciblé par UC3 |
| Route | `POST /donneurs` |

**Scénario nominal**
1. Le donneur saisit son nom, son groupe sanguin, sa position, son canal préféré (SMS / e-mail), son contact et la date de son dernier don.
2. Le système vérifie le groupe (ABO/Rh), la cohérence canal ↔ contact et que la date du dernier don n'est pas dans le futur.
3. Le système vérifie que le téléphone ou l'e-mail n'est pas déjà utilisé.
4. Le système enregistre le donneur (actif) et renvoie son identifiant.

**Scénarios alternatifs**
- 2a. Groupe inconnu, ou canal SMS sans téléphone (ou EMAIL sans e-mail) → refus (422).
- 3a. Contact déjà inscrit → refus (409).

Tests : `tests/unit/test_inscription_service.py`, `tests/integration/test_api_donneurs.py`.

---

## UC2 — Déclarer un besoin urgent
| Élément | Contenu |
|---|---|
| Acteur principal | Agent du centre de transfusion |
| Préconditions | Le centre existe |
| Postconditions | Un besoin OUVERT existe ; UC3 a été exécuté (`<<include>>`) |
| Route | `POST /besoins` |

**Scénario nominal**
1. L'agent saisit le centre, le groupe sanguin demandé, la quantité (poches) et l'échéance.
2. Le système vérifie que le centre existe, que la quantité est entre 1 et 50 et que l'échéance n'est pas passée.
3. Le système enregistre le besoin au statut OUVERT.
4. Le système exécute **UC3** et renvoie le besoin avec le rapport d'alerte.

**Scénarios alternatifs**
- 2a. Centre inconnu → 404. Quantité hors bornes ou échéance passée → 422.

Tests : `tests/integration/test_api_besoins.py`.

---

## UC3 — Alerter les donneurs ciblés (UC à risque)
| Élément | Contenu |
|---|---|
| Acteurs | Système (déclenché par UC2 ou par l'agent) → Service de notification (secondaire) |
| Préconditions | Le besoin existe et est OUVERT |
| Postconditions | Chaque donneur ciblé a une alerte, et une seule, pour ce besoin (ENVOYEE ou ECHEC) |
| Routes | `POST /besoins/{id}/alertes`, `POST /besoins/{id}/alertes/relance`, `GET /besoins/{id}/alertes` |

**Scénario nominal**
1. Le système détermine les groupes compatibles avec le groupe demandé (ex. A+ → O−, O+, A−, A+).
2. Le système récupère les donneurs actifs de ces groupes.
3. Pour chaque candidat, il écarte ceux qui sont hors zone (> 30 km du centre), non éligibles (dernier don il y a moins de 56 jours) ou alertés pour un autre besoin il y a moins de 7 jours.
4. Pour chaque donneur retenu, il crée une alerte et l'envoie via le service de notification, sur le canal préféré du donneur.
5. Le système marque l'alerte ENVOYEE et renvoie un rapport (ciblés, envoyées, échecs, exclusions par motif).

**Scénarios alternatifs**
- 4a. Le donneur a déjà une alerte pour ce besoin → pas de nouvel envoi (idempotence, contrainte d'unicité en base).
- 4b. Le service de notification échoue → alerte ECHEC ; la relance renvoie les alertes en échec dans la limite de 3 tentatives.
- 1a. Besoin inconnu → 404 ; besoin clôturé → 409.

Tests : `tests/unit/test_regles.py`, `tests/unit/test_alerte_service.py` (dont le test fondateur de l'élaboration), `tests/integration/test_uc3_bout_en_bout.py`.

---

## UC4 — Répondre à une alerte
| Élément | Contenu |
|---|---|
| Acteur principal | Donneur |
| Préconditions | L'alerte est ENVOYEE, adressée à ce donneur, et le besoin est OUVERT |
| Postconditions | L'alerte est ACCEPTEE (avec un créneau) ou DECLINEE |
| Routes | `GET /donneurs/{id}/alertes`, `POST /alertes/{id}/reponse` |

**Scénario nominal**
1. Le donneur consulte ses alertes.
2. Il accepte une alerte en choisissant un créneau.
3. Le système vérifie que le créneau se situe entre maintenant et la fin du jour d'échéance.
4. Le système enregistre l'acceptation.

**Scénarios alternatifs**
- 2a. Le donneur décline → DECLINEE.
- 2b. Acceptation sans créneau ou créneau hors période → 422.
- Alerte d'un autre donneur → 422 ; déjà répondue ou besoin couvert → 409.

Tests : `tests/unit/test_reponse_service.py`, `tests/integration/test_uc4_api.py`.

---

## UC5 — Enregistrer un don
| Élément | Contenu |
|---|---|
| Acteur principal | Agent du centre de transfusion |
| Préconditions | Le donneur et le centre existent |
| Postconditions | Le don est enregistré ; la date du dernier don est mise à jour ; le besoin est éventuellement clôturé |
| Route | `POST /dons` |

**Scénario nominal**
1. L'agent saisit le donneur, le centre, la date du don et, s'il y a lieu, le besoin couvert.
2. Le système vérifie l'éligibilité (56 jours depuis le dernier don) et, pour un besoin, qu'il est OUVERT, dans ce centre, et que le groupe est compatible.
3. Le système enregistre le don et met à jour la date du dernier don (ce qui alimente la règle d'éligibilité de UC3).
4. Le système incrémente la quantité collectée et clôture le besoin quand l'objectif est atteint.

**Scénarios alternatifs**
- 2a. Délai non respecté, date future ou groupe incompatible → 422 ; besoin déjà clôturé → 409.

Tests : `tests/unit/test_don_service.py`, `tests/integration/test_uc5_api.py`.

---

## UC6 — Suivre les besoins
| Élément | Contenu |
|---|---|
| Acteur principal | Agent du centre de transfusion |
| Préconditions | Aucune |
| Postconditions | Aucune (consultation) |
| Routes | `GET /suivi/besoins?statut=&centre_id=`, `GET /suivi/besoins/{id}` |

**Scénario nominal**
1. L'agent demande l'état des besoins, avec un filtre éventuel (statut, centre).
2. Pour chaque besoin, le système calcule : alertes reçues et en échec, acceptations, refus, alertes sans réponse, dons, taux de réponse et progression.
3. Le système affiche le tableau de suivi.

Tests : `tests/unit/test_suivi_service.py`, `tests/integration/test_uc6_api.py`.
