"""Contrôleur UC3 — Alerter les donneurs ciblés (route de bout en bout du UC à risque)."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.dependances import get_db, get_gateway, get_horloge
from app.api.schemas_alerte import AlerteOut, RapportAlerteOut
from app.services.alerte_service import AlerteService

router = APIRouter(prefix="/besoins/{besoin_id}/alertes", tags=["UC3 — Alertes ciblées"])


def _service(db, gateway, horloge) -> AlerteService:
    return AlerteService(db, gateway, horloge=horloge)


@router.post("", response_model=RapportAlerteOut)
def alerter(besoin_id: int, db: Session = Depends(get_db),
            gateway=Depends(get_gateway), horloge=Depends(get_horloge)):
    """Sélectionne les donneurs compatibles, proches et éligibles, puis les notifie (idempotent)."""
    return _service(db, gateway, horloge).alerter_donneurs(besoin_id)


@router.post("/relance", response_model=RapportAlerteOut)
def relancer(besoin_id: int, db: Session = Depends(get_db),
             gateway=Depends(get_gateway), horloge=Depends(get_horloge)):
    """Renvoie les alertes en échec (nombre de tentatives borné)."""
    return _service(db, gateway, horloge).relancer_echecs(besoin_id)


@router.get("", response_model=list[AlerteOut])
def lister(besoin_id: int, db: Session = Depends(get_db),
           gateway=Depends(get_gateway), horloge=Depends(get_horloge)):
    return _service(db, gateway, horloge).alertes_du_besoin(besoin_id)
