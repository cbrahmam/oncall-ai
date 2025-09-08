# backend/app/api/v1/endpoints/api_keys.py - NEW FILE
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, update
from app.database import get_async_session
from app.core.deps import get_current_user
from app.models.user import User
from app.models.api_keys import APIKey
from app.services.encryption_service import EncryptionService
from app.services.ai_key_validation import AIKeyValidationService
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

class APIKeyCreate(BaseModel):
    provider: str  # "openai", "gemini", "claude"
    key_name: str
    api_key: str

class APIKeyResponse(BaseModel):
    id: str
    provider: str
    key_name: str
    is_valid: bool
    last_validated: Optional[str]
    validation_error: Optional[str]
    total_requests: int
    total_tokens: int
    last_used: Optional[str]
    created_at: str

class APIKeyUpdate(BaseModel):
    key_name: Optional[str] = None
    api_key: Optional[str] = None

@router.post("/", response_model=APIKeyResponse)
async def create_api_key(
    key_data: APIKeyCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    """Add a new API key for the organization"""
    try:
        # Validate the API key
        is_valid, error_message = await AIKeyValidationService.validate_api_key(
            key_data.provider, 
            key_data.api_key
        )
        
        # Encrypt the API key
        encrypted_key = EncryptionService.encrypt_api_key(key_data.api_key)
        
        # Create API key record
        api_key = APIKey(
            organization_id=current_user.organization_id,
            user_id=current_user.id,
            provider=key_data.provider,
            key_name=key_data.key_name,
            encrypted_key=encrypted_key,
            is_valid=is_valid,
            last_validated=datetime.utcnow() if is_valid else None,
            validation_error=error_message
        )
        
        db.add(api_key)
        await db.commit()
        await db.refresh(api_key)
        
        return APIKeyResponse(
            id=api_key.id,
            provider=api_key.provider,
            key_name=api_key.key_name,
            is_valid=api_key.is_valid,
            last_validated=api_key.last_validated.isoformat() if api_key.last_validated else None,
            validation_error=api_key.validation_error,
            total_requests=api_key.total_requests,
            total_tokens=api_key.total_tokens,
            last_used=api_key.last_used.isoformat() if api_key.last_used else None,
            created_at=api_key.created_at.isoformat()
        )
        
    except Exception as e:
        logger.error(f"Failed to create API key: {e}")
        raise HTTPException(status_code=500, detail="Failed to create API key")

@router.get("/", response_model=List[APIKeyResponse])
async def list_api_keys(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    """List all API keys for the organization"""
    try:
        result = await db.execute(
            select(APIKey).where(APIKey.organization_id == current_user.organization_id)
        )
        api_keys = result.scalars().all()
        
        return [
            APIKeyResponse(
                id=key.id,
                provider=key.provider,
                key_name=key.key_name,
                is_valid=key.is_valid,
                last_validated=key.last_validated.isoformat() if key.last_validated else None,
                validation_error=key.validation_error,
                total_requests=key.total_requests,
                total_tokens=key.total_tokens,
                last_used=key.last_used.isoformat() if key.last_used else None,
                created_at=key.created_at.isoformat()
            )
            for key in api_keys
        ]
        
    except Exception as e:
        logger.error(f"Failed to list API keys: {e}")
        raise HTTPException(status_code=500, detail="Failed to list API keys")

@router.delete("/{key_id}")
async def delete_api_key(
    key_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    """Delete an API key"""
    try:
        result = await db.execute(
            select(APIKey).where(
                APIKey.id == key_id,
                APIKey.organization_id == current_user.organization_id
            )
        )
        api_key = result.scalar_one_or_none()
        
        if not api_key:
            raise HTTPException(status_code=404, detail="API key not found")
        
        await db.execute(
            delete(APIKey).where(APIKey.id == key_id)
        )
        await db.commit()
        
        return {"status": "success", "message": "API key deleted successfully"}
        
    except Exception as e:
        logger.error(f"Failed to delete API key: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete API key")

@router.post("/{key_id}/validate")
async def validate_api_key(
    key_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    """Re-validate an API key"""
    try:
        result = await db.execute(
            select(APIKey).where(
                APIKey.id == key_id,
                APIKey.organization_id == current_user.organization_id
            )
        )
        api_key = result.scalar_one_or_none()
        
        if not api_key:
            raise HTTPException(status_code=404, detail="API key not found")
        
        # Decrypt and validate
        decrypted_key = EncryptionService.decrypt_api_key(api_key.encrypted_key)
        is_valid, error_message = await AIKeyValidationService.validate_api_key(
            api_key.provider, 
            decrypted_key
        )
        
        # Update validation status
        await db.execute(
            update(APIKey)
            .where(APIKey.id == key_id)
            .values(
                is_valid=is_valid,
                last_validated=datetime.utcnow() if is_valid else None,
                validation_error=error_message
            )
        )
        await db.commit()
        
        return {
            "status": "success", 
            "is_valid": is_valid,
            "error_message": error_message
        }
        
    except Exception as e:
        logger.error(f"Failed to validate API key: {e}")
        raise HTTPException(status_code=500, detail="Failed to validate API key")