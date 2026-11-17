"""Contrôleur UC2 — Déclarer un besoin urgent (<<include>> UC3)."""
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.dependances import get_db, get_gateway, get_horloge
from app.api.schemas_alerte import RapportAlerteOut
from app.api.schemas_besoin import BesoinIn, BesoinOut
from app.services.alerte_service import AlerteService
from app.services.besoin_service import BesoinService

router = APIRouter(prefix="/besoins", tags=["UC2 — Besoins"])


class DeclarationOut(BaseModel):
    besoin: BesoinOut
    alerte: RapportAlerteOut


def _service(db, gateway, horloge) -> BesoinService:
    return BesoinService(db, AlerteService(db, gateway, horloge=horloge), horloge=horloge)


@router.post("", status_code=201, response_model=DeclarationOut)
def declarer(donnees: BesoinIn, db: Session = Depends(get_db),
             gateway=Depends(get_gateway), horloge=Depends(get_horloge)):
    resultat = _service(db, gateway, horloge).declarer(
        centre_id=donnees.centre_id, groupe_sanguin=donnees.groupe_sanguin.value,
        quantite=donnees.quantite, echeance=donnees.echeance)
    return DeclarationOut(besoin=BesoinOut.model_validate(resultat.besoin),
                          alerte=RapportAlerteOut.model_validate(resultat.alerte))


@router.get("/{besoin_id}", response_model=BesoinOut)
def obtenir(besoin_id: int, db: Session = Depends(get_db),
            gateway=Depends(get_gateway), horloge=Depends(get_horloge)):
    return _service(db, gateway, horloge).obtenir(besoin_id)
