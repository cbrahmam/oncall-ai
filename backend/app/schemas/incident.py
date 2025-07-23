from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field
from enum import Enum

class IncidentSeverity(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class IncidentStatus(str, Enum):
    OPEN = "open"
    ACKNOWLEDGED = "acknowledged"
    RESOLVED = "resolved"
    CLOSED = "closed"

class IncidentCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=2000)
    severity: IncidentSeverity = IncidentSeverity.MEDIUM
    tags: Optional[List[str]] = Field(default_factory=list)

class IncidentUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=2000)
    severity: Optional[IncidentSeverity] = None
    status: Optional[IncidentStatus] = None
    assigned_to_id: Optional[str] = None  # Changed to str for UUID
    tags: Optional[List[str]] = None

class IncidentResponse(BaseModel):
    id: str  # UUID as string
    title: str
    description: Optional[str]
    severity: IncidentSeverity
    status: IncidentStatus
    assigned_to_id: Optional[str]  # UUID as string
    assigned_to_name: Optional[str]  # Joined from user table
    tags: List[str]
    created_at: datetime
    updated_at: datetime
    resolved_at: Optional[datetime]
    organization_id: str  # UUID as string
    created_by_id: str  # UUID as string
    created_by_name: str  # Joined from user table

    class Config:
        from_attributes = True

class IncidentListResponse(BaseModel):
    incidents: List[IncidentResponse]
    total: int
    page: int
    per_page: int
    total_pages: int

class IncidentFilters(BaseModel):
    status: Optional[List[IncidentStatus]] = None
    severity: Optional[List[IncidentSeverity]] = None
    assigned_to_id: Optional[str] = None  # UUID as string
    created_after: Optional[datetime] = None
    created_before: Optional[datetime] = None
    tags: Optional[List[str]] = None
    search: Optional[str] = None  # Search in title/description