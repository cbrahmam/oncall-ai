# STEP 5: Backend API Security Dependencies
# Create backend/app/core/security_deps.py

from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, List

from app.core.config import settings
from app.core.security import verify_access_token
from app.database import get_async_session
from app.models.user import User
from app.models.subscription import Subscription

security = HTTPBearer()

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_async_session)
) -> User:
    """Get current authenticated user"""
    token = credentials.credentials
    
    try:
        payload = verify_access_token(token)
        user_id = payload.get("sub")
        
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials"
            )
        
        # Get user from database
        result = await db.execute(
            select(User).where(User.id == user_id, User.is_active == True)
        )
        user = result.scalar_one_or_none()
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found or inactive"
            )
        
        return user
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials"
        )

async def require_subscription(
    allowed_plans: List[str] = ["pro", "enterprise"],
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
) -> User:
    """Require active subscription"""
    
    # Get user's subscription
    result = await db.execute(
        select(Subscription).where(
            Subscription.user_id == current_user.id,
            Subscription.active == True
        )
    )
    subscription = result.scalar_one_or_none()
    
    if not subscription:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail="Active subscription required"
        )
    
    if subscription.plan_type not in allowed_plans:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"This feature requires {'/'.join(allowed_plans)} plan"
        )
    
    return current_user

async def require_mfa_verified(
    request: Request,
    current_user: User = Depends(get_current_user)
) -> User:
    """Require MFA verification for sensitive operations"""
    
    if current_user.mfa_enabled:
        # Check if MFA was verified in this session
        mfa_verified = request.session.get("mfa_verified", False)
        mfa_timestamp = request.session.get("mfa_timestamp", 0)
        
        # MFA verification expires after 1 hour
        if not mfa_verified or (time.time() - mfa_timestamp > 3600):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="MFA verification required"
            )
    
    return current_user

async def rate_limit_endpoint(
    request: Request,
    limit_per_minute: int = 60
):
    """Rate limit specific endpoints"""
    from app.middleware.security import rate_limiter
    
    client_ip = request.client.host
    endpoint = request.url.path
    
    # Create rate limit key
    rate_key = f"endpoint:{endpoint}:{client_ip}"
    
    if not await rate_limiter.allow_request(rate_key, limit_per_minute):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded"
        )

# Usage in endpoints:
@router.get("/protected-data")
async def get_protected_data(
    current_user: User = Depends(get_current_user)
):
    return {"data": "protected"}

@router.get("/pro-feature")
async def get_pro_feature(
    current_user: User = Depends(require_subscription)
):
    return {"feature": "pro"}

@router.post("/sensitive-action")
async def sensitive_action(
    request: Request,
    current_user: User = Depends(require_mfa_verified),
    _: None = Depends(lambda: rate_limit_endpoint(request, 10))  # 10/min
):
    return {"status": "success"}