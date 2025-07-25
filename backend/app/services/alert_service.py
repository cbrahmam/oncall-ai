import hashlib
import json
from datetime import datetime
from typing import Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from app.models.alert import Alert
from app.models.incident import Incident
from app.schemas.alert import (
    GenericAlertPayload, AlertProcessingResult, AlertStatus, AlertSeverity
)
from app.schemas.incident import IncidentCreate, IncidentSeverity, IncidentStatus
from app.services.incident_service import IncidentService

class AlertService:
    def __init__(self, db: AsyncSession):
        self.db = db

    def generate_alert_fingerprint(self, alert_data: GenericAlertPayload) -> str:
        """Generate a unique fingerprint for alert deduplication"""
        # Use alert_id, title, and service to create fingerprint
        fingerprint_data = {
            "alert_id": alert_data.alert_id,
            "title": alert_data.title,
            "service": alert_data.service or "unknown",
            "source": alert_data.source
        }
        
        fingerprint_string = json.dumps(fingerprint_data, sort_keys=True)
        return hashlib.md5(fingerprint_string.encode()).hexdigest()

    async def process_alert(
        self, 
        alert_data: GenericAlertPayload, 
        organization_id: str
    ) -> AlertProcessingResult:
        """Process incoming alert and create/update incidents intelligently"""
        
        fingerprint = self.generate_alert_fingerprint(alert_data)
        
        # Check if we've seen this alert before
        existing_alert = await self.get_alert_by_fingerprint(fingerprint, organization_id)
        
        if alert_data.status == AlertStatus.RESOLVED:
            return await self._handle_resolved_alert(
                alert_data, existing_alert, fingerprint, organization_id
            )
        else:
            return await self._handle_active_alert(
                alert_data, existing_alert, fingerprint, organization_id
            )

    async def _handle_active_alert(
        self,
        alert_data: GenericAlertPayload,
        existing_alert: Optional[Alert],
        fingerprint: str,
        organization_id: str
    ) -> AlertProcessingResult:
        """Handle an active/triggered alert"""
        
        if existing_alert:
            # Update existing alert
            existing_alert.status = AlertStatus.ACTIVE
            existing_alert.raw_data = alert_data.raw_payload or {}
            
            await self.db.commit()
            
            return AlertProcessingResult(
                success=True,
                incident_id=str(existing_alert.incident_id) if existing_alert.incident_id else None,
                incident_created=False,
                incident_updated=True,
                message="Alert updated, incident already exists",
                alert_fingerprint=fingerprint
            )
        
        # Create new alert
        new_alert = Alert(
            organization_id=organization_id,
            external_id=alert_data.alert_id,
            fingerprint=fingerprint,
            title=alert_data.title,
            description=alert_data.description,
            severity=alert_data.severity,
            status=AlertStatus.ACTIVE,
            source=alert_data.source,
            service_name=alert_data.service,
            environment=alert_data.environment,
            host=alert_data.region,  # Using region as host for now
            started_at=alert_data.started_at or datetime.utcnow(),
            raw_data=alert_data.raw_payload or {},
            labels={
                "tags": alert_data.tags or [],
                "alert_url": alert_data.alert_url,
                "runbook_url": alert_data.runbook_url,
                "dashboard_url": alert_data.dashboard_url
            }
        )
        
        self.db.add(new_alert)
        await self.db.flush()  # Get the alert ID
        
        # Decide if we should create an incident
        should_create_incident = await self._should_create_incident(alert_data, organization_id)
        
        incident_id = None
        incident_created = False
        try:
            notification_service = NotificationService(self.db)
            await notification_service.notify_incident_created(incident)
        except Exception as e:
            print(f"Notification failed: {e}")
        if should_create_incident:
            # Create incident from alert
            incident_data = await self._alert_to_incident(alert_data, str(new_alert.id))
            
            incident_service = IncidentService(self.db)
            incident = await incident_service.create_incident(
                incident_data=incident_data,
                user_id=None,  # System-created
                organization_id=organization_id
            )
            
            # Link alert to incident
            new_alert.incident_id = incident.id
            incident_id = str(incident.id)
            incident_created = True
        
        await self.db.commit()
        
        return AlertProcessingResult(
            success=True,
            incident_id=incident_id,
            incident_created=incident_created,
            incident_updated=False,
            message="New alert processed" + (" and incident created" if incident_created else ""),
            alert_fingerprint=fingerprint
        )

    async def _handle_resolved_alert(
        self,
        alert_data: GenericAlertPayload,
        existing_alert: Optional[Alert],
        fingerprint: str,
        organization_id: str
    ) -> AlertProcessingResult:
        """Handle a resolved alert"""
        
        if not existing_alert:
            return AlertProcessingResult(
                success=False,
                message="Cannot resolve alert that doesn't exist",
                alert_fingerprint=fingerprint
            )
        
        # Update alert status
        existing_alert.status = AlertStatus.RESOLVED
        existing_alert.ended_at = alert_data.resolved_at or datetime.utcnow()
        
        incident_updated = False
        incident_id = None
        
        # If alert has associated incident, consider auto-resolving it
        if existing_alert.incident_id:
            incident_id = str(existing_alert.incident_id)
            
            # Check if this is the only active alert for the incident
            other_active_alerts = await self._count_active_alerts_for_incident(
                existing_alert.incident_id, organization_id
            )
            
            if other_active_alerts == 0:
                # Auto-resolve the incident
                incident_service = IncidentService(self.db)
                from app.schemas.incident import IncidentUpdate
                
                await incident_service.update_incident(
                    incident_id=str(existing_alert.incident_id),
                    organization_id=organization_id,
                    update_data=IncidentUpdate(status=IncidentStatus.RESOLVED),
                    user_id=None  # System update
                )
                incident_updated = True
        
        await self.db.commit()
        
        return AlertProcessingResult(
            success=True,
            incident_id=incident_id,
            incident_created=False,
            incident_updated=incident_updated,
            message="Alert resolved" + (" and incident auto-resolved" if incident_updated else ""),
            alert_fingerprint=fingerprint
        )

    async def _should_create_incident(
        self, 
        alert_data: GenericAlertPayload, 
        organization_id: str
    ) -> bool:
        """AI-powered decision: should this alert create an incident?"""
        
        # Always create incident for critical alerts
        if alert_data.severity == AlertSeverity.CRITICAL:
            return True
        
        # Create incident for error severity in production
        if (alert_data.severity == AlertSeverity.ERROR and 
            alert_data.environment and 
            alert_data.environment.lower() in ["prod", "production"]):
            return True
        
        # Don't create incidents for info alerts
        if alert_data.severity == AlertSeverity.INFO:
            return False
        
        # Default: create incident for warning/error alerts
        return alert_data.severity in [AlertSeverity.WARNING, AlertSeverity.ERROR]

    async def _alert_to_incident(
        self, 
        alert_data: GenericAlertPayload, 
        alert_id: str
    ) -> IncidentCreate:
        """Convert alert data to incident creation request"""
        
        # Map alert severity to incident severity
        severity_map = {
            AlertSeverity.INFO: IncidentSeverity.LOW,
            AlertSeverity.WARNING: IncidentSeverity.MEDIUM,
            AlertSeverity.ERROR: IncidentSeverity.HIGH,
            AlertSeverity.CRITICAL: IncidentSeverity.CRITICAL
        }
        
        # Create descriptive title
        title = alert_data.title
        if alert_data.service:
            title = f"[{alert_data.service}] {title}"
        if alert_data.environment:
            title = f"{title} ({alert_data.environment})"
        
        # Build description with context
        description_parts = []
        if alert_data.description:
            description_parts.append(alert_data.description)
        
        if alert_data.alert_url:
            description_parts.append(f"Alert URL: {alert_data.alert_url}")
        
        if alert_data.dashboard_url:
            description_parts.append(f"Dashboard: {alert_data.dashboard_url}")
        
        if alert_data.runbook_url:
            description_parts.append(f"Runbook: {alert_data.runbook_url}")
        
        description = "\n\n".join(description_parts)
        
        # Build tags
        tags = alert_data.tags or []
        tags.append(f"source:{alert_data.source}")
        tags.append(f"alert_id:{alert_id}")
        
        if alert_data.service:
            tags.append(f"service:{alert_data.service}")
        if alert_data.environment:
            tags.append(f"env:{alert_data.environment}")
        if alert_data.region:
            tags.append(f"region:{alert_data.region}")
        
        return IncidentCreate(
            title=title[:200],  # Truncate to fit schema
            description=description[:2000],  # Truncate to fit schema
            severity=severity_map[alert_data.severity],
            tags=tags
        )

    async def get_alert_by_fingerprint(
        self, 
        fingerprint: str, 
        organization_id: str
    ) -> Optional[Alert]:
        """Get alert by fingerprint for deduplication"""
        query = select(Alert).where(
            and_(
                Alert.fingerprint == fingerprint,
                Alert.organization_id == organization_id
            )
        )
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def _count_active_alerts_for_incident(
        self, 
        incident_id: str, 
        organization_id: str
    ) -> int:
        """Count how many alerts are still active for an incident"""
        from sqlalchemy import func
        
        query = select(func.count(Alert.id)).where(
            and_(
                Alert.incident_id == incident_id,
                Alert.organization_id == organization_id,
                Alert.status == AlertStatus.ACTIVE
            )
        )
        result = await self.db.execute(query)
        return result.scalar() or 0