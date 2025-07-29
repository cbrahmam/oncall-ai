from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text
from app.database import get_db
from app.models.user import User
from app.models.organization import Organization
from app.core.security import verify_token
import uuid

# Security scheme
security = HTTPBearer()

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
) -> User:
    """Get current authenticated user"""
    
    # Verify token
    payload = verify_token(credentials.credentials)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )
    
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload"
        )
    
    # Get user from database
    result = await db.execute(
        text("SELECT * FROM users WHERE id = :user_id AND is_active = true"),
        {"user_id": user_id}
    )
    user_data = result.fetchone()
    
    if not user_data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive"
        )
    
    # Convert to User model (simplified)
    user = User()
    for key, value in user_data._mapping.items():
        setattr(user, key, value)
    
    return user

async def get_current_organization(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Organization:
    """Get current user's organization"""
    
    result = await db.execute(
        text("SELECT * FROM organizations WHERE id = :org_id AND is_active = true"),
        {"org_id": str(current_user.organization_id)}
    )
    org_data = result.fetchone()
    
    if not org_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found"
        )
    
    # Convert to Organization model
    org = Organization()
    for key, value in org_data._mapping.items():
        setattr(org, key, value)
    
    return org