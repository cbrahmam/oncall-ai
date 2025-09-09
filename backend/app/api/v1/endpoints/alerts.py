# backend/app/api/v1/endpoints/alerts.py

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, Dict, Any, List

from app.database import get_async_session
from app.core.security import get_current_user
from app.models.user import User
from app.services.alert_service import AlertService
from app.schemas.alert import (
    AlertResponse, AlertCreate, AlertUpdate, AlertListResponse,
    AlertStatus, AlertSeverity, AlertSource
)
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

@router.get("/", response_model=AlertListResponse)
async def list_alerts(
    status: Optional[AlertStatus] = Query(None, description="Filter by alert status"),
    severity: Optional[AlertSeverity] = Query(None, description="Filter by alert severity"), 
    service: Optional[str] = Query(None, description="Filter by service name"),
    environment: Optional[str] = Query(None, description="Filter by environment"),
    source: Optional[AlertSource] = Query(None, description="Filter by alert source"),
    page: int = Query(1, ge=1, description="Page number"),
    per_page: int = Query(20, ge=1, le=100, description="Items per page"),
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user)
):
    """List alerts with filtering and pagination"""
    
    try:
        service = AlertService(db)
        return await service.list_alerts(
            organization_id=current_user.organization_id,
            status=status,
            severity=severity,
            service=service,
            environment=environment,
            source=source.value if source else None,
            page=page,
            per_page=per_page
        )
    except Exception as e:
        logger.error(f"Error listing alerts: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve alerts")

@router.get("/{alert_id}", response_model=AlertResponse)
async def get_alert(
    alert_id: str,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user)
):
    """Get a specific alert by ID"""
    
    try:
        service = AlertService(db)
        alert = await service.get_alert_by_id(alert_id, current_user.organization_id)
        
        if not alert:
            raise HTTPException(status_code=404, detail="Alert not found")
        
        return AlertResponse(
            id=str(alert.id),
            external_id=alert.external_id,
            fingerprint=alert.fingerprint,
            title=alert.title,
            description=alert.description,
            severity=alert.severity,
            status=alert.status,
            source=alert.source,
            service_name=alert.service_name,
            environment=alert.environment,
            host=alert.host,
            incident_id=str(alert.incident_id) if alert.incident_id else None,
            started_at=alert.started_at,
            ended_at=alert.ended_at,
            created_at=alert.created_at,
            updated_at=alert.updated_at,
            labels=alert.labels,
            raw_data=alert.raw_data
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving alert {alert_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve alert")

@router.post("/", response_model=AlertResponse)
async def create_alert(
    alert_data: AlertCreate,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user)
):
    """Create a new alert"""
    
    try:
        service = AlertService(db)
        return await service.create_alert(alert_data, current_user.organization_id)
        
    except Exception as e:
        logger.error(f"Error creating alert: {e}")
        raise HTTPException(status_code=500, detail="Failed to create alert")

@router.patch("/{alert_id}", response_model=AlertResponse)
async def update_alert(
    alert_id: str,
    update_data: AlertUpdate,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user)
):
    """Update an existing alert"""
    
    try:
        service = AlertService(db)
        alert = await service.get_alert_by_id(alert_id, current_user.organization_id)
        
        if not alert:
            raise HTTPException(status_code=404, detail="Alert not found")
        
        # Update fields
        if update_data.title is not None:
            alert.title = update_data.title
        if update_data.description is not None:
            alert.description = update_data.description
        if update_data.severity is not None:
            alert.severity = update_data.severity
        if update_data.status is not None:
            alert.status = update_data.status
        if update_data.service_name is not None:
            alert.service_name = update_data.service_name
        if update_data.environment is not None:
            alert.environment = update_data.environment
        if update_data.host is not None:
            alert.host = update_data.host
        if update_data.ended_at is not None:
            alert.ended_at = update_data.ended_at
        if update_data.labels is not None:
            alert.labels = update_data.labels
        
        alert.updated_at = datetime.utcnow()
        await db.commit()
        
        return AlertResponse(
            id=str(alert.id),
            external_id=alert.external_id,
            fingerprint=alert.fingerprint,
            title=alert.title,
            description=alert.description,
            severity=alert.severity,
            status=alert.status,
            source=alert.source,
            service_name=alert.service_name,
            environment=alert.environment,
            host=alert.host,
            incident_id=str(alert.incident_id) if alert.incident_id else None,
            started_at=alert.started_at,
            ended_at=alert.ended_at,
            created_at=alert.created_at,
            updated_at=alert.updated_at,
            labels=alert.labels,
            raw_data=alert.raw_data
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating alert {alert_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to update alert")

@router.post("/{alert_id}/acknowledge", response_model=AlertResponse)
async def acknowledge_alert(
    alert_id: str,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user)
):
    """Acknowledge an alert"""
    
    try:
        service = AlertService(db)
        return await service.acknowledge_alert(
            alert_id=alert_id,
            organization_id=current_user.organization_id,
            user_id=str(current_user.id)
        )
        
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error acknowledging alert {alert_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to acknowledge alert")

@router.post("/{alert_id}/suppress", response_model=AlertResponse)
async def suppress_alert(
    alert_id: str,
    reason: Optional[str] = Query(None, description="Reason for suppression"),
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user)
):
    """Suppress an alert"""
    
    try:
        service = AlertService(db)
        return await service.suppress_alert(
            alert_id=alert_id,
            organization_id=current_user.organization_id,
            user_id=str(current_user.id),
            reason=reason
        )
        
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error suppressing alert {alert_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to suppress alert")

@router.get("/statistics/summary")
async def get_alert_statistics(
    days: int = Query(7, ge=1, le=90, description="Number of days to analyze"),
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user)
):
    """Get alert statistics and insights"""
    
    try:
        service = AlertService(db)
        return await service.get_alert_statistics(
            organization_id=current_user.organization_id,
            days=days
        )
        
    except Exception as e:
        logger.error(f"Error generating alert statistics: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate statistics")

@router.get("/health-check")
async def alert_system_health():
    """Health check for the alert ingestion system"""
    
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "alert_system_version": "2.0.0",
        "supported_sources": [
            "datadog", "grafana", "aws-cloudwatch", "new-relic", 
            "prometheus", "pagerduty", "generic"
        ],
        "features": [
            "deduplication", "auto-incident-creation", "flap-detection",
            "maintenance-windows", "multi-source-support"
        ]
    }