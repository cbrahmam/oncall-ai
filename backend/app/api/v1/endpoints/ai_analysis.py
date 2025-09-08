# backend/app/api/v1/endpoints/ai_analysis.py - NEW FILE
import logging
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from datetime import datetime
import json

from app.database import get_async_session
from app.core.deps import get_current_user
from app.models.user import User
from app.models.api_keys import APIKey
from app.models.incident import Incident
from app.services.ai_providers import ClaudeService, GeminiService

router = APIRouter()
logger = logging.getLogger(__name__)

# Request/Response Models
class IncidentAnalysisRequest(BaseModel):
    incident_id: str
    provider: str  # "claude", "gemini", or "both"
    incident_data: Dict[str, Any]

class AIAnalysisResponse(BaseModel):
    provider: str
    summary: str
    recommended_actions: List[str]
    confidence_score: int
    analysis_time: str
    severity_assessment: Optional[str] = None
    estimated_resolution_time: Optional[str] = None
    root_cause_suggestions: List[str] = []

class DualAnalysisResponse(BaseModel):
    claude_analysis: Optional[AIAnalysisResponse] = None
    gemini_analysis: Optional[AIAnalysisResponse] = None
    comparison_summary: str
    success: bool
    errors: List[str] = []

@router.post("/analyze-incident", response_model=DualAnalysisResponse)
async def analyze_incident_with_ai(
    request: IncidentAnalysisRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    """
    Analyze incident with Claude and/or Gemini AI using user's own API keys
    This is your core competitive differentiator - users choose between AI solutions
    """
    
    try:
        # Get user's API keys from BYOK system
        api_keys = await get_user_api_keys(db, current_user.organization_id)
        
        if not api_keys:
            raise HTTPException(
                status_code=400, 
                detail="No AI API keys configured. Please add your Claude or Gemini API keys in Settings."
            )
        
        # Verify incident exists and user has access
        incident = await verify_incident_access(db, request.incident_id, current_user.organization_id)
        
        if not incident:
            raise HTTPException(status_code=404, detail="Incident not found")
        
        # Prepare incident context for AI analysis
        incident_context = prepare_incident_context(incident, request.incident_data)
        
        results = DualAnalysisResponse(
            comparison_summary="",
            success=False,
            errors=[]
        )
        
        # Analyze with Claude if requested and API key available
        if request.provider in ["claude", "both"] and "claude" in api_keys:
            try:
                claude_service = ClaudeService(api_keys["claude"])
                claude_result = await claude_service.analyze_incident(incident_context)
                results.claude_analysis = claude_result
                logger.info(f"Claude analysis completed for incident {request.incident_id}")
            except Exception as e:
                logger.error(f"Claude analysis failed: {e}")
                results.errors.append(f"Claude analysis failed: {str(e)}")
        
        # Analyze with Gemini if requested and API key available
        if request.provider in ["gemini", "both"] and "gemini" in api_keys:
            try:
                gemini_service = GeminiService(api_keys["gemini"])
                gemini_result = await gemini_service.analyze_incident(incident_context)
                results.gemini_analysis = gemini_result
                logger.info(f"Gemini analysis completed for incident {request.incident_id}")
            except Exception as e:
                logger.error(f"Gemini analysis failed: {e}")
                results.errors.append(f"Gemini analysis failed: {str(e)}")
        
        # Generate comparison if both analyses completed
        if results.claude_analysis and results.gemini_analysis:
            results.comparison_summary = generate_comparison_summary(
                results.claude_analysis, 
                results.gemini_analysis
            )
        
        # Mark as successful if at least one analysis completed
        results.success = bool(results.claude_analysis or results.gemini_analysis)
        
        if not results.success:
            raise HTTPException(
                status_code=500,
                detail=f"All AI analyses failed. Errors: {'; '.join(results.errors)}"
            )
        
        return results
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"AI analysis error: {e}")
        raise HTTPException(status_code=500, detail=f"AI analysis failed: {str(e)}")

@router.get("/providers")
async def get_available_ai_providers(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    """Get list of AI providers user has configured"""
    
    try:
        api_keys = await get_user_api_keys(db, current_user.organization_id)
        
        providers = []
        if "claude" in api_keys:
            providers.append({
                "name": "claude",
                "display_name": "Anthropic Claude",
                "description": "Advanced reasoning and analysis",
                "available": True
            })
        
        if "gemini" in api_keys:
            providers.append({
                "name": "gemini", 
                "display_name": "Google Gemini",
                "description": "Multimodal AI with broad knowledge",
                "available": True
            })
        
        return {
            "providers": providers,
            "total_available": len(providers),
            "can_compare": len(providers) >= 2
        }
        
    except Exception as e:
        logger.error(f"Error getting AI providers: {e}")
        raise HTTPException(status_code=500, detail="Failed to get AI providers")

# Helper Functions
async def get_user_api_keys(db: AsyncSession, organization_id: str) -> Dict[str, str]:
    """Get decrypted API keys for user's organization"""
    
    try:
        query = select(APIKey).where(
            APIKey.organization_id == organization_id,
            APIKey.is_valid == True
        )
        
        result = await db.execute(query)
        api_keys = result.scalars().all()
        
        decrypted_keys = {}
        for key in api_keys:
            try:
                from app.services.encryption_service import EncryptionService
                decrypted_key = EncryptionService.decrypt_api_key(key.encrypted_key)
                decrypted_keys[key.provider] = decrypted_key
            except Exception as e:
                logger.error(f"Failed to decrypt API key for {key.provider}: {e}")
        
        return decrypted_keys
        
    except Exception as e:
        logger.error(f"Error fetching API keys: {e}")
        return {}

async def verify_incident_access(db: AsyncSession, incident_id: str, organization_id: str) -> Optional[Incident]:
    """Verify user has access to incident"""
    
    query = select(Incident).where(
        Incident.id == incident_id,
        Incident.organization_id == organization_id
    )
    
    result = await db.execute(query)
    return result.scalar_one_or_none()

def prepare_incident_context(incident: Incident, additional_data: Dict[str, Any]) -> Dict[str, Any]:
    """Prepare incident data for AI analysis"""
    
    return {
        "incident_id": str(incident.id),
        "title": incident.title,
        "description": incident.description or "",
        "severity": incident.severity,
        "status": incident.status,
        "created_at": incident.created_at.isoformat(),
        "additional_context": additional_data,
        "tags": incident.tags or [],
        "extra_data": incident.extra_data or {}
    }

def generate_comparison_summary(claude_analysis: AIAnalysisResponse, gemini_analysis: AIAnalysisResponse) -> str:
    """Generate a comparison between Claude and Gemini analyses"""
    
    claude_confidence = claude_analysis.confidence_score
    gemini_confidence = gemini_analysis.confidence_score
    
    if abs(claude_confidence - gemini_confidence) <= 10:
        agreement = "Both AI providers show similar confidence levels"
    elif claude_confidence > gemini_confidence:
        agreement = "Claude shows higher confidence in its analysis"
    else:
        agreement = "Gemini shows higher confidence in its analysis"
    
    # Compare recommended actions
    claude_actions = set(claude_analysis.recommended_actions)
    gemini_actions = set(gemini_analysis.recommended_actions)
    common_actions = claude_actions.intersection(gemini_actions)
    
    if common_actions:
        action_comparison = f"Both AIs recommend: {', '.join(list(common_actions)[:3])}"
    else:
        action_comparison = "The AIs suggest different approaches"
    
    return f"{agreement}. {action_comparison}. Review both analyses to choose the best approach for your situation."