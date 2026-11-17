from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field

from app.domain.groupes import GroupeSanguin


class BesoinIn(BaseModel):
    centre_id: int
    groupe_sanguin: GroupeSanguin
    quantite: int = Field(gt=0)
    echeance: date


class BesoinOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    centre_id: int
    groupe_sanguin: str
    quantite: int
    quantite_collectee: int
    echeance: date
    statut: str
    cree_le: datetime
