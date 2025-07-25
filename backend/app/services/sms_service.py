from twilio.rest import Client
from app.core.config import settings
from app.models.incident import Incident
from app.models.user import User

class SMSService:
    def __init__(self):
        if not settings.TWILIO_ACCOUNT_SID or not settings.TWILIO_AUTH_TOKEN:
            raise ValueError("Twilio credentials not configured")
        self.client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
        self.from_number = settings.TWILIO_PHONE_NUMBER

    async def send_critical_alert(self, user: User, incident: Incident) -> bool:
        """Send SMS for critical incidents only"""
        if not user.phone_number:
            return False
            
        try:
            message_body = f"""🚨 CRITICAL INCIDENT
{incident.title}

Severity: {incident.severity.upper()}
Created: {incident.created_at.strftime('%H:%M')}

View: http://localhost:3000/incidents/{incident.id}

OnCall AI"""

            message = self.client.messages.create(
                body=message_body,
                from_=self.from_number,
                to=user.phone_number
            )
            
            return message.sid is not None
            
        except Exception as e:
            print(f"SMS send error: {e}")
            return False

    async def send_escalation_sms(self, user: User, incident: Incident, level: int) -> bool:
        """Send SMS for escalated incidents"""
        if not user.phone_number:
            return False
            
        try:
            message_body = f"""🔴 ESCALATION L{level}
{incident.title}

No response for {level * 10} minutes
URGENT ACTION REQUIRED

View: http://localhost:3000/incidents/{incident.id}

OnCall AI"""

            message = self.client.messages.create(
                body=message_body,
                from_=self.from_number,
                to=user.phone_number
            )
            
            return message.sid is not None
            
        except Exception as e:
            print(f"SMS escalation error: {e}")
            return False    