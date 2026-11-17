"""Abstraction du service de notification (acteur secondaire externe).

Le cœur métier ne dépend que de l'interface NotificationGateway :
on peut brancher un service simulé (élaboration, tests) puis un vrai canal.
"""
import logging
from dataclasses import dataclass
from typing import Protocol

journal = logging.getLogger("alertedon.notification")


@dataclass(frozen=True)
class Message:
    destinataire: str
    canal: str  # "SMS" ou "EMAIL"
    objet: str
    texte: str


class EchecNotification(Exception):
    """Le service externe n'a pas pu acheminer le message."""


class NotificationGateway(Protocol):
    def envoyer(self, message: Message) -> None: ...


class LoggingNotificationGateway:
    """Canal simulé : écrit le message dans le journal."""

    def envoyer(self, message: Message) -> None:
        journal.info("[%s → %s] %s", message.canal, message.destinataire, message.texte)


class MockNotificationGateway:
    """Double de test : mémorise les messages, peut simuler des pannes."""

    def __init__(self, destinataires_en_panne: set[str] | None = None):
        self.envoyes: list[Message] = []
        self.destinataires_en_panne = set(destinataires_en_panne or ())

    def envoyer(self, message: Message) -> None:
        if message.destinataire in self.destinataires_en_panne:
            raise EchecNotification(f"Échec d'envoi vers {message.destinataire}")
        self.envoyes.append(message)
