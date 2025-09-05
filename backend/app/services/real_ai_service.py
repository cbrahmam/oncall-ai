import asyncio
import json
import time
import logging
import aiohttp
from typing import Dict, List, Optional, Any
import os
from datetime import datetime

logger = logging.getLogger(__name__)

class RealAIService:
    """Real AI service with actual API calls to Claude and Gemini"""
    
    def __init__(self):
        self.claude_api_key = os.getenv('ANTHROPIC_API_KEY')
        self.gemini_api_key = os.getenv('GEMINI_API_KEY')
        
        logger.info(f"Claude API key present: {bool(self.claude_api_key)}")
        logger.info(f"Gemini API key present: {bool(self.gemini_api_key)}")
    
    async def analyze_incident_with_claude(self, incident_data: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze incident using real Claude API"""
        
        if not self.claude_api_key:
            return self._mock_analysis("claude", incident_data)
            
        try:
            headers = {
                'Content-Type': 'application/json',
                'x-api-key': self.claude_api_key,
                'anthropic-version': '2023-06-01'
            }
            
            prompt = f"""You are an expert DevOps engineer. Analyze this incident and respond with JSON:

INCIDENT: {incident_data.get('title', 'Unknown')}
DESCRIPTION: {incident_data.get('description', 'No description')}
SEVERITY: {incident_data.get('severity', 'UNKNOWN')}

Respond with valid JSON in this format:
{{
    "provider": "claude",
    "confidence_score": 0.95,
    "predicted_severity": "HIGH",
    "root_cause": "Specific technical cause",
    "business_impact": "Impact description",
    "recommended_actions": ["Action 1", "Action 2", "Action 3"],
    "auto_resolvable": true,
    "estimated_resolution_minutes": 15
}}"""
            
            payload = {
                'model': 'claude-3-5-sonnet-20241022',
                'max_tokens': 1000,
                'messages': [{'role': 'user', 'content': prompt}]
            }
            
            timeout = aiohttp.ClientTimeout(total=20)
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
                            return parsed
                        else:
                            return self._mock_analysis("claude", incident_data, api_error="JSON parsing failed")
                    else:
                        error_text = await response.text()
                        logger.error(f"Claude API error {response.status}: {error_text}")
                        return self._mock_analysis("claude", incident_data, api_error=f"HTTP {response.status}")
                        
        except Exception as e:
            logger.error(f"Claude analysis failed: {str(e)}")
            return self._mock_analysis("claude", incident_data, api_error=str(e))
    
    async def analyze_incident_with_gemini(self, incident_data: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze incident using real Gemini API"""
        
        if not self.gemini_api_key:
            return self._mock_analysis("gemini", incident_data)
            
        try:
            prompt = f"""As a senior SRE, analyze this production incident and respond with JSON:

INCIDENT: {incident_data.get('title', 'Unknown')}
DETAILS: {incident_data.get('description', 'No description')}
SEVERITY: {incident_data.get('severity', 'UNKNOWN')}

Response format (valid JSON only):
{{
    "provider": "gemini",
    "confidence_score": 0.90,
    "predicted_severity": "HIGH",
    "root_cause": "Technical root cause",
    "business_impact": "Business impact",
    "recommended_actions": ["Action 1", "Action 2", "Action 3"],
    "auto_resolvable": false,
    "estimated_resolution_minutes": 20
}}"""
            
            url = f'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={self.gemini_api_key}'
            
            payload = {
                'contents': [{'parts': [{'text': prompt}]}],
                'generationConfig': {
                    'temperature': 0.1,
                    'maxOutputTokens': 1000,
                }
            }
            
            timeout = aiohttp.ClientTimeout(total=20)
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
                                return parsed
                            else:
                                return self._mock_analysis("gemini", incident_data, api_error="JSON parsing failed")
                        else:
                            return self._mock_analysis("gemini", incident_data, api_error="No candidates")
                    else:
                        error_text = await response.text()
                        logger.error(f"Gemini API error {response.status}: {error_text}")
                        return self._mock_analysis("gemini", incident_data, api_error=f"HTTP {response.status}")
                        
        except Exception as e:
            logger.error(f"Gemini analysis failed: {str(e)}")
            return self._mock_analysis("gemini", incident_data, api_error=str(e))
    
    async def multi_ai_analysis(self, incident_data: Dict[str, Any]) -> Dict[str, Any]:
        """Get analysis from multiple AI providers"""
        
        start_time = time.time()
        
        # Run both AIs in parallel
        claude_task = self.analyze_incident_with_claude(incident_data)
        gemini_task = self.analyze_incident_with_gemini(incident_data)
        
        claude_result, gemini_result = await asyncio.gather(claude_task, gemini_task)
        
        processing_time = time.time() - start_time
        
        # Create consensus
        consensus = self._create_consensus(claude_result, gemini_result)
        
        return {
            'claude_analysis': claude_result,
            'gemini_analysis': gemini_result,
            'consensus': consensus,
            'processing_time': processing_time,
            'timestamp': datetime.utcnow().isoformat(),
            'meets_sla': processing_time < 2.0
        }
    
    def _create_consensus(self, claude_result: Dict, gemini_result: Dict) -> Dict[str, Any]:
        """Create consensus from multiple AI analyses"""
        
        claude_confidence = claude_result.get('confidence_score', 0.5)
        gemini_confidence = gemini_result.get('confidence_score', 0.5)
        
        # Use higher confidence as primary
        if claude_confidence >= gemini_confidence:
            primary = claude_result
        else:
            primary = gemini_result
        
        return {
            "consensus_root_cause": primary.get('root_cause', 'Multiple factors identified'),
            "consensus_severity": primary.get('predicted_severity', 'MEDIUM'),
            "consensus_confidence": max(claude_confidence, gemini_confidence),
            "recommended_actions": primary.get('recommended_actions', []),
            "estimated_resolution_minutes": min(
                claude_result.get('estimated_resolution_minutes', 60),
                gemini_result.get('estimated_resolution_minutes', 60)
            ),
            "providers_responding": {
                "claude": claude_result.get('api_success', False),
                "gemini": gemini_result.get('api_success', False)
            }
        }
    
    def _mock_analysis(self, provider: str, incident_data: Dict[str, Any], api_error: str = None) -> Dict[str, Any]:
        """Fallback analysis when API fails"""
        
        incident_title = incident_data.get('title', '').lower()
        
        if 'kubernetes' in incident_title or 'pod' in incident_title:
            analysis = {
                "provider": provider,
                "confidence_score": 0.85,
                "predicted_severity": "HIGH",
                "root_cause": "Kubernetes pod failure - likely missing dependency 'sendgrid'",
                "business_impact": "Backend service unavailable, webhooks not working",
                "recommended_actions": [
                    "Add 'sendgrid' to requirements.txt",
                    "Rebuild Docker image with dependencies",
                    "Deploy updated image to Kubernetes"
                ],
                "auto_resolvable": True,
                "estimated_resolution_minutes": 10,
                "api_success": False
            }
        else:
            analysis = {
                "provider": provider,
                "confidence_score": 0.75,
                "predicted_severity": "MEDIUM",
                "root_cause": "System issue requiring investigation",
                "business_impact": "Service disruption possible",
                "recommended_actions": [
                    "Check system logs and metrics",
                    "Verify service health",
                    "Monitor for resolution"
                ],
                "auto_resolvable": False,
                "estimated_resolution_minutes": 30,
                "api_success": False
            }
        
        if api_error:
            analysis['api_error'] = api_error
            
        return analysis

