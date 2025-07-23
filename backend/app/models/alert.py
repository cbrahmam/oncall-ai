from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, ForeignKey, Enum
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
import enum
from app.database import Base

class AlertSeverity(str, enum.Enum):
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"

class AlertStatus(str, enum.Enum):
    ACTIVE = "active"
    RESOLVED = "resolved"
    SUPPRESSED = "suppressed"

class Alert(Base):
    __tablename__ = "alerts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False)
    incident_id = Column(UUID(as_uuid=True), ForeignKey("incidents.id"))
    integration_id = Column(UUID(as_uuid=True), ForeignKey("integrations.id"))
    
    # Alert identification
    external_id = Column(String(255))  # ID from monitoring tool
    fingerprint = Column(String(255), nullable=False)  # For deduplication
    
    # Alert content
    title = Column(String(255), nullable=False)
    description = Column(Text)
    severity = Column(Enum(AlertSeverity), nullable=False, default=AlertSeverity.WARNING)
    status = Column(Enum(AlertStatus), nullable=False, default=AlertStatus.ACTIVE)
    
    # Source information
    source = Column(String(100), nullable=False)  # datadog, grafana, etc.
    service_name = Column(String(255))
    environment = Column(String(100))
    host = Column(String(255))
    
    # Timing
    started_at = Column(DateTime(timezone=True), nullable=False)
    ended_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Raw data from monitoring tool
    raw_data = Column(JSONB, nullable=False)
    labels = Column(JSONB, default=dict)
    
    # Relationships
    organization = relationship("Organization", back_populates="alerts")
    incident = relationship("Incident", back_populates="alerts")
    integration = relationship("Integration", back_populates="alerts")