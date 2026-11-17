"""Choix du canal de notification selon la configuration."""
from app.config import parametres
from app.notification.gateway import LoggingNotificationGateway, NotificationGateway


def fabriquer_gateway() -> NotificationGateway:
    if parametres.canal_notification == "email":
        from app.notification.email_gateway import EmailNotificationGateway

        return EmailNotificationGateway(
            hote=parametres.smtp_hote,
            port=parametres.smtp_port,
            expediteur=parametres.smtp_expediteur,
            repli=LoggingNotificationGateway(),
        )
    return LoggingNotificationGateway()
