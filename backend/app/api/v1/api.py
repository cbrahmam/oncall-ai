from fastapi import APIRouter
from app.api.v1.endpoints import auth, incidents, webhooks, teams, api_keys, ai_analysis

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["authentication"])
api_router.include_router(incidents.router, prefix="/incidents", tags=["incidents"])
api_router.include_router(webhooks.router, prefix="/webhooks", tags=["webhooks"])
api_router.include_router(teams.router, prefix="/teams", tags=["teams"])
api_router.include_router(api_keys.router, prefix="/api-keys", tags=["api-keys"])

# AI Integration - Use different prefixes
from app.api.v1.endpoints import ai_real
api_router.include_router(ai_real.router, prefix="/ai", tags=["ai"])
api_router.include_router(ai_analysis.router, prefix="/ai-analysis", tags=["ai-analysis"])

# Billing Integration
from app.api.v1.endpoints import billing
api_router.include_router(billing.router, prefix="/billing", tags=["billing"])