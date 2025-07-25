from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_async_session
from app.core.security import get_current_user
from app.models.user import User
from app.services.incident_service import IncidentService
from app.services.notification_service import NotificationService
from app.schemas.incident import (
    IncidentCreate, IncidentUpdate, IncidentResponse, IncidentListResponse,
    IncidentFilters, IncidentStatus, IncidentSeverity
)
import math
from datetime import datetime

router = APIRouter()

@router.post("/", response_model=IncidentResponse)
async def create_incident(
    incident_data: IncidentCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    """Create a new incident with notifications"""
    service = IncidentService(db)
    
    # Create the incident
    incident = await service.create_incident(
        incident_data=incident_data,
        user_id=str(current_user.id),
        organization_id=str(current_user.organization_id)
    )
    
    # Send notifications
    try:
        notification_service = NotificationService(db)
        await notification_service.notify_incident_created(incident)
    except Exception as e:
        print(f"Notification failed: {e}")
    
    # Get the incident with relationships loaded
    full_incident = await service.get_incident(
        incident_id=str(incident.id),
        organization_id=str(current_user.organization_id)
    )
    
    return service._incident_to_response(full_incident)

@router.get("/", response_model=IncidentListResponse)
async def list_incidents(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    status: Optional[str] = Query(None, description="Comma-separated list of statuses"),
    severity: Optional[str] = Query(None, description="Comma-separated list of severities"),
    assigned_to_id: Optional[str] = Query(None),
    created_after: Optional[datetime] = Query(None),
    created_before: Optional[datetime] = Query(None),
    tags: Optional[str] = Query(None, description="Comma-separated list of tags"),
    search: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    """List incidents with filtering and pagination"""
    
    # Parse comma-separated filters
    filters = IncidentFilters(
        status=[IncidentStatus(s.strip()) for s in status.split(",")] if status else None,
        severity=[IncidentSeverity(s.strip()) for s in severity.split(",")] if severity else None,
        assigned_to_id=assigned_to_id,
        created_after=created_after,
        created_before=created_before,
        tags=[t.strip() for t in tags.split(",")] if tags else None,
        search=search
    )
    
    service = IncidentService(db)
    incidents, total = await service.list_incidents(
        organization_id=current_user.organization_id,
        filters=filters,
        page=page,
        per_page=per_page
    )
    
    # Convert incidents to response format
    incident_responses = [service._incident_to_response(incident) for incident in incidents]
    
    return IncidentListResponse(
        incidents=incident_responses,
        total=total,
        page=page,
        per_page=per_page,
        total_pages=math.ceil(total / per_page) if total > 0 else 0
    )

@router.get("/{incident_id}", response_model=IncidentResponse)
async def get_incident(
    incident_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    """Get a specific incident"""
    service = IncidentService(db)
    incident = await service.get_incident(
        incident_id=incident_id,
        organization_id=str(current_user.organization_id)
    )
    
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    
    return service._incident_to_response(incident)

@router.patch("/{incident_id}", response_model=IncidentResponse)
async def update_incident(
    incident_id: str,
    update_data: IncidentUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    """Update an incident with notifications"""
    service = IncidentService(db)
    
    # Get current incident state
    incident = await service.get_incident(incident_id, str(current_user.organization_id))
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    
    old_status = incident.status
    
    # Update incident
    updated_incident = await service.update_incident(
        incident_id=incident_id,
        organization_id=str(current_user.organization_id),
        update_data=update_data,
        user_id=str(current_user.id)
    )
    
    if not updated_incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    
    # Send notifications for status changes
    try:
        notification_service = NotificationService(db)
        
        if (update_data.status == IncidentStatus.ACKNOWLEDGED and 
            old_status != IncidentStatus.ACKNOWLEDGED):
            await notification_service.notify_incident_acknowledged(updated_incident, current_user)
        elif (update_data.status == IncidentStatus.RESOLVED and 
              old_status != IncidentStatus.RESOLVED):
            await notification_service.notify_incident_resolved(updated_incident, current_user)
    except Exception as e:
        print(f"Notification failed: {e}")
    
    return service._incident_to_response(updated_incident)

@router.delete("/{incident_id}")
async def delete_incident(
    incident_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    """Delete an incident"""
    service = IncidentService(db)
    success = await service.delete_incident(
        incident_id=incident_id,
        organization_id=str(current_user.organization_id)
    )
    
    if not success:
        raise HTTPException(status_code=404, detail="Incident not found")
    
    return {"message": "Incident deleted successfully"}

@router.post("/{incident_id}/acknowledge", response_model=IncidentResponse)
async def acknowledge_incident(
    incident_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    """Quick action: Acknowledge an incident with notifications"""
    service = IncidentService(db)
    
    # Get current incident
    incident = await service.get_incident(incident_id, str(current_user.organization_id))
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    
    old_status = incident.status
    
    update_data = IncidentUpdate(
        status=IncidentStatus.ACKNOWLEDGED,
        assigned_to_id=str(current_user.id)
    )
    
    updated_incident = await service.update_incident(
        incident_id=incident_id,
        organization_id=str(current_user.organization_id),
        update_data=update_data,
        user_id=str(current_user.id)
    )
    
    if not updated_incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    
    # Send acknowledgment notification
    try:
        if old_status != IncidentStatus.ACKNOWLEDGED:
            notification_service = NotificationService(db)
            await notification_service.notify_incident_acknowledged(updated_incident, current_user)
    except Exception as e:
        print(f"Notification failed: {e}")
    
    return service._incident_to_response(updated_incident)

@router.post("/{incident_id}/resolve", response_model=IncidentResponse)
async def resolve_incident(
    incident_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    """Quick action: Resolve an incident with notifications"""
    service = IncidentService(db)
    
    # Get current incident
    incident = await service.get_incident(incident_id, str(current_user.organization_id))
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    
    old_status = incident.status
    
    update_data = IncidentUpdate(
        status=IncidentStatus.RESOLVED
    )
    
    updated_incident = await service.update_incident(
        incident_id=incident_id,
        organization_id=str(current_user.organization_id),
        update_data=update_data,
        user_id=str(current_user.id)
    )
    
    if not updated_incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    
    # Send resolution notification
    try:
        if old_status != IncidentStatus.RESOLVED:
            notification_service = NotificationService(db)
            await notification_service.notify_incident_resolved(updated_incident, current_user)
    except Exception as e:
        print(f"Notification failed: {e}")
    
    return service._incident_to_response(updated_incident)