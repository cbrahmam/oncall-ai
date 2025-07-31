# backend/app/api/v1/endpoints/incidents.py - COMPLETELY FIXED VERSION
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from sqlalchemy.orm import selectinload

from app.database import get_async_session
from app.core.security import get_current_user
from app.models.user import User
from app.models.incident import Incident, IncidentStatus, IncidentSeverity
from app.schemas.incident import IncidentCreate, IncidentUpdate, IncidentResponse
from datetime import datetime
import uuid

router = APIRouter()

@router.get("/", response_model=List[dict])
@router.get("", response_model=List[dict])
async def list_incidents(
    page: int = Query(1, ge=1, description="Page number"),
    per_page: int = Query(20, ge=1, le=100, description="Items per page"),
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by status"),
    severity_filter: Optional[str] = Query(None, alias="severity", description="Filter by severity"),
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
        if status_filter:
            try:
                status_enum = IncidentStatus(status_filter.lower())
                query = query.where(Incident.status == status_enum)
            except ValueError:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Invalid status. Must be one of: {[s.value for s in IncidentStatus]}"
                )
        
        if severity_filter:
            try:
                severity_enum = IncidentSeverity(severity_filter.lower())
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

@router.post("/", response_model=dict)
@router.post("", response_model=dict)
async def create_incident(
    incident_data: dict,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    """Create a new incident"""
    try:
        # Create new incident
        new_incident = Incident(
            organization_id=current_user.organization_id,
            title=incident_data.get("title"),
            description=incident_data.get("description"),
            severity=IncidentSeverity(incident_data.get("severity", "medium").lower()),
            status=IncidentStatus.OPEN,
            created_by_id=current_user.id
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
            detail=f"Failed to create incident: {str(e)}"
        )

@router.get("/{incident_id}", response_model=dict)
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

@router.patch("/{incident_id}/acknowledge", response_model=dict)
async def acknowledge_incident(
    incident_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    """Acknowledge an incident"""
    return await _update_incident_status(incident_id, IncidentStatus.ACKNOWLEDGED, current_user, db)

@router.patch("/{incident_id}/resolve", response_model=dict)
async def resolve_incident(
    incident_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    """Resolve an incident"""
    return await _update_incident_status(incident_id, IncidentStatus.RESOLVED, current_user, db)

@router.patch("/{incident_id}/reopen", response_model=dict)
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
) -> dict:
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
        
        # Set resolution time if resolving
        if new_status == IncidentStatus.RESOLVED and not incident.resolved_at:
            incident.resolved_at = datetime.utcnow()
        elif new_status != IncidentStatus.RESOLVED:
            incident.resolved_at = None
            
        # Set acknowledgment time if acknowledging
        if new_status == IncidentStatus.ACKNOWLEDGED and not incident.acknowledged_at:
            incident.acknowledged_at = datetime.utcnow()
            incident.acknowledged_by_id = current_user.id
        
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

def _incident_to_response(incident):
    """Convert incident model to response format"""
    return {
        "id": str(incident.id),
        "organization_id": str(incident.organization_id),
        "title": incident.title,
        "description": incident.description,
        "severity": incident.severity.value,
        "status": incident.status.value,
        "created_by_id": str(incident.created_by_id) if incident.created_by_id else None,
        "assigned_to_id": str(incident.assigned_to_id) if incident.assigned_to_id else None,
        "acknowledged_by_id": str(incident.acknowledged_by_id) if incident.acknowledged_by_id else None,
        "resolved_by_id": str(incident.resolved_by_id) if incident.resolved_by_id else None,
        "created_at": incident.created_at.isoformat() if incident.created_at else None,
        "updated_at": incident.updated_at.isoformat() if incident.updated_at else None,
        "acknowledged_at": incident.acknowledged_at.isoformat() if incident.acknowledged_at else None,
        "resolved_at": incident.resolved_at.isoformat() if incident.resolved_at else None
    }