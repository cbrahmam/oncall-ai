# backend/app/models/deployment.py
from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, ForeignKey, Enum
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
import enum
from app.database import Base

class DeploymentStatus(str, enum.Enum):
    PENDING = "pending"
    RUNNING = "running" 
    PAUSED = "paused"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"
    ROLLING_BACK = "rolling_back"

class StepStatus(str, enum.Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed" 
    FAILED = "failed"
    SKIPPED = "skipped"

class Deployment(Base):
    __tablename__ = "deployments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    incident_id = Column(UUID(as_uuid=True), ForeignKey("incidents.id"), nullable=False, index=True)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False, index=True)
    
    # Deployment metadata
    provider = Column(String(50), nullable=False)  # claude, gemini, manual
    solution_type = Column(String(50), default="automated")  # automated, manual, rollback
    status = Column(Enum(DeploymentStatus), default=DeploymentStatus.PENDING, nullable=False)
    
    # User information
    created_by_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    created_by_name = Column(String(255), nullable=False)
    
    # Solution details
    solution_data = Column(JSONB)  # Original AI solution data
    total_steps = Column(Integer, default=0)
    completed_steps = Column(Integer, default=0)
    failed_steps = Column(Integer, default=0)
    
    # Execution metadata
    execution_environment = Column(String(100))  # docker, kubernetes, local
    container_id = Column(String(255))  # Docker container ID
    resource_limits = Column(JSONB)  # CPU, memory limits
    
    # Timing
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    started_at = Column(DateTime(timezone=True))
    completed_at = Column(DateTime(timezone=True))
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Duration in seconds
    total_duration = Column(Integer)  
    estimated_duration = Column(Integer)
    
    # Error handling
    error_message = Column(Text)
    rollback_deployment_id = Column(UUID(as_uuid=True), ForeignKey("deployments.id"))
    
    # Security and compliance
    approval_required = Column(Boolean, default=False)
    approved_by_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    approved_at = Column(DateTime(timezone=True))
    
    # Relationships
    incident = relationship("Incident", back_populates="deployments")
    organization = relationship("Organization")
    created_by = relationship("User", foreign_keys=[created_by_id])
    approved_by = relationship("User", foreign_keys=[approved_by_id])
    steps = relationship("DeploymentStep", back_populates="deployment", cascade="all, delete-orphan")
    rollback_of = relationship("Deployment", remote_side=[id])

    def __repr__(self):
        return f"<Deployment(id={self.id}, incident_id={self.incident_id}, status={self.status})>"

class DeploymentStep(Base):
    __tablename__ = "deployment_steps"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    deployment_id = Column(UUID(as_uuid=True), ForeignKey("deployments.id"), nullable=False, index=True)
    
    # Step information
    step_index = Column(Integer, nullable=False)  # Order of execution
    command = Column(Text, nullable=False)  # Command to execute
    description = Column(Text)  # Human-readable description
    status = Column(Enum(StepStatus), default=StepStatus.PENDING, nullable=False)
    
    # Execution results
    exit_code = Column(Integer)
    output = Column(Text)  # stdout
    error_output = Column(Text)  # stderr
    
    # Timing
    started_at = Column(DateTime(timezone=True))
    completed_at = Column(DateTime(timezone=True))
    duration = Column(Integer)  # Duration in seconds
    timeout_seconds = Column(Integer, default=300)  # 5 minute default timeout
    
    # Retry logic
    retry_count = Column(Integer, default=0)
    max_retries = Column(Integer, default=3)
    
    # Step metadata
    step_type = Column(String(50), default="command")  # command, script, validation, rollback
    dependencies = Column(JSONB)  # List of step IDs this depends on
    conditions = Column(JSONB)  # Conditions that must be met
    
    # Security
    requires_approval = Column(Boolean, default=False)
    approved = Column(Boolean, default=False)
    
    # Relationships
    deployment = relationship("Deployment", back_populates="steps")

    def __repr__(self):
        return f"<DeploymentStep(id={self.id}, deployment_id={self.deployment_id}, step_index={self.step_index}, status={self.status})>"