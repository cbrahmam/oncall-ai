from fastapi import APIRouter

from app.api.v1.endpoints import auth, incidents, webhooks

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["authentication"])
api_router.include_router(incidents.router, prefix="/incidents", tags=["incidents"])
api_router.include_router(webhooks.router, prefix="/webhooks", tags=["webhooks"])