# backend/app/api/v1/endpoints/websocket_notifications.py - FIXED VERSION
from typing import List, Dict, Any
import json
import asyncio
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import jwt
from app.core.config import settings
from app.core.security import verify_token
from app.database import get_async_session
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
        
        logger.info(f"✅ User {user_id} ({user_info.get('email')}) connected via WebSocket")
        
        # Send connection confirmation
        await self.send_personal_message({
            "type": "connection_established",
            "message": "Real-time notifications connected",
            "user": user_info["full_name"],
            "timestamp": str(asyncio.get_event_loop().time())
        }, websocket)
    
    def disconnect(self, websocket: WebSocket):
        """Disconnect a WebSocket"""
        user_info = self.connection_users.get(websocket)
        if user_info:
            user_id = user_info["user_id"]
            if user_id in self.active_connections:
                if websocket in self.active_connections[user_id]:
                    self.active_connections[user_id].remove(websocket)
                if not self.active_connections[user_id]:
                    del self.active_connections[user_id]
            
            del self.connection_users[websocket]
            logger.info(f"❌ User {user_id} ({user_info.get('email')}) disconnected from WebSocket")
    
    async def send_personal_message(self, message: dict, websocket: WebSocket):
        """Send a message to a specific WebSocket connection"""
        try:
            await websocket.send_text(json.dumps(message))
        except Exception as e:
            logger.error(f"Failed to send message to WebSocket: {e}")
            # Remove the failed connection
            self.disconnect(websocket)
    
    async def send_to_user(self, message: dict, user_id: str):
        """Send a message to all connections of a specific user"""
        if user_id in self.active_connections:
            disconnected_websockets = []
            for websocket in self.active_connections[user_id]:
                try:
                    await websocket.send_text(json.dumps(message))
                except Exception as e:
                    logger.error(f"Failed to send message to user {user_id}: {e}")
                    disconnected_websockets.append(websocket)
            
            # Clean up failed connections
            for websocket in disconnected_websockets:
                self.disconnect(websocket)
    
    async def send_to_organization(self, message: dict, organization_id: str):
        """Send a message to all users in an organization"""
        for websocket, user_info in self.connection_users.items():
            if user_info.get("organization_id") == organization_id:
                try:
                    await websocket.send_text(json.dumps(message))
                except Exception as e:
                    logger.error(f"Failed to send org message: {e}")
                    self.disconnect(websocket)
    
    async def broadcast(self, message: dict):
        """Send a message to all connected users"""
        disconnected_websockets = []
        for websocket in self.connection_users.keys():
            try:
                await websocket.send_text(json.dumps(message))
            except Exception as e:
                logger.error(f"Failed to broadcast message: {e}")
                disconnected_websockets.append(websocket)
        
        # Clean up failed connections
        for websocket in disconnected_websockets:
            self.disconnect(websocket)
    
    def get_connected_users(self) -> List[str]:
        """Get list of connected user IDs"""
        return list(self.active_connections.keys())
    
    def get_user_connection_count(self, user_id: str) -> int:
        """Get number of active connections for a user"""
        return len(self.active_connections.get(user_id, []))

# Global connection manager instance
manager = ConnectionManager()

async def get_user_from_token(token: str) -> dict:
    """Verify WebSocket connection token and return user info - FIXED VERSION"""
    try:
        # Use the same verification logic as regular API endpoints
        payload = verify_token(token)
        if payload is None:
            raise HTTPException(status_code=401, detail="Invalid or expired token")
        
        user_id: str = payload.get("sub")
        org_id: str = payload.get("org_id")  # Get org_id from token payload
        
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token payload")
        
        # Get user from database using async session
        async with get_async_session() as session:
            # Use SQLAlchemy query instead of raw SQL
            result = await session.execute(
                select(User).where(User.id == user_id, User.is_active == True)
            )
            user = result.scalar_one_or_none()
            
            if not user:
                raise HTTPException(status_code=401, detail="User not found or inactive")
            
            return {
                "user_id": str(user.id),
                "email": user.email,
                "full_name": user.full_name,
                "organization_id": str(user.organization_id),
                "role": user.role
            }
    
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token format")
    except Exception as e:
        logger.error(f"WebSocket auth error: {e}")
        raise HTTPException(status_code=401, detail="Authentication failed")

@router.websocket("/ws/notifications")
async def websocket_notifications_endpoint(
    websocket: WebSocket,
    token: str = Query(..., description="JWT authentication token"),
):
    """WebSocket endpoint for real-time notifications - FIXED VERSION"""
    user_info = None
    try:
        # Verify user and get info BEFORE accepting connection
        user_info = await get_user_from_token(token)
        user_id = user_info["user_id"]
        
        # Connect the WebSocket
        await manager.connect(websocket, user_id, user_info)
        
        logger.info(f"🔗 WebSocket connected: {user_info['email']} ({user_id})")
        
        try:
            while True:
                # Keep connection alive and handle incoming messages
                data = await websocket.receive_text()
                
                try:
                    message = json.loads(data)
                    
                    # Handle different types of client messages
                    if message.get("type") == "ping":
                        await manager.send_personal_message({
                            "type": "pong",
                            "timestamp": str(asyncio.get_event_loop().time())
                        }, websocket)
                    
                    elif message.get("type") == "mark_notification_read":
                        notification_id = message.get("notification_id")
                        if notification_id:
                            # TODO: Mark notification as read in database
                            await manager.send_personal_message({
                                "type": "notification_marked_read",
                                "notification_id": notification_id
                            }, websocket)
                    
                    elif message.get("type") == "subscribe_incident":
                        incident_id = message.get("incident_id")
                        if incident_id:
                            # TODO: Add user to incident subscription list
                            await manager.send_personal_message({
                                "type": "subscribed_to_incident",
                                "incident_id": incident_id
                            }, websocket)
                    
                    else:
                        logger.warning(f"Unknown message type: {message.get('type')}")
                
                except json.JSONDecodeError:
                    logger.warning(f"Invalid JSON received from WebSocket: {data}")
                except Exception as e:
                    logger.error(f"Error processing WebSocket message: {e}")
                
        except WebSocketDisconnect:
            logger.info(f"🔌 WebSocket disconnected: {user_info['email'] if user_info else 'unknown'}")
        except Exception as e:
            logger.error(f"WebSocket error: {e}")
        finally:
            if user_info:
                manager.disconnect(websocket)
    
    except HTTPException as e:
        logger.warning(f"WebSocket connection error: {e.status_code}: {e.detail}")
        # Send close frame with specific error code
        await websocket.close(code=1008, reason=e.detail)  # Policy Violation
    except Exception as e:
        logger.error(f"Unexpected WebSocket error: {e}")
        try:
            await websocket.close(code=1011, reason="Internal server error")
        except:
            pass

# Notification service for sending real-time updates
class NotificationService:
    """Service for sending real-time notifications through WebSocket"""
    
    @staticmethod
    async def notify_incident_created(incident: Incident, created_by: User):
        """Notify organization about new incident"""
        message = {
            "type": "incident_created",
            "incident": {
                "id": str(incident.id),
                "title": incident.title,
                "severity": incident.severity.value,
                "status": incident.status.value,
                "created_by": created_by.full_name,
                "created_at": incident.created_at.isoformat(),
            },
            "timestamp": str(asyncio.get_event_loop().time())
        }
        
        await manager.send_to_organization(message, str(incident.organization_id))
        logger.info(f"📢 Sent incident_created notification: {incident.title}")
    
    @staticmethod
    async def notify_incident_updated(incident: Incident, updated_by: User, old_status: str = None):
        """Notify about incident updates"""
        message = {
            "type": "incident_updated",
            "incident": {
                "id": str(incident.id),
                "title": incident.title,
                "severity": incident.severity.value,
                "status": incident.status.value,
                "updated_by": updated_by.full_name,
                "old_status": old_status,
            },
            "timestamp": str(asyncio.get_event_loop().time())
        }
        
        await manager.send_to_organization(message, str(incident.organization_id))
        logger.info(f"🔄 Sent incident_updated notification: {incident.title}")
    
    @staticmethod
    async def notify_incident_acknowledged(incident: Incident, acknowledged_by: User):
        """Notify about incident acknowledgment"""
        message = {
            "type": "incident_acknowledged",
            "incident": {
                "id": str(incident.id),
                "title": incident.title,
                "acknowledged_by": acknowledged_by.full_name,
            },
            "timestamp": str(asyncio.get_event_loop().time())
        }
        
        await manager.send_to_organization(message, str(incident.organization_id))
        logger.info(f"✅ Sent incident_acknowledged notification: {incident.title}")
    
    @staticmethod
    async def notify_incident_resolved(incident: Incident, resolved_by: User):
        """Notify about incident resolution"""
        message = {
            "type": "incident_resolved",
            "incident": {
                "id": str(incident.id),
                "title": incident.title,
                "resolved_by": resolved_by.full_name,
                "resolution_time": (incident.resolved_at - incident.created_at).total_seconds() if incident.resolved_at else None,
            },
            "timestamp": str(asyncio.get_event_loop().time())
        }
        
        await manager.send_to_organization(message, str(incident.organization_id))
        logger.info(f"🎉 Sent incident_resolved notification: {incident.title}")
    
    @staticmethod
    async def notify_system_alert(message_text: str, alert_type: str = "info"):
        """Send system-wide notification"""
        message = {
            "type": "system_alert",
            "alert_type": alert_type,
            "message": message_text,
            "timestamp": str(asyncio.get_event_loop().time())
        }
        
        await manager.broadcast(message)
        logger.info(f"📡 Sent system alert: {message_text}")

# Stats endpoint for monitoring connections
@router.get("/ws/stats")
async def websocket_stats():
    """Get WebSocket connection statistics"""
    return {
        "status": "healthy",
        "connected_users": len(manager.get_connected_users()),
        "total_connections": sum(
            len(connections) for connections in manager.active_connections.values()
        ),
        "active_users": [
            {
                "user_id": user_id,
                "connection_count": len(connections),
                "user_info": manager.connection_users.get(connections[0], {}) if connections else {}
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
        "timestamp": str(asyncio.get_event_loop().time()),
        "test": True
    }
    
    sent_to = []
    
    if user_id:
        await manager.send_to_user(test_message, user_id)
        sent_to.append(f"user:{user_id}")
    elif organization_id:
        await manager.send_to_organization(test_message, organization_id)
        sent_to.append(f"org:{organization_id}")
    else:
        await manager.broadcast(test_message)
        sent_to.append("all_users")
    
    return {
        "status": "sent", 
        "message": "Test notification sent successfully",
        "sent_to": sent_to,
        "connected_users": len(manager.get_connected_users())
    }

# Export the notification service for use in other modules
notification_service = NotificationService()