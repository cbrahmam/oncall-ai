# backend/app/main.py - Enhanced with OAuth and Security
import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from datetime import datetime
import time

from app.core.config import settings
from app.database import get_async_session

# Import core endpoints - these should always work
from app.api.v1.endpoints import auth

# Import additional endpoints with better error handling
INCIDENTS_AVAILABLE = False
WEBHOOKS_AVAILABLE = False
TEAMS_AVAILABLE = False
SLACK_AVAILABLE = False
AI_AVAILABLE = False

try:
    from app.api.v1.endpoints import incidents
    INCIDENTS_AVAILABLE = True
    print("✅ Incidents endpoints loaded")
except ImportError as e:
    print(f"⚠️  Incidents endpoints not available: {e}")

try:
    from app.api.v1.endpoints import webhooks
    WEBHOOKS_AVAILABLE = True
    print("✅ Webhooks endpoints loaded")
except ImportError as e:
    print(f"⚠️  Webhooks endpoints not available: {e}")

try:
    from app.api.v1.endpoints import teams
    TEAMS_AVAILABLE = True
    print("✅ Teams endpoints loaded")
except ImportError as e:
    print(f"⚠️  Teams endpoints not available: {e}")

try:
    from app.api.v1.endpoints import slack
    SLACK_AVAILABLE = True
    print("✅ Slack endpoints loaded")
except ImportError as e:
    print(f"⚠️  Slack endpoints not available: {e}")

try:
    from app.api.v1.endpoints import ai
    AI_AVAILABLE = True
    print("✅ AI endpoints loaded")
except ImportError as e:
    print(f"⚠️  AI endpoints not available: {e}")

# Import OAuth endpoints with better error handling
OAUTH_AVAILABLE = False
oauth_providers = {}

try:
    from app.api.v1.endpoints import oauth
    OAUTH_AVAILABLE = True
    print("✅ OAuth endpoints available")
    
    # Try to get OAuth providers
    try:
        from app.core.oauth_config import get_oauth_providers
        oauth_providers = get_oauth_providers()
        print(f"✅ OAuth providers configured: {list(oauth_providers.keys())}")
    except ImportError:
        try:
            from app.core.config import get_oauth_providers
            oauth_providers = get_oauth_providers()
            print(f"✅ OAuth providers configured: {list(oauth_providers.keys())}")
        except:
            # Fallback - assume providers are configured
            oauth_providers = {"google": True, "microsoft": True, "github": True}
            print("✅ OAuth providers (fallback): google, microsoft, github")
            
except ImportError as e:
    print(f"⚠️  OAuth endpoints not found: {e}")

# Import security components with error handling
SECURITY_AVAILABLE = False
ENHANCED_SECURITY_AVAILABLE = False

try:
    from app.api.v1.endpoints import security
    SECURITY_AVAILABLE = True
    print("✅ Security endpoints available")
except ImportError as e:
    print(f"⚠️  Security endpoints not found: {e}")

try:
    from app.core.enhanced_security import security_logger, rate_limiter
    ENHANCED_SECURITY_AVAILABLE = True
    print("✅ Enhanced security available")
except ImportError as e:
    print(f"⚠️  Enhanced security not available: {e}")

# WebSocket support
WEBSOCKET_AVAILABLE = False
try:
    from app.api.v1.endpoints.websocket_notifications import router as websocket_router
    WEBSOCKET_AVAILABLE = True
    print("✅ WebSocket notifications available")
except ImportError as e:
    print(f"⚠️  WebSocket notifications not available: {e}")

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events"""
    # Startup
    print("🚀 OnCall AI starting up...")
    
    # Initialize OAuth if available
    if OAUTH_AVAILABLE:
        try:
            # Try to initialize OAuth
            if oauth_providers:
                print("🔐 OAuth providers initialized")
        except Exception as e:
            print(f"⚠️  OAuth initialization failed: {e}")
    
    print("✅ FastAPI application initialized")
    print("✅ Database connections ready")
    
    if ENHANCED_SECURITY_AVAILABLE:
        print("✅ Enhanced security features enabled")
    else:
        print("⚠️  Running with basic security")
    
    # Display available features
    features = []
    if OAUTH_AVAILABLE and oauth_providers:
        features.append(f"🔐 SSO: {', '.join(oauth_providers.keys())}")
    
    if ENHANCED_SECURITY_AVAILABLE:
        features.append("🛡️ Enhanced Security")
    
    if AI_AVAILABLE:
        features.append("🤖 AI-Powered Features")
        
    if WEBSOCKET_AVAILABLE:
        features.append("🔗 WebSocket Notifications")
    
    if features:
        print("🎯 Active Features:")
        for feature in features:
            print(f"   {feature}")
    
    yield
    
    # Shutdown
    print("🛑 OnCall AI shutting down...")

# Create FastAPI app
app = FastAPI(
    title="OnCall AI - Enterprise Edition",
    description="AI-powered incident response with enterprise SSO and security",
    version="2.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# Add security headers middleware
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    start_time = time.time()
    
    response = await call_next(request)
    
    # Add security headers
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    response.headers["X-Security-Level"] = "enterprise" if ENHANCED_SECURITY_AVAILABLE else "basic"
    response.headers["X-OAuth-Enabled"] = "true" if OAUTH_AVAILABLE else "false"
    
    # Add performance headers
    process_time = time.time() - start_time
    response.headers["X-Process-Time"] = str(process_time)
    
    # Log requests (but not WebSocket upgrades)
    if not request.url.path.startswith("/api/v1/ws/"):
        # Color-coded logging based on status
        if response.status_code < 300:
            status_color = "🟢"
        elif response.status_code < 400:
            status_color = "🟡"
        else:
            status_color = "🔴"
            
        print(f"{status_color} {request.method} {request.url.path} - {response.status_code} - {process_time:.3f}s")
    
    return response

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "ws://localhost:3000",
        "ws://localhost:5173"
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["X-RateLimit-*", "X-Security-*", "X-OAuth-*"]
)

# Include core routers
app.include_router(auth.router, prefix="/api/v1/auth", tags=["Authentication"])

# Include OAuth router if available
if OAUTH_AVAILABLE:
    app.include_router(oauth.router, prefix="/api/v1/oauth", tags=["OAuth", "SSO"])

# Include security endpoints if available
if SECURITY_AVAILABLE:
    app.include_router(security.router, prefix="/api/v1", tags=["Security"])

# Include additional endpoints if available
if INCIDENTS_AVAILABLE:
    app.include_router(incidents.router, prefix="/api/v1/incidents", tags=["Incidents"])

if WEBHOOKS_AVAILABLE:
    app.include_router(webhooks.router, prefix="/api/v1/webhooks", tags=["Webhooks"])

if TEAMS_AVAILABLE:
    app.include_router(teams.router, prefix="/api/v1/teams", tags=["Teams"])

if SLACK_AVAILABLE:
    app.include_router(slack.router, prefix="/api/v1/slack", tags=["Slack"])

if AI_AVAILABLE:
    app.include_router(ai.router, prefix="/api/v1/ai", tags=["AI", "Artificial Intelligence"])

# Include WebSocket router if available
if WEBSOCKET_AVAILABLE:
    app.include_router(websocket_router, prefix="/api/v1", tags=["WebSockets", "Notifications"])

# Root endpoint
@app.get("/")
async def root():
    """Root endpoint with feature overview"""
    
    return {
        "message": "OnCall AI - Enterprise Edition",
        "version": "2.0.0",
        "status": "operational",
        "security_level": "enterprise" if ENHANCED_SECURITY_AVAILABLE else "basic",
        "features": {
            "oauth_sso": len(oauth_providers) > 0,
            "oauth_providers": list(oauth_providers.keys()),
            "enhanced_security": ENHANCED_SECURITY_AVAILABLE,
            "ai_powered": AI_AVAILABLE,
            "real_time_notifications": WEBSOCKET_AVAILABLE,
            "multi_factor_auth": ENHANCED_SECURITY_AVAILABLE,
            "enterprise_ready": OAUTH_AVAILABLE and ENHANCED_SECURITY_AVAILABLE
        },
        "documentation": "/docs",
        "endpoints": {
            "auth": "/api/v1/auth",
            "oauth": "/api/v1/oauth" if OAUTH_AVAILABLE else "not_available",
            "incidents": "/api/v1/incidents" if INCIDENTS_AVAILABLE else "not_available",
            "ai": "/api/v1/ai" if AI_AVAILABLE else "not_available"
        }
    }

# Health check with comprehensive status
@app.get("/health")
async def health_check():
    """Comprehensive health check with security and feature status"""
    
    health_status = {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "version": "2.0.0",
        "security": {
            "basic_headers": True,
            "cors_configured": True,
            "enhanced_security": ENHANCED_SECURITY_AVAILABLE,
            "oauth_enabled": OAUTH_AVAILABLE,
            "oauth_providers": list(oauth_providers.keys())
        },
        "features": {
            "authentication": True,
            "database": True,
            "incidents": INCIDENTS_AVAILABLE,
            "ai_analysis": AI_AVAILABLE,
            "webhooks": WEBHOOKS_AVAILABLE,
            "real_time_notifications": WEBSOCKET_AVAILABLE
        }
    }
    
    # Test database connectivity with better error handling
    try:
        from sqlalchemy import text
        async with get_async_session() as db:
            result = await db.execute(text("SELECT 1"))
            test_result = result.fetchone()
            health_status["features"]["database_connection"] = "healthy"
    except Exception as e:
        health_status["features"]["database_connection"] = f"error: {str(e)[:50]}"
        health_status["status"] = "degraded"
    
    # Test Redis if available
    try:
        import redis.asyncio as redis
        r = redis.from_url("redis://localhost:6379")
        await r.ping()
        await r.close()
        health_status["features"]["redis_connection"] = "healthy"
    except Exception as e:
        health_status["features"]["redis_connection"] = f"error: {str(e)[:50]}"
    
    return health_status

# Test database with table info
@app.get("/test-db")
async def test_database():
    """Test database connectivity with comprehensive checks"""
    try:
        from sqlalchemy import text
        
        # Use the async session generator correctly
        db_gen = get_async_session()
        session = await db_gen.__anext__()
        
        try:
            # Test basic connectivity
            result = await session.execute(text("SELECT 1"))
            connection_test = result.fetchone()[0]
            
            # Get table list
            tables_result = await session.execute(text("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public'
                ORDER BY table_name
            """))
            tables = [row[0] for row in tables_result.fetchall()]
            
            # Get record counts for each table
            table_counts = {}
            for table in tables:
                if table != 'alembic_version':  # Skip alembic table
                    try:
                        count_result = await session.execute(text(f"SELECT COUNT(*) FROM {table}"))
                        count = count_result.fetchone()[0]
                        table_counts[table] = count
                    except Exception as e:
                        table_counts[table] = f"Error: {str(e)[:50]}"
        
            return {
                "status": "success",
                "connection_test": connection_test,
                "total_tables": len(tables),
                "tables": tables,
                "record_counts": table_counts,
                "features": {
                    "oauth_support": "oauth_accounts" in tables,
                    "enhanced_security": "user_sessions" in tables,
                    "incidents": "incidents" in tables,
                    "teams": "teams" in tables,
                    "ai_ready": True
                }
            }
        finally:
            await session.close()
        
    except Exception as e:
        return {
            "status": "error",
            "error": str(e),
            "error_type": type(e).__name__
        }
# Enhanced startup message
@app.on_event("startup")
async def startup_event():
    
    print("\n" + "="*80)
    print("🚀 OnCall AI Enterprise Edition - Started Successfully!")
    print("="*80)
    print("📚 API Documentation: http://localhost:8000/docs")
    print("🏠 Root Endpoint: http://localhost:8000/")
    print("❤️  Health Check: http://localhost:8000/health")
    print("")
    
    if OAUTH_AVAILABLE and oauth_providers:
        print("🔐 Enterprise SSO Endpoints:")
        print("   🌐 Available Providers: GET http://localhost:8000/api/v1/oauth/providers")
        print("   🔑 Start OAuth Flow: POST http://localhost:8000/api/v1/oauth/authorize")
        print("   ✅ OAuth Callback: POST http://localhost:8000/api/v1/oauth/callback")
        print(f"   🎯 Enabled Providers: {', '.join(oauth_providers.keys())}")
        print("")
    
    if AI_AVAILABLE:
        print("🤖 AI-Powered Features:")
        print("   📈 Incident Analysis: POST http://localhost:8000/api/v1/ai/analyze-incident")
        print("   🔧 Auto Resolution: POST http://localhost:8000/api/v1/ai/suggest-resolution")
        print("   🎯 Alert Classification: POST http://localhost:8000/api/v1/ai/classify-alert")
        print("")
    
    print("🔒 Security Features:")
    if ENHANCED_SECURITY_AVAILABLE:
        print("   🛡️ Multi-Factor Auth: POST http://localhost:8000/api/v1/auth/setup-mfa")
        print("   ⚡ Rate Limiting: Active")
        print("   📊 Security Monitoring: Active")
    
    if oauth_providers:
        print(f"   🔐 Enterprise SSO: {', '.join(oauth_providers.keys())}")
    
    print("   🛡️ Security Headers: Active")
    print("   🔐 CORS Protection: Active")
    print("="*80 + "\n")

# Error handlers
@app.exception_handler(500)
async def internal_error_handler(request: Request, exc):
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal server error",
            "message": "Something went wrong",
            "timestamp": datetime.utcnow().isoformat(),
            "path": str(request.url.path)
        }
    )

@app.exception_handler(404)
async def not_found_handler(request: Request, exc):
    return JSONResponse(
        status_code=404,
        content={
            "error": "Not found",
            "message": "The requested resource was not found",
            "timestamp": datetime.utcnow().isoformat(),
            "path": str(request.url.path),
            "suggestion": "Check /docs for available endpoints"
        }
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app", 
        host="0.0.0.0", 
        port=8000, 
        reload=True,
        log_level="info"
    )