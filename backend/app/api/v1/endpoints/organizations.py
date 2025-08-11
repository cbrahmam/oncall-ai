import logging
from typing import List
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_async_session
from app.models.user import User
from app.schemas.organization import (
    OrganizationResponse, OrganizationUpdate, OrganizationStatsResponse
)
from app.core.auth import get_current_user, require_admin
from app.services.organization_service import OrganizationService

router = APIRouter()
logger = logging.getLogger(__name__)

@router.get("/me", response_model=OrganizationResponse)
async def get_my_organization(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    """Get current user's organization details"""
    
    try:
        service = OrganizationService(db)
        
        organization = await service.get_organization(str(current_user.organization_id))
        
        if not organization:
            raise HTTPException(status_code=404, detail="Organization not found")
        
        return organization
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting organization: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get organization: {str(e)}")

@router.patch("/me", response_model=OrganizationResponse)
async def update_my_organization(
    organization_update: OrganizationUpdate,
    current_user: User = Depends(require_admin),  # Only admins can update org
    db: AsyncSession = Depends(get_async_session)
):
    """Update current user's organization"""
    
    try:
        service = OrganizationService(db)
        
        organization = await service.update_organization(
            organization_id=str(current_user.organization_id),
            organization_update=organization_update
        )
        
        if not organization:
            raise HTTPException(status_code=404, detail="Organization not found")
        
        logger.info(f"Organization {organization.id} updated by {current_user.email}")
        
        return organization
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating organization: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to update organization: {str(e)}")

@router.get("/me/stats", response_model=OrganizationStatsResponse)
async def get_organization_stats(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    """Get organization statistics"""
    
    try:
        service = OrganizationService(db)
        
        stats = await service.get_organization_stats(str(current_user.organization_id))
        
        return stats
        
    except Exception as e:
        logger.error(f"Error getting organization stats: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get organization stats: {str(e)}")

@router.get("/me/members", response_model=List[dict])
async def get_organization_members(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    """Get organization members"""
    
    try:
        service = OrganizationService(db)
        
        members = await service.get_organization_members(str(current_user.organization_id))
        
        return members
        
    except Exception as e:
        logger.error(f"Error getting organization members: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get organization members: {str(e)}")