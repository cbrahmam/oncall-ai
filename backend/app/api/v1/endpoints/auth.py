# backend/app/api/v1/endpoints/auth.py - Fixed Version
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_async_session
from app.models.user import User
from app.models.organization import Organization
from app.schemas.auth import UserCreate, UserLogin, UserResponse
from app.core.security import verify_password, get_password_hash, create_access_token, get_current_user
from app.core.config import settings
import uuid
from datetime import datetime

router = APIRouter()

@router.post("/register", response_model=UserResponse)
async def register(user_data: UserCreate, db: AsyncSession = Depends(get_async_session)):
    """Register a new user and organization"""
    try:
        # Check if user already exists
        result = await db.execute(
            select(User).where(User.email == user_data.email)
        )
        existing_user = result.scalar_one_or_none()
        
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User with this email already exists"
            )
        
        # Create organization first
        organization = Organization(
            id=uuid.uuid4(),
            name=user_data.organization_name,
            is_active=True,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        db.add(organization)
        await db.flush()  # Get the organization ID
        
        # Create user
        user = User(
            id=uuid.uuid4(),
            organization_id=organization.id,
            email=user_data.email,
            password_hash=get_password_hash(user_data.password),
            full_name=user_data.full_name,
            role="admin",  # First user in org is admin
            is_active=True,
            is_verified=False,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        db.add(user)
        
        await db.commit()
        await db.refresh(user)
        await db.refresh(organization)
        
        # Create access token
        access_token = create_access_token(
            data={"sub": str(user.id), "org_id": str(user.organization_id)}
        )
        
        return UserResponse(
            message="User registered successfully",
            access_token=access_token,
            token_type="bearer",
            expires_in=settings.ACCESS_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
            user={
                "id": str(user.id),
                "email": user.email,
                "full_name": user.full_name,
                "role": user.role,
                "organization_id": str(organization.id),
                "organization_name": organization.name
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        print(f"Registration error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Registration failed: {str(e)}"
        )

@router.post("/login", response_model=UserResponse)
async def login(login_data: UserLogin, db: AsyncSession = Depends(get_async_session)):
    """Login user with enhanced error handling"""
    try:
        print(f"🔍 Login attempt for: {login_data.email}")
        
        # Get user from database
        result = await db.execute(
            select(User).where(
                User.email == login_data.email,
                User.is_active == True
            )
        )
        user = result.scalar_one_or_none()
        
        if not user:
            print(f"❌ User not found: {login_data.email}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password"
            )
        
        print(f"✅ User found: {user.email}, ID: {user.id}")
        
        # Verify password with detailed error handling
        try:
            password_valid = verify_password(login_data.password, user.password_hash)
            print(f"🔐 Password verification result: {password_valid}")
            
            if not password_valid:
                print(f"❌ Invalid password for: {login_data.email}")
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Incorrect email or password"
                )
        except Exception as pwd_error:
            print(f"🚨 Password verification error: {pwd_error}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Password verification failed: {str(pwd_error)}"
            )
        
        # Get organization info
        org_result = await db.execute(
            select(Organization).where(Organization.id == user.organization_id)
        )
        organization = org_result.scalar_one_or_none()
        
        if not organization:
            print(f"❌ Organization not found for user: {user.id}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="User organization not found"
            )
        
        # Create access token
        try:
            access_token = create_access_token(
                data={"sub": str(user.id), "org_id": str(user.organization_id)}
            )
            print(f"✅ Token created successfully for: {user.email}")
        except Exception as token_error:
            print(f"🚨 Token creation error: {token_error}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Token creation failed: {str(token_error)}"
            )
        
        # Store ALL data before any commits to avoid async issues
        user_data = {
            "id": str(user.id),
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role,
            "organization_id": str(user.organization_id),
        }
        org_name = organization.name
        
        # Update last login
        user.last_login_at = datetime.utcnow()
        await db.commit()
        
        print(f"🎉 Login successful for: {user_data['email']}")
        
        return UserResponse(
            access_token=access_token,
            token_type="bearer",
            expires_in=settings.ACCESS_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
            user={
                **user_data,
                "organization_name": org_name
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"🚨 Unexpected login error: {e}")
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Login failed: {str(e)}"
        )

@router.get("/me")
async def get_current_user_info(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    """Get current user information"""
    try:
        # Get organization info
        org_result = await db.execute(
            select(Organization).where(Organization.id == current_user.organization_id)
        )
        organization = org_result.scalar_one_or_none()
        
        return {
            "id": str(current_user.id),
            "email": current_user.email,
            "full_name": current_user.full_name,
            "role": current_user.role,
            "organization_id": str(current_user.organization_id),
            "organization_name": organization.name if organization else None,
            "is_verified": current_user.is_verified,
            "created_at": current_user.created_at.isoformat()
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get user info: {str(e)}"
        )

@router.post("/test")
async def test_auth():
    """Test endpoint to verify auth is working"""
    return {"message": "Auth endpoint is working!", "timestamp": datetime.utcnow()}