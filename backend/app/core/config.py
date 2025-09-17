# backend/app/core/config.py - FIXED OAuth Loading from Kubernetes

from pydantic_settings import BaseSettings
from pydantic import Field, validator
from typing import List, Optional
import os
import base64

class Settings(BaseSettings):
    """Application settings with FIXED OAuth configuration loading"""
    
    # App Info
    APP_NAME: str = Field(default="OffCall AI")
    VERSION: str = Field(default="2.0.0")
    DEBUG: bool = Field(default=True)
    ENVIRONMENT: str = Field(default="development")
    
    # Database
    DATABASE_URL: str = Field(default="postgresql://dbadmin:password@database:5432/offcall_ai")
    REDIS_URL: str = Field(default="redis://redis-service:6379")
    
    # JWT Settings
    SECRET_KEY: str = Field(default="APKVwV3oBOxCZqvQHeAs5ZuywsAR6jt0PymOVKrciJI")
    ENCRYPTION_KEY: str = Field(default="o6zLmZ-qY0ipmdF1UtLggotfeGhRY3kWz0m2_Em7VxQ")
    JWT_KEY_ID: str = Field(default="offcall-ai-9f69367c")
    ALGORITHM: str = Field(default="HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(default=15)
    ACCESS_TOKEN_EXPIRE_DAYS: int = Field(default=7)
    REFRESH_TOKEN_EXPIRE_DAYS: int = Field(default=30)
    
    # Frontend URL
    FRONTEND_URL: str = Field(default="http://localhost:3000")
    
    # FIXED: OAuth2 Provider Credentials - Force load from environment/Kubernetes
    GOOGLE_CLIENT_ID: str = Field(default="")
    GOOGLE_CLIENT_SECRET: str = Field(default="")
    MICROSOFT_CLIENT_ID: str = Field(default="")
    MICROSOFT_CLIENT_SECRET: str = Field(default="")
    GITHUB_CLIENT_ID: str = Field(default="")
    GITHUB_CLIENT_SECRET: str = Field(default="")
    
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
        "https://offcallai.com",
        "https://app.offcallai.com"
    ])
    ALLOWED_HOSTS: List[str] = Field(default=["localhost", "*.offcallai.com"])
    
    # External APIs
    OPENAI_API_KEY: Optional[str] = Field(default=None)
    ANTHROPIC_API_KEY: Optional[str] = Field(default=None)
    GEMINI_API_KEY: Optional[str] = Field(default=None)
    
    # Communication Services
    TWILIO_ACCOUNT_SID: Optional[str] = Field(default=None)
    TWILIO_AUTH_TOKEN: Optional[str] = Field(default=None)
    TWILIO_PHONE_NUMBER: Optional[str] = Field(default=None)
    
    SLACK_BOT_TOKEN: Optional[str] = Field(default=None)
    SLACK_SIGNING_SECRET: Optional[str] = Field(default=None)
    
    SENDGRID_API_KEY: Optional[str] = Field(default=None)
    FROM_EMAIL: str = Field(default="alerts@offcallai.com")
    
    # Stripe
    STRIPE_PUBLISHABLE_KEY: Optional[str] = Field(default=None)
    STRIPE_SECRET_KEY: Optional[str] = Field(default=None)
    STRIPE_WEBHOOK_SECRET: Optional[str] = Field(default=None)
    
    # Webhook Security
    WEBHOOK_SECRET: str = Field(default="your-webhook-secret-key")
    
    @validator('GOOGLE_CLIENT_ID', pre=True)
    def load_google_client_id(cls, v):
        """Force load Google Client ID from environment or Kubernetes secret"""
        if v:  # If already set, use it
            return v
        
        # Try environment variable first
        env_val = os.getenv('GOOGLE_CLIENT_ID')
        if env_val:
            print(f"✅ Google Client ID loaded from environment")
            return env_val
        
        # Try Kubernetes secret file (mounted as volume)
        try:
            with open('/etc/secrets/google-client-id', 'r') as f:
                secret_val = f.read().strip()
                if secret_val:
                    print(f"✅ Google Client ID loaded from Kubernetes secret")
                    return secret_val
        except (FileNotFoundError, IOError):
            pass
        
        # Try base64 decoded environment variable (common in Kubernetes)
        b64_val = os.getenv('GOOGLE_CLIENT_ID_B64')
        if b64_val:
            try:
                decoded = base64.b64decode(b64_val).decode('utf-8')
                print(f"✅ Google Client ID loaded from base64 environment variable")
                return decoded
            except Exception as e:
                print(f"⚠️ Failed to decode Google Client ID: {e}")
        
        print(f"⚠️ Google Client ID not found, using default")
        return ""
    
    @validator('GOOGLE_CLIENT_SECRET', pre=True)
    def load_google_client_secret(cls, v):
        """Force load Google Client Secret"""
        if v:
            return v
        
        env_val = os.getenv('GOOGLE_CLIENT_SECRET')
        if env_val:
            print(f"✅ Google Client Secret loaded from environment")
            return env_val
        
        try:
            with open('/etc/secrets/google-client-secret', 'r') as f:
                secret_val = f.read().strip()
                if secret_val:
                    print(f"✅ Google Client Secret loaded from Kubernetes secret")
                    return secret_val
        except (FileNotFoundError, IOError):
            pass
        
        b64_val = os.getenv('GOOGLE_CLIENT_SECRET_B64')
        if b64_val:
            try:
                decoded = base64.b64decode(b64_val).decode('utf-8')
                print(f"✅ Google Client Secret loaded from base64")
                return decoded
            except Exception as e:
                print(f"⚠️ Failed to decode Google Client Secret: {e}")
        
        print(f"⚠️ Google Client Secret not found")
        return ""
    
    @validator('MICROSOFT_CLIENT_ID', pre=True)
    def load_microsoft_client_id(cls, v):
        """Force load Microsoft Client ID"""
        if v:
            return v
        
        env_val = os.getenv('MICROSOFT_CLIENT_ID')
        if env_val:
            return env_val
        
        try:
            with open('/etc/secrets/microsoft-client-id', 'r') as f:
                return f.read().strip()
        except (FileNotFoundError, IOError):
            pass
        
        b64_val = os.getenv('MICROSOFT_CLIENT_ID_B64')
        if b64_val:
            try:
                return base64.b64decode(b64_val).decode('utf-8')
            except:
                pass
        
        return ""
    
    @validator('MICROSOFT_CLIENT_SECRET', pre=True)
    def load_microsoft_client_secret(cls, v):
        """Force load Microsoft Client Secret"""
        if v:
            return v
        
        env_val = os.getenv('MICROSOFT_CLIENT_SECRET')
        if env_val:
            return env_val
        
        try:
            with open('/etc/secrets/microsoft-client-secret', 'r') as f:
                return f.read().strip()
        except (FileNotFoundError, IOError):
            pass
        
        b64_val = os.getenv('MICROSOFT_CLIENT_SECRET_B64')
        if b64_val:
            try:
                return base64.b64decode(b64_val).decode('utf-8')
            except:
                pass
        
        return ""
    
    @validator('GITHUB_CLIENT_ID', pre=True)
    def load_github_client_id(cls, v):
        """Force load GitHub Client ID"""
        if v:
            return v
        
        env_val = os.getenv('GITHUB_CLIENT_ID')
        if env_val:
            return env_val
        
        try:
            with open('/etc/secrets/github-client-id', 'r') as f:
                return f.read().strip()
        except (FileNotFoundError, IOError):
            pass
        
        b64_val = os.getenv('GITHUB_CLIENT_ID_B64')
        if b64_val:
            try:
                return base64.b64decode(b64_val).decode('utf-8')
            except:
                pass
        
        return ""
    
    @validator('GITHUB_CLIENT_SECRET', pre=True) 
    def load_github_client_secret(cls, v):
        """Force load GitHub Client Secret"""
        if v:
            return v
        
        env_val = os.getenv('GITHUB_CLIENT_SECRET')
        if env_val:
            return env_val
        
        try:
            with open('/etc/secrets/github-client-secret', 'r') as f:
                return f.read().strip()
        except (FileNotFoundError, IOError):
            pass
        
        b64_val = os.getenv('GITHUB_CLIENT_SECRET_B64')
        if b64_val:
            try:
                return base64.b64decode(b64_val).decode('utf-8')
            except:
                pass
        
        return ""
    
    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "allow"

# Create settings instance
settings = Settings()

# FIXED: Helper functions with proper OAuth validation
def get_database_url() -> str:
    """Get database URL for SQLAlchemy"""
    return settings.DATABASE_URL

def get_redis_url() -> str:
    """Get Redis URL"""
    return settings.REDIS_URL

def get_oauth_providers() -> dict:
    """Get enabled OAuth providers - FIXED VERSION"""
    providers = {}
    
    # Check Google OAuth
    if settings.GOOGLE_CLIENT_ID and settings.GOOGLE_CLIENT_SECRET:
        if len(settings.GOOGLE_CLIENT_ID) > 10 and len(settings.GOOGLE_CLIENT_SECRET) > 10:
            providers['google'] = {
                'client_id': settings.GOOGLE_CLIENT_ID,
                'client_secret': settings.GOOGLE_CLIENT_SECRET,
                'enabled': True,
                'name': 'Google'
            }
            print(f"✅ Google OAuth configured: {settings.GOOGLE_CLIENT_ID[:20]}...")
    
    # Check Microsoft OAuth
    if settings.MICROSOFT_CLIENT_ID and settings.MICROSOFT_CLIENT_SECRET:
        if len(settings.MICROSOFT_CLIENT_ID) > 10 and len(settings.MICROSOFT_CLIENT_SECRET) > 10:
            providers['microsoft'] = {
                'client_id': settings.MICROSOFT_CLIENT_ID,
                'client_secret': settings.MICROSOFT_CLIENT_SECRET,
                'enabled': True,
                'name': 'Microsoft'
            }
            print(f"✅ Microsoft OAuth configured: {settings.MICROSOFT_CLIENT_ID[:20]}...")
    
    # Check GitHub OAuth
    if settings.GITHUB_CLIENT_ID and settings.GITHUB_CLIENT_SECRET:
        if len(settings.GITHUB_CLIENT_ID) > 10 and len(settings.GITHUB_CLIENT_SECRET) > 10:
            providers['github'] = {
                'client_id': settings.GITHUB_CLIENT_ID,
                'client_secret': settings.GITHUB_CLIENT_SECRET,
                'enabled': True,
                'name': 'GitHub'
            }
            print(f"✅ GitHub OAuth configured: {settings.GITHUB_CLIENT_ID[:20]}...")
    
    if not providers:
        print("⚠️ No OAuth providers configured - check your Kubernetes secrets or environment variables")
    else:
        print(f"🔐 OAuth providers available: {', '.join(providers.keys())}")
    
    return providers

def validate_oauth_configuration():
    """Validate OAuth configuration on startup"""
    oauth_providers = get_oauth_providers()
    
    if oauth_providers:
        print(f"✅ OAuth validation successful: {len(oauth_providers)} provider(s) configured")
        for provider_name, config in oauth_providers.items():
            print(f"   - {provider_name}: {config['name']} ({'✅ enabled' if config['enabled'] else '❌ disabled'})")
        return True
    else:
        print("❌ OAuth validation failed: No providers configured")
        print("   Check these locations for OAuth credentials:")
        print("   1. Environment variables: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, etc.")
        print("   2. Kubernetes secrets: /etc/secrets/google-client-id, etc.")
        print("   3. Base64 environment variables: GOOGLE_CLIENT_ID_B64, etc.")
        return False

def validate_security_settings():
    """Validate that critical security settings are present"""
    required_settings = ['SECRET_KEY', 'ENCRYPTION_KEY']
    
    for setting in required_settings:
        value = getattr(settings, setting, None)
        if not value or len(value) < 32:
            print(f"⚠️ Warning: {setting} should be at least 32 characters long")
    
    # Validate OAuth
    oauth_valid = validate_oauth_configuration()
    
    print("✅ Security settings validation complete")
    return oauth_valid

# Run validation on import
if __name__ != "__main__":
    validate_security_settings()