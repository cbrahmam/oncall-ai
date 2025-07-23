from pydantic_settings import BaseSettings
from typing import List
import os

class Settings(BaseSettings):
    # App
    APP_NAME: str = "OnCall AI"
    DEBUG: bool = os.getenv("DEBUG", "false").lower() == "true"
    SECRET_KEY: str = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    
    # Database
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", 
        "postgresql://admin:password@localhost:5432/oncall_ai"
    )
    
    # Redis
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    
    # JWT
    JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", SECRET_KEY)
    JWT_ALGORITHM: str = "HS256"
    ALGORITHM: str = JWT_ALGORITHM  # Alias for JWT_ALGORITHM
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
    # OpenAI
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    
    # Twilio
    TWILIO_ACCOUNT_SID: str = os.getenv("TWILIO_ACCOUNT_SID", "")
    TWILIO_AUTH_TOKEN: str = os.getenv("TWILIO_AUTH_TOKEN", "")
    TWILIO_PHONE_NUMBER: str = os.getenv("TWILIO_PHONE_NUMBER", "your-twilio-phone")
    
    # Slack
    SLACK_BOT_TOKEN: str = os.getenv("SLACK_BOT_TOKEN", "xoxb-your-slack-bot-token")
    SLACK_SIGNING_SECRET: str = os.getenv("SLACK_SIGNING_SECRET", "your-slack-signing-secret")
    
    # SendGrid
    SENDGRID_API_KEY: str = os.getenv("SENDGRID_API_KEY", "your-sendgrid-key")
    FROM_EMAIL: str = os.getenv("FROM_EMAIL", "alerts@yourdomain.com")
    
    # Webhooks
    WEBHOOK_SECRET: str = os.getenv("WEBHOOK_SECRET", "your-webhook-secret-key")
    
    # CORS
    CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:5173"]
    
    # Rate limiting
    RATE_LIMIT_REQUESTS: int = 100
    RATE_LIMIT_WINDOW: int = 60  # seconds
    
    class Config:
        env_file = ".env"
        extra = "ignore"  # This allows extra fields without errors

settings = Settings()