# backend/app/api/v1/endpoints/slack.py
import json
from typing import Dict, Any
from fastapi import APIRouter, Request, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_async_session
from app.services.slack_service import SlackService
from app.services.incident_service import IncidentService
from app.models.user import User
from app.models.incident import Incident
from app.schemas.incident import IncidentUpdate, IncidentStatus

router = APIRouter()

@router.post("/interactions")
async def handle_slack_interactions(
    request: Request,
    db: AsyncSession = Depends(get_async_session)
):
    """Handle Slack button interactions"""
    try:
        # Get raw body for signature verification
        body = await request.body()
        headers = dict(request.headers)
        
        # Verify Slack signature
        slack_service = SlackService()
        if not slack_service.verify_request(headers, body.decode()):
            raise HTTPException(status_code=400, detail="Invalid Slack signature")
        
        # Parse form data
        form_data = await request.form()
        payload = json.loads(form_data["payload"])
        
        # Handle button interaction
        interaction_data = await slack_service.handle_button_interaction(payload)
        
        if not interaction_data:
            return {"text": "❌ Error processing interaction"}
        
        action = interaction_data["action"]
        incident_id = interaction_data["incident_id"]
        
        # Get incident
        incident_service = IncidentService(db)
        incident = await incident_service.get_incident(incident_id, None)  # We'll need to fix org lookup
        
        if not incident:
            return {"text": "❌ Incident not found"}
        
        # Process action
        if action == "acknowledge_incident":
            update_data = IncidentUpdate(status=IncidentStatus.ACKNOWLEDGED)
            await incident_service.update_incident(
                incident_id=incident_id,
                organization_id=str(incident.organization_id),
                update_data=update_data,
                user_id=None  # System update from Slack
            )
            return {"text": f"✅ Incident acknowledged: {incident.title}"}
            
        elif action == "resolve_incident":
            update_data = IncidentUpdate(status=IncidentStatus.RESOLVED)
            await incident_service.update_incident(
                incident_id=incident_id,
                organization_id=str(incident.organization_id),
                update_data=update_data,
                user_id=None  # System update from Slack
            )
            return {"text": f"✅ Incident resolved: {incident.title}"}
        
        return {"text": "👍 Action processed"}
        
    except Exception as e:
        print(f"Slack interaction error: {e}")
        return {"text": "❌ Error processing action"}

@router.post("/commands")
async def handle_slack_commands(
    request: Request,
    db: AsyncSession = Depends(get_async_session)
):
    """Handle Slack slash commands"""
    try:
        # Get form data
        form_data = await request.form()
        command = form_data.get("command")
        text = form_data.get("text", "")
        user_id = form_data.get("user_id")
        
        if command == "/oncall":
            if text == "status":
                # Return current incidents
                incident_service = IncidentService(db)
                # For now, just return a simple response
                return {
                    "response_type": "ephemeral",
                    "text": "🚨 OnCall Status:\n• Use the dashboard to view current incidents\n• Link: http://localhost:3000"
                }
            else:
                return {
                    "response_type": "ephemeral", 
                    "text": "Available commands:\n• `/oncall status` - Show current incidents"
                }
        
        return {"text": "Command not recognized"}
        
    except Exception as e:
        print(f"Slack command error: {e}")
        return {"text": "❌ Error processing command"}

@router.get("/test")
async def test_slack():
    """Test Slack integration"""
    try:
        slack_service = SlackService()
        # Just test that the service initializes
        return {"status": "ok", "message": "Slack service initialized"}
    except Exception as e:
        return {"status": "error", "message": str(e)}