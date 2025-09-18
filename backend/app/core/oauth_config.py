# backend/app/core/oauth_config.py - COMPLETE IMPLEMENTATION
import httpx
import secrets
from typing import Dict, Any, Optional
from urllib.parse import urlencode
from app.core.config import settings

# Complete OAuth provider configurations
OAUTH_PROVIDERS = {
    "google": {
        "name": "Google",
        "client_id": getattr(settings, 'GOOGLE_CLIENT_ID', None),
        "client_secret": getattr(settings, 'GOOGLE_CLIENT_SECRET', None),
        "authorize_url": "https://accounts.google.com/o/oauth2/v2/auth",
        "token_url": "https://oauth2.googleapis.com/token", 
        "user_info_url": "https://www.googleapis.com/oauth2/v2/userinfo",
        "scopes": ["openid", "email", "profile"],
        "user_id_field": "id",
        "email_field": "email",
        "name_field": "name",
        "avatar_field": "picture"
    },
    "microsoft": {
        "name": "Microsoft",
        "client_id": getattr(settings, 'MICROSOFT_CLIENT_ID', None),
        "client_secret": getattr(settings, 'MICROSOFT_CLIENT_SECRET', None),
        "authorize_url": "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
        "token_url": "https://login.microsoftonline.com/common/oauth2/v2.0/token",
        "user_info_url": "https://graph.microsoft.com/v1.0/me",
        "scopes": ["openid", "email", "profile"],
        "user_id_field": "id",
        "email_field": "mail",
        "name_field": "displayName",
        "avatar_field": "photo"
    },
    "github": {
        "name": "GitHub", 
        "client_id": getattr(settings, 'GITHUB_CLIENT_ID', None),
        "client_secret": getattr(settings, 'GITHUB_CLIENT_SECRET', None),
        "authorize_url": "https://github.com/login/oauth/authorize",
        "token_url": "https://github.com/login/oauth/access_token",
        "user_info_url": "https://api.github.com/user",
        "scopes": ["user:email"],
        "user_id_field": "id",
        "email_field": "email",
        "name_field": "name",
        "avatar_field": "avatar_url"
    }
}

def get_oauth_providers() -> Dict[str, Dict[str, Any]]:
    """Get configured OAuth providers (only those with client credentials)"""
    configured_providers = {}
    
    for provider_key, config in OAUTH_PROVIDERS.items():
        if config["client_id"] and config["client_secret"]:
            configured_providers[provider_key] = config
        else:
            print(f"⚠️ {config['name']} OAuth not configured (missing client credentials)")
    
    return configured_providers

class OAuthService:
    """Complete OAuth service implementation"""
    
    @staticmethod
    def get_authorization_url(provider: str, redirect_uri: str, state: str = None) -> str:
        """Generate OAuth authorization URL"""
        if provider not in OAUTH_PROVIDERS:
            raise ValueError(f"Unsupported OAuth provider: {provider}")
        
        config = OAUTH_PROVIDERS[provider]
        
        if not config["client_id"] or not config["client_secret"]:
            raise ValueError(f"OAuth provider {provider} not configured")
        
        # Generate state if not provided
        if not state:
            state = secrets.token_urlsafe(32)
        
        # Build authorization parameters
        params = {
            "client_id": config["client_id"],
            "redirect_uri": redirect_uri,
            "scope": " ".join(config["scopes"]),
            "response_type": "code",
            "state": state
        }
        
        # Microsoft-specific parameters
        if provider == "microsoft":
            params["response_mode"] = "query"
        
        # GitHub-specific parameters  
        if provider == "github":
            params["allow_signup"] = "true"
        
        authorization_url = f"{config['authorize_url']}?{urlencode(params)}"
        return authorization_url
    
    @staticmethod
    async def exchange_code_for_token(provider: str, code: str, redirect_uri: str) -> Dict[str, Any]:
        """Exchange authorization code for access token"""
        if provider not in OAUTH_PROVIDERS:
            raise ValueError(f"Unsupported OAuth provider: {provider}")
        
        config = OAUTH_PROVIDERS[provider]
        
        if not config["client_id"] or not config["client_secret"]:
            raise ValueError(f"OAuth provider {provider} not configured")
        
        # Prepare token exchange payload
        data = {
            "client_id": config["client_id"],
            "client_secret": config["client_secret"],
            "code": code,
            "grant_type": "authorization_code",
            "redirect_uri": redirect_uri
        }
        
        headers = {"Accept": "application/json"}
        
        # GitHub requires specific header
        if provider == "github":
            headers["Accept"] = "application/vnd.github.v3+json"
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                response = await client.post(
                    config["token_url"],
                    data=data,
                    headers=headers
                )
                response.raise_for_status()
                
                token_data = response.json()
                
                # Validate required fields
                if "access_token" not in token_data:
                    raise ValueError("No access token returned from OAuth provider")
                
                return token_data
                
            except httpx.HTTPStatusError as e:
                error_detail = f"Token exchange failed: {e.response.status_code}"
                try:
                    error_data = e.response.json()
                    error_detail += f" - {error_data.get('error_description', error_data.get('error', 'Unknown error'))}"
                except:
                    pass
                raise ValueError(error_detail)
            except httpx.RequestError as e:
                raise ValueError(f"Token exchange request failed: {str(e)}")
    
    @staticmethod
    async def get_user_info(provider: str, access_token: str) -> Dict[str, Any]:
        """Get user information from OAuth provider"""
        if provider not in OAUTH_PROVIDERS:
            raise ValueError(f"Unsupported OAuth provider: {provider}")
        
        config = OAUTH_PROVIDERS[provider]
        
        headers = {"Authorization": f"Bearer {access_token}"}
        
        # Provider-specific headers
        if provider == "github":
            headers["Accept"] = "application/vnd.github.v3+json"
            headers["User-Agent"] = "OffCall-AI"
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                response = await client.get(
                    config["user_info_url"],
                    headers=headers
                )
                response.raise_for_status()
                
                user_data = response.json()
                
                # For GitHub, we need to fetch email separately if not public
                if provider == "github" and not user_data.get("email"):
                    try:
                        email_response = await client.get(
                            "https://api.github.com/user/emails",
                            headers=headers
                        )
                        email_response.raise_for_status()
                        emails = email_response.json()
                        
                        # Find primary email
                        primary_email = next((e["email"] for e in emails if e["primary"]), None)
                        if primary_email:
                            user_data["email"] = primary_email
                    except:
                        pass  # Continue without email if fetch fails
                
                # Normalize user data across providers
                normalized_data = OAuthService._normalize_user_data(provider, user_data)
                return normalized_data
                
            except httpx.HTTPStatusError as e:
                error_detail = f"User info fetch failed: {e.response.status_code}"
                raise ValueError(error_detail)
            except httpx.RequestError as e:
                raise ValueError(f"User info request failed: {str(e)}")
    
    @staticmethod
    def _normalize_user_data(provider: str, raw_data: Dict[str, Any]) -> Dict[str, Any]:
        """Normalize user data from different OAuth providers"""
        config = OAUTH_PROVIDERS[provider]
        
        # Extract fields based on provider configuration
        normalized = {
            "id": str(raw_data.get(config["user_id_field"])),
            "email": raw_data.get(config["email_field"]),
            "name": raw_data.get(config["name_field"]),
            "avatar": raw_data.get(config["avatar_field"]),
            "provider": provider,
            "raw_data": raw_data  # Keep original data for debugging
        }
        
        # Handle Microsoft-specific email field
        if provider == "microsoft" and not normalized["email"]:
            normalized["email"] = raw_data.get("userPrincipalName")
        
        # Handle GitHub-specific name fallback
        if provider == "github" and not normalized["name"]:
            normalized["name"] = raw_data.get("login")
        
        # Ensure we have required fields
        if not normalized["id"]:
            raise ValueError(f"No user ID returned from {provider}")
        
        if not normalized["email"]:
            raise ValueError(f"No email returned from {provider}")
        
        return normalized

# Export configured providers for use in main.py
def get_configured_oauth_providers() -> Dict[str, bool]:
    """Get simple dict of configured providers for main.py display"""
    configured = {}
    for provider_key, config in OAUTH_PROVIDERS.items():
        configured[provider_key] = bool(config["client_id"] and config["client_secret"])
    return configured