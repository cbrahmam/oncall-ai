# backend/app/services/stripe_service.py - COMPLETE IMPLEMENTATION
import stripe
import os
import logging
from typing import Dict, Any, Optional, List
from datetime import datetime, timezone
from app.core.config import settings

logger = logging.getLogger(__name__)

class StripeService:
    """Complete Stripe service implementation with comprehensive error handling"""
    
    @staticmethod
    def _ensure_api_key():
        """Ensure Stripe API key is set with proper error handling"""
        if not stripe.api_key:
            api_key = getattr(settings, 'STRIPE_SECRET_KEY', None) or os.getenv("STRIPE_SECRET_KEY")
            if not api_key:
                raise ValueError("STRIPE_SECRET_KEY environment variable not set")
            
            # Validate key format
            if not (api_key.startswith("sk_live_") or api_key.startswith("sk_test_")):
                raise ValueError("Invalid Stripe API key format")
            
            if api_key.startswith("sk_test_") and not settings.DEBUG:
                logger.warning("⚠️ Using Stripe TEST key in production environment")
            
            stripe.api_key = api_key
            logger.info(f"✅ Stripe API key configured: {api_key[:12]}...")
    
    @staticmethod
    async def test_connection() -> Dict[str, Any]:
        """Test Stripe API connection"""
        try:
            StripeService._ensure_api_key()
            
            # Test with a simple API call
            account = stripe.Account.retrieve()
            
            return {
                "status": "connected",
                "account_id": account.id,
                "country": account.country,
                "currency": account.default_currency,
                "business_name": account.settings.dashboard.display_name,
                "api_key_type": "live" if stripe.api_key.startswith("sk_live_") else "test"
            }
            
        except stripe.error.AuthenticationError:
            return {
                "status": "error",
                "error": "Invalid or expired API key"
            }
        except stripe.error.StripeError as e:
            return {
                "status": "error", 
                "error": f"Stripe API error: {str(e)}"
            }
        except Exception as e:
            return {
                "status": "error",
                "error": f"Connection test failed: {str(e)}"
            }
    
    @staticmethod
    async def create_customer(email: str, name: str, organization_id: str) -> str:
        """Create a Stripe customer with comprehensive error handling"""
        try:
            StripeService._ensure_api_key()
            
            # Check if customer already exists
            existing_customers = stripe.Customer.list(email=email, limit=1)
            if existing_customers.data:
                logger.info(f"Customer already exists for {email}: {existing_customers.data[0].id}")
                return existing_customers.data[0].id
            
            customer = stripe.Customer.create(
                email=email,
                name=name,
                metadata={
                    "organization_id": organization_id,
                    "platform": "offcall_ai",
                    "created_at": datetime.now(timezone.utc).isoformat()
                }
            )
            
            logger.info(f"✅ Created Stripe customer: {customer.id} for {email}")
            return customer.id
            
        except stripe.error.InvalidRequestError as e:
            logger.error(f"Invalid request for customer creation: {e}")
            raise ValueError(f"Invalid customer data: {str(e)}")
        except stripe.error.AuthenticationError as e:
            logger.error(f"Stripe authentication failed: {e}")
            raise ValueError("Stripe authentication failed - check API key")
        except stripe.error.StripeError as e:
            logger.error(f"Stripe customer creation failed: {e}")
            raise ValueError(f"Failed to create Stripe customer: {str(e)}")
        except Exception as e:
            logger.error(f"Customer creation error: {e}")
            raise ValueError(f"Customer creation failed: {str(e)}")
    
    @staticmethod
    async def create_checkout_session(
        customer_id: str, 
        price_id: str, 
        success_url: str, 
        cancel_url: str,
        trial_days: int = 14
    ) -> Dict[str, Any]:
        """Create a checkout session with trial period and validation"""
        try:
            StripeService._ensure_api_key()
            
            # Verify customer exists
            try:
                customer = stripe.Customer.retrieve(customer_id)
                if customer.deleted:
                    raise ValueError("Customer has been deleted")
            except stripe.error.InvalidRequestError:
                raise ValueError(f"Invalid customer ID: {customer_id}")
            
            # Verify price exists
            try:
                price = stripe.Price.retrieve(price_id)
                if not price.active:
                    raise ValueError(f"Price {price_id} is not active")
            except stripe.error.InvalidRequestError:
                raise ValueError(f"Invalid Stripe price ID: {price_id}")
            
            # Validate URLs
            if not success_url.startswith(('http://', 'https://')):
                raise ValueError("Invalid success URL")
            if not cancel_url.startswith(('http://', 'https://')):
                raise ValueError("Invalid cancel URL")
            
            session_params = {
                "customer": customer_id,
                "payment_method_types": ['card'],
                "line_items": [{
                    'price': price_id,
                    'quantity': 1,
                }],
                "mode": 'subscription',
                "success_url": success_url + ('&' if '?' in success_url else '?') + 'session_id={CHECKOUT_SESSION_ID}',
                "cancel_url": cancel_url,
                "allow_promotion_codes": True,
                "billing_address_collection": "required",
                "customer_update": {
                    "address": "auto",
                    "name": "auto"
                },
                "metadata": {
                    "platform": "offcall_ai",
                    "created_at": datetime.now(timezone.utc).isoformat()
                }
            }
            
            # Add trial period if specified
            if trial_days > 0:
                session_params["subscription_data"] = {
                    "trial_period_days": trial_days,
                    "metadata": {
                        "platform": "offcall_ai",
                        "trial_days": str(trial_days)
                    }
                }
            
            session = stripe.checkout.Session.create(**session_params)
            
            logger.info(f"✅ Created checkout session: {session.id} for customer: {customer_id}")
            
            return {
                "url": session.url, 
                "id": session.id,
                "expires_at": session.expires_at,
                "customer_id": customer_id,
                "price_id": price_id
            }
            
        except stripe.error.InvalidRequestError as e:
            logger.error(f"Invalid checkout session parameters: {e}")
            raise ValueError(f"Invalid checkout parameters: {str(e)}")
        except stripe.error.StripeError as e:
            logger.error(f"Stripe checkout session creation failed: {e}")
            raise ValueError(f"Failed to create checkout session: {str(e)}")
        except Exception as e:
            logger.error(f"Checkout session error: {e}")
            raise ValueError(f"Checkout session creation failed: {str(e)}")
    
    @staticmethod
    async def get_subscription(customer_id: str) -> Optional[Dict[str, Any]]:
        """Get customer's active subscription with detailed info"""
        try:
            StripeService._ensure_api_key()
            
            subscriptions = stripe.Subscription.list(
                customer=customer_id,
                status='all',  # Get all statuses to find the most recent
                limit=10,
                expand=['data.items.data.price.product']
            )
            
            # Find active or trialing subscription
            active_sub = None
            for sub in subscriptions.data:
                if sub.status in ['active', 'trialing']:
                    active_sub = sub
                    break
            
            if active_sub:
                price = active_sub.items.data[0].price
                product = price.product
                
                return {
                    "id": active_sub.id,
                    "status": active_sub.status,
                    "current_period_start": datetime.fromtimestamp(active_sub.current_period_start).isoformat(),
                    "current_period_end": datetime.fromtimestamp(active_sub.current_period_end).isoformat(),
                    "trial_start": datetime.fromtimestamp(active_sub.trial_start).isoformat() if active_sub.trial_start else None,
                    "trial_end": datetime.fromtimestamp(active_sub.trial_end).isoformat() if active_sub.trial_end else None,
                    "cancel_at_period_end": active_sub.cancel_at_period_end,
                    "canceled_at": datetime.fromtimestamp(active_sub.canceled_at).isoformat() if active_sub.canceled_at else None,
                    "plan_name": product.name if hasattr(product, 'name') else price.nickname or "Unknown",
                    "amount": price.unit_amount / 100 if price.unit_amount else 0,
                    "currency": price.currency.upper(),
                    "interval": price.recurring.interval if price.recurring else "one_time",
                    "interval_count": price.recurring.interval_count if price.recurring else 1,
                    "created": datetime.fromtimestamp(active_sub.created).isoformat()
                }
            
            return None
            
        except stripe.error.InvalidRequestError as e:
            logger.error(f"Invalid customer ID for subscription lookup: {e}")
            return None
        except stripe.error.StripeError as e:
            logger.error(f"Failed to get subscription: {e}")
            return None
        except Exception as e:
            logger.error(f"Subscription fetch error: {e}")
            return None
    
    @staticmethod
    async def get_invoices(customer_id: str, limit: int = 10) -> List[Dict[str, Any]]:
        """Get customer invoices with comprehensive details"""
        try:
            StripeService._ensure_api_key()
            
            invoices = stripe.Invoice.list(
                customer=customer_id,
                limit=limit,
                expand=['data.subscription', 'data.payment_intent']
            )
            
            invoice_list = []
            for invoice in invoices.data:
                invoice_data = {
                    "id": invoice.id,
                    "number": invoice.number,
                    "amount_due": invoice.amount_due / 100,
                    "amount_paid": invoice.amount_paid / 100,
                    "amount_remaining": invoice.amount_remaining / 100,
                    "currency": invoice.currency.upper(),
                    "status": invoice.status,
                    "created": datetime.fromtimestamp(invoice.created).isoformat(),
                    "due_date": datetime.fromtimestamp(invoice.due_date).isoformat() if invoice.due_date else None,
                    "period_start": datetime.fromtimestamp(invoice.period_start).isoformat() if invoice.period_start else None,
                    "period_end": datetime.fromtimestamp(invoice.period_end).isoformat() if invoice.period_end else None,
                    "hosted_invoice_url": invoice.hosted_invoice_url,
                    "invoice_pdf": invoice.invoice_pdf,
                    "description": invoice.description,
                    "subscription_id": invoice.subscription
                }
                
                # Add payment status details
                if invoice.status_transitions:
                    if invoice.status_transitions.paid_at:
                        invoice_data["paid_at"] = datetime.fromtimestamp(invoice.status_transitions.paid_at).isoformat()
                    if invoice.status_transitions.finalized_at:
                        invoice_data["finalized_at"] = datetime.fromtimestamp(invoice.status_transitions.finalized_at).isoformat()
                
                invoice_list.append(invoice_data)
            
            return invoice_list
            
        except stripe.error.InvalidRequestError as e:
            logger.error(f"Invalid customer ID for invoice lookup: {e}")
            return []
        except stripe.error.StripeError as e:
            logger.error(f"Failed to get invoices: {e}")
            return []
        except Exception as e:
            logger.error(f"Invoice fetch error: {e}")
            return []
    
    @staticmethod
    async def update_subscription(customer_id: str, new_price_id: str) -> Dict[str, Any]:
        """Update subscription to new plan with proration"""
        try:
            StripeService._ensure_api_key()
            
            # Verify new price exists
            try:
                new_price = stripe.Price.retrieve(new_price_id)
                if not new_price.active:
                    raise ValueError(f"Price {new_price_id} is not active")
            except stripe.error.InvalidRequestError:
                raise ValueError(f"Invalid price ID: {new_price_id}")
            
            # Get current subscription
            subscriptions = stripe.Subscription.list(
                customer=customer_id,
                status='active',
                limit=1
            )
            
            if not subscriptions.data:
                raise ValueError("No active subscription found to update")
            
            subscription = subscriptions.data[0]
            current_item = subscription.items.data[0]
            
            # Check if it's actually a change
            if current_item.price.id == new_price_id:
                return {
                    "id": subscription.id, 
                    "status": subscription.status,
                    "message": "Subscription is already on the requested plan"
                }
            
            # Update subscription with proration
            updated_sub = stripe.Subscription.modify(
                subscription.id,
                items=[{
                    'id': current_item.id,
                    'price': new_price_id,
                }],
                proration_behavior='create_prorations',
                metadata={
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                    "previous_price": current_item.price.id,
                    "new_price": new_price_id
                }
            )
            
            logger.info(f"✅ Updated subscription: {updated_sub.id} from {current_item.price.id} to {new_price_id}")
            
            return {
                "id": updated_sub.id,
                "status": updated_sub.status,
                "current_period_end": datetime.fromtimestamp(updated_sub.current_period_end).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
            
        except stripe.error.InvalidRequestError as e:
            logger.error(f"Invalid subscription update request: {e}")
            raise ValueError(f"Invalid update parameters: {str(e)}")
        except stripe.error.StripeError as e:
            logger.error(f"Failed to update subscription: {e}")
            raise ValueError(f"Subscription update failed: {str(e)}")
        except Exception as e:
            logger.error(f"Subscription update error: {e}")
            raise ValueError(f"Update failed: {str(e)}")
    
    @staticmethod
    async def cancel_subscription(customer_id: str, immediately: bool = False) -> Dict[str, Any]:
        """Cancel subscription with option for immediate or end-of-period cancellation"""
        try:
            StripeService._ensure_api_key()
            
            # Get current subscription
            subscriptions = stripe.Subscription.list(
                customer=customer_id,
                status='active',
                limit=1
            )
            
            if not subscriptions.data:
                raise ValueError("No active subscription found to cancel")
            
            subscription = subscriptions.data[0]
            
            if immediately:
                # Cancel immediately
                canceled_sub = stripe.Subscription.delete(
                    subscription.id,
                    prorate=True
                )
                logger.info(f"✅ Immediately canceled subscription: {subscription.id}")
                
                return {
                    "id": canceled_sub.id,
                    "status": canceled_sub.status,
                    "canceled_at": datetime.now(timezone.utc).isoformat(),
                    "cancellation_type": "immediate"
                }
            else:
                # Cancel at period end
                canceled_sub = stripe.Subscription.modify(
                    subscription.id,
                    cancel_at_period_end=True,
                    metadata={
                        "cancellation_requested_at": datetime.now(timezone.utc).isoformat(),
                        "cancellation_type": "at_period_end"
                    }
                )
                logger.info(f"✅ Scheduled subscription cancellation at period end: {subscription.id}")
                
                return {
                    "id": canceled_sub.id,
                    "status": canceled_sub.status,
                    "cancel_at_period_end": canceled_sub.cancel_at_period_end,
                    "current_period_end": datetime.fromtimestamp(canceled_sub.current_period_end).isoformat(),
                    "cancellation_type": "at_period_end"
                }
            
        except stripe.error.InvalidRequestError as e:
            logger.error(f"Invalid cancellation request: {e}")
            raise ValueError(f"Invalid cancellation: {str(e)}")
        except stripe.error.StripeError as e:
            logger.error(f"Failed to cancel subscription: {e}")
            raise ValueError(f"Subscription cancellation failed: {str(e)}")
        except Exception as e:
            logger.error(f"Cancellation error: {e}")
            raise ValueError(f"Cancellation failed: {str(e)}")
    
    @staticmethod
    def verify_webhook_signature(payload: bytes, sig_header: str, webhook_secret: str) -> Dict[str, Any]:
        """Verify Stripe webhook signature for security"""
        try:
            if not webhook_secret:
                raise ValueError("Webhook secret not configured")
            
            event = stripe.Webhook.construct_event(
                payload, sig_header, webhook_secret
            )
            
            logger.info(f"✅ Verified webhook: {event['type']} - {event['id']}")
            return event
            
        except ValueError as e:
            logger.error(f"Webhook payload error: {e}")
            raise ValueError(f"Invalid webhook payload: {str(e)}")
        except stripe.error.SignatureVerificationError as e:
            logger.error(f"Webhook signature verification failed: {e}")
            raise ValueError(f"Invalid webhook signature: {str(e)}")
        except Exception as e:
            logger.error(f"Webhook verification error: {e}")
            raise ValueError(f"Webhook verification failed: {str(e)}")
    
    @staticmethod
    async def get_payment_methods(customer_id: str) -> List[Dict[str, Any]]:
        """Get customer's saved payment methods"""
        try:
            StripeService._ensure_api_key()
            
            payment_methods = stripe.PaymentMethod.list(
                customer=customer_id,
                type='card'
            )
            
            methods = []
            for pm in payment_methods.data:
                if pm.card:
                    methods.append({
                        "id": pm.id,
                        "brand": pm.card.brand,
                        "last4": pm.card.last4,
                        "exp_month": pm.card.exp_month,
                        "exp_year": pm.card.exp_year,
                        "country": pm.card.country,
                        "created": datetime.fromtimestamp(pm.created).isoformat()
                    })
            
            return methods
            
        except stripe.error.StripeError as e:
            logger.error(f"Failed to get payment methods: {e}")
            return []
        except Exception as e:
            logger.error(f"Payment methods fetch error: {e}")
            return []
    
    @staticmethod
    async def create_portal_session(customer_id: str, return_url: str) -> Dict[str, Any]:
        """Create customer portal session for self-service billing management"""
        try:
            StripeService._ensure_api_key()
            
            if not return_url.startswith(('http://', 'https://')):
                raise ValueError("Invalid return URL")
            
            session = stripe.billing_portal.Session.create(
                customer=customer_id,
                return_url=return_url
            )
            
            logger.info(f"✅ Created portal session for customer: {customer_id}")
            
            return {
                "url": session.url,
                "id": session.id,
                "created": datetime.fromtimestamp(session.created).isoformat()
            }
            
        except stripe.error.InvalidRequestError as e:
            logger.error(f"Invalid portal session request: {e}")
            raise ValueError(f"Invalid portal parameters: {str(e)}")
        except stripe.error.StripeError as e:
            logger.error(f"Failed to create portal session: {e}")
            raise ValueError(f"Portal session creation failed: {str(e)}")
        except Exception as e:
            logger.error(f"Portal session error: {e}")
            raise ValueError(f"Portal session failed: {str(e)}")