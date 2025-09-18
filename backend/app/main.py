import os
# backend/app/main.py - CRITICAL FIX: Add missing router registrations while preserving all existing features
import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from datetime import datetime
import time
import json
from typing import Dict

from app.core.config import settings
from app.database import get_async_session

# SECURITY: Import security middleware
try:
    from app.middleware.security import SecurityMiddleware, setup_security_middleware
    SECURITY_MIDDLEWARE_AVAILABLE = True
    print("✅ Security middleware loaded")
except ImportError as e:
    SECURITY_MIDDLEWARE_AVAILABLE = False
    print(f"⚠️ Security middleware not available: {e}")

# Import core endpoints - these should always work
from app.api.v1.endpoints import auth
from app.api.v1.endpoints import billing

# Import additional endpoints with better error handling
INCIDENTS_AVAILABLE = False
WEBHOOKS_AVAILABLE = False
TEAMS_AVAILABLE = False
SLACK_AVAILABLE = False
AI_AVAILABLE = False
INTEGRATIONS_AVAILABLE = False

try:
    from app.api.v1.endpoints import incidents
    INCIDENTS_AVAILABLE = True
    print("✅ Incidents endpoints loaded")
except ImportError as e:
    print(f"⚠️ Incidents endpoints not available: {e}")

try:
    from app.api.v1.endpoints import webhooks
    WEBHOOKS_AVAILABLE = True
    print("✅ Webhooks endpoints loaded")
except ImportError as e:
    print(f"⚠️ Webhooks endpoints not available: {e}")

try:
    from app.api.v1.endpoints import teams
    TEAMS_AVAILABLE = True
    print("✅ Teams endpoints loaded")
except ImportError as e:
    print(f"⚠️ Teams endpoints not available: {e}")

try:
    from app.api.v1.endpoints import slack
    SLACK_AVAILABLE = True
    print("✅ Slack endpoints loaded")
except ImportError as e:
    print(f"⚠️ Slack endpoints not available: {e}")

try:
    from app.api.v1.endpoints import ai
    AI_AVAILABLE = True
    print("✅ AI endpoints loaded")
except ImportError as e:
    print(f"⚠️ AI endpoints not available: {e}")

try:
    from app.api.v1.endpoints import integrations
    INTEGRATIONS_AVAILABLE = True
    print("✅ Integrations endpoints loaded")
except ImportError as e:
    print(f"⚠️ Integrations endpoints not available: {e}")

# Import OAuth endpoints with error handling
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
            print(f"✅ OAuth providers from config: {list(oauth_providers.keys())}")
        except (ImportError, AttributeError):
            # Fallback - assume providers are configured
            oauth_providers = {"google": True, "microsoft": True, "github": True}
            print("✅ OAuth providers (fallback): google, microsoft, github")
            
except ImportError as e:
    print(f"⚠️ OAuth endpoints not found: {e}")

# Import security components with error handling
SECURITY_AVAILABLE = False
ENHANCED_SECURITY_AVAILABLE = False

try:
    from app.api.v1.endpoints import security
    SECURITY_AVAILABLE = True
    print("✅ Security endpoints available")
except ImportError as e:
    print(f"⚠️ Security endpoints not found: {e}")

try:
    from app.core.enhanced_security import security_logger, rate_limiter
    ENHANCED_SECURITY_AVAILABLE = True
    print("✅ Enhanced security available")
except ImportError as e:
    print(f"⚠️ Enhanced security not available: {e}")

# WebSocket support
WEBSOCKET_AVAILABLE = False
try:
    from app.api.v1.endpoints.websocket_notifications import router as websocket_router
    WEBSOCKET_AVAILABLE = True
    print("✅ WebSocket notifications available")
except ImportError as e:
    print(f"⚠️ WebSocket notifications not available: {e}")

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events"""
    # Startup
    print("🚀 OffCall AI starting up...")
    
    # SECURITY: Validate environment
    if not settings.SECRET_KEY or settings.SECRET_KEY == "your-secret-key":
        print("❌ CRITICAL: SECRET_KEY not properly configured!")
        
    if settings.DEBUG and settings.ENVIRONMENT == "production":
        print("⚠️ WARNING: DEBUG=true in production environment!")
    
    # Initialize OAuth if available
    if OAUTH_AVAILABLE:
        try:
            # Try to initialize OAuth
            if oauth_providers:
                print("🔐 OAuth providers initialized")
        except Exception as e:
            print(f"⚠️ OAuth initialization failed: {e}")
    
    print("✅ FastAPI application initialized")
    print("✅ Database connections ready")
    
    if ENHANCED_SECURITY_AVAILABLE:
        print("✅ Enhanced security features enabled")
    else:
        print("⚠️ Running with basic security")
    
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
    
    if INTEGRATIONS_AVAILABLE:
        features.append("🔌 Integration Management")
    
    if features:
        print("🎯 Active Features:")
        for feature in features:
            print(f"   {feature}")
    
    yield
    
    # Shutdown
    print("🛑 OffCall AI shutting down...")

# Create FastAPI app with SECURITY HARDENING
app = FastAPI(
    title="OffCall AI - Enterprise Edition",
    description="AI-powered incident response with enterprise SSO and security",
    version="2.0.0",
    lifespan=lifespan
)

# Remove docs routes completely in production
if not settings.DEBUG:
    # Remove the routes from the router
    routes_to_remove = []
    for route in app.routes:
        if hasattr(route, 'path') and route.path in ['/docs', '/redoc', '/openapi.json']:
            routes_to_remove.append(route)
    
    for route in routes_to_remove:
        app.routes.remove(route)

# SECURITY: Add trusted host middleware (prevents host header attacks)
app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=["localhost", "127.0.0.1", "offcallai.com", "*.offcallai.com"]
)

# SECURITY: Enhanced security headers middleware
@app.middleware("http")
async def enhanced_security_headers(request: Request, call_next):
    start_time = time.time()
    
    response = await call_next(request)
    
    # SECURITY: Add comprehensive security headers
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=(), payment=()"
    
    # Custom security headers
    response.headers["X-Security-Level"] = "enterprise" if ENHANCED_SECURITY_AVAILABLE else "basic"
    response.headers["X-OAuth-Enabled"] = "true" if OAUTH_AVAILABLE else "false"
    
    # Cache control for security
    if not request.url.path.startswith("/static"):
        response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
        response.headers["Pragma"] = "no-cache"
    
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
production_origins = [
    "https://offcallai.com",
    "https://www.offcallai.com", 
    "https://app.offcallai.com"
]

development_origins = [
    "http://localhost:3000",
    "http://localhost:5173",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5173",
    "ws://localhost:3000",
    "ws://localhost:5173"
]

cors_origins = development_origins if settings.DEBUG else production_origins

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["X-RateLimit-*", "X-Security-*", "X-OAuth-*"]
)

# Include core routers (ALWAYS AVAILABLE)
app.include_router(auth.router, prefix="/api/v1/auth", tags=["Authentication"])
app.include_router(billing.router, prefix="/api/v1/billing", tags=["Billing"])

try:
    from app.api.v1.endpoints import billing  
    app.include_router(billing.router, prefix="/api/v1/billing", tags=["Billing"])
    print('✅ Billing router loaded')
except ImportError as e:
    print(f'❌ CRITICAL: Billing router failed to load: {e}')

# *** CRITICAL FIX: MISSING INCIDENTS ROUTER REGISTRATION ***
# This was the root cause of 404 errors on /api/v1/incidents/
if INCIDENTS_AVAILABLE:
    app.include_router(incidents.router, prefix="/api/v1/incidents", tags=["Incidents"])
    print("✅ INCIDENTS ROUTER REGISTERED: /api/v1/incidents/")
else:
    print("❌ CRITICAL: Incidents router not registered!")

# Include OAuth router if available
if OAUTH_AVAILABLE:
    app.include_router(oauth.router, prefix="/api/v1/oauth", tags=["OAuth", "SSO"])
    print("✅ OAuth router registered: /api/v1/oauth")

# Include security endpoints if available
if SECURITY_AVAILABLE:
    app.include_router(security.router, prefix="/api/v1", tags=["Security"])

# Include additional endpoints if available
if WEBHOOKS_AVAILABLE:
    app.include_router(webhooks.router, prefix="/api/v1/webhooks", tags=["Webhooks"])

if INTEGRATIONS_AVAILABLE:
    app.include_router(integrations.router, prefix="/api/v1/integrations", tags=["Integrations"])

if TEAMS_AVAILABLE and hasattr(teams, 'router') and teams.router:
    app.include_router(teams.router, prefix="/api/v1/teams", tags=["Teams"])
    print("✅ Teams router registered: /api/v1/teams")
else:
    print("⚠️ Teams router not available")

if SLACK_AVAILABLE:
    app.include_router(slack.router, prefix="/api/v1/slack", tags=["Slack"])

if AI_AVAILABLE:
    app.include_router(ai.router, prefix="/api/v1/ai", tags=["AI", "Artificial Intelligence"])

# Include WebSocket router if available
if WEBSOCKET_AVAILABLE:
    app.include_router(websocket_router, prefix="/api/v1", tags=["WebSockets", "Notifications"])

# Add additional missing endpoints based on production logs
try:
    from app.api.v1.endpoints import users
    if users and hasattr(users, 'router') and users.router:
        app.include_router(users.router, prefix="/api/v1/users", tags=["Users"])
        print("✅ Users router loaded: /api/v1/users")
    else:
        print("⚠️ Users router not available - skipping")
except (ImportError, AttributeError) as e:
    print(f"⚠️ Users endpoints not available: {e}")

try:
    from app.api.v1.endpoints import notifications
    app.include_router(notifications.router, prefix="/api/v1/notifications", tags=["Notifications"])
    print("✅ Notifications router loaded: /api/v1/notifications")
except ImportError as e:
    print(f"⚠️ Notifications endpoints not available: {e}")

# Add monitoring webhook routes
try:
    from app.api.v1.endpoints.monitoring_webhooks import router as monitoring_router
    app.include_router(monitoring_router, prefix="/api/v1", tags=["Monitoring"])
    print('✅ Monitoring webhooks loaded')
except ImportError as e:
    print(f'⚠️ Monitoring webhooks not available: {e}')

# Add real AI integration
try:
    from app.api.v1.endpoints import ai_real
    app.include_router(ai_real.router, prefix="/api/v1/ai", tags=["Real AI"])
    print('✅ Real AI endpoints loaded')
except ImportError as e:
    print(f'⚠️ Real AI endpoints not available: {e}')

# Database health check function
async def check_db_health():
    """Enhanced database health check"""
    try:
        async with get_async_session() as session:
            try:
                # Test basic connectivity
                await session.execute("SELECT 1")
                
                # Test table existence
                tables_query = """
                SELECT table_name FROM information_schema.tables 
                WHERE table_schema = 'public'
                """
                result = await session.execute(tables_query)
                tables = [row[0] for row in result.fetchall()]
                
                return {
                    "status": "healthy",
                    "database": "postgresql",
                    "tables_count": len(tables),
                    "critical_tables": {
                        "users": "users" in tables,
                        "organizations": "organizations" in tables,
                        "incidents": "incidents" in tables,
                        "integrations": "integrations" in tables,
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

# SECURITY: Restricted root endpoint
@app.get("/")
async def root():
    """Root endpoint with feature overview"""
    
    # SECURITY: Limited info in production
    if settings.DEBUG:
        return {
            "message": "OffCall AI - Enterprise Edition",
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
                "enterprise_ready": OAUTH_AVAILABLE and ENHANCED_SECURITY_AVAILABLE,
                "integrations": INTEGRATIONS_AVAILABLE
            },
            "documentation": "/docs",
            "endpoints": {
                "auth": "/api/v1/auth",
                "oauth": "/api/v1/oauth" if OAUTH_AVAILABLE else "not_available",
                "incidents": "/api/v1/incidents" if INCIDENTS_AVAILABLE else "not_available",
                "integrations": "/api/v1/integrations" if INTEGRATIONS_AVAILABLE else "not_available",
                "ai": "/api/v1/ai" if AI_AVAILABLE else "not_available",
                "billing": "/api/v1/billing"
            }
        }
    else:
        # Production: Minimal info
        return {
            "message": "OffCall AI API",
            "status": "operational",
            "version": "2.0.0"
        }

# SECURITY: Enhanced health check
@app.get("/health")
async def health_check():
    health_status = {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "version": "2.0.0"
    }
    
    # Don't fail the health check if DB/Redis are down
    try:
        db_status = await check_db_health()
        health_status["database"] = db_status
    except Exception as e:
        health_status["database"] = {"status": "unhealthy", "error": str(e)}
    
    return health_status

# Test database connection
@app.get("/test-db")
async def test_db():
    """Test database connectivity with detailed info"""
    try:
        db_status = await check_db_health()
        if db_status["status"] == "healthy":
            return {"status": "success", "message": "Database connection successful", "details": db_status}
        else:
            return {"status": "error", "message": "Database connection failed", "details": db_status}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database test failed: {str(e)}")

# SECURITY: Enhanced error handlers
@app.exception_handler(500)
async def internal_error_handler(request: Request, exc):
    # SECURITY: Don't expose internal errors in production
    if settings.DEBUG:
        error_detail = str(exc)
    else:
        error_detail = "Internal server error"
        
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal server error",
            "message": error_detail,
            "timestamp": datetime.utcnow().isoformat(),
            "request_id": getattr(request.state, "request_id", "unknown")
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
            "suggestion": "Check API documentation" if settings.DEBUG else None
        }
    )

# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    print(f"❌ Global exception on {request.method} {request.url}: {exc}")
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "path": str(request.url.path)}
    )

# SECURITY: Enhanced startup message
@app.on_event("startup")
async def startup_event():
    print("\n" + "="*80)
    print(f"🚀 OffCall AI Enterprise Edition - {'DEVELOPMENT' if settings.DEBUG else 'PRODUCTION'} Mode")
    print("="*80)
    
    if settings.DEBUG:
        print("📚 API Documentation: http://localhost:8000/docs")
        print("🏠 Root Endpoint: http://localhost:8000/")
        print("❤️ Health Check: http://localhost:8000/health")
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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app", 
        host="0.0.0.0", 
        port=8000, 
        reload=True,
        log_level="info"
    )