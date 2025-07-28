# backend/app/api/v1/endpoints/ai.py
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Dict, List, Optional

from app.database import get_async_session
from app.core.security import get_current_user
from app.models.user import User
from app.services.ai_service import AIService
from app.services.incident_service import IncidentService
from app.schemas.ai import (
    AIAnalysisRequest, AIAnalysisResponse,
    AIResolutionRequest, AIResolutionResponse,
    AlertClassificationRequest, AlertClassificationResponse,
    IncidentCorrelationRequest, IncidentCorrelationResponse,
    RunbookGenerationRequest, GeneratedRunbook,
    UserAPIKeys, AIUsageStats, AISettings, AIProviderStatus,
    AIFeedback, AICostEstimation
)

router = APIRouter()

# Core AI Analysis
@router.post("/analyze-incident", response_model=AIAnalysisResponse)
async def analyze_incident(
    request: AIAnalysisRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    """Perform comprehensive AI analysis of an incident"""
    
    ai_service = AIService(db)
    
    try:
        analysis = await ai_service.analyze_incident(
            incident_id=request.incident_id,
            organization_id=str(current_user.organization_id)
        )
        
        # Track usage for billing
        await _track_ai_usage(db, current_user, "incident_analysis", "gpt4")
        
        return analysis
        
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI analysis failed: {str(e)}")

@router.post("/classify-alert", response_model=AlertClassificationResponse)
async def classify_alert(
    request: AlertClassificationRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    """AI-powered alert severity classification"""
    
    ai_service = AIService(db)
    
    try:
        severity, confidence = await ai_service.classify_alert_severity(request.alert_data)
        
        # Generate additional insights
        suggested_title = _generate_alert_title(request.alert_data)
        suggested_description = _generate_alert_description(request.alert_data)
        affected_services = _extract_services(request.alert_data)
        
        # Track usage
        await _track_ai_usage(db, current_user, "alert_classification", "gpt4")
        
        return AlertClassificationResponse(
            predicted_severity=severity.value,
            confidence_score=confidence,
            should_create_incident=severity.value in ["CRITICAL", "HIGH"] and confidence > 0.7,
            suggested_title=suggested_title,
            suggested_description=suggested_description,
            affected_services=affected_services,
            reasoning=f"Classified as {severity.value} based on alert content analysis",
            similar_alerts_count=0  # TODO: Implement similarity search
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Alert classification failed: {str(e)}")

# Automated Resolution
@router.post("/suggest-resolution", response_model=Dict)
async def suggest_auto_resolution(
    request: AIResolutionRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    """Generate automated resolution plan for an incident"""
    
    ai_service = AIService(db)
    
    try:
        # Get user's API keys if provided
        user_api_keys = request.user_api_keys or {}
        
        resolution_plan = await ai_service.suggest_auto_resolution(
            incident_id=request.incident_id,
            organization_id=str(current_user.organization_id),
            user_api_keys=user_api_keys
        )
        
        # Track usage
        await _track_ai_usage(db, current_user, "resolution_planning", resolution_plan.provider)
        
        return {
            "resolution_plan": resolution_plan.dict(),
            "cost_estimate": await _estimate_resolution_cost(resolution_plan),
            "can_execute": resolution_plan.executable and current_user.role in ["admin", "sre"]
        }
        
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Resolution planning failed: {str(e)}")

@router.post("/execute-resolution", response_model=AIResolutionResponse)
async def execute_auto_resolution(
    request: AIResolutionRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    """Execute automated resolution plan"""
    
    # Security check - only admins and SREs can execute
    if current_user.role not in ["admin", "sre"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions for automated resolution")
    
    ai_service = AIService(db)
    
    try:
        # First get the resolution plan
        user_api_keys = request.user_api_keys or {}
        resolution_plan = await ai_service.suggest_auto_resolution(
            incident_id=request.incident_id,
            organization_id=str(current_user.organization_id),
            user_api_keys=user_api_keys
        )
        
        # Check if human approval is required for non-dry runs
        if not request.dry_run and resolution_plan.human_verification_required:
            if not request.approval_token:
                raise HTTPException(
                    status_code=400, 
                    detail="Human approval required. Please obtain approval token first."
                )
        
        # Execute the resolution
        result = await ai_service.execute_auto_resolution(
            incident_id=request.incident_id,
            organization_id=str(current_user.organization_id),
            resolution_plan=resolution_plan,
            user_id=str(current_user.id),
            dry_run=request.dry_run
        )
        
        # Track usage and results
        await _track_ai_usage(db, current_user, "resolution_execution", resolution_plan.provider)
        
        # Send notifications in background
        if result.success and not request.dry_run:
            background_tasks.add_task(
                _notify_resolution_complete,
                db, current_user, request.incident_id, result
            )
        
        return result
        
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Resolution execution failed: {str(e)}")

# Incident Correlation
@router.post("/correlate-incidents", response_model=IncidentCorrelationResponse)
async def correlate_incidents(
    request: IncidentCorrelationRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    """Find correlations between multiple incidents"""
    
    ai_service = AIService(db)
    incident_service = IncidentService(db)
    
    try:
        # Verify all incidents exist and belong to organization
        primary_incident = await incident_service.get_incident(
            request.primary_incident_id, 
            str(current_user.organization_id)
        )
        if not primary_incident:
            raise HTTPException(status_code=404, detail="Primary incident not found")
        
        # TODO: Implement AI-powered incident correlation
        # For now, return a placeholder response
        
        await _track_ai_usage(db, current_user, "incident_correlation", "gpt4")
        
        return IncidentCorrelationResponse(
            primary_incident_id=request.primary_incident_id,
            correlated_incidents=[],
            correlation_confidence=0.0,
            correlation_reasoning="Correlation analysis not yet implemented",
            suggested_merge=False
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Correlation analysis failed: {str(e)}")

# Runbook Generation
@router.post("/generate-runbook", response_model=GeneratedRunbook)
async def generate_runbook(
    request: RunbookGenerationRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    """Generate AI-powered runbook for an incident"""
    
    ai_service = AIService(db)
    incident_service = IncidentService(db)
    
    try:
        # Verify incident exists
        incident = await incident_service.get_incident(
            request.incident_id,
            str(current_user.organization_id)
        )
        if not incident:
            raise HTTPException(status_code=404, detail="Incident not found")
        
        # TODO: Implement AI runbook generation
        # For now, return a basic runbook structure
        
        from app.schemas.ai import RunbookStep
        
        basic_steps = [
            RunbookStep(
                step_number=1,
                title="Initial Assessment",
                description="Check system health and identify the scope of the issue",
                commands=["kubectl get pods", "curl -f http://health-endpoint"],
                expected_output="System status information",
                troubleshooting_tips=["If pods are not running, check logs", "Verify network connectivity"]
            ),
            RunbookStep(
                step_number=2,
                title="Investigate Root Cause",
                description="Review logs and metrics to identify the root cause",
                commands=["tail -f /var/log/app.log", "grep ERROR /var/log/app.log"],
                expected_output="Error patterns and relevant log entries",
                troubleshooting_tips=["Look for recent changes", "Check resource usage"]
            ),
            RunbookStep(
                step_number=3,
                title="Apply Fix",
                description="Implement the identified solution",
                commands=["systemctl restart service", "kubectl rollout restart deployment/app"],
                expected_output="Service restart confirmation",
                troubleshooting_tips=["Monitor for immediate improvements", "Verify all instances are healthy"],
                escalation_criteria="If restart doesn't resolve issue within 10 minutes"
            )
        ]
        
        await _track_ai_usage(db, current_user, "runbook_generation", "gpt4")
        
        return GeneratedRunbook(
            incident_id=request.incident_id,
            title=f"Runbook for {incident.title}",
            description=f"AI-generated resolution steps for {incident.severity.value} severity incident",
            prerequisites=["kubectl access", "SSH access to servers", "Admin privileges"],
            steps=basic_steps,
            verification_steps=[
                "Verify all services are healthy",
                "Check monitoring dashboards for normal metrics",
                "Confirm user-facing functionality works"
            ],
            prevention_measures=[
                "Add additional monitoring for early detection",
                "Review and update alerting thresholds",
                "Document lessons learned"
            ],
            estimated_time_minutes=30,
            difficulty_level="medium"
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Runbook generation failed: {str(e)}")

# User API Key Management
@router.post("/api-keys")
async def save_user_api_keys(
    api_keys: UserAPIKeys,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    """Save user's AI provider API keys (encrypted)"""
    
    # TODO: Implement secure API key storage with encryption
    # For now, return success
    
    return {"message": "API keys saved successfully", "providers_configured": 0}

@router.get("/api-keys", response_model=UserAPIKeys)
async def get_user_api_keys(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    """Get user's configured API keys (masked)"""
    
    # TODO: Implement secure API key retrieval
    # Return masked keys for UI display
    
    return UserAPIKeys(
        claude_code_api_key="sk-****" if True else None,
        gemini_api_key="AIza****" if False else None,
        openai_api_key="sk-****" if True else None,
        anthropic_api_key="sk-****" if False else None
    )

# Usage and Billing
@router.get("/usage-stats", response_model=AIUsageStats)
async def get_ai_usage_stats(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    """Get AI usage statistics for current user/organization"""
    
    # TODO: Implement usage tracking from database
    
    return AIUsageStats(
        user_id=str(current_user.id),
        organization_id=str(current_user.organization_id),
        provider="gpt4",
        requests_this_month=0,
        estimated_cost_usd=0.0,
        tokens_used=0,
        successful_resolutions=0
    )

@router.get("/cost-estimate")
async def estimate_ai_costs(
    operation: str,
    complexity: str = "medium",
    current_user: User = Depends(get_current_user)
):
    """Get cost estimate for AI operations"""
    
    # Simple cost estimation logic
    base_costs = {
        "incident_analysis": 0.05,
        "alert_classification": 0.01,
        "resolution_planning": 0.10,
        "resolution_execution": 0.15,
        "runbook_generation": 0.08
    }
    
    complexity_multipliers = {
        "low": 0.5,
        "medium": 1.0,
        "high": 2.0,
        "critical": 3.0
    }
    
    base_cost = base_costs.get(operation, 0.05)
    multiplier = complexity_multipliers.get(complexity, 1.0)
    estimated_cost = base_cost * multiplier
    
    return AICostEstimation(
        operation_type=operation,
        estimated_tokens=int(estimated_cost * 1000),  # Rough tokens estimate
        estimated_cost_usd=estimated_cost,
        provider="gpt4",
        complexity_factor=multiplier
    )

# Provider Status
@router.get("/provider-status", response_model=List[AIProviderStatus])
async def get_ai_provider_status(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    """Get status of all AI providers"""
    
    from app.schemas.ai import AIProvider
    
    # TODO: Implement real provider health checks
    providers = []
    
    for provider in AIProvider:
        providers.append(AIProviderStatus(
            provider=provider,
            available=provider == AIProvider.GPT4,  # Only GPT4 available for now
            api_key_configured=provider == AIProvider.GPT4,
            requests_today=0,
            rate_limit_remaining=1000
        ))
    
    return providers

# Feedback and Learning
@router.post("/feedback")
async def submit_ai_feedback(
    feedback: AIFeedback,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    """Submit feedback on AI recommendations"""
    
    # TODO: Store feedback in database for model improvement
    
    return {"message": "Feedback submitted successfully", "feedback_id": "feedback_123"}

@router.get("/settings", response_model=AISettings)
async def get_ai_settings(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    """Get organization AI settings"""
    
    # TODO: Implement settings storage in database
    
    from app.schemas.ai import AIProvider, RiskLevel
    
    return AISettings(
        organization_id=str(current_user.organization_id),
        auto_classification_enabled=True,
        auto_resolution_enabled=False,
        max_auto_resolution_risk=RiskLevel.LOW,
        require_human_approval=True,
        ai_provider_preference=[AIProvider.GPT4, AIProvider.CLAUDE_CODE],
        monthly_ai_budget_usd=100.0,
        enable_cost_notifications=True
    )

@router.put("/settings")
async def update_ai_settings(
    settings: AISettings,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    """Update organization AI settings"""
    
    # Security check - only admins can update settings
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # TODO: Store settings in database
    
    return {"message": "AI settings updated successfully"}

# Helper Functions
async def _track_ai_usage(
    db: AsyncSession, 
    user: User, 
    operation_type: str, 
    provider: str
):
    """Track AI usage for billing and analytics"""
    
    # TODO: Implement usage tracking in database
    pass

async def _estimate_resolution_cost(resolution_plan) -> float:
    """Estimate cost of executing resolution plan"""
    
    base_cost = 0.10
    step_cost = len(resolution_plan.steps) * 0.02
    
    return base_cost + step_cost

async def _notify_resolution_complete(
    db: AsyncSession,
    user: User,
    incident_id: str,
    result
):
    """Send notification when automated resolution completes"""
    
    # TODO: Implement notification via Slack/email
    pass

def _generate_alert_title(alert_data: Dict) -> str:
    """Generate human-readable title from alert data"""
    
    # Simple title generation - could be enhanced with AI
    source = alert_data.get("source", "System")
    message = alert_data.get("message", alert_data.get("summary", "Alert"))
    
    return f"{source}: {message}"[:100]

def _generate_alert_description(alert_data: Dict) -> str:
    """Generate description from alert data"""
    
    description_parts = []
    
    if "message" in alert_data:
        description_parts.append(f"Message: {alert_data['message']}")
    
    if "details" in alert_data:
        description_parts.append(f"Details: {alert_data['details']}")
    
    if "host" in alert_data:
        description_parts.append(f"Host: {alert_data['host']}")
    
    return "\n".join(description_parts) if description_parts else "No additional details available"

def _extract_services(alert_data: Dict) -> List[str]:
    """Extract affected services from alert data"""
    
    services = []
    
    # Look for common service indicators
    if "service" in alert_data:
        services.append(alert_data["service"])
    
    if "tags" in alert_data:
        for tag in alert_data["tags"]:
            if "service:" in str(tag):
                services.append(str(tag).split("service:")[-1])
    
    return list(set(services))[:5]  # Limit to 5 services