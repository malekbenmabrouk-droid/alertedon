"""Paramètres de l'application (modifiables par variables d'environnement)."""
import os
from dataclasses import dataclass, field


def _env(nom: str, defaut: str) -> str:
    return os.getenv(nom, defaut)


@dataclass(frozen=True)
class Parametres:
    database_url: str = field(default_factory=lambda: _env("ALERTEDON_DB_URL", "sqlite:///./alertedon.db"))
    # Règle d'éligibilité : délai minimal entre deux dons de sang total (jours).
    delai_entre_dons_jours: int = field(default_factory=lambda: int(_env("ALERTEDON_DELAI_DON_JOURS", "56")))
    # Anti-sollicitation : un donneur alerté récemment n'est pas réalerté (jours).
    delai_anti_relance_jours: int = field(default_factory=lambda: int(_env("ALERTEDON_DELAI_RELANCE_JOURS", "7")))
    # Zone : rayon autour du centre de transfusion (km).
    rayon_km: float = field(default_factory=lambda: float(_env("ALERTEDON_RAYON_KM", "30")))
    # Fiabilité : nombre maximal de tentatives d'envoi d'une alerte.
    max_tentatives: int = field(default_factory=lambda: int(_env("ALERTEDON_MAX_TENTATIVES", "3")))
    # Canal réel : "log" (simulé) ou "email" (SMTP).
    canal_notification: str = field(default_factory=lambda: _env("ALERTEDON_NOTIFICATION", "log"))
    smtp_hote: str = field(default_factory=lambda: _env("ALERTEDON_SMTP_HOTE", "localhost"))
    smtp_port: int = field(default_factory=lambda: int(_env("ALERTEDON_SMTP_PORT", "25")))
    smtp_expediteur: str = field(default_factory=lambda: _env("ALERTEDON_SMTP_EXPEDITEUR", "alertedon@localhost"))


parametres = Parametres()
