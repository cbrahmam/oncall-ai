# backend/app/middleware/security.py
"""
Comprehensive security middleware for OffCall AI
Implements rate limiting, security headers, attack detection
"""

import time
import json
from typing import Callable, Dict, Any
from fastapi import FastAPI, Request, Response, HTTPException, status, Depends
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.middleware.cors import CORSMiddleware
from starlette.middleware.trustedhost import TrustedHostMiddleware

from app.core.deps import get_current_user  # Add this import
from app.core.enhanced_security import (
    rate_limiter, 
    security_logger, 
    DeviceFingerprinter,
    RiskLevel
)

class SecurityMiddleware(BaseHTTPMiddleware):
    """Main security middleware"""
    
    def __init__(self, app: FastAPI):
        super().__init__(app)
        self.honeypot_endpoints = {"/admin", "/wp-admin", "/.env", "/config"}
        
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Start timing
        start_time = time.time()
        
        # Security checks
        try:
            # 1. Honeypot detection
            if await self._check_honeypot(request):
                return await self._handle_security_violation(request, "honeypot_access")
            
            # 2. Rate limiting
            rate_limit_result = await self._check_rate_limits(request)
            if not rate_limit_result["allowed"]:
                return await self._handle_rate_limit_exceeded(request, rate_limit_result)
            
            # 3. Attack pattern detection
            if await self._detect_attack_patterns(request):
                return await self._handle_security_violation(request, "attack_pattern")
            
            # 4. Generate device fingerprint
            fingerprint = DeviceFingerprinter.generate_fingerprint(
                request, 
                request.headers.get("user-agent")
            )
            request.state.device_fingerprint = fingerprint
            
            # Process request
            response = await call_next(request)
            
            # 5. Add security headers
            response = await self._add_security_headers(response)
            
            # 6. Log request
            process_time = time.time() - start_time
            await self._log_request(request, response, process_time)
            
            return response
            
        except Exception as e:
            await security_logger.log_security_event(
                "middleware_error",
                ip_address=request.client.host,
                details={"error": str(e)},
                risk_level=RiskLevel.MEDIUM
            )
            raise
    
    async def _check_honeypot(self, request: Request) -> bool:
        """Check if request is accessing honeypot endpoints"""
        path = request.url.path.lower()
        return any(honeypot in path for honeypot in self.honeypot_endpoints)
    
    async def _check_rate_limits(self, request: Request) -> Dict[str, Any]:
        """Check multiple rate limits"""
        user_id = getattr(request.state, "user_id", None)
        return await rate_limiter.check_multiple_limits(request, user_id)
    
    async def _detect_attack_patterns(self, request: Request) -> bool:
        """Detect common attack patterns"""
        
        # SQL injection patterns
        sql_patterns = ["union select", "drop table", "'; drop", "1=1", "or 1=1"]
        
        # XSS patterns  
        xss_patterns = ["<script", "javascript:", "onerror=", "onload="]
        
        # Path traversal patterns
        traversal_patterns = ["../", "..\\", "%2e%2e", "..%2f"]
        
        # Check query parameters
        query_string = str(request.url.query).lower()
        for pattern_list in [sql_patterns, xss_patterns, traversal_patterns]:
            if any(pattern in query_string for pattern in pattern_list):
                return True
        
        # Check request body for POST requests  
        if request.method == "POST":
            try:
                body = await request.body()
                body_str = body.decode('utf-8').lower()
                for pattern_list in [sql_patterns, xss_patterns]:
                    if any(pattern in body_str for pattern in pattern_list):
                        return True
            except:
                pass
        
        return False
    
    async def _add_security_headers(self, response: Response) -> Response:
        """Add comprehensive security headers"""
        headers = {
            # HTTPS and transport security
            "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
            
            # Content security
            "Content-Security-Policy": (
                "default-src 'self'; "
                "script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com; "
                "style-src 'self' 'unsafe-inline'; "
                "img-src 'self' data: https:; "
                "font-src 'self' https://fonts.gstatic.com; "
                "connect-src 'self' https://api.offcall-ai.com wss://api.offcall-ai.com; "
                "frame-ancestors 'none';"
            ),
            
            # XSS protection
            "X-Content-Type-Options": "nosniff",
            "X-Frame-Options": "DENY",
            "X-XSS-Protection": "1; mode=block",
            
            # Privacy
            "Referrer-Policy": "strict-origin-when-cross-origin",
            "Permissions-Policy": (
                "geolocation=(), microphone=(), camera=(), "
                "magnetometer=(), gyroscope=(), speaker=(), "
                "notifications=(self), payment=(), sync-xhr=()"
            ),
            
            # Cache control for sensitive endpoints
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0",
            
            # Custom security headers
            "X-Security-Level": "enterprise",
            "X-OffCall-AI-Version": "2.0.0"
        }
        
        for header, value in headers.items():
            response.headers[header] = value
        
        return response
    
    async def _handle_rate_limit_exceeded(self, request: Request, 
                                        rate_limit_result: Dict) -> JSONResponse:
        """Handle rate limit exceeded"""
        
        await security_logger.log_security_event(
            "rate_limit_exceeded",
            ip_address=request.client.host,
            details=rate_limit_result,
            risk_level=RiskLevel.MEDIUM
        )
        
        return JSONResponse(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            content={
                "error": "Rate limit exceeded",
                "limit_type": rate_limit_result.get("limit_type", "unknown"),
                "retry_after": rate_limit_result.get("retry_after", 60),
                "message": "Too many requests. Please try again later."
            },
            headers={
                "Retry-After": str(rate_limit_result.get("retry_after", 60)),
                "X-RateLimit-Limit": str(rate_limit_result.get("limit", 100)),
                "X-RateLimit-Remaining": "0",
                "X-RateLimit-Reset": str(rate_limit_result.get("reset_time", time.time() + 60))
            }
        )
    
    async def _handle_security_violation(self, request: Request, 
                                       violation_type: str) -> JSONResponse:
        """Handle security violations"""
        
        await security_logger.log_security_event(
            f"security_violation_{violation_type}",
            ip_address=request.client.host,
            details={
                "path": request.url.path,
                "method": request.method,
                "user_agent": request.headers.get("user-agent"),
                "violation_type": violation_type
            },
            risk_level=RiskLevel.HIGH
        )
        
        # Return generic error to avoid information disclosure
        return JSONResponse(
            status_code=status.HTTP_403_FORBIDDEN,
            content={
                "error": "Access denied",
                "message": "Your request has been blocked for security reasons."
            }
        )
    
    async def _log_request(self, request: Request, response: Response, 
                          process_time: float):
        """Log request for monitoring"""
        
        # Only log interesting requests (errors, slow requests, authenticated requests)
        should_log = (
            response.status_code >= 400 or 
            process_time > 1.0 or 
            hasattr(request.state, "user_id")
        )
        
        if should_log:
            log_data = {
                "timestamp": time.time(),
                "method": request.method,
                "path": request.url.path,
                "status_code": response.status_code,
                "process_time": process_time,
                "ip_address": request.client.host,
                "user_agent": request.headers.get("user-agent", ""),
                "user_id": getattr(request.state, "user_id", None)
            }
            
            # Log to security system (async)
            risk_level = RiskLevel.HIGH if response.status_code >= 500 else RiskLevel.LOW
            await security_logger.log_security_event(
                "request_processed",
                user_id=log_data.get("user_id"),
                ip_address=log_data["ip_address"],
                details=log_data,
                risk_level=risk_level
            )

# Enhanced Auth Endpoints with MFA
# backend/app/api/v1/endpoints/secure_auth.py

from fastapi import FastAPI, Request, Response, HTTPException, status, Depends
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.middleware.cors import CORSMiddleware
from starlette.middleware.trustedhost import TrustedHostMiddleware

from app.core.deps import get_current_user  # Add this import
from app.core.enhanced_security import (
    token_manager,
    mfa_manager, 
    security_logger,
    RiskLevel
)
from app.core.gdpr_compliance import gdpr_manager
from app.models.user import User

router = APIRouter()
security = HTTPBearer()

class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    remember_me: bool = False
    mfa_code: str = None

class MFASetupRequest(BaseModel):
    code: str

class MFAVerifyRequest(BaseModel):
    code: str
    backup_code: str = None

class ConsentUpdateRequest(BaseModel):
    analytics_consent: bool = False
    marketing_consent: bool = False
    third_party_sharing: bool = False

@router.post("/login-enhanced")
async def enhanced_login(
    request: Request,
    login_data: LoginRequest,
    db: AsyncSession = Depends(get_async_session)
):
    """Enhanced login with MFA, device fingerprinting, and security monitoring"""
    
    client_ip = request.client.host
    user_agent = request.headers.get("user-agent", "")
    device_fingerprint = request.state.device_fingerprint
    
    try:
        # 1. Basic authentication
        user = await authenticate_user(login_data.email, login_data.password, db)
        if not user:
            await security_logger.log_security_event(
                "login_failed",
                ip_address=client_ip,
                details={"email": login_data.email, "reason": "invalid_credentials"},
                risk_level=RiskLevel.MEDIUM
            )
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials"
            )
        
        # 2. Check if account is locked
        if await is_account_locked(user.id):
            await security_logger.log_security_event(
                "login_blocked_locked_account",
                user_id=user.id,
                ip_address=client_ip,
                risk_level=RiskLevel.HIGH
            )
            raise HTTPException(
                status_code=status.HTTP_423_LOCKED,
                detail="Account temporarily locked due to security concerns"
            )
        
        # 3. Check if MFA is enabled
        mfa_enabled = await is_mfa_enabled(user.id)
        
        if mfa_enabled and not login_data.mfa_code:
            # Return MFA challenge
            return {
                "mfa_required": True,
                "message": "Multi-factor authentication required",
                "methods": ["totp", "backup_code"]
            }
        
        # 4. Verify MFA if provided
        if mfa_enabled and login_data.mfa_code:
            mfa_valid = await mfa_manager.verify_totp_code(user.id, login_data.mfa_code)
            if not mfa_valid:
                await security_logger.log_security_event(
                    "mfa_failed",
                    user_id=user.id,
                    ip_address=client_ip,
                    details={"mfa_method": "totp"},
                    risk_level=RiskLevel.HIGH
                )
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid MFA code"
                )
        
        # 5. Check for suspicious login patterns
        risk_assessment = await assess_login_risk(user.id, client_ip, device_fingerprint, db)
        
        if risk_assessment["risk_level"] == "high":
            # Require additional verification for high-risk logins
            await security_logger.log_security_event(
                "high_risk_login_detected",
                user_id=user.id,
                ip_address=client_ip,
                details=risk_assessment,
                risk_level=RiskLevel.HIGH
            )
            
            # Could require email verification, additional MFA, etc.
            # For now, we'll allow but log extensively
        
        # 6. Create secure token pair
        session_data = {
            "ip_address": client_ip,
            "user_agent": user_agent,
            "login_timestamp": time.time(),
            "risk_score": risk_assessment["risk_score"]
        }
        
        tokens = await token_manager.create_token_pair(
            user.id, 
            device_fingerprint,
            session_data
        )
        
        # 7. Update user login timestamp
        user.last_login = datetime.utcnow()
        await db.commit()
        
        # 8. Log successful login
        await security_logger.log_security_event(
            "login_successful",
            user_id=user.id,
            ip_address=client_ip,
            details={
                "device_fingerprint": device_fingerprint,
                "mfa_used": mfa_enabled,
                "risk_score": risk_assessment["risk_score"]
            },
            risk_level=RiskLevel.LOW
        )
        
        return {
            "access_token": tokens["access_token"],
            "refresh_token": tokens["refresh_token"],
            "token_type": "bearer",
            "expires_in": tokens["expires_in"],
            "user": {
                "id": user.id,
                "email": user.email,
                "full_name": user.full_name,
                "role": user.role,
                "mfa_enabled": mfa_enabled
            },
            "security_info": {
                "last_login": user.last_login.isoformat() if user.last_login else None,
                "device_trusted": risk_assessment["device_known"],
                "session_expires": (datetime.utcnow() + timedelta(minutes=15)).isoformat()
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        await security_logger.log_security_event(
            "login_error",
            ip_address=client_ip,
            details={"error": str(e), "email": login_data.email},
            risk_level=RiskLevel.CRITICAL
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Authentication service temporarily unavailable"
        )

@router.post("/setup-mfa")
async def setup_mfa(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    """Initialize MFA setup for user"""
    
    try:
        # Generate TOTP secret and QR code
        mfa_setup = await mfa_manager.generate_totp_secret(current_user.id)
        
        await security_logger.log_security_event(
            "mfa_setup_initiated",
            user_id=current_user.id,
            ip_address=request.client.host,
            risk_level=RiskLevel.LOW
        )
        
        return {
            "secret": mfa_setup["secret"],
            "qr_code": mfa_setup["qr_code"],
            "instructions": [
                "1. Install Google Authenticator or similar TOTP app",
                "2. Scan the QR code or enter the secret key manually",
                "3. Enter the 6-digit code from your app to verify setup"
            ]
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="MFA setup failed"
        )

@router.post("/verify-mfa-setup")
async def verify_mfa_setup(
    request: Request,
    setup_data: MFASetupRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    """Verify and complete MFA setup"""
    
    try:
        # Verify TOTP code
        setup_valid = await mfa_manager.verify_totp_setup(current_user.id, setup_data.code)
        
        if not setup_valid:
            await security_logger.log_security_event(
                "mfa_setup_failed",
                user_id=current_user.id,
                ip_address=request.client.host,
                details={"reason": "invalid_code"},
                risk_level=RiskLevel.MEDIUM
            )
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid verification code"
            )
        
        # Generate backup codes
        backup_codes = await mfa_manager.generate_backup_codes(current_user.id)
        
        # Update user MFA status
        current_user.mfa_enabled = True
        await db.commit()
        
        await security_logger.log_security_event(
            "mfa_setup_completed",
            user_id=current_user.id,
            ip_address=request.client.host,
            risk_level=RiskLevel.LOW
        )
        
        return {
            "message": "MFA setup completed successfully",
            "backup_codes": backup_codes,
            "warning": "Store these backup codes securely. They can only be used once each."
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="MFA verification failed"
        )

@router.post("/refresh-token")
async def refresh_token(
    request: Request,
    refresh_data: dict,
    db: AsyncSession = Depends(get_async_session)
):
    """Refresh access token with security validation"""
    
    try:
        refresh_token = refresh_data.get("refresh_token")
        if not refresh_token:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Refresh token required"
            )
        
        device_fingerprint = request.state.device_fingerprint
        
        # Refresh token pair with security checks
        new_tokens = await token_manager.refresh_token_pair(
            refresh_token,
            device_fingerprint
        )
        
        return new_tokens
        
    except HTTPException:
        raise
    except Exception as e:
        await security_logger.log_security_event(
            "token_refresh_failed",
            ip_address=request.client.host,
            details={"error": str(e)},
            risk_level=RiskLevel.MEDIUM
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token refresh failed"
        )

# GDPR Compliance Endpoints
@router.get("/privacy/data-export")
async def export_user_data(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    """Export all user data (GDPR Article 20)"""
    
    try:
        export_data = await gdpr_manager.process_data_portability_request(
            current_user.id, db
        )
        
        await security_logger.log_security_event(
            "data_export_requested",
            user_id=current_user.id,
            ip_address=request.client.host,
            risk_level=RiskLevel.LOW
        )
        
        return export_data
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Data export failed"
        )

@router.delete("/privacy/delete-account")
async def delete_user_account(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    """Delete user account and all data (GDPR Article 17)"""
    
    try:
        deletion_report = await gdpr_manager.process_data_deletion_request(
            current_user.id, db
        )
        
        await security_logger.log_security_event(
            "account_deletion_requested",
            user_id=current_user.id,
            ip_address=request.client.host,
            details=deletion_report,
            risk_level=RiskLevel.MEDIUM
        )
        
        return {
            "message": "Account deletion completed",
            "deletion_report": deletion_report
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Account deletion failed"
        )

@router.post("/privacy/consent")
async def update_consent(
    request: Request,
    consent_data: ConsentUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    """Update user consent preferences"""
    
    try:
        from app.core.gdpr_compliance import ProcessingPurpose
        
        # Update consent for different purposes
        consent_results = {}
        
        if consent_data.analytics_consent is not None:
            result = await gdpr_manager.manage_user_consent(
                current_user.id,
                ProcessingPurpose.ANALYTICS,
                consent_data.analytics_consent,
                db
            )
            consent_results["analytics"] = result
        
        if consent_data.marketing_consent is not None:
            result = await gdpr_manager.manage_user_consent(
                current_user.id,
                ProcessingPurpose.COMMUNICATION,
                consent_data.marketing_consent,
                db
            )
            consent_results["marketing"] = result
        
        await security_logger.log_security_event(
            "consent_updated",
            user_id=current_user.id,
            ip_address=request.client.host,
            details=consent_results,
            risk_level=RiskLevel.LOW
        )
        
        return {
            "message": "Consent preferences updated",
            "consent_records": consent_results
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Consent update failed"
        )

@router.get("/privacy/report")
async def get_privacy_report(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    """Get comprehensive privacy report"""
    
    try:
        privacy_report = await gdpr_manager.generate_privacy_report(
            current_user.id, db
        )
        
        return privacy_report
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Privacy report generation failed"
        )

# Security Monitoring Endpoints
@router.get("/security/sessions")
async def get_active_sessions(
    current_user: User = Depends(get_current_user)
):
    """Get user's active sessions"""
    
    try:
        # Get active sessions from Redis
        from app.database import get_redis
        redis = get_redis()
        
        session_keys = await redis.keys(f"session:{current_user.id}:*")
        sessions = []
        
        for key in session_keys:
            session_data = await redis.get(key)
            if session_data:
                session_info = json.loads(session_data)
                sessions.append({
                    "session_id": key.decode().split(":")[-1],
                    "created_at": session_info.get("created_at"),
                    "last_activity": session_info.get("last_activity"),
                    "ip_address": session_info.get("ip_address"),
                    "user_agent": session_info.get("user_agent", "")[:100],  # Truncate
                    "current_session": key.decode().endswith(current_user.current_session_id)
                })
        
        return {"sessions": sessions}
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve sessions"
        )

@router.delete("/security/sessions/{session_id}")
async def revoke_session(
    session_id: str,
    current_user: User = Depends(get_current_user)
):
    """Revoke a specific session"""
    
    try:
        from app.database import get_redis
        redis = get_redis()
        
        # Revoke session
        session_key = f"session:{current_user.id}:{session_id}"
        await redis.delete(session_key)
        
        await security_logger.log_security_event(
            "session_revoked",
            user_id=current_user.id,
            details={"revoked_session_id": session_id},
            risk_level=RiskLevel.LOW
        )
        
        return {"message": "Session revoked successfully"}
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Session revocation failed"
        )

# Helper functions
async def authenticate_user(email: str, password: str, db: AsyncSession) -> Optional[User]:
    """Authenticate user with email and password"""
    from app.core.security import verify_password
    from sqlalchemy import select
    
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    
    if user and verify_password(password, user.hashed_password):
        return user
    return None

async def is_account_locked(user_id: str) -> bool:
    """Check if account is temporarily locked"""
    from app.database import get_redis
    redis = get_redis()
    
    lock_key = f"account_lock:{user_id}"
    return await redis.exists(lock_key)

async def is_mfa_enabled(user_id: str) -> bool:
    """Check if MFA is enabled for user"""
    from app.database import get_redis
    redis = get_redis()
    
    mfa_key = f"mfa_secret:{user_id}"
    return await redis.exists(mfa_key)

async def assess_login_risk(user_id: str, ip_address: str, 
                           device_fingerprint: str, db: AsyncSession) -> Dict[str, Any]:
    """Assess risk level of login attempt"""
    
    risk_score = 0
    risk_factors = []
    
    # Check for new device
    from app.database import get_redis
    redis = get_redis()
    
    known_devices_key = f"known_devices:{user_id}"
    known_devices = await redis.smembers(known_devices_key)
    device_known = device_fingerprint.encode() in known_devices
    
    if not device_known:
        risk_score += 30
        risk_factors.append("new_device")
        # Add device to known devices
        await redis.sadd(known_devices_key, device_fingerprint)
        await redis.expire(known_devices_key, 86400 * 365)  # 1 year
    
    # Check for new IP
    known_ips_key = f"known_ips:{user_id}"
    known_ips = await redis.smembers(known_ips_key)
    ip_known = ip_address.encode() in known_ips
    
    if not ip_known:
        risk_score += 20
        risk_factors.append("new_ip")
        # Add IP to known IPs
        await redis.sadd(known_ips_key, ip_address)
        await redis.expire(known_ips_key, 86400 * 90)  # 90 days
    
    # Check time-based patterns (unusual login times)
    current_hour = datetime.utcnow().hour
    if current_hour < 6 or current_hour > 22:  # Outside normal business hours
        risk_score += 10
        risk_factors.append("unusual_time")
    
    # Determine risk level
    if risk_score >= 50:
        risk_level = "high"
    elif risk_score >= 25:
        risk_level = "medium"
    else:
        risk_level = "low"
    
    return {
        "risk_score": risk_score,
        "risk_level": risk_level,
        "risk_factors": risk_factors,
        "device_known": device_known,
        "ip_known": ip_known
    }

def setup_security_middleware(app: FastAPI):
    """Setup all security middleware"""
    
    # 1. Trusted host middleware (prevent host header attacks)
    app.add_middleware(
        TrustedHostMiddleware,
        allowed_hosts=["localhost", "127.0.0.1", "*.offcall-ai.com"]
    )
    
    # 2. CORS middleware with strict settings
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["https://app.offcall-ai.com", "http://localhost:3000"],
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH"],
        allow_headers=["*"],
        expose_headers=["X-RateLimit-*", "X-Security-*"]
    )
    
    # 3. Custom security middleware
    app.add_middleware(SecurityMiddleware)
    
    return app