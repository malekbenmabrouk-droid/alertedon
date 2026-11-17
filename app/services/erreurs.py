"""Erreurs métier, traduites en codes HTTP par la couche contrôleur."""


class ErreurMetier(Exception):
    """Base des erreurs métier."""


class RessourceIntrouvable(ErreurMetier):
    """→ HTTP 404"""


class RegleMetierViolee(ErreurMetier):
    """→ HTTP 422"""


class Conflit(ErreurMetier):
    """→ HTTP 409"""
