# backend/app/core/config.py - Fixed with extra fields allowed
from pydantic_settings import BaseSettings
from pydantic import Field
from typing import List, Optional
import os

class Settings(BaseSettings):
    """Application settings with enhanced security configuration"""
    
    # Database
    DATABASE_URL: str = Field(default="postgresql://admin:password@localhost:5432/oncall_ai")
    
    # Redis
    REDIS_URL: str = Field(default="redis://localhost:6379")
    
    # JWT Settings (Enhanced Security)
    SECRET_KEY: str = Field(default="APKVwV3oBOxCZqvQHeAs5ZuywsAR6jt0PymOVKrciJI")
    ENCRYPTION_KEY: str = Field(default="o6zLmZ-qY0ipmdF1UtLggotfeGhRY3kWz0m2_Em7VxQ")
    JWT_KEY_ID: str = Field(default="oncall-ai-9f69367c")
    ALGORITHM: str = Field(default="HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(default=15)
    REFRESH_TOKEN_EXPIRE_DAYS: int = Field(default=30)
    
    # Rate Limiting
    GLOBAL_RATE_LIMIT: int = Field(default=1000)
    USER_RATE_LIMIT: int = Field(default=100)
    LOGIN_RATE_LIMIT: int = Field(default=5)
    
    # Security Features
    ENABLE_MFA: bool = Field(default=True)
    ENABLE_RATE_LIMITING: bool = Field(default=True)
    ENABLE_OAUTH2: bool = Field(default=True)
    ENABLE_GDPR_FEATURES: bool = Field(default=True)
    
    # CORS and Security Headers
    CORS_ORIGINS: List[str] = Field(default=["http://localhost:3000", "https://app.oncall-ai.com"])
    ALLOWED_HOSTS: List[str] = Field(default=["localhost", "*.oncall-ai.com"])
    
    # Session Security
    SESSION_COOKIE_SECURE: bool = Field(default=True)
    SESSION_COOKIE_HTTPONLY: bool = Field(default=True)
    SESSION_COOKIE_SAMESITE: str = Field(default="strict")
    
    # GDPR Compliance
    DATA_RETENTION_DAYS: int = Field(default=2555)  # 7 years
    ANONYMIZATION_ENABLED: bool = Field(default=True)
    
    # OAuth2 Providers (Optional)
    GOOGLE_CLIENT_ID: Optional[str] = Field(default=None)
    GOOGLE_CLIENT_SECRET: Optional[str] = Field(default=None)
    MICROSOFT_CLIENT_ID: Optional[str] = Field(default=None)
    MICROSOFT_CLIENT_SECRET: Optional[str] = Field(default=None)
    GITHUB_CLIENT_ID: Optional[str] = Field(default=None)
    GITHUB_CLIENT_SECRET: Optional[str] = Field(default=None)
    
    # Security Monitoring
    SECURITY_EMAIL: str = Field(default="security@oncall-ai.com")
    SLACK_SECURITY_WEBHOOK: Optional[str] = Field(default=None)
    
    # External APIs
    OPENAI_API_KEY: Optional[str] = Field(default=None)
    TWILIO_ACCOUNT_SID: Optional[str] = Field(default=None)
    TWILIO_AUTH_TOKEN: Optional[str] = Field(default=None)
    TWILIO_PHONE_NUMBER: Optional[str] = Field(default=None)  # Add missing field
    SENDGRID_API_KEY: Optional[str] = Field(default=None)
    SLACK_BOT_TOKEN: Optional[str] = Field(default=None)
    SLACK_SIGNING_SECRET: Optional[str] = Field(default=None)  # Add missing field
    FROM_EMAIL: Optional[str] = Field(default=None)  # Add missing field
    WEBHOOK_SECRET: Optional[str] = Field(default=None)  # Add missing field
    
    # Application
    DEBUG: bool = Field(default=True)
    ENVIRONMENT: str = Field(default="development")
    
    # For backward compatibility with existing code
    ACCESS_TOKEN_EXPIRE_DAYS: int = Field(default=7)  # Old setting
    
    class Config:
        env_file = ".env"
        case_sensitive = True
        # IMPORTANT: Allow extra fields from .env file
        extra = "allow"

# Create settings instance
settings = Settings()

# Helper function for database connection
def get_database_url() -> str:
    """Get database URL for SQLAlchemy"""
    return settings.DATABASE_URL

# Helper function for Redis connection
def get_redis_url() -> str:
    """Get Redis URL"""
    return settings.REDIS_URL

# Validate critical settings on import
def validate_security_settings():
    """Validate that critical security settings are present"""
    required_settings = ['SECRET_KEY', 'ENCRYPTION_KEY']
    
    for setting in required_settings:
        value = getattr(settings, setting, None)
        if not value or len(value) < 32:
            print(f"⚠️  Warning: {setting} should be at least 32 characters long")
    
    print("✅ Security settings validated")

# Run validation
if __name__ != "__main__":
    validate_security_settings()