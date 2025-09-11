# backend/app/api/v1/endpoints/incidents.py - ADD these endpoints to your existing file

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
import uuid
from app.database import get_async_session
from app.models.user import User
from app.models.incident import Incident
from app.models.audit_log import AuditLog
from app.core.security import get_current_user
from app.schemas.incident import IncidentResponse, IncidentUpdate
from app.services.ai_service import AIService

# Add these new endpoints to your existing router

@router.get("/{incident_id}/timeline")
async def get_incident_timeline(
    incident_id: str,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user)
):
    """Get incident timeline with all events"""
    try:
        # Get incident to verify access
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
        
        # Get audit logs for this incident
        audit_result = await db.execute(
            select(AuditLog)
            .where(AuditLog.incident_id == incident_id)
            .order_by(AuditLog.created_at.asc())
        )
        audit_logs = audit_result.scalars().all()
        
        # Convert to timeline events
        timeline_events = []
        
        # Add incident creation event
        timeline_events.append({
            "id": str(uuid.uuid4()),
            "type": "created",
            "timestamp": incident.created_at.isoformat(),
            "user_name": incident.created_by_name or "System",
            "user_id": str(incident.created_by_id) if incident.created_by_id else "system",
            "description": "Incident created",
            "details": {
                "severity": incident.severity,
                "source": "Alert System"
            }
        })
        
        # Add audit log events
        for log in audit_logs:
            timeline_events.append({
                "id": str(log.id),
                "type": log.action,
                "timestamp": log.created_at.isoformat(),
                "user_name": log.user_name or "System",
                "user_id": str(log.user_id) if log.user_id else "system",
                "description": log.description,
                "details": log.details or {}
            })
        
        # Add status change events
        if incident.acknowledged_at:
            timeline_events.append({
                "id": str(uuid.uuid4()),
                "type": "acknowledged",
                "timestamp": incident.acknowledged_at.isoformat(),
                "user_name": incident.assigned_to_name or "Unknown",
                "user_id": str(incident.assigned_to_id) if incident.assigned_to_id else "unknown",
                "description": "Incident acknowledged",
                "details": {}
            })
        
        if incident.resolved_at:
            timeline_events.append({
                "id": str(uuid.uuid4()),
                "type": "resolved",
                "timestamp": incident.resolved_at.isoformat(),
                "user_name": incident.assigned_to_name or "Unknown",
                "user_id": str(incident.assigned_to_id) if incident.assigned_to_id else "unknown",
                "description": "Incident resolved",
                "details": {}
            })
        
        # Sort by timestamp
        timeline_events.sort(key=lambda x: x["timestamp"])
        
        return {"events": timeline_events}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching timeline: {str(e)}")

@router.post("/{incident_id}/generate-resolution-steps")
async def generate_resolution_steps(
    incident_id: str,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user)
):
    """Generate AI resolution steps for incident"""
    try:
        # Get incident
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
        
        # Generate AI resolution steps based on incident details
        steps = []
        
        # Step 1: Immediate Assessment
        steps.append({
            "id": "1",
            "order": 1,
            "title": "Immediate Assessment",
            "description": f"Check system health for {incident.severity} severity incident",
            "command": "kubectl get pods -n production | grep -v Running",
            "expected_result": "Should show any pods not in Running state",
            "status": "pending",
            "ai_generated": True
        })
        
        # Step 2: Based on incident title/description
        if "database" in incident.title.lower() or "db" in incident.title.lower():
            steps.append({
                "id": "2",
                "order": 2,
                "title": "Database Connection Check",
                "description": "Verify database connectivity and connection pool status",
                "command": "pg_isready -h db-prod.example.com -p 5432",
                "expected_result": "Should return accepting connections",
                "status": "pending",
                "ai_generated": True
            })
        elif "api" in incident.title.lower() or "server" in incident.title.lower():
            steps.append({
                "id": "2",
                "order": 2,
                "title": "API Health Check",
                "description": "Check API server health and response times",
                "command": "curl -I https://api.yourservice.com/health",
                "expected_result": "Should return HTTP 200 OK",
                "status": "pending",
                "ai_generated": True
            })
        else:
            steps.append({
                "id": "2",
                "order": 2,
                "title": "System Health Check",
                "description": "Check overall system health and metrics",
                "command": "systemctl status your-service",
                "expected_result": "Service should be active and running",
                "status": "pending",
                "ai_generated": True
            })
        
        # Step 3: Review Recent Changes
        steps.append({
            "id": "3",
            "order": 3,
            "title": "Review Recent Deployments",
            "description": "Check if incident correlates with recent code deployments",
            "expected_result": "Identify any deployments in the last 2 hours",
            "status": "pending",
            "ai_generated": True
        })
        
        # Step 4: Mitigation based on severity
        if incident.severity in ["critical", "high"]:
            steps.append({
                "id": "4",
                "order": 4,
                "title": "Scale Resources",
                "description": "Increase replica count to handle load",
                "command": "kubectl scale deployment api-server --replicas=10 -n production",
                "expected_result": "Deployment scaled to 10 replicas",
                "status": "pending",
                "ai_generated": True
            })
        
        # Step 5: Monitor Recovery
        steps.append({
            "id": "5",
            "order": 5,
            "title": "Monitor Recovery",
            "description": "Monitor system metrics for 5 minutes to confirm recovery",
            "expected_result": "Error rate below 1%, response time below 200ms",
            "status": "pending",
            "ai_generated": False
        })
        
        return {"resolution_steps": steps}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating resolution steps: {str(e)}")

@router.post("/{incident_id}/execute-step")
async def execute_resolution_step(
    incident_id: str,
    step_data: dict,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user)
):
    """Execute a resolution step (simulate execution)"""
    try:
        # Get incident to verify access
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
        
        step_id = step_data.get("step_id")
        command = step_data.get("command", "")
        
        # Simulate command execution
        import asyncio
        await asyncio.sleep(2)  # Simulate execution time
        
        # Mock execution output
        if "kubectl" in command:
            output = f"$ {command}\nNAME                    READY   STATUS    RESTARTS   AGE\napi-server-abc123       1/1     Running   0          2h\napi-server-def456       1/1     Running   0          2h\nExecution completed successfully."
        elif "curl" in command:
            output = f"$ {command}\nHTTP/1.1 200 OK\nContent-Type: application/json\nDate: {datetime.now().strftime('%a, %d %b %Y %H:%M:%S GMT')}\nExecution completed successfully."
        elif "pg_isready" in command:
            output = f"$ {command}\ndb-prod.example.com:5432 - accepting connections\nExecution completed successfully."
        else:
            output = f"$ {command}\nManual step completed by {current_user.full_name}.\nExecution completed successfully."
        
        # Log the step execution
        audit_log = AuditLog(
            id=uuid.uuid4(),
            incident_id=uuid.UUID(incident_id),
            user_id=current_user.id,
            user_name=current_user.full_name,
            action="step_executed",
            description=f"Executed resolution step: {step_data.get('title', 'Unknown step')}",
            details={
                "step_id": step_id,
                "command": command,
                "output": output,
                "execution_time": 2
            },
            organization_id=current_user.organization_id,
            created_at=datetime.utcnow()
        )
        
        db.add(audit_log)
        await db.commit()
        
        return {
            "success": True,
            "output": output,
            "execution_time": 2,
            "message": "Step executed successfully"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error executing step: {str(e)}")

@router.get("/{incident_id}/comments")
async def get_incident_comments(
    incident_id: str,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user)
):
    """Get comments for an incident"""
    try:
        # Verify incident access
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
        
        # Get comments from audit logs
        comments_result = await db.execute(
            select(AuditLog)
            .where(
                and_(
                    AuditLog.incident_id == incident_id,
                    AuditLog.action == "comment_added"
                )
            )
            .order_by(AuditLog.created_at.desc())
        )
        
        comment_logs = comments_result.scalars().all()
        
        comments = []
        for log in comment_logs:
            comments.append({
                "id": str(log.id),
                "user_name": log.user_name,
                "user_id": str(log.user_id) if log.user_id else None,
                "content": log.details.get("comment", "") if log.details else "",
                "created_at": log.created_at.isoformat(),
                "updated_at": log.created_at.isoformat()
            })
        
        return {"comments": comments}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching comments: {str(e)}")

@router.post("/{incident_id}/comments")
async def add_incident_comment(
    incident_id: str,
    comment_data: dict,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user)
):
    """Add a comment to an incident"""
    try:
        # Verify incident access
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
        
        content = comment_data.get("content", "").strip()
        if not content:
            raise HTTPException(status_code=400, detail="Comment content is required")
        
        # Create audit log for comment
        audit_log = AuditLog(
            id=uuid.uuid4(),
            incident_id=uuid.UUID(incident_id),
            user_id=current_user.id,
            user_name=current_user.full_name,
            action="comment_added",
            description="Added comment to incident",
            details={"comment": content},
            organization_id=current_user.organization_id,
            created_at=datetime.utcnow()
        )
        
        db.add(audit_log)
        await db.commit()
        
        return {
            "id": str(audit_log.id),
            "user_name": current_user.full_name,
            "user_id": str(current_user.id),
            "content": content,
            "created_at": audit_log.created_at.isoformat(),
            "updated_at": audit_log.created_at.isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error adding comment: {str(e)}")

@router.patch("/{incident_id}/status")
async def update_incident_status(
    incident_id: str,
    status_data: dict,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user)
):
    """Update incident status (acknowledge, resolve, etc.)"""
    try:
        # Get incident
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
        
        new_status = status_data.get("status")
        if new_status not in ["open", "acknowledged", "investigating", "resolved", "closed"]:
            raise HTTPException(status_code=400, detail="Invalid status")
        
        old_status = incident.status
        incident.status = new_status
        incident.updated_at = datetime.utcnow()
        
        # Set timestamps based on status
        if new_status == "acknowledged" and not incident.acknowledged_at:
            incident.acknowledged_at = datetime.utcnow()
            incident.assigned_to_id = current_user.id
            incident.assigned_to_name = current_user.full_name
        elif new_status == "resolved" and not incident.resolved_at:
            incident.resolved_at = datetime.utcnow()
        
        # Create audit log
        audit_log = AuditLog(
            id=uuid.uuid4(),
            incident_id=uuid.UUID(incident_id),
            user_id=current_user.id,
            user_name=current_user.full_name,
            action="status_changed",
            description=f"Status changed from {old_status} to {new_status}",
            details={
                "old_status": old_status,
                "new_status": new_status
            },
            organization_id=current_user.organization_id,
            created_at=datetime.utcnow()
        )
        
        db.add(audit_log)
        await db.commit()
        await db.refresh(incident)
        
        return {
            "id": str(incident.id),
            "title": incident.title,
            "description": incident.description,
            "severity": incident.severity,
            "status": incident.status,
            "assigned_to_id": str(incident.assigned_to_id) if incident.assigned_to_id else None,
            "assigned_to_name": incident.assigned_to_name,
            "created_at": incident.created_at.isoformat() if incident.created_at else None,
            "updated_at": incident.updated_at.isoformat() if incident.updated_at else None,
            "resolved_at": incident.resolved_at.isoformat() if incident.resolved_at else None,
            "acknowledged_at": incident.acknowledged_at.isoformat() if incident.acknowledged_at else None
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating status: {str(e)}")

# Add these imports to the top of your incidents.py file if not already there:
# from app.models.audit_log import AuditLog
# import uuid