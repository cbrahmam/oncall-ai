from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB, ARRAY
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
from app.database import Base

class Runbook(Base):
    __tablename__ = "runbooks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False)
    created_by_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    
    # Runbook details
    title = Column(String(255), nullable=False)
    description = Column(Text)
    content = Column(Text, nullable=False)  # Markdown content
    
    # Categorization
    tags = Column(JSONB, default=list)
    service_names = Column(ARRAY(String), default=list)
    alert_patterns = Column(JSONB, default=list)  # For auto-suggestion
    
    # Metadata
    is_active = Column(Boolean, default=True)
    usage_count = Column(Integer, default=0)
    last_used_at = Column(DateTime(timezone=True))
    
    # Timing
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    organization = relationship("Organization", back_populates="runbooks")
    created_by = relationship("User", back_populates="runbooks")