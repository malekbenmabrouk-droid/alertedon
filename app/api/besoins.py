"""Contrôleur UC2 — Déclarer un besoin urgent (version minimale)."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.dependances import get_db, get_horloge
from app.api.schemas_besoin import BesoinIn, BesoinOut
from app.services.besoin_service import BesoinService

router = APIRouter(prefix="/besoins", tags=["UC2 — Besoins"])


@router.post("", status_code=201, response_model=BesoinOut)
def declarer(donnees: BesoinIn, db: Session = Depends(get_db), horloge=Depends(get_horloge)):
    return BesoinService(db, horloge=horloge).declarer(
        centre_id=donnees.centre_id, groupe_sanguin=donnees.groupe_sanguin.value,
        quantite=donnees.quantite, echeance=donnees.echeance)


@router.get("/{besoin_id}", response_model=BesoinOut)
def obtenir(besoin_id: int, db: Session = Depends(get_db), horloge=Depends(get_horloge)):
    return BesoinService(db, horloge=horloge).obtenir(besoin_id)
