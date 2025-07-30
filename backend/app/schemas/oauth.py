# backend/app/schemas/oauth.py
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum

class OAuthProvider(str, Enum):
    GOOGLE = "google"
    MICROSOFT = "microsoft"
    GITHUB = "github"
    SLACK = "slack"

class OAuthAuthorizationRequest(BaseModel):
    """Request to start OAuth authorization flow"""
    provider: OAuthProvider = Field(..., description="OAuth provider")
    redirect_uri: Optional[str] = Field(None, description="Custom redirect URI")

class OAuthAuthorizationResponse(BaseModel):
    """Response with OAuth authorization URL"""
    authorization_url: str = Field(..., description="OAuth authorization URL")
    state: str = Field(..., description="State parameter for security")
    provider: OAuthProvider = Field(..., description="OAuth provider")

class OAuthCallbackRequest(BaseModel):
    """OAuth callback request with authorization code"""
    provider: OAuthProvider = Field(..., description="OAuth provider")
    code: str = Field(..., description="Authorization code from OAuth provider")
    state: Optional[str] = Field(None, description="State parameter for verification")
    redirect_uri: Optional[str] = Field(None, description="Redirect URI used in authorization")

class OAuthAccountInfo(BaseModel):
    """OAuth account information"""
    id: str = Field(..., description="OAuth account ID")
    provider: OAuthProvider = Field(..., description="OAuth provider")
    provider_user_id: str = Field(..., description="User ID from OAuth provider")
    provider_email: Optional[str] = Field(None, description="Email from OAuth provider")
    provider_name: Optional[str] = Field(None, description="Display name from OAuth provider")
    provider_username: Optional[str] = Field(None, description="Username from OAuth provider")
    provider_avatar: Optional[str] = Field(None, description="Avatar URL from OAuth provider")
    is_active: bool = Field(..., description="Whether OAuth account is active")
    is_primary: bool = Field(..., description="Whether this is the primary OAuth account")
    created_at: datetime = Field(..., description="When OAuth account was created")
    last_used_at: Optional[datetime] = Field(None, description="When OAuth account was last used")

class UserWithOAuthAccounts(BaseModel):
    """User information with associated OAuth accounts"""
    id: str = Field(..., description="User ID")
    email: str = Field(..., description="User email")
    full_name: str = Field(..., description="User full name")
    role: str = Field(..., description="User role")
    organization_id: str = Field(..., description="Organization ID")
    organization_name: Optional[str] = Field(None, description="Organization name")
    oauth_accounts: List[OAuthAccountInfo] = Field(default_factory=list, description="Connected OAuth accounts")
    created_at: datetime = Field(..., description="User creation timestamp")

class OAuthLoginResponse(BaseModel):
    """Response after successful OAuth login"""
    message: str = Field(default="OAuth login successful", description="Success message")
    access_token: str = Field(..., description="JWT access token")
    refresh_token: Optional[str] = Field(None, description="Refresh token")
    token_type: str = Field(default="bearer", description="Token type")
    expires_in: int = Field(..., description="Token expiration time in seconds")
    user: Dict[str, Any] = Field(..., description="User information")
    oauth_account: OAuthAccountInfo = Field(..., description="OAuth account used for login")
    is_new_user: bool = Field(..., description="Whether this is a newly created user")

class OAuthLinkRequest(BaseModel):
    """Request to link OAuth account to existing user"""
    provider: OAuthProvider = Field(..., description="OAuth provider")
    code: str = Field(..., description="Authorization code from OAuth provider")
    state: Optional[str] = Field(None, description="State parameter for verification")

class OAuthLinkResponse(BaseModel):
    """Response after linking OAuth account"""
    message: str = Field(default="OAuth account linked successfully", description="Success message")
    oauth_account: OAuthAccountInfo = Field(..., description="Linked OAuth account")

class OAuthUnlinkRequest(BaseModel):
    """Request to unlink OAuth account"""
    provider: OAuthProvider = Field(..., description="OAuth provider to unlink")

class OAuthUnlinkResponse(BaseModel):
    """Response after unlinking OAuth account"""
    message: str = Field(default="OAuth account unlinked successfully", description="Success message")
    provider: OAuthProvider = Field(..., description="Unlinked OAuth provider")

class AvailableOAuthProviders(BaseModel):
    """Available OAuth providers and their configuration"""
    providers: List[Dict[str, Any]] = Field(..., description="List of available OAuth providers")

class OAuthProviderConfig(BaseModel):
    """Configuration for an OAuth provider"""
    name: str = Field(..., description="Provider name")
    display_name: str = Field(..., description="Human-readable provider name")
    enabled: bool = Field(..., description="Whether provider is enabled")
    icon_url: Optional[str] = Field(None, description="Provider icon URL")
    description: Optional[str] = Field(None, description="Provider description")