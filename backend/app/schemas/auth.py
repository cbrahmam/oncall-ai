from pydantic import BaseModel, EmailStr, validator
from typing import Optional
import uuid

class UserRegister(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    organization_name: Optional[str] = None
    organization_slug: Optional[str] = None
    
    @validator('password')
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        return v
    
    @validator('organization_slug')
    def validate_slug(cls, v):
        if v and not v.replace('-', '').replace('_', '').isalnum():
            raise ValueError('Organization slug can only contain letters, numbers, hyphens, and underscores')
        return v

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int

class TokenData(BaseModel):
    user_id: Optional[str] = None
    organization_id: Optional[str] = None

class UserResponse(BaseModel):
    id: uuid.UUID
    email: str
    full_name: str
    role: str
    is_active: bool
    organization_id: uuid.UUID
    
    class Config:
        from_attributes = True