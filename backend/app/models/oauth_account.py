# backend/app/models/oauth_account.py
from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, ForeignKey, Enum
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
import enum
from app.database import Base

class OAuthProvider(str, enum.Enum):
    GOOGLE = "google"
    MICROSOFT = "microsoft"
    GITHUB = "github"
    SLACK = "slack"

class OAuthAccount(Base):
    __tablename__ = "oauth_accounts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    
    # OAuth Provider Info
    provider = Column(Enum(OAuthProvider), nullable=False)
    provider_user_id = Column(String(255), nullable=False)  # ID from the OAuth provider
    provider_username = Column(String(255))  # Username from provider (optional)
    
    # OAuth Tokens (encrypted)
    access_token = Column(Text)  # Current access token
    refresh_token = Column(Text)  # Refresh token for token renewal
    token_expires_at = Column(DateTime(timezone=True))  # When access token expires
    
    # Profile Info from Provider
    provider_email = Column(String(255))  # Email from OAuth provider
    provider_name = Column(String(255))   # Display name from provider
    provider_avatar = Column(String(500)) # Avatar URL from provider
    
    # Account Status
    is_active = Column(Boolean, default=True)
    is_primary = Column(Boolean, default=False)  # Primary OAuth account for user
    
    # Metadata
    provider_data = Column(JSONB, default=dict)  # Additional provider-specific data
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    last_used_at = Column(DateTime(timezone=True))
    
    # Relationships
    user = relationship("User", back_populates="oauth_accounts")
    
    # Constraints to ensure one account per provider per user
    __table_args__ = (
        # Unique constraint: one account per provider per user
        {"schema": None}  # We'll add the constraint in migration
    )