"""UC3 — Alerter les donneurs ciblés (UC à risque).

Ciblage = compatibilité ABO/Rh ∩ zone ∩ éligibilité ∩ anti-relance.
Fiabilité = statut par alerte, échecs comptés, relance bornée, idempotence.
"""
from collections import Counter
from dataclasses import dataclass, field
from datetime import datetime
from typing import Callable

from sqlalchemy.orm import Session

from app.config import Parametres, parametres
from app.domain import regles
from app.domain.alerte import A_ENVOYER, ECHEC, ENVOYEE, Alerte
from app.domain.besoin import OUVERT, Besoin
from app.domain.donneur import Donneur
from app.notification.gateway import EchecNotification, Message, NotificationGateway
from app.repositories.alerte_repository import AlerteRepository
from app.repositories.besoin_repository import BesoinRepository
from app.repositories.donneur_repository import DonneurRepository
from app.services.erreurs import Conflit, RessourceIntrouvable


@dataclass
class RapportAlerte:
    besoin_id: int
    cibles: int = 0
    envoyees: int = 0
    echecs: int = 0
    deja_alertes: int = 0
    exclus: dict[str, int] = field(default_factory=dict)


class AlerteService:
    def __init__(self, db: Session, gateway: NotificationGateway,
                 cfg: Parametres = parametres, horloge: Callable[[], datetime] = datetime.now):
        self.db = db
        self.gateway = gateway
        self.cfg = cfg
        self.horloge = horloge
        self.donneurs = DonneurRepository(db)
        self.besoins = BesoinRepository(db)
        self.alertes = AlerteRepository(db)

    # --- ciblage -------------------------------------------------------------
    def selectionner_donneurs(self, besoin: Besoin) -> tuple[list[Donneur], Counter]:
        maintenant = self.horloge()
        centre = besoin.centre
        retenus, exclus = [], Counter()
        for donneur in self.donneurs.actifs_des_groupes(regles.groupes_compatibles(besoin.groupe_sanguin)):
            if regles.distance_km(donneur.latitude, donneur.longitude,
                                  centre.latitude, centre.longitude) > self.cfg.rayon_km:
                exclus["hors_zone"] += 1
            elif not regles.est_eligible(donneur.date_dernier_don, maintenant.date(),
                                         self.cfg.delai_entre_dons_jours):
                exclus["non_eligible"] += 1
            elif regles.alerte_recente(self.alertes.derniere_alerte_hors_besoin(donneur.id, besoin.id),
                                       maintenant, self.cfg.delai_anti_relance_jours):
                exclus["alerte_recente"] += 1
            else:
                retenus.append(donneur)
        return retenus, exclus

    # --- envoi -----------------------------------------------------------------
    def alerter_donneurs(self, besoin_id: int) -> RapportAlerte:
        besoin = self._besoin_ouvert(besoin_id)
        cibles, exclus = self.selectionner_donneurs(besoin)
        rapport = RapportAlerte(besoin_id=besoin.id, cibles=len(cibles), exclus=dict(exclus))
        for donneur in cibles:
            if self.alertes.pour_besoin_et_donneur(besoin.id, donneur.id):
                rapport.deja_alertes += 1  # idempotence : pas de doublon
                continue
            alerte = self.alertes.ajouter(Alerte(besoin_id=besoin.id, donneur_id=donneur.id,
                                                 statut=A_ENVOYER, tentatives=0))
            self._envoyer(alerte, donneur, besoin, rapport)
        self.db.commit()
        return rapport

    def relancer_echecs(self, besoin_id: int) -> RapportAlerte:
        besoin = self._besoin_ouvert(besoin_id)
        rapport = RapportAlerte(besoin_id=besoin.id)
        for alerte in self.alertes.en_echec(besoin.id, self.cfg.max_tentatives):
            rapport.cibles += 1
            self._envoyer(alerte, alerte.donneur, besoin, rapport)
        self.db.commit()
        return rapport

    def alertes_du_besoin(self, besoin_id: int) -> list[Alerte]:
        if self.besoins.par_id(besoin_id) is None:
            raise RessourceIntrouvable(f"Besoin {besoin_id} introuvable")
        return self.alertes.du_besoin(besoin_id)

    # --- interne ---------------------------------------------------------------
    def _besoin_ouvert(self, besoin_id: int) -> Besoin:
        besoin = self.besoins.par_id(besoin_id)
        if besoin is None:
            raise RessourceIntrouvable(f"Besoin {besoin_id} introuvable")
        if besoin.statut != OUVERT:
            raise Conflit(f"Le besoin {besoin_id} est clôturé")
        return besoin

    def _envoyer(self, alerte: Alerte, donneur: Donneur, besoin: Besoin, rapport: RapportAlerte) -> None:
        alerte.tentatives += 1
        message = Message(
            destinataire=donneur.contact(),
            canal=donneur.canal_prefere,
            objet=f"AlerteDon : besoin urgent en {besoin.groupe_sanguin}",
            texte=(f"Bonjour {donneur.nom}, le centre {besoin.centre.nom} a besoin de sang "
                   f"compatible avec {besoin.groupe_sanguin} avant le {besoin.echeance:%d/%m/%Y}. "
                   f"Répondez à l'alerte n°{alerte.id} dans l'application AlerteDon."),
        )
        try:
            self.gateway.envoyer(message)
        except EchecNotification:
            alerte.statut = ECHEC
            rapport.echecs += 1
        else:
            alerte.statut = ENVOYEE
            alerte.envoyee_le = self.horloge()
            rapport.envoyees += 1
