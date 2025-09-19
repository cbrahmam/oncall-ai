# backend/app/models/audit_log.py - COMPLETE FIXED VERSION
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Enum
from sqlalchemy.dialects.postgresql import UUID, JSONB, INET
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
import enum
from app.database import Base

class AuditAction(str, enum.Enum):
    INCIDENT_CREATED = "incident_created"
    INCIDENT_ACKNOWLEDGED = "incident_acknowledged"
    INCIDENT_RESOLVED = "incident_resolved"
    INCIDENT_CLOSED = "incident_closed"
    ALERT_RECEIVED = "alert_received"
    ALERT_SUPPRESSED = "alert_suppressed"
    USER_LOGIN = "user_login"
    USER_LOGOUT = "user_logout"
    INTEGRATION_CREATED = "integration_created"
    INTEGRATION_UPDATED = "integration_updated"
    ESCALATION_TRIGGERED = "escalation_triggered"
    NOTIFICATION_SENT = "notification_sent"

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    incident_id = Column(UUID(as_uuid=True), ForeignKey("incidents.id"), nullable=True)
    
    # Action details
    action = Column(Enum(AuditAction), nullable=False)
    description = Column(Text, nullable=False)
    
    # Context
    ip_address = Column(INET)
    user_agent = Column(String(500))
    extra_data = Column(JSONB, default=dict)  # Changed from 'metadata' to avoid SQLAlchemy reserved word
    
    # Timing
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    organization = relationship("Organization", back_populates="audit_logs")
    user = relationship("User", back_populates="audit_logs", foreign_keys=[user_id])
    incident = relationship("Incident", back_populates="audit_logs")

    def __repr__(self):
        return f"<AuditLog(id='{self.id}', action='{self.action}')>"