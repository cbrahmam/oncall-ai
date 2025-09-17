# backend/app/api/v1/endpoints/billing.py - COMPLETE FILE (270+ lines)

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from app.database import get_async_session
from app.core.security import get_current_user
from app.models.user import User
from app.models.organization import Organization
from app.services.stripe_service import StripeService
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

# === REQUEST/RESPONSE MODELS ===

class CheckoutRequest(BaseModel):
    plan_type: str  # "free", "pro", "plus", "enterprise"
    success_url: Optional[str] = None
    cancel_url: Optional[str] = None
    trial_days: Optional[int] = 14

class CheckoutResponse(BaseModel):
    checkout_url: str

class SubscriptionResponse(BaseModel):
    id: str
    active: bool
    plan_type: str
    created_at: str
    updated_at: str
    expires_at: Optional[str] = None

class UsageResponse(BaseModel):
    incidents_this_month: int
    incidents_limit: int
    team_members: int
    team_members_limit: int
    integrations_count: int
    integrations_limit: int

class BillingHistoryResponse(BaseModel):
    invoices: list
    total_count: int

# === CORE ENDPOINTS ===

@router.get("/subscription", response_model=SubscriptionResponse)
async def get_subscription(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    """Get current subscription status"""
    try:
        result = await db.execute(
            select(Organization).where(Organization.id == current_user.organization_id)
        )
        organization = result.scalar_one_or_none()
        
        if not organization:
            raise HTTPException(status_code=404, detail="Organization not found")
        
        # Get subscription data from organization
        plan_type = getattr(organization, 'plan_type', 'free')
        subscription_status = getattr(organization, 'subscription_status', 'active')
        expires_at = getattr(organization, 'subscription_expires_at', None)
        
        return SubscriptionResponse(
            id=str(organization.id),
            active=subscription_status == "active",
            plan_type=plan_type,
            created_at=organization.created_at.isoformat() if organization.created_at else datetime.utcnow().isoformat(),
            updated_at=organization.updated_at.isoformat() if hasattr(organization, 'updated_at') and organization.updated_at else datetime.utcnow().isoformat(),
            expires_at=expires_at.isoformat() if expires_at else None
        )
        
    except Exception as e:
        logger.error(f"Failed to get subscription: {e}")
        # Return default free plan instead of failing
        return SubscriptionResponse(
            id="free-default",
            active=True,
            plan_type="free",
            created_at=datetime.utcnow().isoformat(),
            updated_at=datetime.utcnow().isoformat()
        )

@router.post("/create-checkout-session", response_model=CheckoutResponse)
async def create_checkout_session(
    checkout_data: CheckoutRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    """Create Stripe checkout session - MAIN ENDPOINT YOUR FRONTEND CALLS"""
    try:
        logger.info(f"Creating checkout session for plan: {checkout_data.plan_type}, user: {current_user.email}")
        
        # Get user's organization
        result = await db.execute(
            select(Organization).where(Organization.id == current_user.organization_id)
        )
        organization = result.scalar_one_or_none()
        
        if not organization:
            raise HTTPException(status_code=404, detail="Organization not found")
        
        # Handle free plan selection (no Stripe needed)
        if checkout_data.plan_type == "free":
            # Update organization to free plan
            await db.execute(
                update(Organization)
                .where(Organization.id == organization.id)
                .values(
                    plan_type="free",
                    subscription_status="active",
                    updated_at=datetime.utcnow()
                )
            )
            await db.commit()
            
            # Return success URL
            success_url = checkout_data.success_url or "https://offcallai.com/dashboard?plan=free"
            logger.info(f"Free plan selected, redirecting to: {success_url}")
            return CheckoutResponse(checkout_url=success_url)
        
        # Stripe price mapping for paid plans
        price_mapping = {
            "pro": "price_1S4NgY1mRLVuW9GlQhGX0hQ4",  # $29/month
            "plus": "price_1S4NhX1mRLVuW9GldnHIVs9q",  # $49/month
        }
        
        # Handle enterprise plan (contact sales)
        if checkout_data.plan_type == "enterprise":
            logger.info("Enterprise plan requested, redirecting to sales")
            return CheckoutResponse(checkout_url="mailto:sales@offcallai.com?subject=Enterprise Plan Inquiry")
        
        # Get Stripe price ID
        price_id = price_mapping.get(checkout_data.plan_type)
        if not price_id:
            raise HTTPException(status_code=400, detail=f"Invalid plan type: {checkout_data.plan_type}")
        
        # Create or get Stripe customer
        stripe_customer_id = getattr(organization, 'stripe_customer_id', None)
        if not stripe_customer_id:
            logger.info("Creating new Stripe customer")
            customer_id = await StripeService.create_customer(
                email=current_user.email,
                name=organization.name,
                organization_id=str(organization.id)
            )
            
            # Update organization with Stripe customer ID
            await db.execute(
                update(Organization)
                .where(Organization.id == organization.id)
                .values(stripe_customer_id=customer_id)
            )
            await db.commit()
        else:
            customer_id = stripe_customer_id
        
        # Create Stripe checkout session
        logger.info(f"Creating Stripe checkout session for customer: {customer_id}")
        session_data = await StripeService.create_checkout_session(
            customer_id=customer_id,
            price_id=price_id,
            success_url=checkout_data.success_url or "https://offcallai.com/dashboard?upgrade=success",
            cancel_url=checkout_data.cancel_url or "https://offcallai.com/pricing?upgrade=cancelled"
        )
        
        logger.info(f"Stripe checkout session created: {session_data['id']}")
        return CheckoutResponse(checkout_url=session_data['url'])
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to create checkout session: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create checkout session: {str(e)}"
        )

@router.post("/update-subscription")
async def update_subscription(
    plan_data: CheckoutRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    """Update existing subscription plan"""
    try:
        result = await db.execute(
            select(Organization).where(Organization.id == current_user.organization_id)
        )
        organization = result.scalar_one_or_none()
        
        if not organization:
            raise HTTPException(status_code=404, detail="Organization not found")
        
        # Update subscription in Stripe if customer exists
        if hasattr(organization, 'stripe_customer_id') and organization.stripe_customer_id:
            await StripeService.update_subscription(
                organization.stripe_customer_id,
                plan_data.plan_type
            )
        
        # Update organization plan
        await db.execute(
            update(Organization)
            .where(Organization.id == organization.id)
            .values(
                plan_type=plan_data.plan_type,
                subscription_status="active",
                updated_at=datetime.utcnow()
            )
        )
        await db.commit()
        
        return {"status": "success", "message": f"Subscription updated to {plan_data.plan_type}"}
        
    except Exception as e:
        logger.error(f"Failed to update subscription: {e}")
        raise HTTPException(status_code=500, detail="Failed to update subscription")

@router.get("/usage", response_model=UsageResponse)
async def get_usage_metrics(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    """Get current usage metrics for the organization"""
    try:
        result = await db.execute(
            select(Organization).where(Organization.id == current_user.organization_id)
        )
        organization = result.scalar_one_or_none()
        
        if not organization:
            raise HTTPException(status_code=404, detail="Organization not found")
        
        plan_type = getattr(organization, 'plan_type', 'free')
        
        # Plan limits
        plan_limits = {
            "free": {"incidents": 10, "team_members": 3, "integrations": 2},
            "pro": {"incidents": 1000, "team_members": 25, "integrations": 10},
            "plus": {"incidents": -1, "team_members": -1, "integrations": -1},  # Unlimited
            "enterprise": {"incidents": -1, "team_members": -1, "integrations": -1}
        }
        
        limits = plan_limits.get(plan_type, plan_limits["free"])
        
        # Get current usage (would be real queries in production)
        # For now, using mock data
        current_usage = {
            "incidents_this_month": 5,
            "team_members": 1,
            "integrations_count": 2
        }
        
        return UsageResponse(
            incidents_this_month=current_usage["incidents_this_month"],
            incidents_limit=limits["incidents"],
            team_members=current_usage["team_members"],
            team_members_limit=limits["team_members"],
            integrations_count=current_usage["integrations_count"],
            integrations_limit=limits["integrations"]
        )
        
    except Exception as e:
        logger.error(f"Failed to get usage metrics: {e}")
        raise HTTPException(status_code=500, detail="Failed to get usage metrics")

@router.get("/history", response_model=BillingHistoryResponse)
async def get_billing_history(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    """Get billing history for the organization"""
    try:
        result = await db.execute(
            select(Organization).where(Organization.id == current_user.organization_id)
        )
        organization = result.scalar_one_or_none()
        
        if not organization:
            raise HTTPException(status_code=404, detail="Organization not found")
        
        # Get Stripe invoices if customer exists
        invoices = []
        if hasattr(organization, 'stripe_customer_id') and organization.stripe_customer_id:
            invoices = await StripeService.get_invoices(organization.stripe_customer_id)
        
        return BillingHistoryResponse(
            invoices=invoices,
            total_count=len(invoices)
        )
        
    except Exception as e:
        logger.error(f"Failed to get billing history: {e}")
        raise HTTPException(status_code=500, detail="Failed to get billing history")

@router.post("/cancel-subscription")
async def cancel_subscription(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session)
):
    """Cancel current subscription (downgrade to free)"""
    try:
        result = await db.execute(
            select(Organization).where(Organization.id == current_user.organization_id)
        )
        organization = result.scalar_one_or_none()
        
        if not organization:
            raise HTTPException(status_code=404, detail="Organization not found")
        
        # Cancel in Stripe if customer exists
        if hasattr(organization, 'stripe_customer_id') and organization.stripe_customer_id:
            await StripeService.cancel_subscription(organization.stripe_customer_id)
        
        # Update to free plan
        await db.execute(
            update(Organization)
            .where(Organization.id == organization.id)
            .values(
                plan_type="free",
                subscription_status="cancelled",
                updated_at=datetime.utcnow()
            )
        )
        await db.commit()
        
        return {"status": "success", "message": "Subscription cancelled successfully"}
        
    except Exception as e:
        logger.error(f"Failed to cancel subscription: {e}")
        raise HTTPException(status_code=500, detail="Failed to cancel subscription")

@router.post("/webhook")
async def stripe_webhook(
    request: dict,  # This would be the raw request in production
    db: AsyncSession = Depends(get_async_session)
):
    """Handle Stripe webhooks for subscription updates"""
    try:
        # In production, verify the webhook signature here
        event_type = request.get('type')
        data = request.get('data', {}).get('object', {})
        
        if event_type == 'invoice.payment_succeeded':
            # Handle successful payment
            customer_id = data.get('customer')
            
            # Find organization by Stripe customer ID
            result = await db.execute(
                select(Organization).where(Organization.stripe_customer_id == customer_id)
            )
            organization = result.scalar_one_or_none()
            
            if organization:
                # Update subscription status
                await db.execute(
                    update(Organization)
                    .where(Organization.id == organization.id)
                    .values(
                        subscription_status="active",
                        updated_at=datetime.utcnow()
                    )
                )
                await db.commit()
                
                logger.info(f"Updated subscription status for organization: {organization.id}")
        
        elif event_type == 'invoice.payment_failed':
            # Handle failed payment
            customer_id = data.get('customer')
            
            result = await db.execute(
                select(Organization).where(Organization.stripe_customer_id == customer_id)
            )
            organization = result.scalar_one_or_none()
            
            if organization:
                await db.execute(
                    update(Organization)
                    .where(Organization.id == organization.id)
                    .values(
                        subscription_status="past_due",
                        updated_at=datetime.utcnow()
                    )
                )
                await db.commit()
                
                logger.warning(f"Payment failed for organization: {organization.id}")
        
        return {"status": "success"}
        
    except Exception as e:
        logger.error(f"Webhook processing failed: {e}")
        raise HTTPException(status_code=500, detail="Webhook processing failed")

# Health check endpoint
@router.get("/health")
async def billing_health():
    """Health check for billing service"""
    return {
        "status": "healthy",
        "service": "billing",
        "timestamp": datetime.utcnow().isoformat(),
        "endpoints_available": [
            "/subscription",
            "/create-checkout-session", 
            "/update-subscription",
            "/usage",
            "/history",
            "/cancel-subscription",
            "/webhook"
        ]
    }