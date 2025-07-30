# backend/app/core/config.py - Enhanced with OAuth and Security
from pydantic_settings import BaseSettings
from pydantic import Field
from typing import List, Optional
import os

class Settings(BaseSettings):
    """Application settings with enhanced security and OAuth configuration"""
    
    # App Info
    APP_NAME: str = Field(default="OnCall AI")
    VERSION: str = Field(default="2.0.0")
    DEBUG: bool = Field(default=True)
    ENVIRONMENT: str = Field(default="development")
    
    # Database
    DATABASE_URL: str = Field(default="postgresql://admin:password@localhost:5432/oncall_ai")
    REDIS_URL: str = Field(default="redis://localhost:6379")
    
    # JWT Settings (Enhanced Security)
    SECRET_KEY: str = Field(default="APKVwV3oBOxCZqvQHeAs5ZuywsAR6jt0PymOVKrciJI")
    ENCRYPTION_KEY: str = Field(default="o6zLmZ-qY0ipmdF1UtLggotfeGhRY3kWz0m2_Em7VxQ")
    JWT_KEY_ID: str = Field(default="oncall-ai-9f69367c")
    ALGORITHM: str = Field(default="HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(default=15)
    ACCESS_TOKEN_EXPIRE_DAYS: int = Field(default=7)  # For backward compatibility
    REFRESH_TOKEN_EXPIRE_DAYS: int = Field(default=30)
    
    # Frontend URL for OAuth redirects
    FRONTEND_URL: str = Field(default="http://localhost:3000")
    
    # OAuth2 Provider Credentials
    GOOGLE_CLIENT_ID: Optional[str] = Field(default=None)
    GOOGLE_CLIENT_SECRET: Optional[str] = Field(default=None)
    MICROSOFT_CLIENT_ID: Optional[str] = Field(default=None)
    MICROSOFT_CLIENT_SECRET: Optional[str] = Field(default=None)
    GITHUB_CLIENT_ID: Optional[str] = Field(default=None)
    GITHUB_CLIENT_SECRET: Optional[str] = Field(default=None)
    
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
    CORS_ORIGINS: List[str] = Field(default=[
        "http://localhost:3000", 
        "http://localhost:5173",
        "https://app.oncall-ai.com"
    ])
    ALLOWED_HOSTS: List[str] = Field(default=["localhost", "*.oncall-ai.com"])
    
    # Session Security
    SESSION_COOKIE_SECURE: bool = Field(default=True)
    SESSION_COOKIE_HTTPONLY: bool = Field(default=True)
    SESSION_COOKIE_SAMESITE: str = Field(default="strict")
    
    # GDPR Compliance
    DATA_RETENTION_DAYS: int = Field(default=2555)  # 7 years
    ANONYMIZATION_ENABLED: bool = Field(default=True)
    
    # Security Monitoring
    SECURITY_EMAIL: str = Field(default="security@oncall-ai.com")
    SLACK_SECURITY_WEBHOOK: Optional[str] = Field(default=None)
    
    # External APIs
    OPENAI_API_KEY: Optional[str] = Field(default=None)
    
    # Communication Services
    TWILIO_ACCOUNT_SID: Optional[str] = Field(default=None)
    TWILIO_AUTH_TOKEN: Optional[str] = Field(default=None)
    TWILIO_PHONE_NUMBER: Optional[str] = Field(default=None)
    
    SLACK_BOT_TOKEN: Optional[str] = Field(default=None)
    SLACK_SIGNING_SECRET: Optional[str] = Field(default=None)
    
    SENDGRID_API_KEY: Optional[str] = Field(default=None)
    FROM_EMAIL: str = Field(default="alerts@oncall-ai.com")
    
    # Webhook Security
    WEBHOOK_SECRET: str = Field(default="your-webhook-secret-key")
    
    class Config:
        env_file = ".env"
        case_sensitive = True
        # Allow extra fields from .env file
        extra = "allow"

# Create settings instance
settings = Settings()

# Helper functions
def get_database_url() -> str:
    """Get database URL for SQLAlchemy"""
    return settings.DATABASE_URL

def get_redis_url() -> str:
    """Get Redis URL"""
    return settings.REDIS_URL

def get_oauth_providers() -> dict:
    """Get enabled OAuth providers"""
    providers = {}
    
    if settings.GOOGLE_CLIENT_ID and settings.GOOGLE_CLIENT_SECRET:
        providers['google'] = {
            'client_id': settings.GOOGLE_CLIENT_ID,
            'client_secret': settings.GOOGLE_CLIENT_SECRET,
            'enabled': True
        }
    
    if settings.MICROSOFT_CLIENT_ID and settings.MICROSOFT_CLIENT_SECRET:
        providers['microsoft'] = {
            'client_id': settings.MICROSOFT_CLIENT_ID,
            'client_secret': settings.MICROSOFT_CLIENT_SECRET,
            'enabled': True
        }
    
    if settings.GITHUB_CLIENT_ID and settings.GITHUB_CLIENT_SECRET:
        providers['github'] = {
            'client_id': settings.GITHUB_CLIENT_ID,
            'client_secret': settings.GITHUB_CLIENT_SECRET,
            'enabled': True
        }
    
    return providers

# Validate critical settings on import
def validate_security_settings():
    """Validate that critical security settings are present"""
    required_settings = ['SECRET_KEY', 'ENCRYPTION_KEY']
    
    for setting in required_settings:
        value = getattr(settings, setting, None)
        if not value or len(value) < 32:
            print(f"⚠️  Warning: {setting} should be at least 32 characters long")
    
    # Check OAuth configuration
    oauth_providers = get_oauth_providers()
    if oauth_providers:
        print(f"✅ OAuth providers enabled: {', '.join(oauth_providers.keys())}")
    else:
        print("⚠️  No OAuth providers configured")
    
    print("✅ Security settings validated")

# Run validation
if __name__ != "__main__":
    validate_security_settings()