"""Dépendances injectées dans les contrôleurs (remplaçables en test)."""
from datetime import datetime

from app.database import get_db  # noqa: F401  (ré-export)
from app.notification.fabrique import fabriquer_gateway

_gateway = None


def get_gateway():
    global _gateway
    if _gateway is None:
        _gateway = fabriquer_gateway()
    return _gateway


def get_horloge():
    return datetime.now
