import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func
from sqlalchemy.orm import selectinload

from app.database import get_async_session
from app.models.user import User
from app.models.incident import Incident
from app.schemas.incident import (
    IncidentCreate, IncidentUpdate, IncidentResponse, 
    IncidentListResponse, IncidentFilters, IncidentSeverity, IncidentStatus
)
from app.core.auth import get_current_user
from app.services.incident_service import IncidentService
from app.services.notification_service import NotificationService

router = APIRouter()
logger = logging.getLogger(__name__)

@router.post("/", response_model=IncidentResponse)
async def create_incident(
    incident_data: IncidentCreate,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    """Create a new incident"""
    
    try:
        service = IncidentService(db)
        
        incident = await service.create_incident(
            incident_data=incident_data,
            organization_id=str(current_user.organization_id),
            created_by_id=str(current_user.id)
        )
        
        logger.info(f"Incident created: {incident.id} by user {current_user.email}")
        
        # Send notifications in background
        background_tasks.add_task(
            _notify_incident_created,
            db, incident, current_user
        )
        
        return incident
        
    except Exception as e:
        logger.error(f"Error creating incident: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create incident: {str(e)}")

@router.get("/", response_model=IncidentListResponse)
async def list_incidents(
    page: int = Query(1, ge=1, description="Page number"),
    per_page: int = Query(50, ge=1, le=100, description="Items per page"),
    status: Optional[IncidentStatus] = Query(None, description="Filter by status"),
    severity: Optional[IncidentSeverity] = Query(None, description="Filter by severity"),
    assigned_to: Optional[str] = Query(None, description="Filter by assignee user ID"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    """List incidents with filtering and pagination"""
    
    try:
        service = IncidentService(db)
        
        # Build filters
        filters = IncidentFilters(
            status=status,
            severity=severity,
            assigned_to=assigned_to
        )
        
        incidents, total = await service.list_incidents(
            organization_id=str(current_user.organization_id),
            filters=filters,
            page=page,
            per_page=per_page
        )
        
        return IncidentListResponse(
            incidents=incidents,
            total=total,
            page=page,
            per_page=per_page,
            total_pages=(total + per_page - 1) // per_page
        )
        
    except Exception as e:
        logger.error(f"Error listing incidents: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to list incidents: {str(e)}")

@router.get("/{incident_id}", response_model=IncidentResponse)
async def get_incident(
    incident_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    """Get a specific incident"""
    
    try:
        service = IncidentService(db)
        
        incident = await service.get_incident(
            incident_id=incident_id,
            organization_id=str(current_user.organization_id)
        )
        
        if not incident:
            raise HTTPException(status_code=404, detail="Incident not found")
        
        return incident
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting incident {incident_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get incident: {str(e)}")

@router.patch("/{incident_id}", response_model=IncidentResponse)
async def update_incident(
    incident_id: str,
    incident_update: IncidentUpdate,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    """Update an incident"""
    
    try:
        service = IncidentService(db)
        
        incident = await service.update_incident(
            incident_id=incident_id,
            organization_id=str(current_user.organization_id),
            incident_update=incident_update,
            updated_by_id=str(current_user.id)
        )
        
        if not incident:
            raise HTTPException(status_code=404, detail="Incident not found")
        
        logger.info(f"Incident {incident_id} updated by user {current_user.email}")
        
        # Send notifications in background
        background_tasks.add_task(
            _notify_incident_updated,
            db, incident, current_user, incident_update
        )
        
        return incident
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating incident {incident_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to update incident: {str(e)}")

@router.post("/{incident_id}/acknowledge")
async def acknowledge_incident(
    incident_id: str,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    """Acknowledge an incident"""
    
    try:
        service = IncidentService(db)
        
        incident = await service.acknowledge_incident(
            incident_id=incident_id,
            organization_id=str(current_user.organization_id),
            acknowledged_by_id=str(current_user.id)
        )
        
        if not incident:
            raise HTTPException(status_code=404, detail="Incident not found")
        
        logger.info(f"Incident {incident_id} acknowledged by user {current_user.email}")
        
        # Send notifications
        background_tasks.add_task(
            _notify_incident_acknowledged,
            db, incident, current_user
        )
        
        return {"success": True, "message": "Incident acknowledged"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error acknowledging incident {incident_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to acknowledge incident: {str(e)}")

@router.post("/{incident_id}/resolve")
async def resolve_incident(
    incident_id: str,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    """Resolve an incident"""
    
    try:
        service = IncidentService(db)
        
        incident = await service.resolve_incident(
            incident_id=incident_id,
            organization_id=str(current_user.organization_id),
            resolved_by_id=str(current_user.id)
        )
        
        if not incident:
            raise HTTPException(status_code=404, detail="Incident not found")
        
        logger.info(f"Incident {incident_id} resolved by user {current_user.email}")
        
        # Send notifications
        background_tasks.add_task(
            _notify_incident_resolved,
            db, incident, current_user
        )
        
        return {"success": True, "message": "Incident resolved"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error resolving incident {incident_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to resolve incident: {str(e)}")

# Background notification functions
async def _notify_incident_created(db: AsyncSession, incident: Incident, user: User):
    """Send notifications for incident creation"""
    try:
        notification_service = NotificationService(db)
        await notification_service.notify_incident_created(incident, user)
    except Exception as e:
        logger.error(f"Failed to send incident creation notifications: {e}")

async def _notify_incident_updated(db: AsyncSession, incident: Incident, user: User, update: IncidentUpdate):
    """Send notifications for incident updates"""
    try:
        notification_service = NotificationService(db)
        await notification_service.notify_incident_updated(incident, user, update)
    except Exception as e:
        logger.error(f"Failed to send incident update notifications: {e}")

async def _notify_incident_acknowledged(db: AsyncSession, incident: Incident, user: User):
    """Send notifications for incident acknowledgment"""
    try:
        notification_service = NotificationService(db)
        await notification_service.notify_incident_acknowledged(incident, user)
    except Exception as e:
        logger.error(f"Failed to send incident acknowledgment notifications: {e}")

async def _notify_incident_resolved(db: AsyncSession, incident: Incident, user: User):
    """Send notifications for incident resolution"""
    try:
        notification_service = NotificationService(db)
        await notification_service.notify_incident_resolved(incident, user)
    except Exception as e:
        logger.error(f"Failed to send incident resolution notifications: {e}")