# backend/app/services/slack_service.py
import json
from typing import Dict, Any, List
from slack_sdk.web.async_client import AsyncWebClient
from slack_sdk.signature import SignatureVerifier
from app.core.config import settings
from app.models.incident import Incident
from app.models.user import User

class SlackService:
    def __init__(self):
        if not settings.SLACK_BOT_TOKEN:
            raise ValueError("SLACK_BOT_TOKEN not configured")
        self.client = AsyncWebClient(token=settings.SLACK_BOT_TOKEN)
        self.verifier = SignatureVerifier(settings.SLACK_SIGNING_SECRET)

    def _get_severity_emoji(self, severity: str) -> str:
        """Get emoji for incident severity"""
        emojis = {
            "critical": "🔴",
            "high": "🟠", 
            "medium": "🟡",
            "low": "🟢"
        }
        return emojis.get(severity.lower(), "⚪")

    def _get_status_emoji(self, status: str) -> str:
        """Get emoji for incident status"""
        emojis = {
            "open": "🚨",
            "acknowledged": "👀",
            "resolved": "✅",
            "closed": "✅"
        }
        return emojis.get(status.lower(), "❓")

    def _create_incident_blocks(self, incident: Incident) -> List[Dict[str, Any]]:
        """Create Slack blocks for incident alert"""
        severity_emoji = self._get_severity_emoji(incident.severity)
        status_emoji = self._get_status_emoji(incident.status)
        
        return [
            {
                "type": "header",
                "text": {
                    "type": "plain_text",
                    "text": f"{severity_emoji} {incident.severity.upper()} Incident"
                }
            },
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": f"*{incident.title}*\n{incident.description or 'No description provided'}"
                }
            },
            {
                "type": "section",
                "fields": [
                    {
                        "type": "mrkdwn",
                        "text": f"*Status:*\n{status_emoji} {incident.status}"
                    },
                    {
                        "type": "mrkdwn",
                        "text": f"*Severity:*\n{severity_emoji} {incident.severity}"
                    },
                    {
                        "type": "mrkdwn",
                        "text": f"*Created:*\n{incident.created_at.strftime('%Y-%m-%d %H:%M:%S')}"
                    },
                    {
                        "type": "mrkdwn",
                        "text": f"*Assigned:*\n{incident.assigned_to.full_name if incident.assigned_to else 'Unassigned'}"
                    }
                ]
            },
            {
                "type": "actions",
                "elements": [
                    {
                        "type": "button",
                        "text": {
                            "type": "plain_text",
                            "text": "👀 Acknowledge"
                        },
                        "style": "primary",
                        "value": f"ack_{incident.id}",
                        "action_id": "acknowledge_incident"
                    },
                    {
                        "type": "button",
                        "text": {
                            "type": "plain_text",
                            "text": "✅ Resolve"
                        },
                        "style": "danger",
                        "value": f"resolve_{incident.id}",
                        "action_id": "resolve_incident"
                    },
                    {
                        "type": "button",
                        "text": {
                            "type": "plain_text",
                            "text": "🔗 View Details"
                        },
                        "url": f"http://localhost:3000/incidents/{incident.id}",
                        "action_id": "view_incident"
                    }
                ]
            },
            {
                "type": "context",
                "elements": [
                    {
                        "type": "mrkdwn",
                        "text": f"Incident ID: {incident.id} | OnCall AI"
                    }
                ]
            }
        ]

    async def send_incident_alert(self, channel: str, incident: Incident) -> bool:
        """Send incident alert to Slack channel"""
        try:
            blocks = self._create_incident_blocks(incident)
            
            response = await self.client.chat_postMessage(
                channel=channel,
                text=f"🚨 {incident.severity.upper()} Incident: {incident.title}",
                blocks=blocks
            )
            
            return response["ok"]
            
        except Exception as e:
            print(f"Slack send error: {e}")
            return False

    async def send_incident_update(self, channel: str, incident: Incident, action: str, user: User) -> bool:
        """Send incident status update to Slack"""
        try:
            status_emoji = self._get_status_emoji(incident.status)
            action_text = {
                "acknowledged": "acknowledged",
                "resolved": "resolved",
                "reopened": "reopened"
            }.get(action, "updated")
            
            blocks = [
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": f"{status_emoji} *Incident {action_text}* by {user.full_name}\n*{incident.title}*"
                    }
                },
                {
                    "type": "context",
                    "elements": [
                        {
                            "type": "mrkdwn",
                            "text": f"Status: {incident.status} | {incident.created_at.strftime('%Y-%m-%d %H:%M:%S')}"
                        }
                    ]
                }
            ]
            
            response = await self.client.chat_postMessage(
                channel=channel,
                text=f"Incident {action_text}: {incident.title}",
                blocks=blocks
            )
            
            return response["ok"]
            
        except Exception as e:
            print(f"Slack update error: {e}")
            return False

    async def handle_button_interaction(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Handle Slack button interactions"""
        try:
            action = payload["actions"][0]
            action_id = action["action_id"]
            incident_id = action["value"].split("_", 1)[1]
            user_id = payload["user"]["id"]
            
            # Return data for the webhook handler to process
            return {
                "action": action_id,
                "incident_id": incident_id,
                "slack_user_id": user_id,
                "response_url": payload.get("response_url"),
                "channel": payload["channel"]["id"]
            }
            
        except Exception as e:
            print(f"Button interaction error: {e}")
            return {}

    async def update_message(self, response_url: str, text: str) -> bool:
        """Update the original message via response URL"""
        try:
            import aiohttp
            async with aiohttp.ClientSession() as session:
                async with session.post(response_url, json={"text": text}) as response:
                    return response.status == 200
        except Exception as e:
            print(f"Message update error: {e}")
            return False

    def verify_request(self, headers: Dict[str, str], body: str) -> bool:
        """Verify Slack request signature"""
        try:
            return self.verifier.is_valid_request(body, headers)
        except Exception as e:
            print(f"Slack verification error: {e}")
            return False

    async def get_user_by_slack_id(self, slack_user_id: str) -> Dict[str, Any]:
        """Get Slack user info"""
        try:
            response = await self.client.users_info(user=slack_user_id)
            if response["ok"]:
                return response["user"]
            return {}
        except Exception as e:
            print(f"Slack user lookup error: {e}")
            return {}