import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
import redis.asyncio as redis
from dotenv import load_dotenv

load_dotenv()

# Database configuration
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://admin:password@localhost:5432/oncall_ai")
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")

# Convert sync URL to async for SQLAlchemy
ASYNC_DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://")

# SQLAlchemy setup
engine = create_async_engine(ASYNC_DATABASE_URL, echo=True)
SessionLocal = async_sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
    class_=AsyncSession
)

Base = declarative_base()

# Redis setup
redis_client = redis.from_url(REDIS_URL, decode_responses=True)

# Dependency to get database session
async def get_db():
    async with SessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
async def get_async_session():
    async with SessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
# Dependency to get Redis client
async def get_redis():
    return redis_client

# Database initialization
async def init_db():
    """Initialize database tables"""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

# Health check functions
async def check_db_health():
    """Check database connectivity"""
    try:
        async with SessionLocal() as session:
            await session.execute("SELECT 1")
        return True
    except Exception:
        return False

async def check_redis_health():
    """Check Redis connectivity"""
    try:
        await redis_client.ping()
        return True
    except Exception:
        return False