from pydantic import BaseModel
import uuid
from datetime import datetime
from typing import Optional

class OrganizationCreate(BaseModel):
    name: str
    slug: str

class OrganizationResponse(BaseModel):
    id: uuid.UUID
    name: str
    slug: str
    plan: str
    is_active: bool
    max_users: int
    max_incidents_per_month: int
    created_at: datetime
    
    class Config:
        from_attributes = True