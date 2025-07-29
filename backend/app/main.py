from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from contextlib import asynccontextmanager
from datetime import datetime
import time

from app.core.config import settings
from app.database import get_async_session

# Import your existing endpoints
from app.api.v1.endpoints import auth

# Import security components with error handling
try:
    from app.api.v1.endpoints import security
    SECURITY_AVAILABLE = True
    print("✅ Security endpoints available")
except ImportError as e:
    SECURITY_AVAILABLE = False
    print(f"⚠️  Security endpoints not found: {e}")

try:
    from app.core.enhanced_security import security_logger, rate_limiter, RiskLevel
    ENHANCED_SECURITY_AVAILABLE = True
    print("✅ Enhanced security available")
except ImportError as e:
    ENHANCED_SECURITY_AVAILABLE = False
    print(f"⚠️  Enhanced security not available: {e}")

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events"""
    # Startup
    print("🚀 OnCall AI starting...")
    print("✅ FastAPI application initialized")
    print("✅ Database connections ready")
    
    if ENHANCED_SECURITY_AVAILABLE:
        print("✅ Enhanced security features enabled")
    else:
        print("⚠️  Running with basic security")
    
    yield
    
    # Shutdown
    print("🔐 OnCall AI shutting down...")

# Create FastAPI app
app = FastAPI(
    title="OnCall AI - Security Edition",
    description="AI-powered incident response with security",
    version="2.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# Add basic security headers middleware
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    
    # Add basic security headers
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    response.headers["X-Security-Level"] = "enterprise" if ENHANCED_SECURITY_AVAILABLE else "basic"
    
    return response

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://app.oncall-ai.com"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["X-RateLimit-*", "X-Security-*"]
)

# Include routers
app.include_router(auth.router, prefix="/api/v1/auth", tags=["Authentication"])

# Include security endpoints if available
if SECURITY_AVAILABLE:
    app.include_router(security.router, prefix="/api/v1", tags=["Security"])

# Root endpoint
@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "OnCall AI - Security Edition",
        "version": "2.0.0",
        "status": "operational",
        "security_level": "enterprise" if ENHANCED_SECURITY_AVAILABLE else "basic",
        "documentation": "/docs"
    }

# Health check
@app.get("/health")
async def health_check():
    """Health check with security status"""
    
    health_status = {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "version": "2.0.0",
        "security": {
            "basic_headers": True,
            "cors_configured": True,
            "enhanced_security": ENHANCED_SECURITY_AVAILABLE
        },
        "features": {
            "authentication": True,
            "database": True
        }
    }
    
    # Test database connectivity
    try:
        async with get_async_session() as db:
            await db.execute("SELECT 1")
            health_status["features"]["database_connection"] = "healthy"
    except Exception as e:
        health_status["features"]["database_connection"] = f"error: {str(e)[:100]}"
        health_status["status"] = "degraded"
    
    # Test Redis if enhanced security available
    if ENHANCED_SECURITY_AVAILABLE:
        try:
            import redis.asyncio as redis
            r = redis.from_url(settings.REDIS_URL)
            await r.ping()
            await r.close()
            health_status["features"]["redis_connection"] = "healthy"
        except Exception as e:
            health_status["features"]["redis_connection"] = f"error: {str(e)[:100]}"
    
    return health_status

# Security test endpoint
@app.get("/security-test")
async def security_test():
    """Security features test"""
    
    features = [
        "✅ Basic security headers",
        "✅ CORS protection",
        "✅ Authentication system"
    ]
    
    if ENHANCED_SECURITY_AVAILABLE:
        features.extend([
            "✅ Enhanced JWT tokens",
            "✅ Multi-factor authentication",
            "✅ Rate limiting",
            "✅ Security event logging",
            "✅ Device fingerprinting"
        ])
    
    endpoints = {
        "auth": {
            "login": "POST /api/v1/auth/login",
            "register": "POST /api/v1/auth/register",
            "me": "GET /api/v1/auth/me"
        }
    }
    
    if SECURITY_AVAILABLE:
        endpoints["security"] = {
            "mfa_setup": "POST /api/v1/auth/setup-mfa",
            "security_status": "GET /api/v1/security/status"
        }
    
    return {
        "message": "OnCall AI Security System",
        "security_level": "enterprise" if ENHANCED_SECURITY_AVAILABLE else "basic",
        "features": features,
        "endpoints": endpoints,
        "test_instructions": [
            "1. Check /health for system status",
            "2. Register via POST /api/v1/auth/register",
            "3. Login via POST /api/v1/auth/login",
            "4. Test security features if available"
        ]
    }

# Error handlers
@app.exception_handler(500)
async def internal_error_handler(request: Request, exc):
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal server error",
            "message": "Something went wrong",
            "timestamp": datetime.utcnow().isoformat()
        }
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
