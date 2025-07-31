# backend/app/api/v1/endpoints/oauth.py - FIXED VERSION
from fastapi import APIRouter, Depends, HTTPException, status, Request, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from sqlalchemy.orm import selectinload
from app.database import get_async_session
from app.models.user import User
from app.models.organization import Organization
from app.models.oauth_account import OAuthAccount, OAuthProvider
from app.schemas.oauth import *
from app.core.oauth_config import OAuthService, OAUTH_PROVIDERS
from app.core.security import create_access_token, get_current_user
from app.core.config import settings
import uuid
import secrets
from datetime import datetime, timedelta
from typing import Optional, List
import redis.asyncio as redis

router = APIRouter()

# Redis client for storing OAuth state
redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)

@router.get("/providers")
async def get_oauth_providers():
    """Get list of available OAuth providers"""
    providers = []
    
    for provider_key, config in OAUTH_PROVIDERS.items():
        if config["client_id"] and config["client_secret"]:
            providers.append({
                "name": provider_key,
                "display_name": config["name"],
                "enabled": True,
                "icon_url": f"/static/icons/{provider_key}.svg",
                "description": f"Sign in with {config['name']}"
            })
    
    return {"providers": providers}

@router.post("/authorize")
async def start_oauth_authorization(request: dict):
    """Start OAuth authorization flow"""
    
    provider = request.get("provider")
    if provider not in OAUTH_PROVIDERS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"OAuth provider '{provider}' is not supported"
        )
    
    # Generate secure state parameter
    state = secrets.token_urlsafe(32)
    
    # Store state in Redis with 10-minute expiration
    await redis_client.setex(
        f"oauth_state:{state}",
        600,  # 10 minutes
        provider
    )
    
    # Default redirect URI
    redirect_uri = request.get("redirect_uri") or f"{settings.FRONTEND_URL}/auth/oauth/callback"
    
    try:
        authorization_url = OAuthService.get_authorization_url(
            provider=provider,
            redirect_uri=redirect_uri,
            state=state
        )
        
        return {
            "authorization_url": authorization_url,
            "state": state,
            "provider": provider
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate authorization URL: {str(e)}"
        )

@router.post("/callback")
async def oauth_callback(
    request: dict,
    db: AsyncSession = Depends(get_async_session)
):
    """Handle OAuth callback and complete login/registration"""
    
    provider = request.get("provider")
    code = request.get("code")
    state = request.get("state")
    
    # Verify state parameter
    if state:
        stored_provider = await redis_client.get(f"oauth_state:{state}")
        if not stored_provider or stored_provider != provider:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid state parameter"
            )
        # Clean up state
        await redis_client.delete(f"oauth_state:{state}")
    
    redirect_uri = request.get("redirect_uri") or f"{settings.FRONTEND_URL}/auth/oauth/callback"
    
    try:
        # Exchange code for token
        token_data = await OAuthService.exchange_code_for_token(
            provider=provider,
            code=code,
            redirect_uri=redirect_uri
        )
        
        # Get user info from provider
        user_info = await OAuthService.get_user_info(
            provider=provider,
            access_token=token_data["access_token"]
        )
        
        if not user_info.get("email"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email not provided by OAuth provider"
            )
        
        # Check if OAuth account exists
        oauth_account_result = await db.execute(
            select(OAuthAccount).where(
                and_(
                    OAuthAccount.provider == provider,
                    OAuthAccount.provider_user_id == user_info["id"]
                )
            ).options(selectinload(OAuthAccount.user))
        )
        oauth_account = oauth_account_result.scalar_one_or_none()
        
        is_new_user = False
        user = None
        
        if oauth_account:
            # Existing OAuth account - login
            user = oauth_account.user
            if not user or not user.is_active:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="User account is disabled"
                )
            
            # Update OAuth account info
            oauth_account.access_token = token_data["access_token"]
            oauth_account.refresh_token = token_data.get("refresh_token")
            oauth_account.email = user_info["email"]
            oauth_account.name = user_info["name"]
            oauth_account.avatar_url = user_info.get("avatar")
            
            if "expires_in" in token_data:
                oauth_account.expires_at = datetime.utcnow() + timedelta(seconds=token_data["expires_in"])
            
        else:
            # Check if user exists with this email
            user_result = await db.execute(
                select(User).where(User.email == user_info["email"])
            )
            user = user_result.scalar_one_or_none()
            
            if user:
                # Existing user - link OAuth account
                oauth_account = OAuthAccount(
                    id=uuid.uuid4(),
                    user_id=user.id,
                    provider=provider,
                    provider_user_id=user_info["id"],
                    email=user_info["email"],
                    name=user_info["name"],
                    avatar_url=user_info.get("avatar"),
                    access_token=token_data["access_token"],
                    refresh_token=token_data.get("refresh_token")
                )
                
                if "expires_in" in token_data:
                    oauth_account.expires_at = datetime.utcnow() + timedelta(seconds=token_data["expires_in"])
                
                db.add(oauth_account)
            
            else:
                # New user - create user and OAuth account
                is_new_user = True
                
                # Create organization
                organization = Organization(
                    id=uuid.uuid4(),
                    name=f"{user_info['name']}'s Organization"
                )
                db.add(organization)
                await db.flush()
                
                # Create user
                user = User(
                    id=uuid.uuid4(),
                    organization_id=organization.id,
                    email=user_info["email"],
                    full_name=user_info["name"] or user_info["email"].split("@")[0],
                    role="admin",
                    is_active=True,
                    is_verified=True,
                    password_hash=None
                )
                db.add(user)
                await db.flush()
                
                # Create OAuth account
                oauth_account = OAuthAccount(
                    id=uuid.uuid4(),
                    user_id=user.id,
                    provider=provider,
                    provider_user_id=user_info["id"],
                    email=user_info["email"],
                    name=user_info["name"],
                    avatar_url=user_info.get("avatar"),
                    access_token=token_data["access_token"],
                    refresh_token=token_data.get("refresh_token")
                )
                
                if "expires_in" in token_data:
                    oauth_account.expires_at = datetime.utcnow() + timedelta(seconds=token_data["expires_in"])
                
                db.add(oauth_account)
        
        # Update user's last login
        user.last_login_at = datetime.utcnow()
        
        await db.commit()
        await db.refresh(user)
        await db.refresh(oauth_account)
        
        # Get organization info
        org_result = await db.execute(
            select(Organization).where(Organization.id == user.organization_id)
        )
        organization = org_result.scalar_one_or_none()
        
        # Create JWT token
        access_token = create_access_token(
            data={"sub": str(user.id), "org_id": str(user.organization_id)}
        )
        
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "expires_in": settings.ACCESS_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
            "user": {
                "id": str(user.id),
                "email": user.email,
                "full_name": user.full_name,
                "role": user.role,
                "organization_id": str(user.organization_id),
                "organization_name": organization.name if organization else None
            },
            "oauth_account": {
                "id": str(oauth_account.id),
                "provider": oauth_account.provider,
                "provider_user_id": oauth_account.provider_user_id,
                "email": oauth_account.email,
                "name": oauth_account.name,
                "avatar_url": oauth_account.avatar_url,
                "created_at": oauth_account.created_at.isoformat() if oauth_account.created_at else None
            },
            "is_new_user": is_new_user
        }
        
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"OAuth login failed: {str(e)}"
        )

@router.get("/accounts")
async def get_linked_oauth_accounts(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    """Get all OAuth accounts linked to current user"""
    
    oauth_result = await db.execute(
        select(OAuthAccount).where(
            OAuthAccount.user_id == current_user.id
        ).order_by(OAuthAccount.created_at)
    )
    oauth_accounts = oauth_result.scalars().all()
    
    return [
        {
            "id": str(account.id),
            "provider": account.provider,
            "provider_user_id": account.provider_user_id,
            "email": account.email,
            "name": account.name,
            "avatar_url": account.avatar_url,
            "created_at": account.created_at.isoformat() if account.created_at else None
        }
        for account in oauth_accounts
    ]

@router.get("/authorize/{provider}")
async def get_oauth_authorization_url(
    provider: str,
    redirect_uri: str = Query(default="http://localhost:3000/auth/oauth/callback")
):
    """Get OAuth authorization URL - GET endpoint for easy testing"""
    
    if provider not in OAUTH_PROVIDERS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"OAuth provider '{provider}' is not supported"
        )
    
    # Generate secure state parameter
    state = secrets.token_urlsafe(32)
    
    # Store state in Redis with 10-minute expiration
    await redis_client.setex(
        f"oauth_state:{state}",
        600,  # 10 minutes
        provider
    )
    
    try:
        authorization_url = OAuthService.get_authorization_url(
            provider=provider,
            redirect_uri=redirect_uri,
            state=state
        )
        
        return {
            "authorization_url": authorization_url,
            "state": state,
            "provider": provider
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate authorization URL: {str(e)}"
        )