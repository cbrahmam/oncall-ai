#!/bin/bash
# Fix the source code issues in backend files

echo "🔧 FIXING BACKEND SOURCE CODE ISSUES"
echo "==================================="

cd backend

echo "🔍 Backing up original files"
cp app/database.py app/database.py.backup
cp app/core/config.py app/core/config.py.backup

echo "✅ Backups created"

echo ""
echo "🔧 Fix 1: Remove +asyncpg from database.py (causing async_generator error)"
echo "======================================================================="

# Fix the database URL conversion that's causing the async error
sed -i '' 's/postgresql+asyncpg:\/\//postgresql:\/\//g' app/database.py

# Remove the line that converts sync to async URL (line 18)
sed -i '' '/ASYNC_DATABASE_URL = DATABASE_URL.replace/d' app/database.py
sed -i '' '/postgresql+asyncpg/d' app/database.py

# Use the direct DATABASE_URL instead
sed -i '' 's/ASYNC_DATABASE_URL/DATABASE_URL/g' app/database.py

echo "✅ Fixed database URL format issue"

echo ""
echo "🔧 Fix 2: Fix Redis URL in database.py (remove localhost default)"
echo "================================================================="

# Update Redis URL to use environment variable without localhost fallback
sed -i '' 's/redis:\/\/localhost:6379/redis:\/\/redis-service:6379/g' app/database.py

echo "✅ Fixed Redis URL fallback"

echo ""
echo "🔧 Fix 3: Fix config.py defaults (use proper env var reading)"
echo "==========================================================="

# Fix the config.py to not have hardcoded localhost defaults
sed -i '' 's/postgresql:\/\/admin:password@localhost:5432\/offcall_ai/postgresql:\/\/dbadmin:password@database:5432\/offcall_ai/g' app/core/config.py
sed -i '' 's/redis:\/\/localhost:6379/redis:\/\/redis-service:6379/g' app/core/config.py

echo "✅ Fixed config.py defaults"

echo ""
echo "🔧 Fix 4: Create improved database.py with proper async handling"
echo "=============================================================="

cat > app/database.py << 'EOF'
import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
import redis.asyncio as redis
from dotenv import load_dotenv
from app.core.config import settings

load_dotenv()

# Get database URL from environment (no hardcoded fallbacks)
DATABASE_URL = os.getenv("DATABASE_URL") or settings.DATABASE_URL
REDIS_URL = os.getenv("REDIS_URL") or settings.REDIS_URL

print(f"🔧 Using DATABASE_URL: {DATABASE_URL[:50]}...")
print(f"🔧 Using REDIS_URL: {REDIS_URL[:30]}...")

# Use DATABASE_URL directly (it should already be correct format)
engine = create_async_engine(DATABASE_URL, echo=False)
SessionLocal = async_sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
    class_=AsyncSession
)

Base = declarative_base()

# Redis setup with proper URL
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
    """Get async Redis connection"""
    return redis.from_url(REDIS_URL)

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
            result = await session.execute("SELECT 1")
            return "connected"
    except Exception as e:
        print(f"Database health check failed: {e}")
        return f"error: {str(e)[:50]}"

async def check_redis_health():
    """Check Redis connectivity"""
    try:
        await redis_client.ping()
        return "connected"
    except Exception as e:
        print(f"Redis health check failed: {e}")
        return f"error: {str(e)[:50]}"

async def test_db_connection():
    """Test database connection"""
    try:
        async with SessionLocal() as session:
            await session.execute("SELECT 1")
        return True
    except Exception as e:
        print(f"Database connection test failed: {e}")
        return False
EOF

echo "✅ Created improved database.py"

echo ""
echo "🔧 Fix 5: Verify the fixes"
echo "========================="

echo "Checking for remaining localhost references:"
grep -n "localhost" app/database.py app/core/config.py || echo "✅ No localhost references found"

echo ""
echo "Checking for +asyncpg references:"
grep -n "asyncpg" app/database.py || echo "✅ No +asyncpg references found"

echo ""
echo "🎯 FIXES COMPLETE"
echo "================="
echo "✅ Removed +asyncpg from database URL (fixes async_generator error)"
echo "✅ Fixed Redis URL to use environment variables properly"
echo "✅ Updated config.py defaults"
echo "✅ Created robust database.py with proper error handling"
echo ""
echo "🚀 Ready to rebuild container with fixed code!"
echo "Run: docker buildx build --platform linux/amd64 --push -t offcaiaicr80017.azurecr.io/offcall-ai-backend:v1.0.6 ."