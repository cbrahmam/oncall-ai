# backend/app/api/v1/endpoints/websocket_notifications.py
from typing import List, Dict, Any
import json
import asyncio
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, HTTPException, Query
from fastapi.security import HTTPBearer
import jwt
from app.core.config import settings
from app.core.security import verify_token
from app.database import SessionLocal
from app.models.user import User
from app.models.incident import Incident
from app.models.alert import Alert
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

class ConnectionManager:
    """Manages WebSocket connections for real-time notifications"""
    
    def __init__(self):
        # Store active connections by user_id
        self.active_connections: Dict[str, List[WebSocket]] = {}
        # Store user info for connections
        self.connection_users: Dict[WebSocket, dict] = {}
    
    async def connect(self, websocket: WebSocket, user_id: str, user_info: dict):
        """Connect a new WebSocket for a user"""
        await websocket.accept()
        
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
        
        self.active_connections[user_id].append(websocket)
        self.connection_users[websocket] = user_info
        
        logger.info(f"User {user_id} connected via WebSocket")
        
        # Send connection confirmation
        await self.send_personal_message({
            "type": "connection_established",
            "message": "Real-time notifications connected",
            "timestamp": str(asyncio.get_event_loop().time())
        }, websocket)
    
    def disconnect(self, websocket: WebSocket):
        """Disconnect a WebSocket"""
        user_info = self.connection_users.get(websocket)
        if user_info:
            user_id = user_info["user_id"]
            if user_id in self.active_connections:
                self.active_connections[user_id].remove(websocket)
                if not self.active_connections[user_id]:
                    del self.active_connections[user_id]
            
            del self.connection_users[websocket]
            logger.info(f"User {user_id} disconnected from WebSocket")
    
    async def send_personal_message(self, message: dict, websocket: WebSocket):
        """Send a message to a specific WebSocket connection"""
        try:
            await websocket.send_text(json.dumps(message))
        except Exception as e:
            logger.error(f"Error sending message to WebSocket: {e}")
            self.disconnect(websocket)
    
    async def send_to_user(self, message: dict, user_id: str):
        """Send a message to all connections for a specific user"""
        if user_id in self.active_connections:
            disconnected = []
            for websocket in self.active_connections[user_id]:
                try:
                    await websocket.send_text(json.dumps(message))
                except Exception as e:
                    logger.error(f"Error sending message to user {user_id}: {e}")
                    disconnected.append(websocket)
            
            # Clean up disconnected connections
            for websocket in disconnected:
                self.disconnect(websocket)
    
    async def send_to_organization(self, message: dict, org_id: str):
        """Send a message to all users in an organization"""
        for websocket, user_info in self.connection_users.items():
            if user_info.get("organization_id") == org_id:
                try:
                    await websocket.send_text(json.dumps(message))
                except Exception as e:
                    logger.error(f"Error sending org message: {e}")
                    self.disconnect(websocket)
    
    async def broadcast(self, message: dict):
        """Broadcast a message to all connected users"""
        disconnected = []
        for user_id, connections in self.active_connections.items():
            for websocket in connections:
                try:
                    await websocket.send_text(json.dumps(message))
                except Exception as e:
                    logger.error(f"Error broadcasting message: {e}")
                    disconnected.append(websocket)
        
        # Clean up disconnected connections
        for websocket in disconnected:
            self.disconnect(websocket)
    
    def get_connected_users(self) -> List[str]:
        """Get list of connected user IDs"""
        return list(self.active_connections.keys())
    
    def get_user_connection_count(self, user_id: str) -> int:
        """Get number of active connections for a user"""
        return len(self.active_connections.get(user_id, []))

# Global connection manager instance
manager = ConnectionManager()

async def get_user_from_token(token: str = Query(...)):
    """Verify WebSocket connection token and return user info"""
    try:
        # Verify JWT token
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        # Get user from database
        async with SessionLocal() as session:
            result = await session.execute(
                "SELECT id, email, full_name, organization_id FROM users WHERE id = $1",
                user_id
            )
            user_data = result.fetchone()
            
            if not user_data:
                raise HTTPException(status_code=401, detail="User not found")
            
            return {
                "user_id": str(user_data[0]),
                "email": user_data[1],
                "full_name": user_data[2],
                "organization_id": str(user_data[3])
            }
    
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

@router.websocket("/ws/notifications")
async def websocket_notifications_endpoint(
    websocket: WebSocket,
    token: str = Query(...),
):
    """WebSocket endpoint for real-time notifications"""
    try:
        # Verify user and get info
        user_info = await get_user_from_token(token)
        user_id = user_info["user_id"]
        
        # Connect the WebSocket
        await manager.connect(websocket, user_id, user_info)
        
        try:
            while True:
                # Keep connection alive and handle incoming messages
                data = await websocket.receive_text()
                message = json.loads(data)
                
                # Handle different types of client messages
                if message.get("type") == "ping":
                    await manager.send_personal_message({
                        "type": "pong",
                        "timestamp": str(asyncio.get_event_loop().time())
                    }, websocket)
                
                elif message.get("type") == "mark_notification_read":
                    # Handle marking notifications as read
                    notification_id = message.get("notification_id")
                    logger.info(f"User {user_id} marked notification {notification_id} as read")
                
                elif message.get("type") == "subscribe_incident":
                    # Handle subscribing to specific incident updates
                    incident_id = message.get("incident_id")
                    logger.info(f"User {user_id} subscribed to incident {incident_id}")
                
        except WebSocketDisconnect:
            logger.info(f"WebSocket disconnected for user {user_id}")
        
    except Exception as e:
        logger.error(f"WebSocket connection error: {e}")
        await websocket.close(code=1000)
    
    finally:
        manager.disconnect(websocket)

# Notification service functions
class NotificationService:
    """Service for sending real-time notifications"""
    
    @staticmethod
    async def notify_incident_created(incident: Incident, created_by: User):
        """Notify organization members about new incident"""
        message = {
            "type": "incident_created",
            "incident": {
                "id": str(incident.id),
                "title": incident.title,
                "description": incident.description,
                "severity": incident.severity,
                "status": incident.status,
                "created_at": incident.created_at.isoformat(),
            },
            "created_by": {
                "id": str(created_by.id),
                "name": created_by.full_name,
                "email": created_by.email
            },
            "timestamp": str(asyncio.get_event_loop().time())
        }
        
        await manager.send_to_organization(message, str(incident.organization_id))
        logger.info(f"Sent incident_created notification for incident {incident.id}")
    
    @staticmethod
    async def notify_incident_acknowledged(incident: Incident, acknowledged_by: User):
        """Notify about incident acknowledgment"""
        message = {
            "type": "incident_acknowledged",
            "incident": {
                "id": str(incident.id),
                "title": incident.title,
                "severity": incident.severity,
                "status": incident.status,
                "acknowledged_at": incident.acknowledged_at.isoformat() if incident.acknowledged_at else None,
            },
            "acknowledged_by": acknowledged_by.full_name,
            "timestamp": str(asyncio.get_event_loop().time())
        }
        
        await manager.send_to_organization(message, str(incident.organization_id))
        logger.info(f"Sent incident_acknowledged notification for incident {incident.id}")
    
    @staticmethod
    async def notify_incident_resolved(incident: Incident, resolved_by: User):
        """Notify about incident resolution"""
        message = {
            "type": "incident_resolved",
            "incident": {
                "id": str(incident.id),
                "title": incident.title,
                "severity": incident.severity,
                "status": incident.status,
                "resolved_at": incident.resolved_at.isoformat() if incident.resolved_at else None,
            },
            "resolved_by": resolved_by.full_name,
            "timestamp": str(asyncio.get_event_loop().time())
        }
        
        await manager.send_to_organization(message, str(incident.organization_id))
        logger.info(f"Sent incident_resolved notification for incident {incident.id}")
    
    @staticmethod
    async def notify_alert_received(alert: Alert, organization_id: str):
        """Notify about new alert"""
        message = {
            "type": "alert_received",
            "alert": {
                "id": str(alert.id),
                "title": alert.title,
                "summary": alert.summary,
                "severity": alert.severity,
                "source": alert.source,
                "created_at": alert.created_at.isoformat(),
            },
            "timestamp": str(asyncio.get_event_loop().time())
        }
        
        await manager.send_to_organization(message, organization_id)
        logger.info(f"Sent alert_received notification for alert {alert.id}")
    
    @staticmethod
    async def notify_system_update(message_text: str, severity: str = "info"):
        """Send system-wide notification"""
        message = {
            "type": "system_update",
            "message": message_text,
            "severity": severity,
            "timestamp": str(asyncio.get_event_loop().time())
        }
        
        await manager.broadcast(message)
        logger.info(f"Sent system update notification: {message_text}")
    
    @staticmethod
    async def notify_user_mentioned(incident: Incident, mentioned_user_id: str, mentioned_by: User):
        """Notify user when mentioned in incident"""
        message = {
            "type": "user_mentioned",
            "incident": {
                "id": str(incident.id),
                "title": incident.title,
                "severity": incident.severity,
            },
            "mentioned_by": mentioned_by.full_name,
            "timestamp": str(asyncio.get_event_loop().time())
        }
        
        await manager.send_to_user(message, mentioned_user_id)
        logger.info(f"Sent user_mentioned notification to user {mentioned_user_id}")

# Stats endpoint for monitoring connections
@router.get("/ws/stats")
async def websocket_stats():
    """Get WebSocket connection statistics"""
    return {
        "connected_users": len(manager.get_connected_users()),
        "total_connections": sum(
            len(connections) for connections in manager.active_connections.values()
        ),
        "users": [
            {
                "user_id": user_id,
                "connection_count": len(connections)
            }
            for user_id, connections in manager.active_connections.items()
        ]
    }

# Test endpoint for sending notifications
@router.post("/ws/test-notification")
async def send_test_notification(
    message: str,
    notification_type: str = "system",
    user_id: str = None,
    organization_id: str = None
):
    """Send a test notification (for development/testing)"""
    test_message = {
        "type": "test_notification",
        "notification_type": notification_type,
        "message": message,
        "timestamp": str(asyncio.get_event_loop().time())
    }
    
    if user_id:
        await manager.send_to_user(test_message, user_id)
    elif organization_id:
        await manager.send_to_organization(test_message, organization_id)
    else:
        await manager.broadcast(test_message)
    
    return {"status": "sent", "message": "Test notification sent successfully"}

# Export the notification service for use in other modules
notification_service = NotificationService()