# backend/app/api/v1/endpoints/escalations.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_async_session
from app.core.security import get_current_user
from app.models.user import User
from app.services.escalation_service import EscalationService

router = APIRouter()

@router.post("/check")
async def trigger_escalation_check(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    """Manually trigger escalation check (admin only)"""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    escalation_service = EscalationService(db)
    escalated_incidents = await escalation_service.check_incidents_for_escalation()
    
    return {
        "message": f"Escalation check completed",
        "escalated_count": len(escalated_incidents),
        "escalated_incidents": escalated_incidents
    }

@router.get("/status")
async def escalation_status(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    """Get escalation system status"""
    # Simple status check - in production you'd check worker health
    return {
        "status": "active",
        "message": "Escalation system is running",
        "check_interval": "5 minutes",
        "escalation_levels": {
            "critical": "5 minutes",
            "high": "10 minutes", 
            "medium": "15 minutes"
        }
    }