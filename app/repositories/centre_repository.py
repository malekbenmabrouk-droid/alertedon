from sqlalchemy import select
from sqlalchemy.orm import Session

from app.domain.centre import Centre


class CentreRepository:
    def __init__(self, db: Session):
        self.db = db

    def ajouter(self, centre: Centre) -> Centre:
        self.db.add(centre)
        self.db.flush()
        return centre

    def par_id(self, centre_id: int) -> Centre | None:
        return self.db.get(Centre, centre_id)

    def par_nom(self, nom: str) -> Centre | None:
        return self.db.scalar(select(Centre).where(Centre.nom == nom))
