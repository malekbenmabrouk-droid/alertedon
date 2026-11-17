"""Référentiel des centres (support de UC2)."""
from fastapi import APIRouter, Depends
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.orm import Session

from app.api.dependances import get_db
from app.services.centre_service import CentreService

router = APIRouter(prefix="/centres", tags=["Centres"])


class CentreIn(BaseModel):
    nom: str = Field(min_length=2, max_length=120)
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)


class CentreOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    nom: str
    latitude: float
    longitude: float


@router.post("", status_code=201, response_model=CentreOut)
def creer(donnees: CentreIn, db: Session = Depends(get_db)):
    return CentreService(db).creer(donnees.nom, donnees.latitude, donnees.longitude)


@router.get("/{centre_id}", response_model=CentreOut)
def obtenir(centre_id: int, db: Session = Depends(get_db)):
    return CentreService(db).obtenir(centre_id)
