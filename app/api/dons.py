"""Contrôleur UC5 — Enregistrer un don."""
from datetime import date

from fastapi import APIRouter, Depends
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.orm import Session

from app.api.dependances import get_db, get_horloge
from app.api.schemas_besoin import BesoinOut
from app.services.don_service import DonService

router = APIRouter(prefix="/dons", tags=["UC5 — Dons"])


class DonIn(BaseModel):
    donneur_id: int
    centre_id: int
    date_don: date
    besoin_id: int | None = None
    volume_ml: int = Field(default=450, ge=200, le=500)


class DonOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    donneur_id: int
    centre_id: int
    besoin_id: int | None
    date_don: date
    volume_ml: int


class EnregistrementOut(BaseModel):
    don: DonOut
    besoin: BesoinOut | None


@router.post("", status_code=201, response_model=EnregistrementOut)
def enregistrer(donnees: DonIn, db: Session = Depends(get_db), horloge=Depends(get_horloge)):
    resultat = DonService(db, horloge=horloge).enregistrer(
        donneur_id=donnees.donneur_id, centre_id=donnees.centre_id, date_don=donnees.date_don,
        besoin_id=donnees.besoin_id, volume_ml=donnees.volume_ml)
    return EnregistrementOut(
        don=DonOut.model_validate(resultat.don),
        besoin=BesoinOut.model_validate(resultat.besoin) if resultat.besoin else None)
