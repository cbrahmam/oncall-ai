# backend/app/models/oauth_account.py - COMPLETE FIXED VERSION
from sqlalchemy import Column, String, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
from app.database import Base

class OAuthAccount(Base):
    __tablename__ = "oauth_accounts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    
    # OAuth provider info
    provider = Column(String(50), nullable=False)  # google, github, microsoft
    provider_user_id = Column(String(255), nullable=False)  # ID from OAuth provider
    
    # Profile info from provider
    email = Column(String(255))
    name = Column(String(255))
    avatar_url = Column(String(500))
    
    # OAuth tokens
    access_token = Column(String(2000))  # Encrypted
    refresh_token = Column(String(2000))  # Encrypted
    expires_at = Column(DateTime(timezone=True))
    
    # Timing
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    user = relationship("User", back_populates="oauth_accounts")

    def __repr__(self):
        return f"<OAuthAccount(id='{self.id}', provider='{self.provider}', user_id='{self.user_id}')>"