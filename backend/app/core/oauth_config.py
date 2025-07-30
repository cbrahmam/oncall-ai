# backend/app/core/oauth_config.py
from authlib.integrations.starlette_client import OAuth
from authlib.integrations.httpx_client import AsyncOAuth2Client
from app.core.config import settings
from typing import Dict, Any

# OAuth Provider Configurations
OAUTH_PROVIDERS = {
    "google": {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "client_secret": settings.GOOGLE_CLIENT_SECRET,
        "authorize_url": "https://accounts.google.com/o/oauth2/v2/auth",
        "token_url": "https://oauth2.googleapis.com/token",
        "userinfo_url": "https://www.googleapis.com/oauth2/v2/userinfo",
        "scopes": ["openid", "email", "profile"],
        "name": "Google"
    },
    "microsoft": {
        "client_id": settings.MICROSOFT_CLIENT_ID,
        "client_secret": settings.MICROSOFT_CLIENT_SECRET,
        "authorize_url": "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
        "token_url": "https://login.microsoftonline.com/common/oauth2/v2.0/token",
        "userinfo_url": "https://graph.microsoft.com/v1.0/me",
        "scopes": ["openid", "email", "profile", "User.Read"],
        "name": "Microsoft"
    },
    "github": {
        "client_id": settings.GITHUB_CLIENT_ID,
        "client_secret": settings.GITHUB_CLIENT_SECRET,
        "authorize_url": "https://github.com/login/oauth/authorize",
        "token_url": "https://github.com/login/oauth/access_token",
        "userinfo_url": "https://api.github.com/user",
        "scopes": ["user:email"],
        "name": "GitHub"
    }
}

# Initialize OAuth instance
oauth = OAuth()

def init_oauth():
    """Initialize OAuth providers"""
    for provider_name, config in OAUTH_PROVIDERS.items():
        if config["client_id"] and config["client_secret"]:
            oauth.register(
                name=provider_name,
                client_id=config["client_id"],
                client_secret=config["client_secret"],
                authorize_url=config["authorize_url"],
                access_token_url=config["token_url"],
                client_kwargs={
                    "scope": " ".join(config["scopes"])
                }
            )

class OAuthService:
    """Service for handling OAuth operations"""
    
    @staticmethod
    def get_authorization_url(provider: str, redirect_uri: str, state: str = None) -> str:
        """Generate OAuth authorization URL"""
        if provider not in OAUTH_PROVIDERS:
            raise ValueError(f"Unsupported OAuth provider: {provider}")
        
        config = OAUTH_PROVIDERS[provider]
        client = AsyncOAuth2Client(
            client_id=config["client_id"],
            redirect_uri=redirect_uri
        )
        
        authorization_url, state = client.create_authorization_url(
            config["authorize_url"],
            scope=" ".join(config["scopes"]),
            state=state
        )
        
        return authorization_url
    
    @staticmethod
    async def exchange_code_for_token(provider: str, code: str, redirect_uri: str) -> Dict[str, Any]:
        """Exchange authorization code for access token"""
        if provider not in OAUTH_PROVIDERS:
            raise ValueError(f"Unsupported OAuth provider: {provider}")
        
        config = OAUTH_PROVIDERS[provider]
        client = AsyncOAuth2Client(
            client_id=config["client_id"],
            client_secret=config["client_secret"]
        )
        
        token = await client.fetch_token(
            config["token_url"],
            code=code,
            redirect_uri=redirect_uri
        )
        
        return token
    
    @staticmethod
    async def get_user_info(provider: str, access_token: str) -> Dict[str, Any]:
        """Get user information from OAuth provider"""
        if provider not in OAUTH_PROVIDERS:
            raise ValueError(f"Unsupported OAuth provider: {provider}")
        
        config = OAUTH_PROVIDERS[provider]
        client = AsyncOAuth2Client(token={"access_token": access_token})
        
        response = await client.get(config["userinfo_url"])
        user_info = response.json()
        
        # Normalize user info across providers
        normalized_info = {
            "id": str(user_info.get("id", user_info.get("sub"))),
            "email": user_info.get("email"),
            "name": user_info.get("name", user_info.get("display_name", user_info.get("login"))),
            "avatar": user_info.get("picture", user_info.get("avatar_url")),
            "username": user_info.get("login", user_info.get("preferred_username")),
            "raw_data": user_info
        }
        
        # Provider-specific email handling
        if provider == "github" and not normalized_info["email"]:
            # GitHub might not return email in user info if private
            email_response = await client.get("https://api.github.com/user/emails")
            emails = email_response.json()
            primary_email = next((e["email"] for e in emails if e["primary"]), None)
            normalized_info["email"] = primary_email
        
        return normalized_info