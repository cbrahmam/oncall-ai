# backend/app/api/v1/endpoints/incidents.py - Fixed Version
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from sqlalchemy.orm import selectinload

from app.database import get_async_session
from app.core.security import get_current_user
from app.models.user import User
from app.models.incident import Incident
from app.schemas.incident import (
    IncidentCreate, IncidentUpdate, IncidentResponse, 
    IncidentStatus, IncidentSeverity
)
from datetime import datetime
import uuid

router = APIRouter()

@router.get("/", response_model=List[IncidentResponse])
@router.get("", response_model=List[IncidentResponse])  # Handle both with and without trailing slash
async def list_incidents(
    page: int = Query(1, ge=1, description="Page number"),
    per_page: int = Query(20, ge=1, le=100, description="Items per page"),
    status: Optional[str] = Query(None, description="Filter by status"),
    severity: Optional[str] = Query(None, description="Filter by severity"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    """Get all incidents for the current user's organization"""
    try:
        # Build base query
        query = select(Incident).where(
            Incident.organization_id == current_user.organization_id
        )
        
        # Add filters
        if status:
            try:
                status_enum = IncidentStatus(status.lower())
                query = query.where(Incident.status == status_enum)
            except ValueError:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Invalid status. Must be one of: {[s.value for s in IncidentStatus]}"
                )
        
        if severity:
            try:
                severity_enum = IncidentSeverity(severity.lower())
                query = query.where(Incident.severity == severity_enum)
            except ValueError:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Invalid severity. Must be one of: {[s.value for s in IncidentSeverity]}"
                )
        
        # Add ordering (newest first)
        query = query.order_by(Incident.created_at.desc())
        
        # Add pagination
        offset = (page - 1) * per_page
        query = query.offset(offset).limit(per_page)
        
        # Execute query
        result = await db.execute(query)
        incidents = result.scalars().all()
        
        # Convert to response format
        return [_incident_to_response(incident) for incident in incidents]
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error listing incidents: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve incidents"
        )

@router.post("/", response_model=IncidentResponse)
@router.post("", response_model=IncidentResponse)
async def create_incident(
    incident_data: IncidentCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    """Create a new incident"""
    try:
        # Create new incident
        new_incident = Incident(
            id=uuid.uuid4(),
            organization_id=current_user.organization_id,
            title=incident_data.title,
            description=incident_data.description,
            severity=IncidentSeverity(incident_data.severity),
            status=IncidentStatus.OPEN,
            source=incident_data.source or "manual",
            created_by=current_user.id,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        
        db.add(new_incident)
        await db.commit()
        await db.refresh(new_incident)
        
        return _incident_to_response(new_incident)
        
    except Exception as e:
        await db.rollback()
        print(f"Error creating incident: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create incident"
        )

@router.get("/{incident_id}", response_model=IncidentResponse)
async def get_incident(
    incident_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    """Get a specific incident by ID"""
    try:
        # Parse UUID
        try:
            incident_uuid = uuid.UUID(incident_id)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid incident ID format")
        
        # Query incident
        query = select(Incident).where(
            and_(
                Incident.id == incident_uuid,
                Incident.organization_id == current_user.organization_id
            )
        )
        
        result = await db.execute(query)
        incident = result.scalar_one_or_none()
        
        if not incident:
            raise HTTPException(status_code=404, detail="Incident not found")
        
        return _incident_to_response(incident)
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error getting incident: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve incident"
        )

@router.patch("/{incident_id}/acknowledge", response_model=IncidentResponse)
async def acknowledge_incident(
    incident_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    """Acknowledge an incident"""
    return await _update_incident_status(incident_id, IncidentStatus.ACKNOWLEDGED, current_user, db)

@router.patch("/{incident_id}/resolve", response_model=IncidentResponse)
async def resolve_incident(
    incident_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    """Resolve an incident"""
    return await _update_incident_status(incident_id, IncidentStatus.RESOLVED, current_user, db)

@router.patch("/{incident_id}/reopen", response_model=IncidentResponse)
async def reopen_incident(
    incident_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    """Reopen a resolved incident"""
    return await _update_incident_status(incident_id, IncidentStatus.OPEN, current_user, db)

# Helper functions
async def _update_incident_status(
    incident_id: str,
    new_status: IncidentStatus,
    current_user: User,
    db: AsyncSession
) -> IncidentResponse:
    """Helper function to update incident status"""
    try:
        # Parse UUID
        try:
            incident_uuid = uuid.UUID(incident_id)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid incident ID format")
        
        # Get incident
        query = select(Incident).where(
            and_(
                Incident.id == incident_uuid,
                Incident.organization_id == current_user.organization_id
            )
        )
        
        result = await db.execute(query)
        incident = result.scalar_one_or_none()
        
        if not incident:
            raise HTTPException(status_code=404, detail="Incident not found")
        
        # Update status
        incident.status = new_status
        incident.updated_at = datetime.utcnow()
        
        # Set resolution time if resolving
        if new_status == IncidentStatus.RESOLVED and not incident.resolved_at:
            incident.resolved_at = datetime.utcnow()
        elif new_status != IncidentStatus.RESOLVED:
            incident.resolved_at = None
        
        await db.commit()
        await db.refresh(incident)
        
        return _incident_to_response(incident)
        
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        print(f"Error updating incident status: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update incident"
        )

def _incident_to_response(incident: Incident) -> IncidentResponse:
    """Convert Incident model to response format"""
    return IncidentResponse(
        id=str(incident.id),
        organization_id=str(incident.organization_id),
        title=incident.title,
        description=incident.description,
        severity=incident.severity.value,
        status=incident.status.value,
        source=incident.source,
        created_by=str(incident.created_by) if incident.created_by else None,
        assigned_to=str(incident.assigned_to) if incident.assigned_to else None,
        created_at=incident.created_at,
        updated_at=incident.updated_at,
        resolved_at=incident.resolved_at
    )