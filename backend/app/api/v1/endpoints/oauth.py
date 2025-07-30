# backend/app/api/v1/endpoints/oauth.py
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
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
from typing import Optional
import redis.asyncio as redis

router = APIRouter()

# Redis client for storing OAuth state
redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)

@router.get("/providers", response_model=AvailableOAuthProviders)
async def get_oauth_providers():
    """Get list of available OAuth providers"""
    providers = []
    
    for provider_key, config in OAUTH_PROVIDERS.items():
        if config["client_id"] and config["client_secret"]:
            providers.append({
                "name": provider_key,
                "display_name": config["name"],
                "enabled": True,
                "icon_url": f"/static/icons/{provider_key}.svg",  # You'll need to add these
                "description": f"Sign in with {config['name']}"
            })
    
    return AvailableOAuthProviders(providers=providers)

@router.post("/authorize", response_model=OAuthAuthorizationResponse)
async def start_oauth_authorization(request: OAuthAuthorizationRequest):
    """Start OAuth authorization flow"""
    
    if request.provider.value not in OAUTH_PROVIDERS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"OAuth provider '{request.provider.value}' is not supported"
        )
    
    # Generate secure state parameter
    state = secrets.token_urlsafe(32)
    
    # Store state in Redis with 10-minute expiration
    await redis_client.setex(
        f"oauth_state:{state}",
        600,  # 10 minutes
        request.provider.value
    )
    
    # Default redirect URI
    redirect_uri = request.redirect_uri or f"{settings.FRONTEND_URL}/auth/oauth/callback"
    
    try:
        authorization_url = OAuthService.get_authorization_url(
            provider=request.provider.value,
            redirect_uri=redirect_uri,
            state=state
        )
        
        return OAuthAuthorizationResponse(
            authorization_url=authorization_url,
            state=state,
            provider=request.provider
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate authorization URL: {str(e)}"
        )

@router.post("/callback", response_model=OAuthLoginResponse)
async def oauth_callback(
    request: OAuthCallbackRequest,
    db: AsyncSession = Depends(get_async_session)
):
    """Handle OAuth callback and complete login/registration"""
    
    # Verify state parameter
    if request.state:
        stored_provider = await redis_client.get(f"oauth_state:{request.state}")
        if not stored_provider or stored_provider != request.provider.value:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid state parameter"
            )
        # Clean up state
        await redis_client.delete(f"oauth_state:{request.state}")
    
    redirect_uri = request.redirect_uri or f"{settings.FRONTEND_URL}/auth/oauth/callback"
    
    try:
        # Exchange code for token
        token_data = await OAuthService.exchange_code_for_token(
            provider=request.provider.value,
            code=request.code,
            redirect_uri=redirect_uri
        )
        
        # Get user info from provider
        user_info = await OAuthService.get_user_info(
            provider=request.provider.value,
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
                    OAuthAccount.provider == request.provider,
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
            oauth_account.provider_email = user_info["email"]
            oauth_account.provider_name = user_info["name"]
            oauth_account.provider_avatar = user_info["avatar"]
            oauth_account.last_used_at = datetime.utcnow()
            
            if "expires_in" in token_data:
                oauth_account.token_expires_at = datetime.utcnow() + timedelta(seconds=token_data["expires_in"])
            
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
                    provider=request.provider,
                    provider_user_id=user_info["id"],
                    provider_username=user_info.get("username"),
                    provider_email=user_info["email"],
                    provider_name=user_info["name"],
                    provider_avatar=user_info["avatar"],
                    access_token=token_data["access_token"],
                    refresh_token=token_data.get("refresh_token"),
                    provider_data=user_info["raw_data"],
                    is_active=True,
                    last_used_at=datetime.utcnow()
                )
                
                if "expires_in" in token_data:
                    oauth_account.token_expires_at = datetime.utcnow() + timedelta(seconds=token_data["expires_in"])
                
                db.add(oauth_account)
            
            else:
                # New user - create user and OAuth account
                is_new_user = True
                
                # Create organization (or you might want different logic here)
                organization = Organization(
                    id=uuid.uuid4(),
                    name=f"{user_info['name']}'s Organization",
                    is_active=True
                )
                db.add(organization)
                await db.flush()
                
                # Create user
                user = User(
                    id=uuid.uuid4(),
                    organization_id=organization.id,
                    email=user_info["email"],
                    full_name=user_info["name"] or user_info["email"].split("@")[0],
                    role="admin",  # First user in org is admin
                    is_active=True,
                    is_verified=True,  # OAuth users are considered verified
                    password_hash=None  # No password for OAuth-only users
                )
                db.add(user)
                await db.flush()
                
                # Create OAuth account
                oauth_account = OAuthAccount(
                    id=uuid.uuid4(),
                    user_id=user.id,
                    provider=request.provider,
                    provider_user_id=user_info["id"],
                    provider_username=user_info.get("username"),
                    provider_email=user_info["email"],
                    provider_name=user_info["name"],
                    provider_avatar=user_info["avatar"],
                    access_token=token_data["access_token"],
                    refresh_token=token_data.get("refresh_token"),
                    provider_data=user_info["raw_data"],
                    is_active=True,
                    is_primary=True,  # First OAuth account is primary
                    last_used_at=datetime.utcnow()
                )
                
                if "expires_in" in token_data:
                    oauth_account.token_expires_at = datetime.utcnow() + timedelta(seconds=token_data["expires_in"])
                
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
        
        # Prepare OAuth account info
        oauth_account_info = OAuthAccountInfo(
            id=str(oauth_account.id),
            provider=oauth_account.provider,
            provider_user_id=oauth_account.provider_user_id,
            provider_email=oauth_account.provider_email,
            provider_name=oauth_account.provider_name,
            provider_username=oauth_account.provider_username,
            provider_avatar=oauth_account.provider_avatar,
            is_active=oauth_account.is_active,
            is_primary=oauth_account.is_primary,
            created_at=oauth_account.created_at,
            last_used_at=oauth_account.last_used_at
        )
        
        return OAuthLoginResponse(
            access_token=access_token,
            token_type="bearer",
            expires_in=settings.ACCESS_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
            user={
                "id": str(user.id),
                "email": user.email,
                "full_name": user.full_name,
                "role": user.role,
                "organization_id": str(user.organization_id),
                "organization_name": organization.name if organization else None
            },
            oauth_account=oauth_account_info,
            is_new_user=is_new_user
        )
        
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"OAuth login failed: {str(e)}"
        )

@router.post("/link", response_model=OAuthLinkResponse)
async def link_oauth_account(
    request: OAuthLinkRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    """Link OAuth account to current authenticated user"""
    
    # Verify state if provided
    if request.state:
        stored_provider = await redis_client.get(f"oauth_state:{request.state}")
        if stored_provider:
            await redis_client.delete(f"oauth_state:{request.state}")
    
    redirect_uri = f"{settings.FRONTEND_URL}/auth/oauth/callback"
    
    try:
        # Exchange code for token
        token_data = await OAuthService.exchange_code_for_token(
            provider=request.provider.value,
            code=request.code,
            redirect_uri=redirect_uri
        )
        
        # Get user info from provider
        user_info = await OAuthService.get_user_info(
            provider=request.provider.value,
            access_token=token_data["access_token"]
        )
        
        # Check if this OAuth account is already linked to another user
        existing_oauth_result = await db.execute(
            select(OAuthAccount).where(
                and_(
                    OAuthAccount.provider == request.provider,
                    OAuthAccount.provider_user_id == user_info["id"]
                )
            )
        )
        existing_oauth = existing_oauth_result.scalar_one_or_none()
        
        if existing_oauth:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"This {request.provider.value} account is already linked to another user"
            )
        
        # Check if user already has this provider linked
        user_oauth_result = await db.execute(
            select(OAuthAccount).where(
                and_(
                    OAuthAccount.user_id == current_user.id,
                    OAuthAccount.provider == request.provider
                )
            )
        )
        user_existing_oauth = user_oauth_result.scalar_one_or_none()
        
        if user_existing_oauth:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"You already have a {request.provider.value} account linked"
            )
        
        # Create new OAuth account link
        oauth_account = OAuthAccount(
            id=uuid.uuid4(),
            user_id=current_user.id,
            provider=request.provider,
            provider_user_id=user_info["id"],
            provider_username=user_info.get("username"),
            provider_email=user_info["email"],
            provider_name=user_info["name"],
            provider_avatar=user_info["avatar"],
            access_token=token_data["access_token"],
            refresh_token=token_data.get("refresh_token"),
            provider_data=user_info["raw_data"],
            is_active=True,
            last_used_at=datetime.utcnow()
        )
        
        if "expires_in" in token_data:
            oauth_account.token_expires_at = datetime.utcnow() + timedelta(seconds=token_data["expires_in"])
        
        db.add(oauth_account)
        await db.commit()
        await db.refresh(oauth_account)
        
        oauth_account_info = OAuthAccountInfo(
            id=str(oauth_account.id),
            provider=oauth_account.provider,
            provider_user_id=oauth_account.provider_user_id,
            provider_email=oauth_account.provider_email,
            provider_name=oauth_account.provider_name,
            provider_username=oauth_account.provider_username,
            provider_avatar=oauth_account.provider_avatar,
            is_active=oauth_account.is_active,
            is_primary=oauth_account.is_primary,
            created_at=oauth_account.created_at,
            last_used_at=oauth_account.last_used_at
        )
        
        return OAuthLinkResponse(oauth_account=oauth_account_info)
        
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to link OAuth account: {str(e)}"
        )

@router.delete("/unlink", response_model=OAuthUnlinkResponse)
async def unlink_oauth_account(
    request: OAuthUnlinkRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    """Unlink OAuth account from current user"""
    
    # Find the OAuth account to unlink
    oauth_result = await db.execute(
        select(OAuthAccount).where(
            and_(
                OAuthAccount.user_id == current_user.id,
                OAuthAccount.provider == request.provider
            )
        )
    )
    oauth_account = oauth_result.scalar_one_or_none()
    
    if not oauth_account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No {request.provider.value} account linked to your profile"
        )
    
    # Check if user has a password or other OAuth accounts before unlinking
    other_oauth_result = await db.execute(
        select(OAuthAccount).where(
            and_(
                OAuthAccount.user_id == current_user.id,
                OAuthAccount.provider != request.provider,
                OAuthAccount.is_active == True
            )
        )
    )
    other_oauth_accounts = other_oauth_result.scalars().all()
    
    if not current_user.password_hash and len(other_oauth_accounts) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot unlink the last authentication method. Please set a password first or link another OAuth account."
        )
    
    # Delete the OAuth account
    await db.delete(oauth_account)
    await db.commit()
    
    return OAuthUnlinkResponse(provider=request.provider)

@router.get("/accounts", response_model=List[OAuthAccountInfo])
async def get_linked_oauth_accounts(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    """Get all OAuth accounts linked to current user"""
    
    oauth_result = await db.execute(
        select(OAuthAccount).where(
            and_(
                OAuthAccount.user_id == current_user.id,
                OAuthAccount.is_active == True
            )
        ).order_by(OAuthAccount.created_at)
    )
    oauth_accounts = oauth_result.scalars().all()
    
    return [
        OAuthAccountInfo(
            id=str(account.id),
            provider=account.provider,
            provider_user_id=account.provider_user_id,
            provider_email=account.provider_email,
            provider_name=account.provider_name,
            provider_username=account.provider_username,
            provider_avatar=account.provider_avatar,
            is_active=account.is_active,
            is_primary=account.is_primary,
            created_at=account.created_at,
            last_used_at=account.last_used_at
        )
        for account in oauth_accounts
    ]

@router.post("/refresh-token")
async def refresh_oauth_token(
    provider: OAuthProvider,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    """Refresh OAuth access token using refresh token"""
    
    # Find the OAuth account
    oauth_result = await db.execute(
        select(OAuthAccount).where(
            and_(
                OAuthAccount.user_id == current_user.id,
                OAuthAccount.provider == provider
            )
        )
    )
    oauth_account = oauth_result.scalar_one_or_none()
    
    if not oauth_account or not oauth_account.refresh_token:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="OAuth account not found or no refresh token available"
        )
    
    try:
        # Refresh the token using the OAuth service
        # This would depend on the specific provider's refresh token flow
        # For now, return success message
        
        return {"message": "Token refresh functionality not implemented yet"}
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to refresh OAuth token: {str(e)}"
        )