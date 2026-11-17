"""Scénario nominal complet (test d'intégration de la transition) :
inscription → besoin urgent (+ alerte) → réponse → don → clôture → suivi."""


def test_scenario_nominal_de_bout_en_bout(client, gateway):
    centre = client.post("/centres", json={"nom": "CNTS Tunis",
                                           "latitude": 36.8065, "longitude": 10.1815}).json()
    donneur = client.post("/donneurs", json={
        "nom": "Malek", "groupe_sanguin": "O-", "latitude": 36.8625, "longitude": 10.1956,
        "canal_prefere": "EMAIL", "email": "malek@exemple.tn"}).json()

    declaration = client.post("/besoins", json={"centre_id": centre["id"], "groupe_sanguin": "A+",
                                                 "quantite": 1, "echeance": "2026-11-20"}).json()
    besoin_id = declaration["besoin"]["id"]
    assert declaration["alerte"]["envoyees"] == 1
    assert gateway.envoyes[0].canal == "EMAIL"

    alerte = client.get(f"/donneurs/{donneur['id']}/alertes").json()[0]
    assert client.post(f"/alertes/{alerte['id']}/reponse", json={
        "donneur_id": donneur["id"], "accepte": True,
        "creneau": "2026-11-18T09:00:00"}).status_code == 200

    don = client.post("/dons", json={"donneur_id": donneur["id"], "centre_id": centre["id"],
                                     "date_don": "2026-11-17", "besoin_id": besoin_id}).json()
    assert don["besoin"]["statut"] == "CLOTURE"

    suivi = client.get(f"/suivi/besoins/{besoin_id}").json()
    assert suivi["statut"] == "CLOTURE"
    assert (suivi["acceptees"], suivi["dons"], suivi["progression"]) == (1, 1, 1.0)
