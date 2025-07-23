from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import timedelta

from app.database import get_db
from app.schemas.auth import UserRegister, UserLogin, UserResponse
from app.models.user import User
from app.models.organization import Organization
from app.core.security import create_access_token, get_password_hash, verify_password
from app.core.config import settings
import uuid
import re

router = APIRouter()

@router.get("/test")
async def test_auth():
    """Test endpoint to verify auth router is working"""
    return {
        "message": "Auth endpoints are working!",
        "status": "ok"
    }

@router.post("/register")
async def register(
    user_data: UserRegister,
    db: AsyncSession = Depends(get_db)
):
    """Register a new user and organization"""
    try:
        # Check if email already exists
        result = await db.execute(
            select(User).where(User.email == user_data.email)
        )
        existing_user = result.scalar_one_or_none()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        
        # Create organization slug from name
        org_name = user_data.organization_name or f"{user_data.full_name}'s Organization"
        slug = user_data.organization_slug or re.sub(r'[^a-zA-Z0-9]', '-', org_name).lower()
        slug = re.sub(r'-+', '-', slug).strip('-')
        
        # Check if organization slug already exists
        result = await db.execute(
            select(Organization).where(Organization.slug == slug)
        )
        existing_org = result.scalar_one_or_none()
        if existing_org:
            slug = f"{slug}-{str(uuid.uuid4())[:8]}"
        
        # Create organization
        organization = Organization(
            name=org_name,
            slug=slug,
            plan="free"
        )
        db.add(organization)
        await db.flush()  # Get the ID without committing
        
        # Create user
        user = User(
            email=user_data.email,
            password_hash=get_password_hash(user_data.password),
            full_name=user_data.full_name,
            organization_id=organization.id,
            role="admin",  # First user is admin
            is_verified=True
        )
        db.add(user)
        
        await db.commit()
        await db.refresh(organization)
        await db.refresh(user)
        
        # Create access token
        access_token = create_access_token(
            data={"sub": str(user.id), "org_id": str(organization.id)}
        )
        
        return {
            "message": "User registered successfully",
            "access_token": access_token,
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

@router.post("/login")
async def login(
    login_data: UserLogin,
    db: AsyncSession = Depends(get_db)
):
    """Login user"""
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
        
        # Create access token
        access_token = create_access_token(
            data={"sub": str(user.id), "org_id": str(user.organization_id)}
        )
        
        return {
            "access_token": access_token,
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

