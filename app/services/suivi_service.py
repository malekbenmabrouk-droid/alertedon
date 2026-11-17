"""UC6 — Suivre les besoins."""
from collections import Counter
from dataclasses import dataclass
from datetime import date

from sqlalchemy.orm import Session

from app.domain.alerte import ACCEPTEE, DECLINEE, ECHEC, ENVOYEE
from app.domain.besoin import Besoin
from app.repositories.alerte_repository import AlerteRepository
from app.repositories.besoin_repository import BesoinRepository
from app.repositories.don_repository import DonRepository
from app.services.erreurs import RessourceIntrouvable


@dataclass
class SuiviBesoin:
    besoin_id: int
    centre: str
    groupe_sanguin: str
    statut: str
    echeance: date
    quantite: int
    quantite_collectee: int
    alertes_envoyees: int
    alertes_en_echec: int
    acceptees: int
    declinees: int
    sans_reponse: int
    dons: int
    taux_reponse: float  # réponses / alertes reçues
    progression: float   # collecté / demandé


class SuiviService:
    def __init__(self, db: Session):
        self.besoins = BesoinRepository(db)
        self.alertes = AlerteRepository(db)
        self.dons = DonRepository(db)

    def suivre(self, besoin_id: int) -> SuiviBesoin:
        besoin = self.besoins.par_id(besoin_id)
        if besoin is None:
            raise RessourceIntrouvable(f"Besoin {besoin_id} introuvable")
        return self._suivi(besoin)

    def lister(self, statut: str | None = None, centre_id: int | None = None) -> list[SuiviBesoin]:
        return [self._suivi(b) for b in self.besoins.lister(statut=statut, centre_id=centre_id)]

    def _suivi(self, besoin: Besoin) -> SuiviBesoin:
        statuts = Counter(a.statut for a in self.alertes.du_besoin(besoin.id))
        recues = statuts[ENVOYEE] + statuts[ACCEPTEE] + statuts[DECLINEE]
        reponses = statuts[ACCEPTEE] + statuts[DECLINEE]
        return SuiviBesoin(
            besoin_id=besoin.id, centre=besoin.centre.nom, groupe_sanguin=besoin.groupe_sanguin,
            statut=besoin.statut, echeance=besoin.echeance, quantite=besoin.quantite,
            quantite_collectee=besoin.quantite_collectee,
            alertes_envoyees=recues, alertes_en_echec=statuts[ECHEC],
            acceptees=statuts[ACCEPTEE], declinees=statuts[DECLINEE], sans_reponse=statuts[ENVOYEE],
            dons=self.dons.nombre_pour_besoin(besoin.id),
            taux_reponse=round(reponses / recues, 2) if recues else 0.0,
            progression=round(besoin.quantite_collectee / besoin.quantite, 2),
        )
