from sqlalchemy import Column, String, DateTime, Boolean, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
from app.database import Base

class Organization(Base):
    __tablename__ = "organizations"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    slug = Column(String(100), unique=True, nullable=False, index=True)
    plan = Column(String(50), default="free")  # free, pro, enterprise
    is_active = Column(Boolean, default=True)
    max_users = Column(Integer, default=5)
    max_incidents_per_month = Column(Integer, default=100)
    # Billing fields
    stripe_customer_id = Column(String(100), nullable=True)
    subscription_id = Column(String(100), nullable=True)
    plan_type = Column(String(20), default="free")
    subscription_status = Column(String(20), default="active")
    current_period_end = Column(DateTime(timezone=False), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships - COMMENTED OUT API KEYS FOR NOW
    # api_keys = relationship("APIKey", back_populates="organization")
    notifications = relationship("Notification", back_populates="organization")
    incidents = relationship("Incident", back_populates="organization")
    alerts = relationship("Alert", back_populates="organization") 
    escalation_policies = relationship("EscalationPolicy", back_populates="organization")
    integrations = relationship("Integration", back_populates="organization")
    runbooks = relationship("Runbook", back_populates="organization")
    audit_logs = relationship("AuditLog", back_populates="organization")
    users = relationship("User", back_populates="organization")
    teams = relationship("Team", back_populates="organization") 

    def __repr__(self):
        return f"<Organization(name='{self.name}', slug='{self.slug}')>"