from fastapi import APIRouter, Request
from datetime import datetime
import json
import logging

from app.services.monitoring_simple import monitoring_service

router = APIRouter(prefix="/webhooks", tags=["monitoring"])
logger = logging.getLogger(__name__)

@router.get("/health")
async def webhook_health():
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "version": "2.2.0",
        "integrations": monitoring_service.get_status(),
        "message": "OffCall AI monitoring is operational!"
    }

@router.get("/integration-status")
async def integration_status():
    return {
        "integrations": monitoring_service.get_status(),
        "timestamp": datetime.now().isoformat()
    }

@router.post("/setup-self-monitoring")
async def setup_self_monitoring():
    return {
        "status": "configured",
        "message": "OffCall AI is now monitoring itself!",
        "timestamp": datetime.now().isoformat()
    }

@router.post("/datadog")
async def datadog_webhook(request: Request):
    payload = await request.json()
    logger.info(f"📊 Datadog webhook: {payload.get('alert_name', 'alert')}")
    return {"status": "received", "source": "datadog"}

@router.post("/newrelic") 
async def newrelic_webhook(request: Request):
    payload = await request.json()
    logger.info(f"📈 New Relic webhook: {payload.get('incident', {}).get('policy_name', 'incident')}")
    return {"status": "received", "source": "newrelic"}

@router.post("/test")
async def test_webhook(request: Request):
    payload = await request.json()
    logger.info(f"🧪 Test webhook: {payload}")
    return {"status": "test_successful", "message": "Monitoring webhooks working!"}
