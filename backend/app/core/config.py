# backend/app/core/config.py - Fixed Version for Pydantic v2
from pydantic_settings import BaseSettings
import os
from typing import Optional

class Settings(BaseSettings):
    """Application settings with proper defaults"""
    
    # Database
    DATABASE_URL: str = "postgresql+asyncpg://oncall_user:oncall_password@localhost:5432/oncall_ai"
    REDIS_URL: str = "redis://localhost:6379"
    
    # JWT Settings
    SECRET_KEY: str = "your-super-secret-jwt-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_DAYS: int = 7  # Changed to days for clarity
    ACCESS_TOKEN_EXPIRE_MINUTES: int = ACCESS_TOKEN_EXPIRE_DAYS * 24 * 60  # Backwards compatibility
    
    # Alternative JWT settings (for compatibility)
    JWT_SECRET_KEY: str = SECRET_KEY
    JWT_ALGORITHM: str = ALGORITHM
    
    # External API Keys
    OPENAI_API_KEY: Optional[str] = None
    SLACK_BOT_TOKEN: Optional[str] = None
    SLACK_SIGNING_SECRET: Optional[str] = None
    TWILIO_ACCOUNT_SID: Optional[str] = None
    TWILIO_AUTH_TOKEN: Optional[str] = None
    TWILIO_PHONE_NUMBER: Optional[str] = None  # Add missing field
    SENDGRID_API_KEY: Optional[str] = None
    FROM_EMAIL: Optional[str] = None  # Add missing field
    WEBHOOK_SECRET: Optional[str] = None  # Add missing field
    
    # Environment
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    
    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "ignore"  # Allow extra fields to be ignored

# Create global settings instance
settings = Settings()