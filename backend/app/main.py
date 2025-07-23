# app/main.py (Updated with webhooks and incident endpoints)
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Create FastAPI app
app = FastAPI(
    title="OnCall AI API",
    description="AI-powered incident response and oncall management platform",
    version="1.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health check
@app.get("/health")
async def health_check():
    return {"status": "healthy", "version": "1.0.0"}

# Root endpoint
@app.get("/")
async def root():
    return {
        "message": "OnCall AI API", 
        "version": "1.0.0",
        "docs": "/docs"
    }

# Fixed test endpoint with proper SQLAlchemy text syntax
@app.get("/test-db")
async def test_database():
    try:
        from app.database import SessionLocal
        from sqlalchemy import text
        
        # Test async connection with proper text() syntax
        async with SessionLocal() as session:
            result = await session.execute(text("SELECT 1 as test_value"))
            row = result.fetchone()
            
        return {
            "database": "connected",
            "status": "ok",
            "test_result": row[0] if row else "no result",
            "connection_type": "async_sqlalchemy"
        }
    except Exception as e:
        return {
            "database": "error", 
            "status": "error",
            "error": str(e),
            "error_type": type(e).__name__
        }

# Test database tables
@app.get("/test-tables")
async def test_tables():
    try:
        from app.database import SessionLocal
        from sqlalchemy import text
        
        async with SessionLocal() as session:
            # Check what tables exist
            result = await session.execute(text("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public'
                ORDER BY table_name
            """))
            tables = [row[0] for row in result.fetchall()]
            
        return {
            "status": "ok",
            "tables": tables,
            "table_count": len(tables)
        }
    except Exception as e:
        return {
            "status": "error",
            "error": str(e),
            "error_type": type(e).__name__
        }

# Include routes
try:
    from app.api.v1.endpoints import auth, incidents, webhooks
    app.include_router(auth.router, prefix="/api/v1/auth", tags=["Authentication"])
    app.include_router(incidents.router, prefix="/api/v1/incidents", tags=["Incidents"])
    app.include_router(webhooks.router, prefix="/api/v1/webhooks", tags=["Webhooks"])
    print("✅ All endpoints loaded successfully")
except Exception as e:
    print(f"❌ Failed to load endpoints: {e}")