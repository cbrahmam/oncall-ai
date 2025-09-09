from fastapi import APIRouter
from app.api.v1.endpoints import (
    auth, 
    incidents, 
    webhooks,
    ai,
    api_keys,
    billing
)

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["authentication"])
api_router.include_router(incidents.router, prefix="/incidents", tags=["incidents"])
api_router.include_router(webhooks.router, prefix="/webhooks", tags=["webhooks"])
api_router.include_router(ai.router, prefix="/ai", tags=["ai"])
api_router.include_router(api_keys.router, prefix="/api-keys", tags=["api-keys"])
api_router.include_router(billing.router, prefix="/billing", tags=["billing"])