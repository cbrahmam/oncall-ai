# backend/app/api/v1/endpoints/notifications.py - FIXED: metadata → extra_data
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, update, desc
from sqlalchemy.orm import selectinload
from typing import List, Optional, Dict, Any
from datetime import datetime

from app.database import get_async_session
from app.models.user import User
from app.models.notification import Notification  # Uses fixed model
from app.core.security import get_current_user

router = APIRouter()

# Pydantic schemas
from pydantic import BaseModel, Field

class NotificationCreate(BaseModel):
    type: str = Field(..., description="Notification type")
    title: str = Field(..., description="Notification title") 
    message: str = Field(..., description="Notification message")
    severity: Optional[str] = Field(None, description="Notification severity")
    incident_id: Optional[str] = Field(None, description="Related incident ID")
    action_url: Optional[str] = Field(None, description="Action URL")
    extra_data: Optional[Dict[str, Any]] = Field(None, description="Additional notification data")  # FIXED: renamed from metadata

class NotificationResponse(BaseModel):
    id: str
    type: str
    title: str
    message: str
    severity: Optional[str] = None
    incident_id: Optional[str] = None
    action_url: Optional[str] = None
    extra_data: Optional[Dict[str, Any]] = None  # FIXED: renamed from metadata
    read: bool
    read_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True

class NotificationListResponse(BaseModel):
    notifications: List[NotificationResponse]
    total: int
    unread_count: int

@router.get("/", response_model=NotificationListResponse)
async def get_notifications(
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=100),
    unread_only: bool = Query(default=False),
    notification_type: Optional[str] = Query(default=None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    """Get notifications for the current user"""
    
    try:
        # Build base query
        query = select(Notification).where(
            Notification.user_id == current_user.id
        )
        
        # Apply filters
        if unread_only:
            query = query.where(Notification.read == False)
        
        if notification_type:
            query = query.where(Notification.type == notification_type)
        
        # Get total count
        total_query = query
        count_result = await db.execute(total_query)
        total = len(count_result.scalars().all())
        
        # Get unread count
        unread_query = select(Notification).where(
            and_(
                Notification.user_id == current_user.id,
                Notification.read == False
            )
        )
        unread_result = await db.execute(unread_query)
        unread_count = len(unread_result.scalars().all())
        
        # Apply pagination and ordering
        query = query.order_by(desc(Notification.created_at))
        query = query.offset((page - 1) * per_page).limit(per_page)
        
        # Execute query
        result = await db.execute(query)
        notifications = result.scalars().all()
        
        # Convert to response format
        notification_responses = []
        for notification in notifications:
            notification_responses.append(NotificationResponse(
                id=str(notification.id),
                type=notification.type,
                title=notification.title,
                message=notification.message,
                severity=notification.severity,
                incident_id=str(notification.incident_id) if notification.incident_id else None,
                action_url=notification.action_url,
                extra_data=notification.extra_data,  # FIXED: uses extra_data
                read=notification.read,
                read_at=notification.read_at,
                created_at=notification.created_at
            ))
        
        return NotificationListResponse(
            notifications=notification_responses,
            total=total,
            unread_count=unread_count
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get notifications: {str(e)}")

@router.post("/", response_model=NotificationResponse)
async def create_notification(
    notification_data: NotificationCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    """Create a new notification"""
    
    try:
        notification = Notification(
            id=uuid.uuid4(),
            user_id=current_user.id,
            organization_id=current_user.organization_id,
            type=notification_data.type,
            title=notification_data.title,
            message=notification_data.message,
            severity=notification_data.severity,
            incident_id=notification_data.incident_id,
            action_url=notification_data.action_url,
            extra_data=notification_data.extra_data or {},  # FIXED: uses extra_data
            read=False,
            created_at=datetime.utcnow()
        )
        
        db.add(notification)
        await db.commit()
        await db.refresh(notification)
        
        return NotificationResponse(
            id=str(notification.id),
            type=notification.type,
            title=notification.title,
            message=notification.message,
            severity=notification.severity,
            incident_id=str(notification.incident_id) if notification.incident_id else None,
            action_url=notification.action_url,
            extra_data=notification.extra_data,  # FIXED: uses extra_data
            read=notification.read,
            read_at=notification.read_at,
            created_at=notification.created_at
        )
        
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create notification: {str(e)}")

@router.patch("/{notification_id}/read", response_model=NotificationResponse)
async def mark_notification_read(
    notification_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    """Mark notification as read"""
    
    result = await db.execute(
        select(Notification).where(
            and_(
                Notification.id == notification_id,
                Notification.user_id == current_user.id
            )
        )
    )
    
    notification = result.scalar_one_or_none()
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    notification.read = True
    notification.read_at = datetime.utcnow()
    
    await db.commit()
    await db.refresh(notification)
    
    return NotificationResponse(
        id=str(notification.id),
        type=notification.type,
        title=notification.title,
        message=notification.message,
        severity=notification.severity,
        incident_id=str(notification.incident_id) if notification.incident_id else None,
        action_url=notification.action_url,
        extra_data=notification.extra_data,  # FIXED: uses extra_data
        read=notification.read,
        read_at=notification.read_at,
        created_at=notification.created_at
    )

@router.patch("/mark-all-read")
async def mark_all_notifications_read(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    """Mark all notifications as read"""
    
    await db.execute(
        update(Notification)
        .where(
            and_(
                Notification.user_id == current_user.id,
                Notification.read == False
            )
        )
        .values(read=True, read_at=datetime.utcnow())
    )
    
    await db.commit()
    
    return {"message": "All notifications marked as read"}

@router.delete("/{notification_id}")
async def delete_notification(
    notification_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    """Delete a notification"""
    
    result = await db.execute(
        select(Notification).where(
            and_(
                Notification.id == notification_id,
                Notification.user_id == current_user.id
            )
        )
    )
    
    notification = result.scalar_one_or_none()
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    await db.delete(notification)
    await db.commit()
    
    return {"message": "Notification deleted successfully"}

@router.get("/unread-count")
async def get_unread_count(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    """Get unread notification count"""
    
    result = await db.execute(
        select(Notification).where(
            and_(
                Notification.user_id == current_user.id,
                Notification.read == False
            )
        )
    )
    
    unread_count = len(result.scalars().all())
    
    return {"unread_count": unread_count}