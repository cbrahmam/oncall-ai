# backend/app/api/v1/endpoints/incidents.py - PRODUCTION VERSION
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func, desc, asc
from sqlalchemy.orm import selectinload
from app.database import get_async_session
from app.core.security import get_current_user
from app.models.user import User
from app.models.incident import Incident
from app.models.audit_log import AuditLog
from app.schemas.incident import (
    IncidentCreate, IncidentUpdate, IncidentResponse, 
    IncidentListResponse, IncidentFilters
)
from app.services.ai_service import EnhancedAIService
from app.services.deployment_service import deployment_service
from typing import Optional, List
from datetime import datetime, timedelta
import uuid
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

@router.get("/", response_model=IncidentListResponse)
async def get_incidents(
    page: int = Query(1, ge=1, description="Page number"),
    per_page: int = Query(20, ge=1, le=100, description="Items per page"),
    status: Optional[str] = Query(None, description="Filter by status"),
    severity: Optional[str] = Query(None, description="Filter by severity"),
    assigned_to: Optional[str] = Query(None, description="Filter by assigned user"),
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user)
):
    """Get paginated list of incidents for organization"""
    try:
        # Build query with organization isolation
        query = select(Incident).where(
            Incident.organization_id == current_user.organization_id
        )
        
        # Apply filters
        if status:
            query = query.where(Incident.status == status)
        if severity:
            query = query.where(Incident.severity == severity)
        if assigned_to:
            query = query.where(Incident.assigned_to_id == assigned_to)
        
        # Get total count
        count_query = select(func.count()).select_from(
            query.subquery()
        )
        total_result = await db.execute(count_query)
        total = total_result.scalar()
        
        # Apply pagination and ordering
        query = query.order_by(desc(Incident.created_at))
        query = query.offset((page - 1) * per_page).limit(per_page)
        
        # Execute query
        result = await db.execute(query)
        incidents = result.scalars().all()
        
        # Convert to response format
        incident_responses = []
        for incident in incidents:
            incident_responses.append(IncidentResponse(
                id=str(incident.id),
                organization_id=str(incident.organization_id),
                title=incident.title,
                description=incident.description or "",
                severity=incident.severity,
                status=incident.status,
                source=incident.source or "manual",
                created_by=incident.created_by_name,
                assigned_to=incident.assigned_to_name,
                created_at=incident.created_at,
                updated_at=incident.updated_at,
                resolved_at=incident.resolved_at,
                tags=incident.tags or []
            ))
        
        total_pages = (total + per_page - 1) // per_page
        
        return IncidentListResponse(
            incidents=incident_responses,
            total=total,
            page=page,
            per_page=per_page,
            total_pages=total_pages
        )
        
    except Exception as e:
        logger.error(f"Error fetching incidents: {e}")
        raise HTTPException(status_code=500, detail=f"Error fetching incidents: {str(e)}")

@router.post("/", response_model=IncidentResponse)
async def create_incident(
    incident_data: IncidentCreate,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user)
):
    """Create new incident"""
    try:
        # Create incident with real database insertion
        new_incident = Incident(
            id=uuid.uuid4(),
            organization_id=current_user.organization_id,
            title=incident_data.title,
            description=incident_data.description,
            severity=incident_data.severity,
            status="open",
            source=incident_data.source or "manual",
            created_by_id=current_user.id,
            created_by_name=current_user.full_name,
            tags=incident_data.tags or [],
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        
        db.add(new_incident)
        
        # Create audit log for incident creation
        audit_log = AuditLog(
            id=uuid.uuid4(),
            incident_id=new_incident.id,
            user_id=current_user.id,
            user_name=current_user.full_name,
            action="incident_created",
            description=f"Incident created: {incident_data.title}",
            details={
                "severity": incident_data.severity,
                "source": incident_data.source,
                "tags": incident_data.tags
            },
            organization_id=current_user.organization_id,
            created_at=datetime.utcnow()
        )
        
        db.add(audit_log)
        await db.commit()
        await db.refresh(new_incident)
        
        return IncidentResponse(
            id=str(new_incident.id),
            organization_id=str(new_incident.organization_id),
            title=new_incident.title,
            description=new_incident.description or "",
            severity=new_incident.severity,
            status=new_incident.status,
            source=new_incident.source or "manual",
            created_by=new_incident.created_by_name,
            assigned_to=new_incident.assigned_to_name,
            created_at=new_incident.created_at,
            updated_at=new_incident.updated_at,
            resolved_at=new_incident.resolved_at,
            tags=new_incident.tags or []
        )
        
    except Exception as e:
        logger.error(f"Error creating incident: {e}")
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Error creating incident: {str(e)}")

@router.get("/{incident_id}", response_model=IncidentResponse)
async def get_incident(
    incident_id: str,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user)
):
    """Get specific incident by ID"""
    try:
        result = await db.execute(
            select(Incident).where(
                and_(
                    Incident.id == incident_id,
                    Incident.organization_id == current_user.organization_id
                )
            )
        )
        incident = result.scalar_one_or_none()
        
        if not incident:
            raise HTTPException(status_code=404, detail="Incident not found")
        
        return IncidentResponse(
            id=str(incident.id),
            organization_id=str(incident.organization_id),
            title=incident.title,
            description=incident.description or "",
            severity=incident.severity,
            status=incident.status,
            source=incident.source or "manual",
            created_by=incident.created_by_name,
            assigned_to=incident.assigned_to_name,
            created_at=incident.created_at,
            updated_at=incident.updated_at,
            resolved_at=incident.resolved_at,
            tags=incident.tags or []
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching incident {incident_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Error fetching incident: {str(e)}")

@router.patch("/{incident_id}", response_model=IncidentResponse)
async def update_incident(
    incident_id: str,
    incident_update: IncidentUpdate,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user)
):
    """Update incident details"""
    try:
        result = await db.execute(
            select(Incident).where(
                and_(
                    Incident.id == incident_id,
                    Incident.organization_id == current_user.organization_id
                )
            )
        )
        incident = result.scalar_one_or_none()
        
        if not incident:
            raise HTTPException(status_code=404, detail="Incident not found")
        
        # Track changes for audit log
        changes = {}
        
        # Update fields if provided
        if incident_update.title is not None:
            changes["title"] = {"old": incident.title, "new": incident_update.title}
            incident.title = incident_update.title
            
        if incident_update.description is not None:
            changes["description"] = {"old": incident.description, "new": incident_update.description}
            incident.description = incident_update.description
            
        if incident_update.severity is not None:
            changes["severity"] = {"old": incident.severity, "new": incident_update.severity}
            incident.severity = incident_update.severity
            
        if incident_update.status is not None:
            old_status = incident.status
            new_status = incident_update.status
            changes["status"] = {"old": old_status, "new": new_status}
            incident.status = new_status
            
            # Set status-specific timestamps
            if new_status == "acknowledged" and not incident.acknowledged_at:
                incident.acknowledged_at = datetime.utcnow()
                incident.assigned_to_id = current_user.id
                incident.assigned_to_name = current_user.full_name
            elif new_status == "resolved" and not incident.resolved_at:
                incident.resolved_at = datetime.utcnow()
        
        if incident_update.tags is not None:
            changes["tags"] = {"old": incident.tags, "new": incident_update.tags}
            incident.tags = incident_update.tags
        
        incident.updated_at = datetime.utcnow()
        
        # Create audit log for changes
        if changes:
            audit_log = AuditLog(
                id=uuid.uuid4(),
                incident_id=uuid.UUID(incident_id),
                user_id=current_user.id,
                user_name=current_user.full_name,
                action="incident_updated",
                description=f"Updated incident: {', '.join(changes.keys())}",
                details={"changes": changes},
                organization_id=current_user.organization_id,
                created_at=datetime.utcnow()
            )
            db.add(audit_log)
        
        await db.commit()
        await db.refresh(incident)
        
        return IncidentResponse(
            id=str(incident.id),
            organization_id=str(incident.organization_id),
            title=incident.title,
            description=incident.description or "",
            severity=incident.severity,
            status=incident.status,
            source=incident.source or "manual",
            created_by=incident.created_by_name,
            assigned_to=incident.assigned_to_name,
            created_at=incident.created_at,
            updated_at=incident.updated_at,
            resolved_at=incident.resolved_at,
            tags=incident.tags or []
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating incident {incident_id}: {e}")
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Error updating incident: {str(e)}")

@router.post("/{incident_id}/ai-analysis")
async def analyze_incident_with_ai(
    incident_id: str,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user)
):
    """Get AI analysis for incident using both Claude and Gemini"""
    try:
        # Verify incident exists and user has access
        result = await db.execute(
            select(Incident).where(
                and_(
                    Incident.id == incident_id,
                    Incident.organization_id == current_user.organization_id
                )
            )
        )
        incident = result.scalar_one_or_none()
        
        if not incident:
            raise HTTPException(status_code=404, detail="Incident not found")
        
        # Initialize AI service
        ai_service = EnhancedAIService()
        
        # Prepare incident context
        incident_context = {
            "title": incident.title,
            "description": incident.description or "",
            "severity": incident.severity,
            "status": incident.status,
            "created_at": incident.created_at.isoformat() if incident.created_at else None,
            "tags": incident.tags or []
        }
        
        # Get AI analyses from both providers
        claude_analysis = await ai_service.analyze_with_claude(incident_context)
        gemini_analysis = await ai_service.analyze_with_gemini(incident_context)
        
        # Create audit log for AI analysis
        audit_log = AuditLog(
            id=uuid.uuid4(),
            incident_id=uuid.UUID(incident_id),
            user_id=current_user.id,
            user_name=current_user.full_name,
            action="ai_analysis_requested",
            description="AI analysis performed using Claude and Gemini",
            details={
                "claude_analysis": claude_analysis,
                "gemini_analysis": gemini_analysis
            },
            organization_id=current_user.organization_id,
            created_at=datetime.utcnow()
        )
        
        db.add(audit_log)
        await db.commit()
        
        return {
            "incident_id": incident_id,
            "analyses": [
                {
                    "provider": "claude",
                    "analysis": claude_analysis,
                    "timestamp": datetime.utcnow().isoformat()
                },
                {
                    "provider": "gemini", 
                    "analysis": gemini_analysis,
                    "timestamp": datetime.utcnow().isoformat()
                }
            ]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error analyzing incident {incident_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Error performing AI analysis: {str(e)}")

@router.post("/{incident_id}/deploy-solution")
async def deploy_incident_solution(
    incident_id: str,
    solution_data: dict,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user)
):
    """Deploy AI-recommended solution for incident"""
    try:
        # Verify incident exists and user has access
        result = await db.execute(
            select(Incident).where(
                and_(
                    Incident.id == incident_id,
                    Incident.organization_id == current_user.organization_id
                )
            )
        )
        incident = result.scalar_one_or_none()
        
        if not incident:
            raise HTTPException(status_code=404, detail="Incident not found")
        
        # Extract solution details
        solution_type = solution_data.get("solution_type", "automated")
        commands = solution_data.get("commands", [])
        provider = solution_data.get("provider", "claude")
        
        # Start deployment using deployment service
        deployment_id = await deployment_service.deploy_solution(
            incident_id=incident_id,
            solution_type=solution_type,
            commands=commands,
            user_id=current_user.id,
            organization_id=current_user.organization_id
        )
        
        # Create audit log for deployment
        audit_log = AuditLog(
            id=uuid.uuid4(),
            incident_id=uuid.UUID(incident_id),
            user_id=current_user.id,
            user_name=current_user.full_name,
            action="solution_deployed",
            description=f"Deployed {provider} solution for incident",
            details={
                "deployment_id": deployment_id,
                "solution_type": solution_type,
                "provider": provider,
                "commands_count": len(commands)
            },
            organization_id=current_user.organization_id,
            created_at=datetime.utcnow()
        )
        
        db.add(audit_log)
        await db.commit()
        
        return {
            "success": True,
            "deployment_id": deployment_id,
            "incident_id": incident_id,
            "status": "deployment_started",
            "websocket_url": f"/api/v1/deployments/{deployment_id}/stream"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deploying solution for incident {incident_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Error deploying solution: {str(e)}")

# Legacy endpoint compatibility
@router.post("/{incident_id}/acknowledge")
async def acknowledge_incident(
    incident_id: str,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user)
):
    """Acknowledge incident (legacy endpoint)"""
    return await update_incident(
        incident_id=incident_id,
        incident_update=IncidentUpdate(status="acknowledged"),
        db=db,
        current_user=current_user
    )

@router.post("/{incident_id}/resolve")
async def resolve_incident(
    incident_id: str,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user)
):
    """Resolve incident (legacy endpoint)"""
    return await update_incident(
        incident_id=incident_id,
        incident_update=IncidentUpdate(status="resolved"),
        db=db,
        current_user=current_user
    )