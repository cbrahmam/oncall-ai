from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete, and_, func
from typing import List, Optional
from datetime import datetime
import uuid

from app.database import get_async_session
from app.core.deps import get_current_user
from app.models.user import User
from app.models.notification import Notification
from app.schemas.notification import (
    NotificationCreate,
    NotificationResponse,
    NotificationUpdate,
    NotificationStats
)

router = APIRouter()

@router.get("/", response_model=List[NotificationResponse])
async def get_notifications(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    filter_type: Optional[str] = Query(None),
    unread_only: bool = Query(False),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    """Get user's notifications with pagination and filtering"""
    
    query = select(Notification).where(
        Notification.user_id == current_user.id
    )
    
    if filter_type:
        query = query.where(Notification.type == filter_type)
    
    if unread_only:
        query = query.where(Notification.read == False)
    
    query = query.order_by(Notification.created_at.desc()).offset(skip).limit(limit)
    
    result = await db.execute(query)
    notifications = result.scalars().all()
    
    return notifications

@router.post("/", response_model=NotificationResponse)
async def create_notification(
    notification_data: NotificationCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    """Create a new notification"""
    
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
        metadata=notification_data.metadata or {},
        read=False,
        created_at=datetime.utcnow()
    )
    
    db.add(notification)
    await db.commit()
    await db.refresh(notification)
    
    return notification

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
    
    return notification

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
    """Delete notification"""
    
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
    
    return {"message": "Notification deleted"}

@router.get("/stats", response_model=NotificationStats)
async def get_notification_stats(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    """Get notification statistics"""
    
    # Get counts using aggregation
    stats_query = select(
        func.count(Notification.id).label('total_count'),
        func.sum(func.cast(~Notification.read, db.Integer)).label('unread_count'),
        func.sum(func.case((Notification.type == 'incident', 1), else_=0)).label('incidents_count'),
        func.sum(func.case((Notification.type == 'alert', 1), else_=0)).label('alerts_count'),
        func.sum(func.case((Notification.type == 'system', 1), else_=0)).label('system_count')
    ).where(Notification.user_id == current_user.id)
    
    result = await db.execute(stats_query)
    stats = result.first()
    
    return NotificationStats(
        total_count=stats.total_count or 0,
        unread_count=stats.unread_count or 0,
        incidents_count=stats.incidents_count or 0,
        alerts_count=stats.alerts_count or 0,
        system_count=stats.system_count or 0
    )