from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.organization import Organization
from app.services.stripe_service import StripeService
from pydantic import BaseModel

router = APIRouter()

class CheckoutRequest(BaseModel):
    plan: str  # "pro" or "plus"

class CheckoutResponse(BaseModel):
    url: str

@router.post("/create-checkout", response_model=CheckoutResponse)
async def create_checkout(
    checkout_data: CheckoutRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Get user's organization
    result = await db.execute(
        select(Organization).where(Organization.id == current_user.organization_id)
    )
    organization = result.scalar_one_or_none()
    
    if not organization:
        raise HTTPException(status_code=404, detail="Organization not found")
    
    # Determine price ID
    if checkout_data.plan == "pro":
        price_id = "price_1S4NgY1mRLVuW9GlQhGX0hQ4"
    elif checkout_data.plan == "plus":
        price_id = "price_1S4NhX1mRLVuW9GldnHIVs9q"
    else:
        raise HTTPException(status_code=400, detail="Invalid plan")
    
    # Create or get Stripe customer
    if not organization.stripe_customer_id:
        customer_id = await StripeService.create_customer(
            email=current_user.email,
            name=organization.name,
            organization_id=str(organization.id)
        )
        organization.stripe_customer_id = customer_id
        await db.commit()
    else:
        customer_id = organization.stripe_customer_id
    
    # Create checkout session
    session_data = await StripeService.create_checkout_session(
        customer_id=customer_id,
        price_id=price_id,
        success_url="https://offcallai.com/success",
        cancel_url="https://offcallai.com/pricing"
    )
    
    return CheckoutResponse(url=session_data['url'])