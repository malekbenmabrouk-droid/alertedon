from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.domain.don import Don


class DonRepository:
    def __init__(self, db: Session):
        self.db = db

    def ajouter(self, don: Don) -> Don:
        self.db.add(don)
        self.db.flush()
        return don

    def nombre_pour_besoin(self, besoin_id: int) -> int:
        return self.db.scalar(select(func.count(Don.id)).where(Don.besoin_id == besoin_id)) or 0
