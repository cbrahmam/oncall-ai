from datetime import datetime
from typing import Optional, List, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_
from sqlalchemy.orm import selectinload

from app.models.incident import Incident
from app.models.user import User
from app.schemas.incident import (
    IncidentCreate, IncidentUpdate, IncidentResponse, 
    IncidentFilters, IncidentStatus
)

class IncidentService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_incident(
        self, 
        incident_data: IncidentCreate, 
        user_id: str, 
        organization_id: str
    ) -> Incident:
        """Create a new incident"""
        incident = Incident(
            title=incident_data.title,
            description=incident_data.description,
            severity=incident_data.severity,
            status=IncidentStatus.OPEN,
            tags=incident_data.tags or [],
            created_by_id=user_id,
            organization_id=organization_id
            # created_at and updated_at are handled by server_default
        )
        
        self.db.add(incident)
        await self.db.commit()
        await self.db.refresh(incident)
        
        # Load the created_by relationship before returning
        if incident.created_by_id:
            await self.db.refresh(incident, ['created_by'])
            
        return incident

    async def get_incident(
        self, 
        incident_id: str, 
        organization_id: str
    ) -> Optional[Incident]:
        """Get incident by ID with user details"""
        query = (
            select(Incident)
            .options(
                selectinload(Incident.created_by),
                selectinload(Incident.assigned_to)
            )
            .where(
                and_(
                    Incident.id == incident_id,
                    Incident.organization_id == organization_id
                )
            )
        )
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def list_incidents(
        self,
        organization_id: str,
        filters: IncidentFilters,
        page: int = 1,
        per_page: int = 20
    ) -> Tuple[List[Incident], int]:
        """List incidents with filtering and pagination"""
        query = (
            select(Incident)
            .options(
                selectinload(Incident.created_by),
                selectinload(Incident.assigned_to)
            )
            .where(Incident.organization_id == organization_id)
        )

        # Apply filters
        if filters.status:
            query = query.where(Incident.status.in_(filters.status))
        
        if filters.severity:
            query = query.where(Incident.severity.in_(filters.severity))
        
        if filters.assigned_to_id:
            query = query.where(Incident.assigned_to_id == filters.assigned_to_id)
        
        if filters.created_after:
            query = query.where(Incident.created_at >= filters.created_after)
        
        if filters.created_before:
            query = query.where(Incident.created_at <= filters.created_before)
        
        if filters.tags:
            # PostgreSQL JSONB array contains check
            for tag in filters.tags:
                query = query.where(Incident.tags.contains([tag]))
        
        if filters.search:
            search_term = f"%{filters.search}%"
            query = query.where(
                or_(
                    Incident.title.ilike(search_term),
                    Incident.description.ilike(search_term)
                )
            )

        # Get total count
        count_query = select(func.count()).select_from(query.subquery())
        total_result = await self.db.execute(count_query)
        total = total_result.scalar()

        # Apply pagination and ordering
        query = (
            query
            .order_by(Incident.created_at.desc())
            .offset((page - 1) * per_page)
            .limit(per_page)
        )

        result = await self.db.execute(query)
        incidents = result.scalars().all()
        
        return incidents, total

    async def update_incident(
        self,
        incident_id: str,
        organization_id: str,
        update_data: IncidentUpdate,
        user_id: str
    ) -> Optional[Incident]:
        """Update an incident"""
        incident = await self.get_incident(incident_id, organization_id)
        if not incident:
            return None

        # Track status changes for resolved_at timestamp
        old_status = incident.status
        
        # Update fields
        update_dict = update_data.dict(exclude_unset=True)
        for field, value in update_dict.items():
            setattr(incident, field, value)
        
        # Set resolved_at timestamp when status changes to resolved
        if (update_data.status == IncidentStatus.RESOLVED and 
            old_status != IncidentStatus.RESOLVED):
            incident.resolved_at = datetime.utcnow()
        elif (old_status == IncidentStatus.RESOLVED and 
              update_data.status and update_data.status != IncidentStatus.RESOLVED):
            incident.resolved_at = None

        # updated_at is handled by onupdate in the model
        
        await self.db.commit()
        await self.db.refresh(incident)
        return incident

    async def delete_incident(
        self,
        incident_id: str,
        organization_id: str
    ) -> bool:
        """Soft delete an incident (mark as deleted)"""
        incident = await self.get_incident(incident_id, organization_id)
        if not incident:
            return False
        
        # You might want to add a deleted_at field to the model instead
        await self.db.delete(incident)
        await self.db.commit()
        return True

    def _incident_to_response(self, incident: Incident) -> IncidentResponse:
        """Convert incident model to response schema"""
        return IncidentResponse(
            id=str(incident.id),
            title=incident.title,
            description=incident.description,
            severity=incident.severity,
            status=incident.status,
            assigned_to_id=str(incident.assigned_to_id) if incident.assigned_to_id else None,
            assigned_to_name=incident.assigned_to.full_name if incident.assigned_to else None,
            tags=incident.tags or [],
            created_at=incident.created_at,
            updated_at=incident.updated_at,
            resolved_at=incident.resolved_at,
            organization_id=str(incident.organization_id),
            created_by_id=str(incident.created_by_id),
            created_by_name=incident.created_by.full_name if incident.created_by else "Unknown"
        )