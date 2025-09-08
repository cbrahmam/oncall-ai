# backend/app/api/v1/endpoints/incidents.py - FIXED VERSION
import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func, update
from sqlalchemy.orm import selectinload
from datetime import datetime
import uuid

from app.database import get_async_session
from app.models.user import User
from app.models.incident import Incident
from app.core.deps import get_current_user  # Fixed import path

router = APIRouter()
logger = logging.getLogger(__name__)

# Simplified schemas directly in this file for now
from pydantic import BaseModel
from enum import Enum

class IncidentSeverity(str, Enum):
    low = "low"
    medium = "medium"
    high = "high"
    critical = "critical"

class IncidentStatus(str, Enum):
    open = "open"
    acknowledged = "acknowledged"
    resolved = "resolved"

class IncidentCreate(BaseModel):
    title: str
    description: str
    severity: IncidentSeverity = IncidentSeverity.medium
    status: IncidentStatus = IncidentStatus.open

class IncidentUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    severity: Optional[IncidentSeverity] = None
    status: Optional[IncidentStatus] = None
    assigned_to: Optional[str] = None

class IncidentResponse(BaseModel):
    id: str
    title: str
    description: str
    severity: str
    status: str
    assigned_to: Optional[str] = None
    created_at: str
    updated_at: str
    resolved_at: Optional[str] = None
    
    class Config:
        from_attributes = True

class IncidentListResponse(BaseModel):
    incidents: List[IncidentResponse]
    total: int
    page: int
    per_page: int
    total_pages: int

@router.post("/", response_model=IncidentResponse)
async def create_incident(
    incident_data: IncidentCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    """Create a new incident"""
    
    try:
        # Create incident directly without service layer for now
        incident = Incident(
            organization_id=current_user.organization_id,
            title=incident_data.title,
            description=incident_data.description,
            severity=incident_data.severity.value,
            status=incident_data.status.value,
            created_by_id=current_user.id,  # Fixed: use created_by_id not created_by
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        
        db.add(incident)
        await db.commit()
        await db.refresh(incident)
        
        logger.info(f"Incident created: {incident.id} by user {current_user.email}")
        
        return IncidentResponse(
            id=str(incident.id),
            title=incident.title,
            description=incident.description,
            severity=incident.severity,
            status=incident.status,
            assigned_to=incident.assigned_to,
            created_at=incident.created_at.isoformat(),
            updated_at=incident.updated_at.isoformat(),
            resolved_at=incident.resolved_at.isoformat() if incident.resolved_at else None
        )
        
    except Exception as e:
        logger.error(f"Error creating incident: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create incident: {str(e)}")

@router.get("/", response_model=IncidentListResponse)
async def list_incidents(
    page: int = Query(1, ge=1, description="Page number"),
    per_page: int = Query(50, ge=1, le=100, description="Items per page"),
    status: Optional[IncidentStatus] = Query(None, description="Filter by status"),
    severity: Optional[IncidentSeverity] = Query(None, description="Filter by severity"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    """List incidents with filtering and pagination"""
    
    try:
        # Build query
        query = select(Incident).where(Incident.organization_id == current_user.organization_id)
        
        # Add filters
        if status:
            query = query.where(Incident.status == status.value)
        if severity:
            query = query.where(Incident.severity == severity.value)
        
        # Get total count
        count_query = select(func.count(Incident.id)).where(Incident.organization_id == current_user.organization_id)
        if status:
            count_query = count_query.where(Incident.status == status.value)
        if severity:
            count_query = count_query.where(Incident.severity == severity.value)
        
        total_result = await db.execute(count_query)
        total = total_result.scalar()
        
        # Add pagination and ordering
        query = query.order_by(Incident.created_at.desc())
        query = query.offset((page - 1) * per_page).limit(per_page)
        
        # Execute query
        result = await db.execute(query)
        incidents = result.scalars().all()
        
        # Convert to response format
        incident_responses = [
            IncidentResponse(
                id=str(incident.id),
                title=incident.title,
                description=incident.description,
                severity=incident.severity,
                status=incident.status,
                assigned_to=incident.assigned_to,
                created_at=incident.created_at.isoformat(),
                updated_at=incident.updated_at.isoformat(),
                resolved_at=incident.resolved_at.isoformat() if incident.resolved_at else None
            )
            for incident in incidents
        ]
        
        return IncidentListResponse(
            incidents=incident_responses,
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
        query = select(Incident).where(
            and_(
                Incident.id == incident_id,
                Incident.organization_id == current_user.organization_id
            )
        )
        
        result = await db.execute(query)
        incident = result.scalar_one_or_none()
        
        if not incident:
            raise HTTPException(status_code=404, detail="Incident not found")
        
        return IncidentResponse(
            id=str(incident.id),
            title=incident.title,
            description=incident.description,
            severity=incident.severity,
            status=incident.status,
            assigned_to=incident.assigned_to,
            created_at=incident.created_at.isoformat(),
            updated_at=incident.updated_at.isoformat(),
            resolved_at=incident.resolved_at.isoformat() if incident.resolved_at else None
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting incident {incident_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get incident: {str(e)}")

@router.patch("/{incident_id}", response_model=IncidentResponse)
async def update_incident(
    incident_id: str,
    incident_update: IncidentUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    """Update an incident"""
    
    try:
        # Get existing incident
        query = select(Incident).where(
            and_(
                Incident.id == incident_id,
                Incident.organization_id == current_user.organization_id
            )
        )
        
        result = await db.execute(query)
        incident = result.scalar_one_or_none()
        
        if not incident:
            raise HTTPException(status_code=404, detail="Incident not found")
        
        # Update fields
        update_data = {}
        if incident_update.title is not None:
            update_data["title"] = incident_update.title
        if incident_update.description is not None:
            update_data["description"] = incident_update.description
        if incident_update.severity is not None:
            update_data["severity"] = incident_update.severity.value
        if incident_update.status is not None:
            update_data["status"] = incident_update.status.value
            if incident_update.status == IncidentStatus.resolved:
                update_data["resolved_at"] = datetime.utcnow()
        if incident_update.assigned_to is not None:
            update_data["assigned_to"] = incident_update.assigned_to
        
        update_data["updated_at"] = datetime.utcnow()
        
        # Update in database
        update_query = update(Incident).where(Incident.id == incident_id).values(**update_data)
        await db.execute(update_query)
        await db.commit()
        
        # Refresh incident
        await db.refresh(incident)
        
        logger.info(f"Incident {incident_id} updated by user {current_user.email}")
        
        return IncidentResponse(
            id=str(incident.id),
            title=incident.title,
            description=incident.description,
            severity=incident.severity,
            status=incident.status,
            assigned_to=incident.assigned_to,
            created_at=incident.created_at.isoformat(),
            updated_at=incident.updated_at.isoformat(),
            resolved_at=incident.resolved_at.isoformat() if incident.resolved_at else None
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating incident {incident_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to update incident: {str(e)}")

@router.post("/{incident_id}/acknowledge")
async def acknowledge_incident(
    incident_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    """Acknowledge an incident"""
    
    try:
        # Update incident status to acknowledged
        update_query = update(Incident).where(
            and_(
                Incident.id == incident_id,
                Incident.organization_id == current_user.organization_id
            )
        ).values(
            status="acknowledged",
            assigned_to=str(current_user.id),
            updated_at=datetime.utcnow()
        )
        
        result = await db.execute(update_query)
        await db.commit()
        
        if result.rowcount == 0:
            raise HTTPException(status_code=404, detail="Incident not found")
        
        logger.info(f"Incident {incident_id} acknowledged by user {current_user.email}")
        
        return {"success": True, "message": "Incident acknowledged"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error acknowledging incident {incident_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to acknowledge incident: {str(e)}")

@router.post("/{incident_id}/resolve")
async def resolve_incident(
    incident_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    """Resolve an incident"""
    
    try:
        # Update incident status to resolved
        update_query = update(Incident).where(
            and_(
                Incident.id == incident_id,
                Incident.organization_id == current_user.organization_id
            )
        ).values(
            status="resolved",
            resolved_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        
        result = await db.execute(update_query)
        await db.commit()
        
        if result.rowcount == 0:
            raise HTTPException(status_code=404, detail="Incident not found")
        
        logger.info(f"Incident {incident_id} resolved by user {current_user.email}")
        
        return {"success": True, "message": "Incident resolved"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error resolving incident {incident_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to resolve incident: {str(e)}")