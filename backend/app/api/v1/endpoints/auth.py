# backend/app/api/v1/endpoints/auth.py - FIXED VERSION
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, timedelta  # ← FIXED: Added datetime import
import secrets
import uuid
import re

from app.database import get_async_session as get_db
from app.schemas.auth import UserCreate, UserLogin, UserResponse, RefreshTokenRequest
from app.models.user import User
from app.models.organization import Organization
from app.core.security import get_password_hash, verify_password, create_access_token, get_current_user
from app.core.config import settings

router = APIRouter()

# In-memory refresh token store (in production, use Redis or database)
REFRESH_TOKENS = {}

def create_refresh_token(user_id: str) -> str:
    """Create a secure refresh token"""
    refresh_token = secrets.token_urlsafe(64)
    # Store with expiration (30 days)
    REFRESH_TOKENS[refresh_token] = {
        "user_id": user_id,
        "expires_at": (datetime.utcnow() + timedelta(days=30)).timestamp()
    }
    return refresh_token

def verify_refresh_token(refresh_token: str) -> str:
    """Verify refresh token and return user_id"""
    token_data = REFRESH_TOKENS.get(refresh_token)
    if not token_data:
        return None
    
    # Check expiration
    if datetime.utcnow().timestamp() > token_data["expires_at"]:
        # Remove expired token
        del REFRESH_TOKENS[refresh_token]
        return None
    
    return token_data["user_id"]

def revoke_refresh_token(refresh_token: str):
    """Revoke a refresh token"""
    if refresh_token in REFRESH_TOKENS:
        del REFRESH_TOKENS[refresh_token]

@router.get("/test")
async def test_auth():
    """Test endpoint to verify auth router is working"""
    return {
        "message": "Auth endpoints are working!",
        "status": "ok",
        "timestamp": datetime.utcnow().isoformat(),  # ← FIXED: Now datetime is imported
        "features": [
            "User registration",
            "User login", 
            "Automatic token refresh",
            "Secure logout",
            "JWT authentication"
        ]
    }

@router.post("/register", response_model=UserResponse)
async def register(user_data: UserCreate, db: AsyncSession = Depends(get_db)):
    """Register a new user with automatic token refresh"""
    try:
        # Check if user already exists
        existing_user = await db.execute(
            select(User).where(User.email == user_data.email)
        )
        if existing_user.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        
        # Create organization
        organization = Organization(
            name=user_data.organization_name,
            slug=re.sub(r'[^a-zA-Z0-9]', '-', user_data.organization_name).lower()[:50],
            plan="free"
        )
        db.add(organization)
        await db.flush()  # Get the ID
        
        # Create user
        user = User(
            email=user_data.email,
            password_hash=get_password_hash(user_data.password),
            full_name=user_data.full_name,
            organization_id=organization.id,
            role="admin",
            is_verified=True
        )
        db.add(user)
        
        await db.commit()
        await db.refresh(organization)
        await db.refresh(user)
        
        # Create tokens
        access_token = create_access_token(
            data={"sub": str(user.id), "org_id": str(organization.id)}
        )
        refresh_token = create_refresh_token(str(user.id))
        
        return {
            "message": "User registered successfully",
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            "user": {
                "id": str(user.id),
                "email": user.email,
                "full_name": user.full_name,
                "role": user.role,
                "organization_id": str(organization.id),
                "organization_name": organization.name
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Registration failed: {str(e)}"
        )

@router.post("/login", response_model=UserResponse)
async def login(login_data: UserLogin, db: AsyncSession = Depends(get_db)):
    """Login user with automatic token refresh"""
    try:
        # Get user
        result = await db.execute(
            select(User).where(
                User.email == login_data.email,
                User.is_active == True
            )
        )
        user = result.scalar_one_or_none()
        
        if not user or not verify_password(login_data.password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password"
            )
        
        # Create tokens
        access_token = create_access_token(
            data={"sub": str(user.id), "org_id": str(user.organization_id)}
        )
        refresh_token = create_refresh_token(str(user.id))
        
        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            "user": {
                "id": str(user.id),
                "email": user.email,
                "full_name": user.full_name,
                "role": user.role,
                "organization_id": str(user.organization_id)
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Login failed: {str(e)}"
        )

@router.post("/refresh")
async def refresh_token(
    refresh_data: RefreshTokenRequest, 
    db: AsyncSession = Depends(get_db)
):
    """Refresh access token using refresh token"""
    try:
        # Verify refresh token
        user_id = verify_refresh_token(refresh_data.refresh_token)
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired refresh token"
            )
        
        # Get user
        result = await db.execute(
            select(User).where(User.id == user_id, User.is_active == True)
        )
        user = result.scalar_one_or_none()
        
        if not user:
            # Revoke the refresh token since user doesn't exist
            revoke_refresh_token(refresh_data.refresh_token)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found"
            )
        
        # Create new access token
        new_access_token = create_access_token(
            data={"sub": str(user.id), "org_id": str(user.organization_id)}
        )
        
        # Optionally create new refresh token (token rotation for security)
        new_refresh_token = create_refresh_token(str(user.id))
        # Revoke old refresh token
        revoke_refresh_token(refresh_data.refresh_token)
        
        return {
            "access_token": new_access_token,
            "refresh_token": new_refresh_token,
            "token_type": "bearer",
            "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Token refresh failed: {str(e)}"
        )

@router.post("/logout")
async def logout(
    refresh_data: RefreshTokenRequest,
    current_user: User = Depends(get_current_user)
):
    """Logout user and revoke refresh token"""
    try:
        # Revoke refresh token
        revoke_refresh_token(refresh_data.refresh_token)
        
        return {"message": "Logged out successfully"}
        
    except Exception as e:
        # Even if refresh token revocation fails, consider logout successful
        return {"message": "Logged out successfully"}

@router.get("/me", response_model=dict)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    """Get current user information"""
    return {
        "id": str(current_user.id),
        "email": current_user.email,
        "full_name": current_user.full_name,
        "role": current_user.role,
        "organization_id": str(current_user.organization_id),
        "is_verified": current_user.is_verified,
        "created_at": current_user.created_at.isoformat()
    }