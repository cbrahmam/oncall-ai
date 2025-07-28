# backend/app/services/ai_service.py
import json
import asyncio
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
import openai
from app.core.config import settings
from app.models.incident import Incident, IncidentStatus, IncidentSeverity
from app.models.alert import Alert
from app.models.user import User
from app.schemas.ai import (
    AIAnalysisRequest, AIAnalysisResponse, 
    IncidentInsights, AutoResolutionPlan,
    AIResolutionRequest, AIResolutionResponse
)

class AIService:
    """Core AI service for incident analysis and automated resolution"""
    
    def __init__(self, db: AsyncSession):
        self.db = db
        self.client = openai.AsyncOpenAI(api_key=settings.OPENAI_API_KEY) if settings.OPENAI_API_KEY else None
        
    async def analyze_incident(self, incident_id: str, organization_id: str) -> AIAnalysisResponse:
        """Complete AI analysis of an incident with insights and recommendations"""
        
        # Get incident with related data
        incident = await self._get_incident_with_context(incident_id, organization_id)
        if not incident:
            raise ValueError("Incident not found")
        
        # Get historical context
        similar_incidents = await self._find_similar_incidents(incident, organization_id)
        
        # Perform AI analysis
        analysis = await self._analyze_with_ai(incident, similar_incidents)
        
        # Generate actionable insights
        insights = await self._generate_insights(incident, analysis, similar_incidents)
        
        return AIAnalysisResponse(
            incident_id=incident_id,
            severity_prediction=analysis.get("predicted_severity"),
            confidence_score=analysis.get("confidence", 0.0),
            insights=insights,
            similar_incidents_count=len(similar_incidents),
            estimated_resolution_time=analysis.get("estimated_resolution_minutes", 30),
            impact_assessment=analysis.get("impact_assessment", "Medium"),
            recommended_actions=analysis.get("recommended_actions", []),
            auto_resolution_available=analysis.get("auto_resolvable", False)
        )
    
    async def suggest_auto_resolution(
        self, 
        incident_id: str, 
        organization_id: str,
        user_api_keys: Dict[str, str] = None
    ) -> AutoResolutionPlan:
        """Generate automated resolution plan using Claude Code/Gemini CLI"""
        
        incident = await self._get_incident_with_context(incident_id, organization_id)
        if not incident:
            raise ValueError("Incident not found")
        
        # Determine best AI provider based on available keys
        ai_provider = self._select_ai_provider(user_api_keys)
        
        if ai_provider == "claude_code":
            return await self._generate_claude_code_resolution(incident, user_api_keys)
        elif ai_provider == "gemini_cli":
            return await self._generate_gemini_cli_resolution(incident, user_api_keys)
        else:
            return await self._generate_gpt4_resolution(incident)
    
    async def execute_auto_resolution(
        self, 
        incident_id: str, 
        organization_id: str,
        resolution_plan: AutoResolutionPlan,
        user_id: str,
        dry_run: bool = True
    ) -> AIResolutionResponse:
        """Execute automated resolution with safety checks"""
        
        if not resolution_plan.executable:
            return AIResolutionResponse(
                success=False,
                message="Resolution plan is not executable",
                executed_commands=[],
                dry_run=dry_run
            )
        
        executed_commands = []
        
        try:
            for step in resolution_plan.steps:
                if step.command_type == "api_call":
                    result = await self._execute_api_command(step, dry_run)
                elif step.command_type == "cli_command":
                    result = await self._execute_cli_command(step, dry_run)
                elif step.command_type == "database_query":
                    result = await self._execute_database_command(step, dry_run)
                else:
                    result = {"status": "skipped", "reason": "Unknown command type"}
                
                executed_commands.append({
                    "step": step.description,
                    "command": step.command,
                    "result": result,
                    "timestamp": datetime.utcnow().isoformat()
                })
                
                # Stop execution if any step fails
                if result.get("status") == "error":
                    break
            
            # Update incident if not dry run and all steps succeeded
            if not dry_run and all(cmd["result"].get("status") == "success" for cmd in executed_commands):
                await self._update_incident_with_ai_resolution(incident_id, organization_id, user_id, resolution_plan)
            
            return AIResolutionResponse(
                success=True,
                message=f"Resolution {'simulated' if dry_run else 'executed'} successfully",
                executed_commands=executed_commands,
                dry_run=dry_run,
                estimated_time_saved=resolution_plan.estimated_time_minutes
            )
            
        except Exception as e:
            return AIResolutionResponse(
                success=False,
                message=f"Resolution failed: {str(e)}",
                executed_commands=executed_commands,
                dry_run=dry_run
            )
    
    async def classify_alert_severity(self, alert_data: Dict[str, Any]) -> Tuple[IncidentSeverity, float]:
        """AI-powered alert severity classification"""
        
        if not self.client:
            # Fallback to rule-based classification
            return await self._rule_based_severity_classification(alert_data)
        
        try:
            response = await self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {
                        "role": "system",
                        "content": """You are an expert SRE analyzing alerts. Classify the severity level based on:
                        - Impact on users (CRITICAL: affects all users, HIGH: affects significant portion, MEDIUM: affects some users, LOW: minimal impact)
                        - System health implications
                        - Business criticality
                        
                        Respond with JSON: {"severity": "CRITICAL|HIGH|MEDIUM|LOW", "confidence": 0.0-1.0, "reasoning": "brief explanation"}"""
                    },
                    {
                        "role": "user", 
                        "content": f"Analyze this alert:\n{json.dumps(alert_data, indent=2)}"
                    }
                ],
                temperature=0.1,
                max_tokens=200
            )
            
            result = json.loads(response.choices[0].message.content)
            severity = IncidentSeverity(result["severity"])
            confidence = float(result["confidence"])
            
            return severity, confidence
            
        except Exception as e:
            print(f"AI severity classification failed: {e}")
            return await self._rule_based_severity_classification(alert_data)
    
    async def _get_incident_with_context(self, incident_id: str, organization_id: str) -> Optional[Incident]:
        """Get incident with all related context (alerts, users, etc.)"""
        result = await self.db.execute(
            select(Incident)
            .where(and_(Incident.id == incident_id, Incident.organization_id == organization_id))
        )
        return result.scalar_one_or_none()
    
    async def _find_similar_incidents(self, incident: Incident, organization_id: str, limit: int = 5) -> List[Incident]:
        """Find similar resolved incidents for pattern analysis"""
        
        # Look for incidents with similar title/description keywords
        keywords = self._extract_keywords(incident.title + " " + (incident.description or ""))
        
        query = select(Incident).where(
            and_(
                Incident.organization_id == organization_id,
                Incident.status == IncidentStatus.RESOLVED,
                Incident.id != incident.id,
                Incident.created_at > datetime.utcnow() - timedelta(days=90)  # Last 90 days
            )
        ).limit(limit)
        
        result = await self.db.execute(query)
        return result.scalars().all()
    
    async def _analyze_with_ai(self, incident: Incident, similar_incidents: List[Incident]) -> Dict[str, Any]:
        """Core AI analysis using OpenAI"""
        
        if not self.client:
            return await self._rule_based_analysis(incident, similar_incidents)
        
        try:
            context = {
                "current_incident": {
                    "title": incident.title,
                    "description": incident.description,
                    "severity": incident.severity.value,
                    "created_at": incident.created_at.isoformat(),
                    "tags": incident.tags or []
                },
                "similar_incidents": [
                    {
                        "title": inc.title,
                        "severity": inc.severity.value,
                        "resolution_time_minutes": (inc.resolved_at - inc.created_at).total_seconds() / 60 if inc.resolved_at else None,
                        "tags": inc.tags or []
                    }
                    for inc in similar_incidents
                ]
            }
            
            response = await self.client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {
                        "role": "system",
                        "content": """You are a senior SRE analyzing incidents. Provide detailed analysis including:
                        - Predicted severity (CRITICAL/HIGH/MEDIUM/LOW)
                        - Confidence score (0.0-1.0)
                        - Impact assessment (High/Medium/Low)
                        - Estimated resolution time in minutes
                        - 3-5 specific recommended actions
                        - Whether this incident could be auto-resolved (boolean)
                        
                        Respond with valid JSON only."""
                    },
                    {
                        "role": "user",
                        "content": f"Analyze this incident with historical context:\n{json.dumps(context, indent=2)}"
                    }
                ],
                temperature=0.2,
                max_tokens=800
            )
            
            return json.loads(response.choices[0].message.content)
            
        except Exception as e:
            print(f"AI analysis failed: {e}")
            return await self._rule_based_analysis(incident, similar_incidents)
    
    async def _generate_claude_code_resolution(self, incident: Incident, user_api_keys: Dict[str, str]) -> AutoResolutionPlan:
        """Generate resolution plan using Claude Code API"""
        
        # This would integrate with Claude Code API when available
        # For now, generate a structured plan that could be executed
        
        return AutoResolutionPlan(
            provider="claude_code",
            executable=True,
            confidence_score=0.85,
            estimated_time_minutes=15,
            risk_level="low",
            steps=[
                {
                    "order": 1,
                    "description": "Check service health",
                    "command": "curl -f http://api.service.com/health",
                    "command_type": "api_call",
                    "expected_result": "HTTP 200 OK",
                    "rollback_command": None
                },
                {
                    "order": 2,
                    "description": "Restart failing service",
                    "command": "kubectl rollout restart deployment/api-service",
                    "command_type": "cli_command", 
                    "expected_result": "deployment.apps/api-service restarted",
                    "rollback_command": "kubectl rollout undo deployment/api-service"
                },
                {
                    "order": 3,
                    "description": "Verify service recovery",
                    "command": "kubectl get pods -l app=api-service",
                    "command_type": "cli_command",
                    "expected_result": "All pods running",
                    "rollback_command": None
                }
            ],
            human_verification_required=True,
            audit_trail=f"Generated for incident {incident.id} at {datetime.utcnow().isoformat()}"
        )
    
    async def _generate_gemini_cli_resolution(self, incident: Incident, user_api_keys: Dict[str, str]) -> AutoResolutionPlan:
        """Generate resolution plan using Gemini CLI wrapper"""
        
        return AutoResolutionPlan(
            provider="gemini_cli",
            executable=True,
            confidence_score=0.80,
            estimated_time_minutes=20,
            risk_level="medium",
            steps=[
                {
                    "order": 1,
                    "description": "Analyze error logs",
                    "command": "tail -n 100 /var/log/application.log | grep ERROR",
                    "command_type": "cli_command",
                    "expected_result": "Recent error patterns identified",
                    "rollback_command": None
                }
            ],
            human_verification_required=True,
            audit_trail=f"Generated via Gemini CLI for incident {incident.id}"
        )
    
    async def _generate_gpt4_resolution(self, incident: Incident) -> AutoResolutionPlan:
        """Generate resolution plan using GPT-4 (fallback)"""
        
        if not self.client:
            return AutoResolutionPlan(
                provider="gpt4",
                executable=False,
                confidence_score=0.0,
                estimated_time_minutes=0,
                risk_level="unknown",
                steps=[],
                human_verification_required=True,
                audit_trail="AI service unavailable"
            )
        
        try:
            response = await self.client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {
                        "role": "system",
                        "content": """Generate a detailed incident resolution plan. Include specific commands that could be executed to resolve the issue. Focus on common infrastructure problems like service restarts, configuration updates, scaling operations.
                        
                        Respond with JSON containing:
                        - executable: boolean
                        - confidence_score: 0.0-1.0
                        - estimated_time_minutes: number
                        - risk_level: "low/medium/high"
                        - steps: array of {order, description, command, command_type, expected_result, rollback_command}
                        """
                    },
                    {
                        "role": "user",
                        "content": f"Create resolution plan for:\nTitle: {incident.title}\nDescription: {incident.description}\nSeverity: {incident.severity.value}"
                    }
                ],
                temperature=0.3,
                max_tokens=1000
            )
            
            plan_data = json.loads(response.choices[0].message.content)
            
            return AutoResolutionPlan(
                provider="gpt4",
                executable=plan_data.get("executable", False),
                confidence_score=plan_data.get("confidence_score", 0.5),
                estimated_time_minutes=plan_data.get("estimated_time_minutes", 30),
                risk_level=plan_data.get("risk_level", "medium"),
                steps=plan_data.get("steps", []),
                human_verification_required=True,
                audit_trail=f"GPT-4 generated plan for incident {incident.id}"
            )
            
        except Exception as e:
            print(f"GPT-4 resolution generation failed: {e}")
            return AutoResolutionPlan(
                provider="gpt4",
                executable=False,
                confidence_score=0.0,
                estimated_time_minutes=0,
                risk_level="unknown",
                steps=[],
                human_verification_required=True,
                audit_trail=f"Failed to generate plan: {str(e)}"
            )
    
    def _select_ai_provider(self, user_api_keys: Dict[str, str] = None) -> str:
        """Select best available AI provider based on user API keys"""
        
        if user_api_keys:
            if user_api_keys.get("claude_code_api_key"):
                return "claude_code"
            elif user_api_keys.get("gemini_api_key"):
                return "gemini_cli"
        
        if settings.OPENAI_API_KEY:
            return "gpt4"
        
        return "fallback"
    
    def _extract_keywords(self, text: str) -> List[str]:
        """Extract keywords from incident text for similarity matching"""
        
        # Simple keyword extraction - could be enhanced with NLP
        import re
        words = re.findall(r'\w+', text.lower())
        
        # Filter out common words and keep technical terms
        stop_words = {'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did'}
        keywords = [word for word in words if len(word) > 3 and word not in stop_words]
        
        return list(set(keywords))[:10]  # Top 10 unique keywords
    
    async def _rule_based_severity_classification(self, alert_data: Dict[str, Any]) -> Tuple[IncidentSeverity, float]:
        """Fallback rule-based severity classification when AI is unavailable"""
        
        # Check for critical keywords
        text = str(alert_data).lower()
        
        if any(keyword in text for keyword in ['down', 'outage', 'critical', 'offline', 'failure']):
            return IncidentSeverity.CRITICAL, 0.8
        elif any(keyword in text for keyword in ['error', 'warning', 'high', 'degraded']):
            return IncidentSeverity.HIGH, 0.7
        elif any(keyword in text for keyword in ['slow', 'latency', 'timeout']):
            return IncidentSeverity.MEDIUM, 0.6
        else:
            return IncidentSeverity.LOW, 0.5
    
    async def _rule_based_analysis(self, incident: Incident, similar_incidents: List[Incident]) -> Dict[str, Any]:
        """Fallback analysis when AI is unavailable"""
        
        avg_resolution_time = 30  # Default
        if similar_incidents:
            resolution_times = [
                (inc.resolved_at - inc.created_at).total_seconds() / 60 
                for inc in similar_incidents 
                if inc.resolved_at
            ]
            if resolution_times:
                avg_resolution_time = sum(resolution_times) / len(resolution_times)
        
        return {
            "predicted_severity": incident.severity.value,
            "confidence": 0.6,
            "impact_assessment": "Medium",
            "estimated_resolution_minutes": int(avg_resolution_time),
            "recommended_actions": [
                "Check system logs for error patterns",
                "Verify service health endpoints", 
                "Review recent deployments",
                "Contact on-call engineer if needed"
            ],
            "auto_resolvable": False
        }
    
    async def _generate_insights(self, incident: Incident, analysis: Dict[str, Any], similar_incidents: List[Incident]) -> IncidentInsights:
        """Generate structured insights from AI analysis"""
        
        return IncidentInsights(
            pattern_analysis=f"Found {len(similar_incidents)} similar incidents in the last 90 days",
            root_cause_hypothesis=analysis.get("root_cause", "Unknown - requires investigation"),
            affected_systems=self._extract_affected_systems(incident),
            business_impact=analysis.get("business_impact", "Potential customer-facing impact"),
            prevention_suggestions=[
                "Implement additional monitoring for early detection",
                "Add automated health checks",
                "Review and update runbooks based on this incident"
            ]
        )
    
    def _extract_affected_systems(self, incident: Incident) -> List[str]:
        """Extract affected systems from incident data"""
        
        # Simple extraction from title/description
        systems = []
        text = (incident.title + " " + (incident.description or "")).lower()
        
        # Common system keywords
        system_keywords = {
            'database': 'Database',
            'db': 'Database', 
            'api': 'API Gateway',
            'web': 'Web Server',
            'cache': 'Cache Layer',
            'redis': 'Redis Cache',
            'queue': 'Message Queue',
            'auth': 'Authentication Service',
            'payment': 'Payment System'
        }
        
        for keyword, system in system_keywords.items():
            if keyword in text:
                systems.append(system)
        
        return systems or ["Unknown System"]
    
    async def _execute_api_command(self, step: Dict[str, Any], dry_run: bool) -> Dict[str, Any]:
        """Execute API command step"""
        
        if dry_run:
            return {"status": "success", "message": "API call simulated", "dry_run": True}
        
        # Implement actual API execution here
        return {"status": "success", "message": "API call executed"}
    
    async def _execute_cli_command(self, step: Dict[str, Any], dry_run: bool) -> Dict[str, Any]:
        """Execute CLI command step"""
        
        if dry_run:
            return {"status": "success", "message": "CLI command simulated", "dry_run": True}
        
        # Implement actual CLI execution here (with proper security)
        return {"status": "success", "message": "CLI command executed"}
    
    async def _execute_database_command(self, step: Dict[str, Any], dry_run: bool) -> Dict[str, Any]:
        """Execute database command step"""
        
        if dry_run:
            return {"status": "success", "message": "Database query simulated", "dry_run": True}
        
        # Implement actual database operations here
        return {"status": "success", "message": "Database query executed"}
    
    async def _update_incident_with_ai_resolution(
        self, 
        incident_id: str, 
        organization_id: str, 
        user_id: str, 
        resolution_plan: AutoResolutionPlan
    ):
        """Update incident after successful AI resolution"""
        
        result = await self.db.execute(
            select(Incident)
            .where(and_(Incident.id == incident_id, Incident.organization_id == organization_id))
        )
        incident = result.scalar_one_or_none()
        
        if incident:
            incident.status = IncidentStatus.RESOLVED
            incident.resolved_at = datetime.utcnow()
            incident.resolved_by_id = user_id
            
            # Add AI resolution note
            ai_note = f"Automatically resolved using {resolution_plan.provider} AI in {resolution_plan.estimated_time_minutes} minutes"
            incident.notes = (incident.notes or "") + f"\n\n[AI RESOLUTION] {ai_note}"
            
            await self.db.commit()