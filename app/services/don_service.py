"""UC5 — Enregistrer un don."""
from dataclasses import dataclass
from datetime import date, datetime
from typing import Callable

from sqlalchemy.orm import Session

from app.config import Parametres, parametres
from app.domain import regles
from app.domain.besoin import CLOTURE, OUVERT, Besoin
from app.domain.don import Don
from app.repositories.besoin_repository import BesoinRepository
from app.repositories.centre_repository import CentreRepository
from app.repositories.don_repository import DonRepository
from app.repositories.donneur_repository import DonneurRepository
from app.services.erreurs import Conflit, RegleMetierViolee, RessourceIntrouvable


@dataclass
class ResultatDon:
    don: Don
    besoin: Besoin | None


class DonService:
    def __init__(self, db: Session, cfg: Parametres = parametres,
                 horloge: Callable[[], datetime] = datetime.now):
        self.db = db
        self.cfg = cfg
        self.horloge = horloge
        self.dons = DonRepository(db)
        self.donneurs = DonneurRepository(db)
        self.centres = CentreRepository(db)
        self.besoins = BesoinRepository(db)

    def enregistrer(self, *, donneur_id: int, centre_id: int, date_don: date,
                    besoin_id: int | None = None, volume_ml: int = 450) -> ResultatDon:
        donneur = self.donneurs.par_id(donneur_id)
        if donneur is None:
            raise RessourceIntrouvable(f"Donneur {donneur_id} introuvable")
        if self.centres.par_id(centre_id) is None:
            raise RessourceIntrouvable(f"Centre {centre_id} introuvable")
        if date_don > self.horloge().date():
            raise RegleMetierViolee("La date du don ne peut pas être dans le futur")
        if not regles.est_eligible(donneur.date_dernier_don, date_don, self.cfg.delai_entre_dons_jours):
            raise RegleMetierViolee(
                f"Délai minimal de {self.cfg.delai_entre_dons_jours} jours entre deux dons non respecté")

        besoin = None
        if besoin_id is not None:
            besoin = self.besoins.par_id(besoin_id)
            if besoin is None:
                raise RessourceIntrouvable(f"Besoin {besoin_id} introuvable")
            if besoin.statut != OUVERT:
                raise Conflit("Le besoin est déjà clôturé")
            if besoin.centre_id != centre_id:
                raise RegleMetierViolee("Le don doit être fait dans le centre du besoin")
            if not regles.est_compatible(donneur.groupe_sanguin, besoin.groupe_sanguin):
                raise RegleMetierViolee("Groupe du donneur incompatible avec le besoin")

        don = self.dons.ajouter(Don(donneur_id=donneur.id, centre_id=centre_id, besoin_id=besoin_id,
                                    date_don=date_don, volume_ml=volume_ml))
        donneur.date_dernier_don = date_don  # alimente la règle d'éligibilité de UC3
        if besoin is not None:
            besoin.quantite_collectee += 1
            if besoin.objectif_atteint:
                besoin.statut = CLOTURE
                besoin.cloture_le = self.horloge()
        self.db.commit()
        return ResultatDon(don=don, besoin=besoin)
