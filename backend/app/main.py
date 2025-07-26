# backend/app/main.py (Updated with WebSocket notifications)
import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1.endpoints import auth, incidents, webhooks, teams, slack
from app.api.v1.endpoints.websocket_notifications import router as websocket_router
# from app.background.worker import start_background_workers  # Disabled for now

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Start background workers (disabled for now due to async session issues)
    print("🚀 OnCall AI starting up...")
    print("🔗 WebSocket notifications enabled")
    # background_task = asyncio.create_task(start_background_workers())
    
    yield
    
    # Cleanup on shutdown
    print("🛑 OnCall AI shutting down...")
    # background_task.cancel()
    # try:
    #     await background_task
    # except asyncio.CancelledError:
    #     pass

# Create FastAPI app with lifespan
app = FastAPI(
    title="OnCall AI API",
    description="AI-powered incident response and oncall management platform with real-time notifications",
    version="1.0.0",
    lifespan=lifespan
)

# CORS - Updated to allow WebSocket connections
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000", 
        "http://localhost:5173",
        "ws://localhost:3000",
        "ws://localhost:5173"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health check
@app.get("/health")
async def health_check():
    return {
        "status": "healthy", 
        "version": "1.0.0",
        "features": {
            "websocket_notifications": True,
            "real_time_updates": True,
            "multi_tenant": True
        }
    }

# Root endpoint
@app.get("/")
async def root():
    return {
        "message": "OnCall AI API", 
        "version": "1.0.0",
        "docs": "/docs",
        "websocket": "/api/v1/ws/notifications",
        "features": [
            "Real-time incident notifications",
            "Multi-tenant SaaS architecture", 
            "AI-powered alert processing",
            "WebSocket-based live updates"
        ]
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
            # Get all table names
            result = await session.execute(text("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public'
                ORDER BY table_name
            """))
            tables = [row[0] for row in result.fetchall()]
            
            # Count records in each table
            table_counts = {}
            for table in tables:
                if table != 'alembic_version':  # Skip alembic table
                    try:
                        count_result = await session.execute(text(f"SELECT COUNT(*) FROM {table}"))
                        count = count_result.fetchone()[0]
                        table_counts[table] = count
                    except Exception as e:
                        table_counts[table] = f"Error: {str(e)}"
        
        return {
            "status": "success",
            "total_tables": len(tables),
            "tables": tables,
            "record_counts": table_counts
        }
        
    except Exception as e:
        return {
            "status": "error",
            "error": str(e),
            "error_type": type(e).__name__
        }

# Include API routers
app.include_router(auth.router, prefix="/api/v1/auth", tags=["authentication"])
app.include_router(incidents.router, prefix="/api/v1/incidents", tags=["incidents"])
app.include_router(webhooks.router, prefix="/api/v1/webhooks", tags=["webhooks"])
app.include_router(teams.router, prefix="/api/v1/teams", tags=["teams"])
app.include_router(slack.router, prefix="/api/v1/slack", tags=["slack"])

# Include WebSocket router
app.include_router(websocket_router, prefix="/api/v1", tags=["websockets", "notifications"])

# Optional: Add middleware for logging WebSocket connections
@app.middleware("http")
async def log_requests(request, call_next):
    import time
    start_time = time.time()
    
    response = await call_next(request)
    
    process_time = time.time() - start_time
    
    # Log API requests (but not WebSocket upgrades)
    if not request.url.path.startswith("/api/v1/ws/"):
        print(f"📝 {request.method} {request.url.path} - {response.status_code} - {process_time:.3f}s")
    
    return response

# Add startup message with WebSocket info
@app.on_event("startup")
async def startup_event():
    print("\n" + "="*60)
    print("🚀 OnCall AI API Server Started Successfully!")
    print("="*60)
    print("📚 API Documentation: http://localhost:8000/docs")
    print("🔗 WebSocket Endpoint: ws://localhost:8000/api/v1/ws/notifications")
    print("📊 WebSocket Stats: http://localhost:8000/api/v1/ws/stats")
    print("🧪 Test Notification: POST http://localhost:8000/api/v1/ws/test-notification")
    print("="*60)
    print("Frontend should connect to WebSocket with JWT token:")
    print("Example: ws://localhost:8000/api/v1/ws/notifications?token=YOUR_JWT_TOKEN")
    print("="*60 + "\n")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app", 
        host="0.0.0.0", 
        port=8000, 
        reload=True,
        log_level="info"
    )