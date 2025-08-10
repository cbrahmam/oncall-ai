import json
from typing import Dict, Any, Optional
from fastapi import APIRouter, Request, HTTPException, Depends, Header
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import ValidationError

from app.database import get_async_session
from app.services.alert_service import AlertService
from app.schemas.alert import (
    GenericAlertPayload, DatadogAlertPayload, GrafanaAlertPayload,
    AlertProcessingResult, AlertSource
)

router = APIRouter()

# Organization lookup helper (simplified for MVP)
async def get_organization_from_webhook(
    request: Request,
    organization_key: Optional[str] = Header(None, alias="X-Organization-Key"),
    db: AsyncSession = Depends(get_async_session)
) -> str:
    """
    Extract organization ID from webhook request.
    
    In production, you'd:
    1. Have organizations register webhook URLs with unique keys
    2. Store the mapping in database
    3. Look up org_id from the webhook key/URL
    
    For MVP, we'll use a header or default to the first org
    """
    
    if organization_key:
        # In real implementation, look up org by webhook key
        # For now, return a default org ID (you can replace with your actual org ID)
        return "6433e6e3-6f33-44c4-97d1-71a84ba23f74"  # Your test org ID
    
    # Fallback: extract from URL path or use default
    # You can customize this based on your webhook URL structure
    return "6433e6e3-6f33-44c4-97d1-71a84ba23f74"  # Default org

@router.post("/generic")
async def generic_webhook(
    alert_data: GenericAlertPayload,
    db: AsyncSession = Depends(get_async_session),
    organization_id: str = Depends(get_organization_from_webhook)
):
    """Generic webhook that accepts standardized alert format"""
    
    try:
        service = AlertService(db)
        result = await service.process_alert(alert_data, organization_id)
        
        return {
            "success": result.success,
            "message": result.message,
            "incident_id": result.incident_id,
            "incident_created": result.incident_created,
            "incident_updated": result.incident_updated,
            "alert_fingerprint": result.alert_fingerprint
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing alert: {str(e)}")

@router.post("/datadog")
async def datadog_webhook(
    request: Request,
    db: AsyncSession = Depends(get_async_session),
    organization_id: str = Depends(get_organization_from_webhook)
):
    """Webhook endpoint for Datadog alerts"""
    
    try:
        # Get raw JSON payload
        raw_payload = await request.json()
        
        # Parse Datadog payload
        datadog_alert = DatadogAlertPayload(**raw_payload)
        
        # Convert to generic format
        generic_alert = datadog_alert.to_generic()
        
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
            "source": "datadog"
        }
    
    except ValidationError as e:
        raise HTTPException(status_code=400, detail=f"Invalid Datadog payload: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing Datadog alert: {str(e)}")

@router.post("/grafana")
async def grafana_webhook(
    request: Request,
    db: AsyncSession = Depends(get_async_session),
    organization_id: str = Depends(get_organization_from_webhook)
):
    """Webhook endpoint for Grafana alerts"""
    
    try:
        # Get raw JSON payload
        raw_payload = await request.json()
        
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
        # Get raw JSON payload
        raw_payload = await request.json()
        
        # AWS CloudWatch SNS format conversion
        # Extract the actual message if it's wrapped in SNS
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
            severity="critical" if cloudwatch_data.get("NewStateValue") == "ALARM" else "medium",
            status="firing" if cloudwatch_data.get("NewStateValue") == "ALARM" else "resolved",
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
        
        # Create a test alert
        test_alert = GenericAlertPayload(
            alert_id=f"test-{hash(str(raw_payload))}",
            title="Test Alert from Webhook",
            description="This is a test alert to verify webhook functionality",
            severity="medium",
            status="firing",
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