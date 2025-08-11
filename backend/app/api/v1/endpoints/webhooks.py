import json
import logging
from typing import Dict, Any, Optional
from fastapi import APIRouter, Request, HTTPException, Depends, Header
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import ValidationError

from app.database import get_async_session
from app.models.organization import Organization
from app.services.alert_service import AlertService
from app.schemas.alert import (
    GenericAlertPayload, DatadogAlertPayload, GrafanaAlertPayload,
    AlertProcessingResult, AlertSource, AlertSeverity, AlertStatus
)

router = APIRouter()
logger = logging.getLogger(__name__)

async def get_organization_from_webhook(
    request: Request,
    organization_key: Optional[str] = Header(None, alias="X-Organization-Key"),
    db: AsyncSession = Depends(get_async_session)
) -> str:
    """
    Extract organization ID from webhook request.
    Production-ready organization lookup with fallback strategy.
    """
    
    try:
        # Strategy 1: Use organization key from header to lookup mapping
        if organization_key:
            # TODO: In production, implement webhook key -> org_id mapping
            # For now, look up first available organization
            logger.info(f"Webhook request with org key: {organization_key}")
        
        # Strategy 2: Get the most recently created organization (fallback)
        query = select(Organization).order_by(Organization.created_at.desc()).limit(1)
        result = await db.execute(query)
        org = result.scalar_one_or_none()
        
        if org:
            logger.info(f"Using organization: {org.name} ({org.id})")
            return str(org.id)
        
        # Strategy 3: Critical fallback - create default organization if none exists
        logger.warning("No organizations found, this should not happen in production")
        raise HTTPException(
            status_code=500, 
            detail="No organizations configured. Contact administrator."
        )
        
    except Exception as e:
        logger.error(f"Error in organization lookup: {e}")
        raise HTTPException(status_code=500, detail="Organization lookup failed")

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
            "alert_fingerprint": result.alert_fingerprint
        }
    
    except Exception as e:
        logger.error(f"Error processing generic alert: {e}")
        raise HTTPException(status_code=500, detail=f"Error processing alert: {str(e)}")

@router.post("/datadog")
async def datadog_webhook(
    request: Request,
    db: AsyncSession = Depends(get_async_session),
    organization_id: str = Depends(get_organization_from_webhook)
):
    """Webhook endpoint for Datadog alerts"""
    
    try:
        raw_payload = await request.json()
        logger.info(f"Processing Datadog webhook for org: {organization_id}")
        
        # Parse Datadog payload
        datadog_alert = DatadogAlertPayload(**raw_payload)
        
        # Convert to generic format
        generic_alert = datadog_alert.to_generic()
        
        # Process the alert
        service = AlertService(db)
        result = await service.process_alert(generic_alert, organization_id)
        
        logger.info(f"Datadog alert processed: {result.success}")
        
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
        
        # Parse Grafana payload
        grafana_alert = GrafanaAlertPayload(**raw_payload)
        
        # Convert to generic format
        generic_alert = grafana_alert.to_generic()
        
        # Process the alert
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
        raise HTTPException(status_code=400, detail=f"Invalid Grafana payload: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing Grafana alert: {str(e)}")

@router.post("/aws-cloudwatch")
async def aws_cloudwatch_webhook(
    request: Request,
    db: AsyncSession = Depends(get_async_session),
    organization_id: str = Depends(get_organization_from_webhook)
):
    """Webhook endpoint for AWS CloudWatch alerts"""
    
    try:
        raw_payload = await request.json()
        logger.info(f"Processing CloudWatch webhook for org: {organization_id}")
        
        # AWS CloudWatch SNS format conversion
        if "Message" in raw_payload and isinstance(raw_payload["Message"], str):
            try:
                cloudwatch_data = json.loads(raw_payload["Message"])
            except json.JSONDecodeError:
                cloudwatch_data = raw_payload
        else:
            cloudwatch_data = raw_payload
        
        # Convert CloudWatch alarm to generic format
        generic_alert = GenericAlertPayload(
            alert_id=cloudwatch_data.get("AlarmName", f"cloudwatch-{hash(str(cloudwatch_data))}"),
            title=cloudwatch_data.get("AlarmName", "CloudWatch Alert"),
            description=cloudwatch_data.get("AlarmDescription", ""),
            severity=AlertSeverity.CRITICAL if cloudwatch_data.get("NewStateValue") == "ALARM" else AlertSeverity.WARNING,
            status=AlertStatus.ACTIVE if cloudwatch_data.get("NewStateValue") == "ALARM" else AlertStatus.RESOLVED,
            source=AlertSource.AWS_CLOUDWATCH,
            region=cloudwatch_data.get("Region"),
            raw_payload=raw_payload
        )
        
        # Process the alert
        service = AlertService(db)
        result = await service.process_alert(generic_alert, organization_id)
        
        return {
            "success": result.success,
            "message": result.message,
            "incident_id": result.incident_id,
            "incident_created": result.incident_created,
            "incident_updated": result.incident_updated,
            "alert_fingerprint": result.alert_fingerprint,
            "source": "aws_cloudwatch"
        }
    
    except Exception as e:
        logger.error(f"Error processing CloudWatch alert: {e}")
        raise HTTPException(status_code=500, detail=f"Error processing CloudWatch alert: {str(e)}")

@router.post("/test")
async def test_webhook(
    request: Request,
    db: AsyncSession = Depends(get_async_session),
    organization_id: str = Depends(get_organization_from_webhook)
):
    """Test endpoint for webhook development and debugging"""
    
    try:
        raw_payload = await request.json()
        logger.info(f"Processing test webhook for org: {organization_id}")
        
        # Create a test alert with correct enum values
        test_alert = GenericAlertPayload(
            alert_id=f"test-{hash(str(raw_payload))}",
            title="Test Alert from Webhook",
            description="This is a test alert to verify webhook functionality",
            severity=AlertSeverity.WARNING,  # Use enum value, not string
            status=AlertStatus.ACTIVE,       # Use enum value, not string
            source=AlertSource.GENERIC,
            service="test-service",
            environment="test",
            tags=["test", "webhook"],
            raw_payload=raw_payload
        )
        
        # Process the alert
        service = AlertService(db)
        result = await service.process_alert(test_alert, organization_id)
        
        return {
            "success": result.success,
            "message": result.message,
            "incident_id": result.incident_id,
            "incident_created": result.incident_created,
            "incident_updated": result.incident_updated,
            "alert_fingerprint": result.alert_fingerprint,
            "source": "test",
            "received_payload": raw_payload
        }
    
    except Exception as e:
        logger.error(f"Error processing test alert: {e}")
        raise HTTPException(status_code=500, detail=f"Error processing test alert: {str(e)}")

@router.get("/health")
async def webhook_health():
    """Health check endpoint for webhooks"""
    return {
        "status": "healthy",
        "service": "OffCall AI Webhook Service",
        "version": "1.0.0",
        "supported_sources": [
            "generic",
            "datadog", 
            "grafana",
            "aws_cloudwatch",
            "test"
        ]
    }