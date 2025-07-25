# backend/app/services/notification_service.py
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.models.incident import Incident
from app.models.user import User
from app.models.team import Team, team_members
from app.services.email_service import EmailService
from app.services.slack_service import SlackService
from app.services.sms_service import SMSService

class NotificationService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.email_service = EmailService()
        try:
            self.slack_service = SlackService()
            self.slack_enabled = True
        except Exception as e:
            print(f"Slack not configured: {e}")
            self.slack_service = None
            self.slack_enabled = False
        
        try:
            self.sms_service = SMSService()
            self.sms_enabled = True
        except Exception as e:
            print(f"SMS not configured: {e}")
            self.sms_service = None
            self.sms_enabled = False

    async def notify_incident_created(self, incident: Incident) -> bool:
        """Notify relevant users when incident is created"""
        try:
            # Get all active users in the organization
            query = (
                select(User)
                .where(
                    User.organization_id == incident.organization_id,
                    User.is_active == True
                )
            )
            result = await self.db.execute(query)
            users = result.scalars().all()

            # Filter users who should be notified
            users_to_notify = [u for u in users if u.notification_preferences.get('email', True)]

            # Send emails
            email_success_count = 0
            for user in users_to_notify:
                if await self.email_service.send_incident_alert(user, incident):
                    email_success_count += 1

            # Send Slack notification if enabled
            slack_success = False
            if self.slack_enabled and incident.severity in ['critical', 'high']:
                slack_success = await self.slack_service.send_incident_alert(
                    "#incidents", incident
                )

            # Send SMS for critical incidents
            sms_success_count = 0
            if self.sms_enabled and incident.severity == 'critical':
                sms_users = [u for u in users_to_notify if u.phone_number and u.notification_preferences.get('sms', True)]
                for user in sms_users:
                    if await self.sms_service.send_critical_alert(user, incident):
                        sms_success_count += 1

            print(f"Notifications sent - Email: {email_success_count}/{len(users_to_notify)}, Slack: {slack_success}, SMS: {sms_success_count}")
            return email_success_count > 0 or slack_success or sms_success_count > 0

        except Exception as e:
            print(f"Notification error: {e}")
            return False

    async def notify_incident_acknowledged(self, incident: Incident, acknowledged_by: User) -> bool:
        """Notify team when incident is acknowledged"""
        try:
            # Get organization users except the one who acknowledged
            query = (
                select(User)
                .where(
                    User.organization_id == incident.organization_id,
                    User.is_active == True,
                    User.id != acknowledged_by.id
                )
            )
            result = await self.db.execute(query)
            users = result.scalars().all()

            users_to_notify = [u for u in users if u.notification_preferences.get('email', True)]

            # Send email notifications
            email_success_count = 0
            for user in users_to_notify:
                if await self.email_service.send_incident_acknowledged(user, incident, acknowledged_by):
                    email_success_count += 1

            # Send Slack update
            slack_success = False
            if self.slack_enabled:
                slack_success = await self.slack_service.send_incident_update(
                    "#incidents", incident, "acknowledged", acknowledged_by
                )

            print(f"Acknowledgment notifications sent - Email: {email_success_count}/{len(users_to_notify)}, Slack: {slack_success}")
            return email_success_count > 0 or slack_success

        except Exception as e:
            print(f"Acknowledgment notification error: {e}")
            return False

    async def notify_incident_resolved(self, incident: Incident, resolved_by: User) -> bool:
        """Notify team when incident is resolved"""
        try:
            # Get organization users except the one who resolved
            query = (
                select(User)
                .where(
                    User.organization_id == incident.organization_id,
                    User.is_active == True,
                    User.id != resolved_by.id
                )
            )
            result = await self.db.execute(query)
            users = result.scalars().all()

            users_to_notify = [u for u in users if u.notification_preferences.get('email', True)]

            # Send email notifications
            email_success_count = 0
            for user in users_to_notify:
                if await self.email_service.send_incident_resolved(user, incident, resolved_by):
                    email_success_count += 1

            # Send Slack update
            slack_success = False
            if self.slack_enabled:
                slack_success = await self.slack_service.send_incident_update(
                    "#incidents", incident, "resolved", resolved_by
                )

            print(f"Resolution notifications sent - Email: {email_success_count}/{len(users_to_notify)}, Slack: {slack_success}")
            return email_success_count > 0 or slack_success

        except Exception as e:
            print(f"Resolution notification error: {e}")
            return False

    async def notify_escalation(self, incident: Incident, escalation_level: int) -> bool:
        """Send escalation notifications"""
        try:
            # For now, escalate to all admins
            query = (
                select(User)
                .where(
                    User.organization_id == incident.organization_id,
                    User.is_active == True,
                    User.role == "admin"
                )
            )
            result = await self.db.execute(query)
            admin_users = result.scalars().all()

            if not admin_users:
                # Fallback to all users if no admins
                query = (
                    select(User)
                    .where(
                        User.organization_id == incident.organization_id,
                        User.is_active == True
                    )
                )
                result = await self.db.execute(query)
                admin_users = result.scalars().all()

            users_to_notify = [u for u in admin_users if u.notification_preferences.get('email', True)]

            # Send escalation emails
            email_success_count = 0
            for user in users_to_notify:
                if await self.email_service.send_escalation_alert(user, incident, escalation_level):
                    email_success_count += 1

            # Send urgent Slack alert
            slack_success = False
            if self.slack_enabled:
                slack_success = await self.slack_service.send_incident_alert(
                    "#incidents", incident
                )

            # Send escalation SMS to admins
            sms_success_count = 0
            if self.sms_enabled:
                sms_users = [u for u in users_to_notify if u.phone_number and u.notification_preferences.get('sms', True)]
                for user in sms_users:
                    if await self.sms_service.send_escalation_sms(user, incident, escalation_level):
                        sms_success_count += 1

            print(f"Escalation notifications sent - Email: {email_success_count}/{len(users_to_notify)}, Slack: {slack_success}, SMS: {sms_success_count}")
            return email_success_count > 0 or slack_success or sms_success_count > 0

        except Exception as e:
            print(f"Escalation notification error: {e}")
            return False