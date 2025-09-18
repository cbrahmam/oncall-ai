# backend/app/api/v1/endpoints/oauth.py - COMPLETE FIXED VERSION
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from sqlalchemy.orm import selectinload
from app.database import get_async_session
from app.models.user import User
from app.models.organization import Organization
from app.models.oauth_account import OAuthAccount
from app.core.oauth_config import OAuthService, get_oauth_providers
from app.core.security import create_access_token, get_current_user
from app.core.config import settings
import uuid
import secrets
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
import asyncio

router = APIRouter()

# In-memory OAuth state store (fallback if Redis not available)
oauth_state_store: Dict[str, Dict[str, Any]] = {}

# Redis connection with fallback
redis_client = None
try:
    import redis.asyncio as redis
    redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)
    print("✅ Redis connected for OAuth state storage")
except Exception as e:
    print(f"⚠️ Redis not available, using in-memory OAuth state storage: {e}")

async def store_oauth_state(state: str, provider: str, expire_seconds: int = 600):
    """Store OAuth state with Redis fallback"""
    if redis_client:
        try:
            await redis_client.setex(f"oauth_state:{state}", expire_seconds, provider)
            return
        except Exception as e:
            print(f"Redis store failed, using fallback: {e}")
    
    # Fallback to in-memory storage
    oauth_state_store[state] = {
        "provider": provider,
        "expires_at": datetime.utcnow() + timedelta(seconds=expire_seconds)
    }

async def get_oauth_state(state: str) -> Optional[str]:
    """Get OAuth state with Redis fallback"""
    if redis_client:
        try:
            return await redis_client.get(f"oauth_state:{state}")
        except Exception:
            pass
    
    # Fallback to in-memory storage
    stored = oauth_state_store.get(state)
    if stored and stored["expires_at"] > datetime.utcnow():
        return stored["provider"]
    
    # Clean up expired states
    expired_states = [s for s, data in oauth_state_store.items() 
                     if data["expires_at"] <= datetime.utcnow()]
    for expired_state in expired_states:
        del oauth_state_store[expired_state]
    
    return None

async def cleanup_oauth_state(state: str):
    """Clean up OAuth state"""
    if redis_client:
        try:
            await redis_client.delete(f"oauth_state:{state}")
        except Exception:
            pass
    
    oauth_state_store.pop(state, None)

@router.get("/providers")
async def get_oauth_providers_endpoint():
    """Get list of available OAuth providers"""
    try:
        configured_providers = get_oauth_providers()
        
        providers = []
        for provider_key, config in configured_providers.items():
            providers.append({
                "name": provider_key,
                "display_name": config["name"],
                "enabled": True,
                "icon_url": f"/static/icons/{provider_key}.svg",
                "description": f"Sign in with {config['name']}"
            })
        
        return {
            "providers": providers,
            "total": len(providers)
        }
    except Exception as e:
        print(f"Error getting OAuth providers: {e}")
        return {"providers": [], "total": 0}

@router.get("/authorize/{provider}")
async def get_oauth_authorization_url(
    provider: str,
    redirect_uri: str = Query(default=None, description="Custom redirect URI")
):
    """Get OAuth authorization URL - GET endpoint for easy frontend integration"""
    
    try:
        # Check if provider is supported and configured
        configured_providers = get_oauth_providers()
        if provider not in configured_providers:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"OAuth provider '{provider}' is not supported or not configured"
            )
        
        # Use provided redirect_uri or default
        if not redirect_uri:
            redirect_uri = f"{settings.FRONTEND_URL}/auth/oauth/callback"
        
        # Generate secure state parameter
        state = secrets.token_urlsafe(32)
        
        # Store state with 10-minute expiration
        await store_oauth_state(state, provider, 600)
        
        # Generate authorization URL
        authorization_url = OAuthService.get_authorization_url(
            provider=provider,
            redirect_uri=redirect_uri,
            state=state
        )
        
        print(f"✅ Generated OAuth URL for {provider}: {authorization_url[:100]}...")
        
        return {
            "authorization_url": authorization_url,
            "state": state,
            "provider": provider,
            "redirect_uri": redirect_uri
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"OAuth authorization URL generation failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate authorization URL: {str(e)}"
        )

@router.post("/authorize")
async def start_oauth_authorization(request: dict):
    """Start OAuth authorization flow - POST endpoint for programmatic access"""
    
    provider = request.get("provider")
    redirect_uri = request.get("redirect_uri")
    
    if not provider:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Provider is required"
        )
    
    # Call the GET endpoint logic
    return await get_oauth_authorization_url(provider, redirect_uri)

@router.post("/callback")
async def oauth_callback(
    request: dict,
    db: AsyncSession = Depends(get_async_session)
):
    """Handle OAuth callback and complete login/registration"""
    
    provider = request.get("provider")
    code = request.get("code")
    state = request.get("state")
    redirect_uri = request.get("redirect_uri")
    
    print(f"🔄 OAuth callback received - Provider: {provider}, State: {state[:10] if state else 'None'}...")
    
    if not provider or not code:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Provider and authorization code are required"
        )
    
    # Verify state parameter for security
    if state:
        stored_provider = await get_oauth_state(state)
        if not stored_provider:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired state parameter"
            )
        if stored_provider != provider:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="State parameter does not match provider"
            )
        # Clean up state
        await cleanup_oauth_state(state)
    
    # Use provided redirect_uri or default
    if not redirect_uri:
        redirect_uri = f"{settings.FRONTEND_URL}/auth/oauth/callback"
    
    try:
        print(f"🔄 Exchanging code for token...")
        # Exchange code for token
        token_data = await OAuthService.exchange_code_for_token(
            provider=provider,
            code=code,
            redirect_uri=redirect_uri
        )
        print(f"✅ Token exchange successful")
        
        print(f"🔄 Fetching user info...")
        # Get user info from provider
        user_info = await OAuthService.get_user_info(
            provider=provider,
            access_token=token_data["access_token"]
        )
        print(f"✅ User info retrieved: {user_info['email']}")
        
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
            print(f"🔍 Existing OAuth account found")
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
            oauth_account.updated_at = datetime.utcnow()
            
            if "expires_in" in token_data:
                oauth_account.expires_at = datetime.utcnow() + timedelta(seconds=token_data["expires_in"])
            
        else:
            print(f"🔍 No existing OAuth account, checking for user by email...")
            # Check if user exists with this email
            user_result = await db.execute(
                select(User).where(User.email == user_info["email"])
            )
            user = user_result.scalar_one_or_none()
            
            if user:
                print(f"🔍 Existing user found, linking OAuth account")
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
                    refresh_token=token_data.get("refresh_token"),
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow()
                )
                
                if "expires_in" in token_data:
                    oauth_account.expires_at = datetime.utcnow() + timedelta(seconds=token_data["expires_in"])
                
                db.add(oauth_account)
            
            else:
                print(f"🆕 Creating new user and OAuth account")
                # New user - create user and OAuth account
                is_new_user = True
                
                # Create organization first
                organization = Organization(
                    id=uuid.uuid4(),
                    name=f"{user_info['name']}'s Organization",
                    slug=f"org-{secrets.token_urlsafe(8).lower()}",
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow()
                )
                db.add(organization)
                await db.flush()  # Get the organization ID
                
                # Create user
                user = User(
                    id=uuid.uuid4(),
                    organization_id=organization.id,
                    email=user_info["email"],
                    full_name=user_info["name"] or user_info["email"].split("@")[0],
                    role="admin",  # First user in org is admin
                    is_active=True,
                    is_verified=True,  # OAuth users are pre-verified
                    password_hash=None,  # OAuth users don't need passwords
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow()
                )
                db.add(user)
                await db.flush()  # Get the user ID
                
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
                    refresh_token=token_data.get("refresh_token"),
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow()
                )
                
                if "expires_in" in token_data:
                    oauth_account.expires_at = datetime.utcnow() + timedelta(seconds=token_data["expires_in"])
                
                db.add(oauth_account)
        
        # Update user's last login
        user.last_login = datetime.utcnow()
        user.updated_at = datetime.utcnow()
        
        # Commit all changes
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
        
        print(f"✅ OAuth login successful for {user.email}")
        
        return {
            "message": "OAuth login successful",
            "access_token": access_token,
            "token_type": "bearer",
            "expires_in": settings.ACCESS_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
            "user": {
                "id": str(user.id),
                "email": user.email,
                "full_name": user.full_name,
                "role": user.role,
                "organization_id": str(user.organization_id),
                "organization_name": organization.name if organization else None,
                "avatar_url": oauth_account.avatar_url
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
        print(f"❌ OAuth login failed: {e}")
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
    
    try:
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
                "created_at": account.created_at.isoformat() if account.created_at else None,
                "last_used": account.updated_at.isoformat() if account.updated_at else None
            }
            for account in oauth_accounts
        ]
    except Exception as e:
        print(f"Error getting OAuth accounts: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get OAuth accounts"
        )

@router.delete("/accounts/{provider}")
async def unlink_oauth_account(
    provider: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    """Unlink OAuth account from current user"""
    
    try:
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
        
        if not oauth_account:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No {provider} account linked to your profile"
            )
        
        # Check if user has password or other OAuth accounts (don't lock them out)
        if not current_user.password_hash:
            # Check for other OAuth accounts
            other_accounts_result = await db.execute(
                select(OAuthAccount).where(
                    and_(
                        OAuthAccount.user_id == current_user.id,
                        OAuthAccount.provider != provider
                    )
                )
            )
            other_accounts = other_accounts_result.scalars().all()
            
            if not other_accounts:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Cannot unlink the only authentication method. Set a password first."
                )
        
        # Remove the OAuth account
        await db.delete(oauth_account)
        await db.commit()
        
        return {
            "message": f"{provider.title()} account unlinked successfully",
            "provider": provider
        }
        
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        print(f"Error unlinking OAuth account: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to unlink OAuth account"
        )

@router.get("/test/{provider}")
async def test_oauth_provider(provider: str):
    """Test OAuth provider configuration (development only)"""
    
    if not settings.DEBUG:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Endpoint not available in production"
        )
    
    try:
        configured_providers = get_oauth_providers()
        
        if provider not in configured_providers:
            return {
                "provider": provider,
                "configured": False,
                "error": "Provider not configured or missing credentials"
            }
        
        config = configured_providers[provider]
        
        return {
            "provider": provider,
            "configured": True,
            "config": {
                "name": config["name"],
                "client_id": config["client_id"][:10] + "..." if config["client_id"] else None,
                "client_secret_set": bool(config["client_secret"]),
                "authorize_url": config["authorize_url"],
                "token_url": config["token_url"],
                "user_info_url": config["user_info_url"],
                "scopes": config["scopes"]
            }
        }
        
    except Exception as e:
        return {
            "provider": provider,
            "configured": False,
            "error": str(e)
        }