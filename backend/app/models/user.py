from sqlalchemy import Column, String, DateTime, Boolean, ForeignKey, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
from app.database import Base
from app.models.team import team_members  # Add this import

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False)
    
    # Basic info
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    
    # Role and permissions
    role = Column(String(50), default="engineer")  # admin, engineer, observer
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    
    # Contact info
    phone_number = Column(String(20))
    timezone = Column(String(50), default="UTC")
    
    # Preferences
    notification_preferences = Column(JSON, default={
        "email": True,
        "sms": True,
        "slack": True,
        "push": True
    })
    
    # Skills for smart routing
    skills = Column(JSON, default=[])  # ["database", "frontend", "kubernetes"]
    
    # On-call schedule fields
    on_call_start = Column(DateTime(timezone=True))
    on_call_end = Column(DateTime(timezone=True))
    is_currently_on_call = Column(Boolean, default=False)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    last_login_at = Column(DateTime(timezone=True))
    
    # Relationships - FIXED with explicit foreign_keys
    organization = relationship("Organization", back_populates="users")
    
    # Fixed relationships with explicit foreign keys
    runbooks = relationship("Runbook", back_populates="created_by", foreign_keys="Runbook.created_by_id")
    audit_logs = relationship("AuditLog", back_populates="user", foreign_keys="AuditLog.user_id")
    teams = relationship("Team", secondary=team_members, back_populates="members")
    
    def __repr__(self):
        return f"<User(email='{self.email}', role='{self.role}')>"