# backend/app/services/real_ai_service.py - ENHANCED WITH BYOK
import asyncio
import json
import time
import logging
import aiohttp
from typing import Dict, List, Optional, Any
import os
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

logger = logging.getLogger(__name__)

class RealAIService:
    """Real AI service with BYOK integration - users bring their own API keys"""
    
    def __init__(self, db: AsyncSession = None, organization_id: str = None):
        self.db = db
        self.organization_id = organization_id
        
        # Fallback to environment variables if no DB session
        self.claude_api_key = os.getenv('ANTHROPIC_API_KEY')
        self.gemini_api_key = os.getenv('GEMINI_API_KEY')
        
        # Will be populated from BYOK system
        self.user_api_keys = {}
        
        logger.info(f"RealAIService initialized - BYOK enabled: {bool(db and organization_id)}")
    
    async def load_user_api_keys(self):
        """Load user's API keys from BYOK system"""
        
        if not self.db or not self.organization_id:
            logger.info("Using environment API keys (no BYOK)")
            return
        
        try:
            from app.models.api_keys import APIKey
            from app.services.encryption_service import EncryptionService
            
            query = select(APIKey).where(
                APIKey.organization_id == self.organization_id,
                APIKey.is_valid == True
            )
            
            result = await self.db.execute(query)
            api_keys = result.scalars().all()
            
            for key in api_keys:
                try:
                    decrypted_key = EncryptionService.decrypt_api_key(key.encrypted_key)
                    self.user_api_keys[key.provider] = decrypted_key
                    logger.info(f"Loaded {key.provider} API key from BYOK")
                except Exception as e:
                    logger.error(f"Failed to decrypt {key.provider} key: {e}")
            
            # Update keys for analysis
            if 'claude' in self.user_api_keys:
                self.claude_api_key = self.user_api_keys['claude']
            if 'gemini' in self.user_api_keys:
                self.gemini_api_key = self.user_api_keys['gemini']
                
            logger.info(f"BYOK loaded - Claude: {bool(self.claude_api_key)}, Gemini: {bool(self.gemini_api_key)}")
            
        except Exception as e:
            logger.error(f"Failed to load BYOK keys: {e}")
            # Continue with environment keys as fallback
    
    async def analyze_incident_with_claude(self, incident_data: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze incident using real Claude API with user's key"""
        
        # Load user keys if not already loaded
        if self.db and not self.user_api_keys and self.organization_id:
            await self.load_user_api_keys()
        
        if not self.claude_api_key:
            return self._mock_analysis("claude", incident_data, api_error="No Claude API key configured")
            
        try:
            headers = {
                'Content-Type': 'application/json',
                'x-api-key': self.claude_api_key,
                'anthropic-version': '2023-06-01'
            }
            
            # Enhanced prompt for better incident analysis
            prompt = f"""You are an expert DevOps/SRE engineer specializing in incident response. Analyze this production incident:

INCIDENT TITLE: {incident_data.get('title', 'Unknown incident')}
DESCRIPTION: {incident_data.get('description', 'No description provided')}
SEVERITY: {incident_data.get('severity', 'UNKNOWN')}
AFFECTED SYSTEMS: {incident_data.get('affected_systems', [])}
TAGS: {incident_data.get('tags', [])}

Provide a detailed technical analysis with actionable recommendations. Respond with valid JSON:

{{
    "provider": "claude",
    "confidence_score": 0.95,
    "predicted_severity": "CRITICAL|HIGH|MEDIUM|LOW",
    "root_cause": "Specific technical root cause analysis",
    "business_impact": "Clear business impact description",
    "recommended_actions": [
        "Immediate action 1 - most critical",
        "Action 2 - investigation step", 
        "Action 3 - prevention measure"
    ],
    "auto_resolvable": true|false,
    "estimated_resolution_minutes": 15,
    "technical_details": "Additional technical context",
    "prevention_steps": [
        "Long-term prevention step 1",
        "Prevention step 2"
    ]
}}

Focus on practical, actionable solutions. Be specific about commands, configurations, or code changes needed."""
            
            payload = {
                'model': 'claude-3-5-sonnet-20241022',
                'max_tokens': 1500,
                'messages': [{'role': 'user', 'content': prompt}]
            }
            
            timeout = aiohttp.ClientTimeout(total=30)
            async with aiohttp.ClientSession(timeout=timeout) as session:
                async with session.post(
                    'https://api.anthropic.com/v1/messages',
                    headers=headers,
                    json=payload
                ) as response:
                    
                    if response.status == 200:
                        result = await response.json()
                        content = result.get('content', [{}])[0].get('text', '')
                        
                        # Extract JSON from response
                        start_idx = content.find('{')
                        end_idx = content.rfind('}') + 1
                        
                        if start_idx >= 0 and end_idx > start_idx:
                            json_str = content[start_idx:end_idx]
                            parsed = json.loads(json_str)
                            parsed['api_success'] = True
                            parsed['api_source'] = 'user_byok' if 'claude' in self.user_api_keys else 'environment'
                            
                            # Update usage tracking in BYOK system
                            if self.db and self.organization_id and 'claude' in self.user_api_keys:
                                await self._update_api_key_usage('claude', len(content))
                            
                            logger.info(f"Claude analysis successful - confidence: {parsed.get('confidence_score', 0)}")
                            return parsed
                        else:
                            logger.warning("Claude returned non-JSON response")
                            return self._mock_analysis("claude", incident_data, api_error="JSON parsing failed")
                    else:
                        error_text = await response.text()
                        logger.error(f"Claude API error {response.status}: {error_text}")
                        return self._mock_analysis("claude", incident_data, api_error=f"HTTP {response.status}")
                        
        except Exception as e:
            logger.error(f"Claude analysis failed: {str(e)}")
            return self._mock_analysis("claude", incident_data, api_error=str(e))
    
    async def analyze_incident_with_gemini(self, incident_data: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze incident using real Gemini API with user's key"""
        
        # Load user keys if not already loaded
        if self.db and not self.user_api_keys and self.organization_id:
            await self.load_user_api_keys()
        
        if not self.gemini_api_key:
            return self._mock_analysis("gemini", incident_data, api_error="No Gemini API key configured")
            
        try:
            # Enhanced prompt for Gemini
            prompt = f"""As a senior Site Reliability Engineer, analyze this production incident and provide structured recommendations:

INCIDENT: {incident_data.get('title', 'Unknown incident')}
DETAILS: {incident_data.get('description', 'No description provided')}
SEVERITY: {incident_data.get('severity', 'UNKNOWN')}
AFFECTED_SYSTEMS: {incident_data.get('affected_systems', [])}
CONTEXT: {incident_data.get('tags', [])}

Provide technical analysis in this exact JSON format:

{{
    "provider": "gemini",
    "confidence_score": 0.90,
    "predicted_severity": "CRITICAL|HIGH|MEDIUM|LOW", 
    "root_cause": "Technical root cause with specific details",
    "business_impact": "Business impact assessment",
    "recommended_actions": [
        "Priority 1: Immediate stabilization action",
        "Priority 2: Investigation action",
        "Priority 3: Resolution action"
    ],
    "auto_resolvable": false,
    "estimated_resolution_minutes": 20,
    "technical_details": "Additional technical analysis",
    "monitoring_commands": [
        "Command 1 for monitoring",
        "Command 2 for diagnostics"
    ]
}}

Be specific about commands, logs to check, and technical steps. Focus on rapid resolution."""
            
            url = f'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={self.gemini_api_key}'
            
            payload = {
                'contents': [{'parts': [{'text': prompt}]}],
                'generationConfig': {
                    'temperature': 0.1,
                    'maxOutputTokens': 1500,
                }
            }
            
            timeout = aiohttp.ClientTimeout(total=30)
            async with aiohttp.ClientSession(timeout=timeout) as session:
                async with session.post(url, json=payload) as response:
                    
                    if response.status == 200:
                        result = await response.json()
                        candidates = result.get('candidates', [])
                        if candidates:
                            content = candidates[0].get('content', {}).get('parts', [{}])[0].get('text', '')
                            
                            # Extract JSON
                            start_idx = content.find('{')
                            end_idx = content.rfind('}') + 1
                            
                            if start_idx >= 0 and end_idx > start_idx:
                                json_str = content[start_idx:end_idx]
                                parsed = json.loads(json_str)
                                parsed['api_success'] = True
                                parsed['api_source'] = 'user_byok' if 'gemini' in self.user_api_keys else 'environment'
                                
                                # Update usage tracking
                                if self.db and self.organization_id and 'gemini' in self.user_api_keys:
                                    await self._update_api_key_usage('gemini', len(content))
                                
                                logger.info(f"Gemini analysis successful - confidence: {parsed.get('confidence_score', 0)}")
                                return parsed
                            else:
                                logger.warning("Gemini returned non-JSON response")
                                return self._mock_analysis("gemini", incident_data, api_error="JSON parsing failed")
                        else:
                            return self._mock_analysis("gemini", incident_data, api_error="No candidates in response")
                    else:
                        error_text = await response.text()
                        logger.error(f"Gemini API error {response.status}: {error_text}")
                        return self._mock_analysis("gemini", incident_data, api_error=f"HTTP {response.status}")
                        
        except Exception as e:
            logger.error(f"Gemini analysis failed: {str(e)}")
            return self._mock_analysis("gemini", incident_data, api_error=str(e))
    
    async def multi_ai_analysis(self, incident_data: Dict[str, Any]) -> Dict[str, Any]:
        """Get analysis from multiple AI providers using BYOK"""
        
        start_time = time.time()
        
        # Load user API keys first
        if self.db and self.organization_id:
            await self.load_user_api_keys()
        
        # Run both AIs in parallel
        claude_task = self.analyze_incident_with_claude(incident_data)
        gemini_task = self.analyze_incident_with_gemini(incident_data)
        
        claude_result, gemini_result = await asyncio.gather(claude_task, gemini_task)
        
        processing_time = time.time() - start_time
        
        # Create enhanced consensus
        consensus = self._create_consensus(claude_result, gemini_result)
        
        # Add BYOK metadata
        byok_status = {
            'using_byok': bool(self.user_api_keys),
            'claude_source': claude_result.get('api_source', 'fallback'),
            'gemini_source': gemini_result.get('api_source', 'fallback'),
            'total_providers_configured': len(self.user_api_keys),
            'successful_analyses': sum(1 for r in [claude_result, gemini_result] if r.get('api_success'))
        }
        
        return {
            'claude_analysis': claude_result,
            'gemini_analysis': gemini_result,
            'consensus': consensus,
            'processing_time': processing_time,
            'timestamp': datetime.utcnow().isoformat(),
            'meets_sla': processing_time < 2.0,
            'byok_status': byok_status
        }
    
    async def _update_api_key_usage(self, provider: str, tokens_used: int):
        """Update API key usage statistics in BYOK system"""
        
        if not self.db or not self.organization_id:
            return
        
        try:
            from app.models.api_keys import APIKey
            from sqlalchemy import update
            
            # Update usage stats
            stmt = update(APIKey).where(
                APIKey.organization_id == self.organization_id,
                APIKey.provider == provider
            ).values(
                total_requests=APIKey.total_requests + 1,
                total_tokens=APIKey.total_tokens + tokens_used,
                last_used=datetime.utcnow()
            )
            
            await self.db.execute(stmt)
            await self.db.commit()
            
        except Exception as e:
            logger.error(f"Failed to update API key usage: {e}")
    
    def _create_consensus(self, claude_result: Dict, gemini_result: Dict) -> Dict[str, Any]:
        """Create enhanced consensus from multiple AI analyses"""
        
        claude_confidence = claude_result.get('confidence_score', 0.5)
        gemini_confidence = gemini_result.get('confidence_score', 0.5)
        claude_success = claude_result.get('api_success', False)
        gemini_success = gemini_result.get('api_success', False)
        
        # Use successful analysis with higher confidence
        if claude_success and gemini_success:
            primary = claude_result if claude_confidence >= gemini_confidence else gemini_result
            secondary = gemini_result if claude_confidence >= gemini_confidence else claude_result
            consensus_confidence = (claude_confidence + gemini_confidence) / 2
        elif claude_success:
            primary = claude_result
            secondary = None
            consensus_confidence = claude_confidence
        elif gemini_success:
            primary = gemini_result
            secondary = None
            consensus_confidence = gemini_confidence
        else:
            # Both failed, use fallback
            primary = claude_result
            secondary = None
            consensus_confidence = 0.5
        
        # Combine recommendations from both if available
        combined_actions = primary.get('recommended_actions', [])
        if secondary and secondary.get('recommended_actions'):
            # Add unique actions from secondary
            secondary_actions = secondary.get('recommended_actions', [])
            for action in secondary_actions:
                if action not in combined_actions:
                    combined_actions.append(action)
        
        return {
            "consensus_root_cause": primary.get('root_cause', 'Multiple factors identified'),
            "consensus_severity": primary.get('predicted_severity', 'MEDIUM'),
            "consensus_confidence": consensus_confidence,
            "recommended_actions": combined_actions[:5],  # Limit to top 5
            "estimated_resolution_minutes": min(
                claude_result.get('estimated_resolution_minutes', 60),
                gemini_result.get('estimated_resolution_minutes', 60)
            ),
            "providers_responding": {
                "claude": claude_success,
                "gemini": gemini_success
            },
            "primary_analysis_source": primary.get('provider', 'unknown'),
            "consensus_quality": "high" if claude_success and gemini_success else "medium" if claude_success or gemini_success else "low"
        }
    
    def _mock_analysis(self, provider: str, incident_data: Dict[str, Any], api_error: str = None) -> Dict[str, Any]:
        """Enhanced fallback analysis when API fails"""
        
        incident_title = incident_data.get('title', '').lower()
        incident_desc = incident_data.get('description', '').lower()
        
        # Intelligent analysis based on incident content
        if any(keyword in incident_title + incident_desc for keyword in ['kubernetes', 'pod', 'container', 'k8s']):
            analysis = {
                "provider": provider,
                "confidence_score": 0.85,
                "predicted_severity": "HIGH",
                "root_cause": "Kubernetes pod failure - likely container configuration or dependency issue",
                "business_impact": "Backend service unavailable, affecting customer operations",
                "recommended_actions": [
                    "Check pod logs: kubectl logs -f <pod-name>",
                    "Verify container image and dependencies",
                    "Review resource limits and requests",
                    "Check ConfigMaps and Secrets",
                    "Restart deployment if needed"
                ],
                "auto_resolvable": True,
                "estimated_resolution_minutes": 15,
                "api_success": False
            }
        elif any(keyword in incident_title + incident_desc for keyword in ['database', 'db', 'sql', 'connection']):
            analysis = {
                "provider": provider,
                "confidence_score": 0.80,
                "predicted_severity": "HIGH",
                "root_cause": "Database connectivity or performance issue",
                "business_impact": "Data access disrupted, application functionality impacted",
                "recommended_actions": [
                    "Check database connection pool status",
                    "Verify database server health",
                    "Review slow query logs",
                    "Check network connectivity",
                    "Monitor connection timeouts"
                ],
                "auto_resolvable": False,
                "estimated_resolution_minutes": 25,
                "api_success": False
            }
        else:
            # Generic system issue
            analysis = {
                "provider": provider,
                "confidence_score": 0.75,
                "predicted_severity": "MEDIUM",
                "root_cause": "System issue requiring investigation",
                "business_impact": "Service disruption possible",
                "recommended_actions": [
                    "Check system logs and metrics",
                    "Verify service health endpoints",
                    "Monitor resource utilization",
                    "Review recent deployments",
                    "Check external dependencies"
                ],
                "auto_resolvable": False,
                "estimated_resolution_minutes": 30,
                "api_success": False
            }
        
        if api_error:
            analysis['api_error'] = api_error
            analysis['fallback_reason'] = f"Using intelligent fallback due to: {api_error}"
            
        return analysis