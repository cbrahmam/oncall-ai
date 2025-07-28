# backend/app/schemas/ai.py
from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any
from datetime import datetime
from enum import Enum

class AIProvider(str, Enum):
    """Supported AI providers for incident resolution"""
    CLAUDE_CODE = "claude_code"
    GEMINI_CLI = "gemini_cli"
    GPT4 = "gpt4"
    FALLBACK = "fallback"

class CommandType(str, Enum):
    """Types of commands that can be executed"""
    API_CALL = "api_call"
    CLI_COMMAND = "cli_command"
    DATABASE_QUERY = "database_query"
    KUBERNETES = "kubernetes"
    TERRAFORM = "terraform"
    ANSIBLE = "ansible"

class RiskLevel(str, Enum):
    """Risk levels for automated actions"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

# Request/Response Models
class AIAnalysisRequest(BaseModel):
    """Request for incident AI analysis"""
    incident_id: str = Field(..., description="Incident ID to analyze")
    include_historical: bool = Field(True, description="Include historical incident analysis")
    include_recommendations: bool = Field(True, description="Include action recommendations")

class IncidentInsights(BaseModel):
    """AI-generated insights about an incident"""
    pattern_analysis: str = Field(..., description="Analysis of incident patterns")
    root_cause_hypothesis: str = Field(..., description="Potential root cause")
    affected_systems: List[str] = Field(default=[], description="List of affected systems")
    business_impact: str = Field(..., description="Assessment of business impact")
    prevention_suggestions: List[str] = Field(default=[], description="Suggestions to prevent similar incidents")

class AIAnalysisResponse(BaseModel):
    """Response from incident AI analysis"""
    incident_id: str
    severity_prediction: Optional[str] = Field(None, description="AI-predicted severity")
    confidence_score: float = Field(..., ge=0.0, le=1.0, description="Confidence in analysis")
    insights: IncidentInsights
    similar_incidents_count: int = Field(0, description="Number of similar historical incidents")
    estimated_resolution_time: int = Field(..., description="Estimated resolution time in minutes")
    impact_assessment: str = Field(..., description="High/Medium/Low impact assessment")
    recommended_actions: List[str] = Field(default=[], description="Specific recommended actions")
    auto_resolution_available: bool = Field(False, description="Whether auto-resolution is possible")
    analysis_timestamp: datetime = Field(default_factory=datetime.utcnow)

# Auto-Resolution Models
class ResolutionStep(BaseModel):
    """Single step in an automated resolution plan"""
    order: int = Field(..., description="Execution order")
    description: str = Field(..., description="Human-readable description")
    command: str = Field(..., description="Command to execute")
    command_type: CommandType = Field(..., description="Type of command")
    expected_result: str = Field(..., description="Expected outcome")
    rollback_command: Optional[str] = Field(None, description="Command to rollback if needed")
    timeout_seconds: int = Field(300, description="Timeout for command execution")
    critical: bool = Field(False, description="Whether failure should stop entire plan")

class AutoResolutionPlan(BaseModel):
    """Complete automated resolution plan"""
    provider: AIProvider = Field(..., description="AI provider that generated this plan")
    executable: bool = Field(..., description="Whether this plan can be executed")
    confidence_score: float = Field(..., ge=0.0, le=1.0, description="Confidence in resolution plan")
    estimated_time_minutes: int = Field(..., description="Estimated execution time")
    risk_level: RiskLevel = Field(..., description="Risk level of executing this plan")
    steps: List[ResolutionStep] = Field(..., description="Ordered list of resolution steps")
    human_verification_required: bool = Field(True, description="Whether human approval is needed")
    audit_trail: str = Field(..., description="Audit information about plan generation")
    prerequisites: List[str] = Field(default=[], description="Prerequisites before execution")
    success_criteria: List[str] = Field(default=[], description="Criteria to determine success")

class AIResolutionRequest(BaseModel):
    """Request for automated incident resolution"""
    incident_id: str = Field(..., description="Incident ID to resolve")
    dry_run: bool = Field(True, description="Whether to simulate execution")
    user_api_keys: Optional[Dict[str, str]] = Field(None, description="User's API keys for AI providers")
    force_provider: Optional[AIProvider] = Field(None, description="Force specific AI provider")
    approval_token: Optional[str] = Field(None, description="Human approval token for high-risk operations")

class CommandExecutionResult(BaseModel):
    """Result of executing a single command"""
    step_order: int
    command: str
    status: str = Field(..., description="success/error/timeout/skipped")
    output: Optional[str] = Field(None, description="Command output")
    error_message: Optional[str] = Field(None, description="Error details if failed")
    execution_time_seconds: float = Field(0.0, description="Time taken to execute")
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class AIResolutionResponse(BaseModel):
    """Response from automated resolution attempt"""
    success: bool = Field(..., description="Whether resolution was successful")
    message: str = Field(..., description="Human-readable result message")
    executed_commands: List[Dict[str, Any]] = Field(default=[], description="Commands that were executed")
    dry_run: bool = Field(True, description="Whether this was a simulation")
    estimated_time_saved: Optional[int] = Field(None, description="Minutes saved by automation")
    resolution_plan_id: Optional[str] = Field(None, description="ID of the resolution plan used")
    execution_timestamp: datetime = Field(default_factory=datetime.utcnow)

# API Key Management
class UserAPIKeys(BaseModel):
    """User's API keys for different AI providers"""
    claude_code_api_key: Optional[str] = Field(None, description="Claude Code API key")
    gemini_api_key: Optional[str] = Field(None, description="Google Gemini API key")
    openai_api_key: Optional[str] = Field(None, description="OpenAI API key")
    anthropic_api_key: Optional[str] = Field(None, description="Anthropic API key")

class AIUsageStats(BaseModel):
    """AI usage statistics for billing/tracking"""
    user_id: str
    organization_id: str
    provider: AIProvider
    requests_this_month: int = Field(0, description="Number of AI requests this month")
    estimated_cost_usd: float = Field(0.0, description="Estimated cost in USD")
    tokens_used: int = Field(0, description="Total tokens consumed")
    successful_resolutions: int = Field(0, description="Number of successful auto-resolutions")
    last_updated: datetime = Field(default_factory=datetime.utcnow)

# Alert Classification
class AlertClassificationRequest(BaseModel):
    """Request for AI alert classification"""
    alert_data: Dict[str, Any] = Field(..., description="Raw alert data")
    organization_id: str = Field(..., description="Organization context for classification")
    source_integration: Optional[str] = Field(None, description="Source monitoring tool")

class AlertClassificationResponse(BaseModel):
    """Response from AI alert classification"""
    predicted_severity: str = Field(..., description="CRITICAL/HIGH/MEDIUM/LOW")
    confidence_score: float = Field(..., ge=0.0, le=1.0, description="Classification confidence")
    should_create_incident: bool = Field(..., description="Whether to auto-create incident")
    suggested_title: str = Field(..., description="AI-suggested incident title")
    suggested_description: str = Field(..., description="AI-generated description")
    affected_services: List[str] = Field(default=[], description="Identified affected services")
    reasoning: str = Field(..., description="Explanation of classification decision")
    similar_alerts_count: int = Field(0, description="Number of similar recent alerts")

# Incident Correlation
class IncidentCorrelationRequest(BaseModel):
    """Request for correlating multiple incidents/alerts"""
    primary_incident_id: str = Field(..., description="Main incident to correlate against")
    candidate_incident_ids: List[str] = Field(..., description="Potential related incidents")
    time_window_hours: int = Field(24, description="Time window for correlation analysis")

class IncidentCorrelationResponse(BaseModel):
    """Response showing incident correlations"""
    primary_incident_id: str
    correlated_incidents: List[str] = Field(default=[], description="Confirmed related incidents")
    correlation_confidence: float = Field(..., ge=0.0, le=1.0)
    correlation_reasoning: str = Field(..., description="Why incidents are related")
    suggested_merge: bool = Field(False, description="Whether incidents should be merged")
    root_incident_id: Optional[str] = Field(None, description="Identified root cause incident")

# Runbook Generation
class RunbookGenerationRequest(BaseModel):
    """Request for AI-generated runbook"""
    incident_id: str = Field(..., description="Incident to generate runbook for")
    include_historical_resolutions: bool = Field(True, description="Include past resolution steps")
    target_audience: str = Field("sre", description="junior/senior/sre/oncall")

class RunbookStep(BaseModel):
    """Single step in a runbook"""
    step_number: int
    title: str = Field(..., description="Step title")
    description: str = Field(..., description="Detailed instructions")
    commands: List[str] = Field(default=[], description="Commands to execute")
    expected_output: Optional[str] = Field(None, description="Expected command output")
    troubleshooting_tips: List[str] = Field(default=[], description="Common issues and fixes")
    escalation_criteria: Optional[str] = Field(None, description="When to escalate")

class GeneratedRunbook(BaseModel):
    """AI-generated runbook"""
    incident_id: str
    title: str = Field(..., description="Runbook title")
    description: str = Field(..., description="Runbook overview")
    prerequisites: List[str] = Field(default=[], description="Required tools/access")
    steps: List[RunbookStep] = Field(..., description="Ordered resolution steps")
    verification_steps: List[str] = Field(default=[], description="Steps to verify resolution")
    prevention_measures: List[str] = Field(default=[], description="How to prevent recurrence")
    estimated_time_minutes: int = Field(30, description="Expected execution time")
    difficulty_level: str = Field("medium", description="easy/medium/hard")
    generated_at: datetime = Field(default_factory=datetime.utcnow)

# Cost Estimation
class AICostEstimation(BaseModel):
    """Estimated cost for AI operations"""
    operation_type: str = Field(..., description="Type of AI operation")
    estimated_tokens: int = Field(..., description="Estimated token usage")
    estimated_cost_usd: float = Field(..., description="Estimated cost in USD")
    provider: AIProvider = Field(..., description="AI provider")
    complexity_factor: float = Field(1.0, description="Complexity multiplier")

# Settings and Configuration
class AISettings(BaseModel):
    """Organization-wide AI settings"""
    organization_id: str
    auto_classification_enabled: bool = Field(True, description="Enable auto alert classification")
    auto_resolution_enabled: bool = Field(False, description="Enable automated resolution")
    max_auto_resolution_risk: RiskLevel = Field(RiskLevel.LOW, description="Max risk level for auto-resolution")
    require_human_approval: bool = Field(True, description="Require human approval for resolutions")
    ai_provider_preference: List[AIProvider] = Field(default=[AIProvider.GPT4], description="Preferred AI providers in order")
    monthly_ai_budget_usd: float = Field(100.0, description="Monthly AI budget limit")
    enable_cost_notifications: bool = Field(True, description="Notify when approaching budget")

class AIProviderStatus(BaseModel):
    """Status of AI providers"""
    provider: AIProvider
    available: bool = Field(..., description="Whether provider is available")
    api_key_configured: bool = Field(..., description="Whether API key is set")
    last_health_check: datetime = Field(default_factory=datetime.utcnow)
    error_message: Optional[str] = Field(None, description="Error details if unavailable")
    requests_today: int = Field(0, description="Requests made today")
    rate_limit_remaining: Optional[int] = Field(None, description="Remaining rate limit")

# Feedback and Learning
class AIFeedback(BaseModel):
    """Feedback on AI recommendations"""
    recommendation_id: str = Field(..., description="ID of the AI recommendation")
    user_id: str
    incident_id: str
    feedback_type: str = Field(..., description="helpful/not_helpful/incorrect/dangerous")
    rating: int = Field(..., ge=1, le=5, description="1-5 star rating")
    comments: Optional[str] = Field(None, description="Additional feedback")
    actual_resolution_steps: Optional[List[str]] = Field(None, description="What actually worked")
    submitted_at: datetime = Field(default_factory=datetime.utcnow)

class AILearningMetrics(BaseModel):
    """Metrics for AI learning and improvement"""
    organization_id: str
    total_recommendations: int = Field(0)
    successful_recommendations: int = Field(0)
    user_feedback_count: int = Field(0)
    average_rating: float = Field(0.0)
    accuracy_percentage: float = Field(0.0)
    time_saved_hours: float = Field(0.0)
    cost_saved_usd: float = Field(0.0)
    last_updated: datetime = Field(default_factory=datetime.utcnow)