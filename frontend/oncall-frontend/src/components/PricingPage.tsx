// frontend/src/components/PricingPage.tsx
import React, { useState } from 'react';
import { CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';

interface PricingPageProps {
  onPlanSelected?: () => void;
  currentPlan?: string;
  showBackButton?: boolean;
  onBack?: () => void;
}

const PricingPage: React.FC<PricingPageProps> = ({ 
  onPlanSelected, 
  currentPlan,
  showBackButton = false,
  onBack 
}) => {
  const { user, isAuthenticated } = useAuth();
  const { showToast } = useNotifications();
  const [loading, setLoading] = useState<string | null>(null);

  const plans = [
    {
      id: 'free',
      name: 'Free',
      price: '$0',
      period: '/forever',
      description: 'Perfect for getting started',
      popular: false,
      features: [
        'Up to 3 team members',
        'Basic incident management',
        'Email notifications',
        'Community support',
        '5 integrations'
      ],
      buttonText: 'Get Started',
      buttonStyle: 'bg-gray-700 hover:bg-gray-600 text-white'
    },
    {
      id: 'pro',
      name: 'Pro',
      price: '$29',
      period: '/user/month',
      description: 'For growing teams',
      popular: true,
      features: [
        'Up to 25 team members',
        'AI-powered incident analysis',
        'Advanced notifications (Slack, SMS)',
        'Priority support',
        'Unlimited integrations',
        'Custom escalation policies',
        'Basic analytics'
      ],
      buttonText: 'Get Started',
      buttonStyle: 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white'
    },
    {
      id: 'plus',
      name: 'Plus',
      price: '$49',
      period: '/user/month',
      description: 'For scaling organizations',
      popular: false,
      features: [
        'Unlimited team members',
        'Advanced AI features',
        'Multi-channel notifications',
        '24/7 dedicated support',
        'Enterprise integrations',
        'Advanced analytics & reporting',
        'Custom SLA management',
        'API access'
      ],
      buttonText: 'Get Started',
      buttonStyle: 'bg-gray-700 hover:bg-gray-600 text-white border border-gray-600'
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      price: 'Custom',
      period: '',
      description: 'For large organizations',
      popular: false,
      features: [
        'Everything in Plus',
        'Dedicated success manager',
        'Custom deployment options',
        'Advanced security controls',
        'Custom integrations',
        'Training & onboarding',
        'SLA guarantees',
        'White-label options'
      ],
      buttonText: 'Contact Sales',
      buttonStyle: 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white'
    }
  ];

  const handlePlanSelection = async (planId: string) => {
    if (!isAuthenticated && planId !== 'free') {
      showToast({
        type: 'warning',
        title: 'Authentication Required',
        message: 'Please sign up or log in to select a paid plan.',
        autoClose: true,
      });
      return;
    }

    setLoading(planId);

    try {
      if (planId === 'free') {
        // For free plan, just mark as selected
        if (onPlanSelected) onPlanSelected();
        showToast({
          type: 'success',
          title: 'Plan Selected',
          message: 'Welcome to OffCall AI! You can upgrade anytime from settings.',
          autoClose: true,
        });
        return;
      }

      if (planId === 'enterprise') {
        // For enterprise, redirect to contact form or show contact info
        showToast({
          type: 'info',
          title: 'Enterprise Plan',
          message: 'Our sales team will contact you within 24 hours to discuss your requirements.',
          autoClose: true,
        });
        return;
      }

      // For paid plans, create Stripe checkout session
      const token = localStorage.getItem('access_token');
      const response = await fetch('/api/v1/billing/create-checkout-session', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          plan_type: planId,
          success_url: `${window.location.origin}/dashboard?payment=success`,
          cancel_url: `${window.location.origin}/pricing?payment=cancelled`
        }),
      });

      if (response.ok) {
        const data = await response.json();
        // Redirect to Stripe Checkout
        window.location.href = data.checkout_url;
      } else {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to create checkout session');
      }
    } catch (error) {
      console.error('Plan selection error:', error);
      showToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to process plan selection. Please try again.',
        autoClose: true,
      });
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          {showBackButton && (
            <button
              onClick={onBack}
              className="mb-8 text-gray-400 hover:text-white transition-colors inline-flex items-center"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Dashboard
            </button>
          )}
          
          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            <span className="bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent">
              Simple, Transparent
            </span>
            <br />
            <span className="bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 bg-clip-text text-transparent">
              Pricing
            </span>
          </h1>
          
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Start free, scale as you grow. No hidden fees, no vendor lock-in.
          </p>

          {currentPlan && (
            <div className="mt-6">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-500/20 text-blue-300">
                Current Plan: {currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1)}
              </span>
            </div>
          )}
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`relative rounded-2xl p-8 ${
                plan.popular
                  ? 'bg-gradient-to-b from-blue-500/10 to-purple-600/10 border-2 border-blue-500/30'
                  : 'bg-gray-800/50 border border-gray-700'
              } hover:transform hover:scale-105 transition-all duration-200`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-1 rounded-full text-sm font-medium">
                    Most Popular
                  </span>
                </div>
              )}

              {/* Plan Header */}
              <div className="mb-6">
                <h3 className="text-xl font-bold text-white mb-2">{plan.name}</h3>
                <p className="text-gray-400 text-sm mb-4">{plan.description}</p>
                <div className="flex items-baseline">
                  <span className="text-4xl font-bold text-white">{plan.price}</span>
                  <span className="text-gray-400 ml-1">{plan.period}</span>
                </div>
              </div>

              {/* Features */}
              <ul className="space-y-3 mb-8">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start">
                    <CheckIcon className="w-5 h-5 text-green-400 mr-3 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-300 text-sm">{feature}</span>
                  </li>
                ))}
              </ul>

              {/* CTA Button */}
              <button
                onClick={() => handlePlanSelection(plan.id)}
                disabled={loading === plan.id || currentPlan === plan.id}
                className={`w-full py-3 rounded-xl font-medium transition-all duration-200 ${
                  currentPlan === plan.id
                    ? 'bg-gray-600 text-gray-300 cursor-not-allowed'
                    : plan.buttonStyle
                } ${loading === plan.id ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {loading === plan.id ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Processing...
                  </div>
                ) : currentPlan === plan.id ? (
                  'Current Plan'
                ) : (
                  plan.buttonText
                )}
              </button>
            </div>
          ))}
        </div>

        {/* FAQ Section */}
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-white text-center mb-12">
            Frequently Asked Questions
          </h2>
          
          <div className="space-y-6">
            <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-2">Can I change plans anytime?</h3>
              <p className="text-gray-400">
                Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately, 
                and we'll prorate the billing accordingly.
              </p>
            </div>

            <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-2">What payment methods do you accept?</h3>
              <p className="text-gray-400">
                We accept all major credit cards (Visa, Mastercard, American Express) and bank transfers 
                for enterprise customers.
              </p>
            </div>

            <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-2">Is there a free trial?</h3>
              <p className="text-gray-400">
                Yes! Our Free plan gives you full access to basic features forever. 
                Pro and Plus plans come with a 14-day free trial.
              </p>
            </div>

            <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-2">Do you offer discounts for annual billing?</h3>
              <p className="text-gray-400">
                Yes, save 20% when you choose annual billing. Contact our sales team for volume discounts 
                on enterprise plans.
              </p>
            </div>
          </div>
        </div>

        {/* Contact Section */}
        <div className="text-center mt-16">
          <p className="text-gray-400 mb-4">
            Need help choosing the right plan?
          </p>
          <button className="text-blue-400 hover:text-blue-300 font-medium transition-colors">
            Contact our sales team →
          </button>
        </div>
      </div>
    </div>
  );
};

export default PricingPage;