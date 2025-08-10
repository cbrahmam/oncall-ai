import os
from typing import List, Dict, Any
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail, To, From
from app.core.config import settings
from app.models.incident import Incident
from app.models.user import User

class EmailService:
    def __init__(self):
        if not settings.SENDGRID_API_KEY:
            raise ValueError("SENDGRID_API_KEY not configured")
        self.sg = SendGridAPIClient(api_key=settings.SENDGRID_API_KEY)
        self.from_email = From(settings.FROM_EMAIL)

    async def send_incident_alert(self, user: User, incident: Incident) -> bool:
        """Send incident alert email"""
        try:
            subject = f"🚨 {incident.severity.upper()} Incident: {incident.title}"
            
            html_content = f"""
            <div style="font-family: Arial, sans-serif; max-width: 600px;">
                <h2 style="color: #dc2626;">New Incident Alert</h2>
                <div style="background: #fef2f2; padding: 16px; border-radius: 8px; margin: 16px 0;">
                    <h3>{incident.title}</h3>
                    <p><strong>Severity:</strong> {incident.severity.upper()}</p>
                    <p><strong>Status:</strong> {incident.status}</p>
                    <p><strong>Description:</strong> {incident.description or 'No description'}</p>
                    <p><strong>Created:</strong> {incident.created_at}</p>
                </div>
                <div style="margin: 24px 0;">
                    <a href="http://localhost:3000/incidents/{incident.id}" 
                       style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
                        View Incident
                    </a>
                </div>
                <p style="color: #666; font-size: 14px;">
                    OffCall AI - Incident Response Platform
                </p>
            </div>
            """
            
            message = Mail(
                from_email=self.from_email,
                to_emails=To(user.email),
                subject=subject,
                html_content=html_content
            )
            
            response = self.sg.send(message)
            return response.status_code == 202
            
        except Exception as e:
            print(f"Email send error: {e}")
            return False

    async def send_incident_acknowledged(self, user: User, incident: Incident, acknowledged_by: User) -> bool:
        """Send incident acknowledged notification"""
        try:
            subject = f"✅ Incident Acknowledged: {incident.title}"
            
            html_content = f"""
            <div style="font-family: Arial, sans-serif; max-width: 600px;">
                <h2 style="color: #059669;">Incident Acknowledged</h2>
                <div style="background: #f0fdf4; padding: 16px; border-radius: 8px; margin: 16px 0;">
                    <h3>{incident.title}</h3>
                    <p><strong>Acknowledged by:</strong> {acknowledged_by.full_name}</p>
                    <p><strong>Status:</strong> {incident.status}</p>
                    <p><strong>Time:</strong> {incident.acknowledged_at}</p>
                </div>
                <div style="margin: 24px 0;">
                    <a href="http://localhost:3000/incidents/{incident.id}" 
                       style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
                        View Incident
                    </a>
                </div>
            </div>
            """
            
            message = Mail(
                from_email=self.from_email,
                to_emails=To(user.email),
                subject=subject,
                html_content=html_content
            )
            
            response = self.sg.send(message)
            return response.status_code == 202
            
        except Exception as e:
            print(f"Email send error: {e}")
            return False

    async def send_incident_resolved(self, user: User, incident: Incident, resolved_by: User) -> bool:
        """Send incident resolved notification"""
        try:
            subject = f"✅ Incident Resolved: {incident.title}"
            
            html_content = f"""
            <div style="font-family: Arial, sans-serif; max-width: 600px;">
                <h2 style="color: #059669;">Incident Resolved</h2>
                <div style="background: #f0fdf4; padding: 16px; border-radius: 8px; margin: 16px 0;">
                    <h3>{incident.title}</h3>
                    <p><strong>Resolved by:</strong> {resolved_by.full_name}</p>
                    <p><strong>Status:</strong> {incident.status}</p>
                    <p><strong>Resolved at:</strong> {incident.resolved_at}</p>
                </div>
                <div style="margin: 24px 0;">
                    <a href="http://localhost:3000/incidents/{incident.id}" 
                       style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
                        View Incident
                    </a>
                </div>
            </div>
            """
            
            message = Mail(
                from_email=self.from_email,
                to_emails=To(user.email),
                subject=subject,
                html_content=html_content
            )
            
            response = self.sg.send(message)
            return response.status_code == 202
            
        except Exception as e:
            print(f"Email send error: {e}")
            return False

    async def send_escalation_alert(self, user: User, incident: Incident, escalation_level: int) -> bool:
        """Send escalation alert email"""
        try:
            subject = f"🔴 ESCALATION Level {escalation_level}: {incident.title}"
            
            html_content = f"""
            <div style="font-family: Arial, sans-serif; max-width: 600px;">
                <h2 style="color: #dc2626;">Incident Escalation</h2>
                <div style="background: #fef2f2; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #dc2626;">
                    <h3>{incident.title}</h3>
                    <p><strong>Escalation Level:</strong> {escalation_level}</p>
                    <p><strong>Severity:</strong> {incident.severity.upper()}</p>
                    <p><strong>Status:</strong> {incident.status}</p>
                    <p><strong>No response for:</strong> {(incident.updated_at - incident.created_at).total_seconds() // 60:.0f} minutes</p>
                </div>
                <div style="margin: 24px 0;">
                    <a href="http://localhost:3000/incidents/{incident.id}" 
                       style="background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
                        URGENT: View Incident
                    </a>
                </div>
                <p style="color: #dc2626; font-weight: bold;">
                    This incident requires immediate attention.
                </p>
            </div>
            """
            
            message = Mail(
                from_email=self.from_email,
                to_emails=To(user.email),
                subject=subject,
                html_content=html_content
            )
            
            response = self.sg.send(message)
            return response.status_code == 202
            
        except Exception as e:
            print(f"Email send error: {e}")
            return False