import stripe
import os
from typing import Dict, Any, Optional

class StripeService:
    @staticmethod
    def _ensure_api_key():
        """Ensure Stripe API key is set"""
        if not stripe.api_key:
            stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
    
    @staticmethod
    async def create_customer(email: str, name: str, organization_id: str) -> str:
        """Create a Stripe customer"""
        StripeService._ensure_api_key()
        customer = stripe.Customer.create(
            email=email,
            name=name,
            metadata={
                "organization_id": organization_id
            }
        )
        return customer.id
    
    @staticmethod
    async def create_checkout_session(
        customer_id: str, 
        price_id: str, 
        success_url: str, 
        cancel_url: str
    ) -> Dict[str, Any]:
        """Create a checkout session"""
        StripeService._ensure_api_key()
        session = stripe.checkout.Session.create(
            customer=customer_id,
            payment_method_types=['card'],
            line_items=[{
                'price': price_id,
                'quantity': 1,
            }],
            mode='subscription',
            success_url=success_url + '?session_id={CHECKOUT_SESSION_ID}',
            cancel_url=cancel_url,
        )
        return {"url": session.url, "id": session.id}
    
    @staticmethod
    async def get_subscription(customer_id: str) -> Optional[Dict[str, Any]]:
        """Get customer's active subscription"""
        StripeService._ensure_api_key()
        subscriptions = stripe.Subscription.list(
            customer=customer_id,
            status='active',
            limit=1
        )
        
        if subscriptions.data:
            sub = subscriptions.data[0]
            return {
                "id": sub.id,
                "status": sub.status,
                "current_period_end": sub.current_period_end,
                "plan_name": sub.items.data[0].price.nickname or "Unknown"
            }
        return None
