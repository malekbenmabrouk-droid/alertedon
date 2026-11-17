"""Choix du canal de notification. Élaboration : canal simulé uniquement."""
from app.notification.gateway import LoggingNotificationGateway, NotificationGateway


def fabriquer_gateway() -> NotificationGateway:
    return LoggingNotificationGateway()
