from datetime import datetime

from pydantic import BaseModel, ConfigDict


class RapportAlerteOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    besoin_id: int
    cibles: int
    envoyees: int
    echecs: int
    deja_alertes: int
    exclus: dict[str, int]


class AlerteOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    besoin_id: int
    donneur_id: int
    statut: str
    tentatives: int
    envoyee_le: datetime | None
    repondue_le: datetime | None
    creneau: datetime | None
