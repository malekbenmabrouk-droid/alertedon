"""Référentiel des centres de transfusion (support de UC2)."""
from sqlalchemy.orm import Session

from app.domain.centre import Centre
from app.repositories.centre_repository import CentreRepository
from app.services.erreurs import Conflit, RessourceIntrouvable


class CentreService:
    def __init__(self, db: Session):
        self.db = db
        self.centres = CentreRepository(db)

    def creer(self, nom: str, latitude: float, longitude: float) -> Centre:
        if self.centres.par_nom(nom):
            raise Conflit(f"Le centre « {nom} » existe déjà")
        centre = self.centres.ajouter(Centre(nom=nom, latitude=latitude, longitude=longitude))
        self.db.commit()
        return centre

    def obtenir(self, centre_id: int) -> Centre:
        centre = self.centres.par_id(centre_id)
        if centre is None:
            raise RessourceIntrouvable(f"Centre {centre_id} introuvable")
        return centre
