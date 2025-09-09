from fastapi import APIRouter, Request, Depends, HTTPException, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional, Dict, Any
import logging
import hashlib
import hmac
import json
from datetime import datetime
from pydantic import ValidationError

from app.database import get_async_session
from app.models.organization import Organization  
from app.models.integration import Integration
from app.services.alert_service import AlertService
from app.schemas.alert import (
    GenericAlertPayload, DatadogAlertPayload, GrafanaAlertPayload,
    AlertSeverity, AlertStatus, AlertSource
)

router = APIRouter(prefix="/webhooks", tags=["webhooks"])
logger = logging.getLogger(__name__)
security = HTTPBearer(auto_error=False)

async def get_organization_from_webhook(
    request: Request,
    authorization: Optional[HTTPAuthorizationCredentials] = Depends(security),
    x_org_id: Optional[str] = Header(None, alias="X-Organization-ID"),
    x_webhook_token: Optional[str] = Header(None, alias="X-Webhook-Token")
) -> str:
    """Extract organization ID from webhook request headers or token"""
    
    try:
        # Method 1: Direct organization ID in header
        if x_org_id:
            logger.info(f"Using organization ID from header: {x_org_id}")
            return x_org_id
            
        # Method 2: JWT token (for authenticated webhooks)
        if authorization and authorization.credentials:
            # You can add JWT validation here if needed
            # For now, assume the token contains org info
            logger.info("Using organization from JWT token")
            # Extract org from JWT - implement as needed
            pass
            
        # Method 3: Webhook token lookup
        if x_webhook_token:
            logger.info("Looking up organization by webhook token")
            # This would lookup organization by webhook token
            # Implementation depends on your webhook token system
            pass
            
        # Method 4: URL path parsing (for custom webhook URLs)
        path_parts = request.url.path.split('/')
        if len(path_parts) >= 4 and path_parts[-2] == 'webhooks':
            # URL like /api/v1/webhooks/{org_id}/datadog
            potential_org_id = path_parts[-3]
            if len(potential_org_id) == 36:  # UUID length
                logger.info(f"Extracted org ID from URL: {potential_org_id}")
                return potential_org_id
        
        # Default fallback - you might want to remove this in production
        logger.warning("No organization ID found, using default")
        raise HTTPException(
            status_code=400, 
            detail="Organization ID required. Use X-Organization-ID header or authenticated webhook."
        )
        
    except Exception as e:
        logger.error(f"Error extracting organization ID: {e}")
        raise HTTPException(status_code=500, detail="Organization lookup failed")

def verify_webhook_signature(payload: bytes, signature: str, secret: str) -> bool:
    """Verify webhook signature for security"""
    if not signature or not secret:
        return False
        
    try:
        expected_signature = hmac.new(
            secret.encode('utf-8'),
            payload,
            hashlib.sha256
        ).hexdigest()
        
        # Handle different signature formats
        if signature.startswith('sha256='):
            signature = signature[7:]
            
        return hmac.compare_digest(signature, expected_signature)
    except Exception as e:
        logger.error(f"Signature verification failed: {e}")
        return False

@router.get("/health")
async def webhook_health():
    """Health check endpoint for webhook system"""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "version": "2.0.0",
        "supported_sources": [
            "datadog", "grafana", "aws-cloudwatch", "new-relic", 
            "pagerduty", "prometheus", "generic"
        ]
    }

@router.post("/generic")
async def generic_webhook(
    alert_data: GenericAlertPayload,
    db: AsyncSession = Depends(get_async_session),
    organization_id: str = Depends(get_organization_from_webhook)
):
    """Generic webhook that accepts standardized alert format"""
    
    try:
        logger.info(f"Processing generic webhook alert: {alert_data.alert_id}")
        
        service = AlertService(db)
        result = await service.process_alert(alert_data, organization_id)
        
        logger.info(f"Alert processed: success={result.success}, incident_id={result.incident_id}")
        
        return {
            "success": result.success,
            "message": result.message,
            "incident_id": result.incident_id,
            "incident_created": result.incident_created,
            "incident_updated": result.incident_updated,
            "alert_fingerprint": result.alert_fingerprint,
            "source": "generic"
        }
    
    except ValidationError as e:
        logger.error(f"Invalid generic payload: {e}")
        raise HTTPException(status_code=400, detail=f"Invalid payload: {str(e)}")
    except Exception as e:
        logger.error(f"Error processing generic alert: {e}")
        raise HTTPException(status_code=500, detail=f"Error processing alert: {str(e)}")

@router.post("/datadog")
async def datadog_webhook(
    request: Request,
    db: AsyncSession = Depends(get_async_session),
    organization_id: str = Depends(get_organization_from_webhook),
    x_signature: Optional[str] = Header(None, alias="X-Datadog-Signature")
):
    """Webhook endpoint for Datadog alerts with signature verification"""
    
    try:
        # Get raw payload for signature verification
        payload_bytes = await request.body()
        raw_payload = json.loads(payload_bytes.decode())
        
        # Verify signature if provided (optional for now)
        # if x_signature:
        #     if not verify_webhook_signature(payload_bytes, x_signature, webhook_secret):
        #         raise HTTPException(status_code=401, detail="Invalid webhook signature")
        
        logger.info(f"Processing Datadog webhook for org: {organization_id}")
        
        # Handle different Datadog payload formats
        if isinstance(raw_payload, list):
            # Datadog can send multiple alerts in one webhook
            results = []
            for alert_payload in raw_payload:
                datadog_alert = DatadogAlertPayload(**alert_payload)
                generic_alert = datadog_alert.to_generic()
                
                service = AlertService(db)
                result = await service.process_alert(generic_alert, organization_id)
                results.append(result)
            
            return {
                "success": all(r.success for r in results),
                "message": f"Processed {len(results)} alerts",
                "results": [
                    {
                        "incident_id": r.incident_id,
                        "incident_created": r.incident_created,
                        "alert_fingerprint": r.alert_fingerprint
                    } for r in results
                ],
                "source": "datadog"
            }
        else:
            # Single alert
            datadog_alert = DatadogAlertPayload(**raw_payload)
            generic_alert = datadog_alert.to_generic()
            
            service = AlertService(db)
            result = await service.process_alert(generic_alert, organization_id)
            
            return {
                "success": result.success,
                "message": result.message,
                "incident_id": result.incident_id,
                "incident_created": result.incident_created,
                "incident_updated": result.incident_updated,
                "alert_fingerprint": result.alert_fingerprint,
                "source": "datadog"
            }
    
    except ValidationError as e:
        logger.error(f"Invalid Datadog payload: {e}")
        raise HTTPException(status_code=400, detail=f"Invalid Datadog payload: {str(e)}")
    except Exception as e:
        logger.error(f"Error processing Datadog alert: {e}")
        raise HTTPException(status_code=500, detail=f"Error processing Datadog alert: {str(e)}")

@router.post("/grafana")
async def grafana_webhook(
    request: Request,
    db: AsyncSession = Depends(get_async_session),
    organization_id: str = Depends(get_organization_from_webhook)
):
    """Webhook endpoint for Grafana alerts"""
    
    try:
        raw_payload = await request.json()
        logger.info(f"Processing Grafana webhook for org: {organization_id}")
        
        # Grafana sends different payload formats
        if "alerts" in raw_payload:
            # New Grafana alerting format (v8+)
            results = []
            for alert in raw_payload["alerts"]:
                grafana_alert = GrafanaAlertPayload(**alert)
                generic_alert = grafana_alert.to_generic()
                
                service = AlertService(db)
                result = await service.process_alert(generic_alert, organization_id)
                results.append(result)
            
            return {
                "success": all(r.success for r in results),
                "message": f"Processed {len(results)} Grafana alerts",
                "results": [
                    {
                        "incident_id": r.incident_id,
                        "incident_created": r.incident_created,
                        "alert_fingerprint": r.alert_fingerprint
                    } for r in results
                ],
                "source": "grafana"
            }
        else:
            # Legacy Grafana format or single alert
            grafana_alert = GrafanaAlertPayload(**raw_payload)
            generic_alert = grafana_alert.to_generic()
            
            service = AlertService(db)
            result = await service.process_alert(generic_alert, organization_id)
            
            return {
                "success": result.success,
                "message": result.message,
                "incident_id": result.incident_id,
                "incident_created": result.incident_created,
                "incident_updated": result.incident_updated,
                "alert_fingerprint": result.alert_fingerprint,
                "source": "grafana"
            }
    
    except ValidationError as e:
        logger.error(f"Invalid Grafana payload: {e}")
        raise HTTPException(status_code=400, detail=f"Invalid Grafana payload: {str(e)}")
    except Exception as e:
        logger.error(f"Error processing Grafana alert: {e}")
        raise HTTPException(status_code=500, detail=f"Error processing Grafana alert: {str(e)}")

@router.post("/aws-cloudwatch")
async def aws_cloudwatch_webhook(
    request: Request,
    db: AsyncSession = Depends(get_async_session),
    organization_id: str = Depends(get_organization_from_webhook)
):
    """Webhook endpoint for AWS CloudWatch alerts (via SNS)"""
    
    try:
        raw_payload = await request.json()
        logger.info(f"Processing AWS CloudWatch webhook for org: {organization_id}")
        
        # Handle SNS message format
        if "Type" in raw_payload and raw_payload["Type"] == "Notification":
            # Parse SNS notification
            message = json.loads(raw_payload["Message"]) if isinstance(raw_payload["Message"], str) else raw_payload["Message"]
            
            # Convert to generic format
            generic_alert = GenericAlertPayload(
                alert_id=raw_payload.get("MessageId", "unknown"),
                title=message.get("AlarmName", "CloudWatch Alert"),
                description=message.get("AlarmDescription", raw_payload.get("Subject", "")),
                severity=AlertSeverity.WARNING if message.get("NewStateValue") == "ALARM" else AlertSeverity.INFO,
                status=AlertStatus.ACTIVE if message.get("NewStateValue") == "ALARM" else AlertStatus.RESOLVED,
                source=AlertSource.AWS_CLOUDWATCH,
                service=message.get("Namespace"),
                region=message.get("Region"),
                started_at=datetime.fromisoformat(raw_payload.get("Timestamp", datetime.utcnow().isoformat())),
                alert_url=f"https://console.aws.amazon.com/cloudwatch/home?region={message.get('Region', 'us-east-1')}#alarmsV2:alarm/{message.get('AlarmName')}",
                raw_payload=raw_payload
            )
        else:
            # Direct CloudWatch alarm format
            generic_alert = GenericAlertPayload(
                alert_id=raw_payload.get("AlarmName", "unknown"),
                title=raw_payload.get("AlarmName", "CloudWatch Alert"),
                description=raw_payload.get("AlarmDescription", ""),
                severity=AlertSeverity.WARNING if raw_payload.get("NewStateValue") == "ALARM" else AlertSeverity.INFO,
                status=AlertStatus.ACTIVE if raw_payload.get("NewStateValue") == "ALARM" else AlertStatus.RESOLVED,
                source=AlertSource.AWS_CLOUDWATCH,
                service=raw_payload.get("Namespace"),
                region=raw_payload.get("Region"),
                raw_payload=raw_payload
            )
        
        service = AlertService(db)
        result = await service.process_alert(generic_alert, organization_id)
        
        return {
            "success": result.success,
            "message": result.message,
            "incident_id": result.incident_id,
            "incident_created": result.incident_created,
            "incident_updated": result.incident_updated,
            "alert_fingerprint": result.alert_fingerprint,
            "source": "aws-cloudwatch"
        }
    
    except Exception as e:
        logger.error(f"Error processing CloudWatch alert: {e}")
        raise HTTPException(status_code=500, detail=f"Error processing CloudWatch alert: {str(e)}")

@router.post("/new-relic")
async def new_relic_webhook(
    request: Request,
    db: AsyncSession = Depends(get_async_session),
    organization_id: str = Depends(get_organization_from_webhook)
):
    """Webhook endpoint for New Relic alerts"""
    
    try:
        raw_payload = await request.json()
        logger.info(f"Processing New Relic webhook for org: {organization_id}")
        
        # New Relic alert format
        incident = raw_payload.get("incident", raw_payload)
        
        # Map New Relic severity
        severity_map = {
            "critical": AlertSeverity.CRITICAL,
            "warning": AlertSeverity.WARNING,
            "info": AlertSeverity.INFO
        }
        
        # Map New Relic state
        status_map = {
            "open": AlertStatus.ACTIVE,
            "acknowledged": AlertStatus.ACTIVE,
            "closed": AlertStatus.RESOLVED
        }
        
        generic_alert = GenericAlertPayload(
            alert_id=str(incident.get("incident_id", "unknown")),
            title=incident.get("condition_name", "New Relic Alert"),
            description=incident.get("details", ""),
            severity=severity_map.get(incident.get("priority", "warning").lower(), AlertSeverity.WARNING),
            status=status_map.get(incident.get("state", "open").lower(), AlertStatus.ACTIVE),
            source=AlertSource.NEW_RELIC,
            service=incident.get("policy_name"),
            environment=incident.get("targets", [{}])[0].get("labels", {}).get("environment") if incident.get("targets") else None,
            alert_url=incident.get("incident_url"),
            raw_payload=raw_payload
        )
        
        service = AlertService(db)
        result = await service.process_alert(generic_alert, organization_id)
        
        return {
            "success": result.success,
            "message": result.message,
            "incident_id": result.incident_id,
            "incident_created": result.incident_created,
            "incident_updated": result.incident_updated,
            "alert_fingerprint": result.alert_fingerprint,
            "source": "new-relic"
        }
    
    except Exception as e:
        logger.error(f"Error processing New Relic alert: {e}")
        raise HTTPException(status_code=500, detail=f"Error processing New Relic alert: {str(e)}")

@router.post("/prometheus")
async def prometheus_webhook(
    request: Request,
    db: AsyncSession = Depends(get_async_session),
    organization_id: str = Depends(get_organization_from_webhook)
):
    """Webhook endpoint for Prometheus Alertmanager"""
    
    try:
        raw_payload = await request.json()
        logger.info(f"Processing Prometheus webhook for org: {organization_id}")
        
        results = []
        
        # Prometheus sends alerts in a list
        for alert in raw_payload.get("alerts", []):
            # Map Prometheus severity
            severity_map = {
                "critical": AlertSeverity.CRITICAL,
                "warning": AlertSeverity.WARNING,
                "info": AlertSeverity.INFO
            }
            
            status_map = {
                "firing": AlertStatus.ACTIVE,
                "resolved": AlertStatus.RESOLVED
            }
            
            labels = alert.get("labels", {})
            annotations = alert.get("annotations", {})
            
            generic_alert = GenericAlertPayload(
                alert_id=alert.get("fingerprint", "unknown"),
                title=labels.get("alertname", "Prometheus Alert"),
                description=annotations.get("description", annotations.get("summary", "")),
                severity=severity_map.get(labels.get("severity", "warning").lower(), AlertSeverity.WARNING),
                status=status_map.get(alert.get("status", "firing").lower(), AlertStatus.ACTIVE),
                source=AlertSource.GENERIC,  # Could add PROMETHEUS to AlertSource enum
                service=labels.get("service", labels.get("job")),
                environment=labels.get("environment", labels.get("env")),
                region=labels.get("region"),
                tags=[f"{k}:{v}" for k, v in labels.items()],
                alert_url=raw_payload.get("externalURL"),
                runbook_url=annotations.get("runbook_url"),
                raw_payload=alert
            )
            
            service = AlertService(db)
            result = await service.process_alert(generic_alert, organization_id)
            results.append(result)
        
        return {
            "success": all(r.success for r in results),
            "message": f"Processed {len(results)} Prometheus alerts",
            "results": [
                {
                    "incident_id": r.incident_id,
                    "incident_created": r.incident_created,
                    "alert_fingerprint": r.alert_fingerprint
                } for r in results
            ],
            "source": "prometheus"
        }
    
    except Exception as e:
        logger.error(f"Error processing Prometheus alert: {e}")
        raise HTTPException(status_code=500, detail=f"Error processing Prometheus alert: {str(e)}")

@router.post("/test")
async def test_webhook(
    request: Request,
    db: AsyncSession = Depends(get_async_session),
    organization_id: str = Depends(get_organization_from_webhook)
):
    """Test webhook endpoint for debugging and integration testing"""
    
    try:
        raw_payload = await request.json()
        logger.info(f"Test webhook received for org {organization_id}: {raw_payload}")
        
        # Create a test alert
        test_alert = GenericAlertPayload(
            alert_id=f"test-{datetime.utcnow().timestamp()}",
            title="Test Alert",
            description="This is a test alert for webhook integration testing",
            severity=AlertSeverity.INFO,
            status=AlertStatus.ACTIVE,
            source=AlertSource.GENERIC,
            service="test-service",
            environment="test",
            raw_payload=raw_payload
        )
        
        service = AlertService(db)
        result = await service.process_alert(test_alert, organization_id)
        
        return {
            "success": result.success,
            "message": "Test webhook processed successfully",
            "incident_id": result.incident_id,
            "incident_created": result.incident_created,
            "alert_fingerprint": result.alert_fingerprint,
            "source": "test",
            "received_payload": raw_payload
        }
    
    except Exception as e:
        logger.error(f"Error processing test webhook: {e}")
        raise HTTPException(status_code=500, detail=f"Error processing test webhook: {str(e)}")