import React, { useState } from 'react';
import { 
  CheckIcon,
  StarIcon,
  BoltIcon,
  ShieldCheckIcon,
  CpuChipIcon,
  UsersIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';

interface PricingPageProps {
  onPlanSelected?: (planId: string) => void;
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
      id: 'pro',
      name: 'Pro',
      price: '$29',
      period: '/user/month',
      description: 'Perfect for growing teams',
      popular: true,
      trial: '14-day free trial',
      features: [
        'Up to 25 team members',
        'AI-powered incident analysis',
        'Unlimited monitoring integrations',
        'Slack, SMS & email notifications',
        'Basic escalation policies',
        'Community support',
        'Mobile app access',
        'Basic analytics dashboard'
      ],
      buttonText: 'Start 14-Day Free Trial',
      buttonStyle: 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white'
    },
    {
      id: 'plus',
      name: 'Plus',
      price: '$49',
      period: '/user/month',
      description: 'For scaling organizations',
      popular: false,
      trial: '14-day free trial',
      features: [
        'Everything in Pro',
        'Unlimited team members',
        'Advanced AI features (Claude + Gemini)',
        'Custom escalation policies',
        'Advanced analytics & reporting',
        'Priority support (4-hour response)',
        'API access & webhooks',
        'Custom SLA management',
        'Advanced security controls'
      ],
      buttonText: 'Start 14-Day Free Trial',
      buttonStyle: 'bg-gray-700 hover:bg-gray-600 text-white border border-gray-600'
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      price: 'Custom',
      period: '',
      description: 'For large organizations',
      popular: false,
      trial: 'Custom trial period',
      features: [
        'Everything in Plus',
        'Dedicated success manager',
        'Custom deployment options',
        'Advanced security & compliance',
        'Custom integrations development',
        'Training & onboarding',
        'SLA guarantees (99.9% uptime)',
        'White-label options',
        '24/7 phone support'
      ],
      buttonText: 'Contact Sales',
      buttonStyle: 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white'
    }
  ];

  const handlePlanSelection = async (planId: string) => {
    if (!isAuthenticated) {
      showToast({
        type: 'warning',
        title: 'Authentication Required',
        message: 'Please sign up or log in to start your free trial.',
        autoClose: true,
      });
      return;
    }

    setLoading(planId);

    try {
      const token = localStorage.getItem('access_token');

      if (planId === 'enterprise') {
        // Redirect to sales contact
        window.location.href = 'mailto:sales@offcallai.com?subject=Enterprise Plan Inquiry&body=Hi, I\'m interested in the Enterprise plan for my organization.';
        return;
      }

      // For Pro and Plus plans, redirect to Stripe checkout
      const response = await fetch('/api/v1/billing/create-checkout-session', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          plan_type: planId,
          trial_days: 14 // 14-day free trial
        }),
      });

      if (response.ok) {
        const data = await response.json();
        showToast({
          type: 'success',
          title: 'Redirecting to Checkout',
          message: 'Starting your 14-day free trial...',
          autoClose: true,
        });
        window.location.href = data.checkout_url;
      } else {
        throw new Error('Failed to create checkout session');
      }
    } catch (error) {
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
              Start Your Free Trial
            </span>
            <br />
            <span className="bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 bg-clip-text text-transparent">
              No Credit Card Required
            </span>
          </h1>
          
          <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-8">
            Try OffCall AI risk-free for 14 days. Cancel anytime, no questions asked.
          </p>

          {/* Trust Badges */}
          <div className="flex justify-center gap-8 text-gray-400 text-sm">
            <div className="flex items-center gap-2">
              <ShieldCheckIcon className="w-5 h-5" />
              <span>SOC 2 Compliant</span>
            </div>
            <div className="flex items-center gap-2">
              <BoltIcon className="w-5 h-5" />
              <span>99.9% Uptime</span>
            </div>
            <div className="flex items-center gap-2">
              <UsersIcon className="w-5 h-5" />
              <span>500+ Teams</span>
            </div>
          </div>

          {currentPlan && (
            <div className="mt-6">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-500/20 text-blue-300">
                Current Plan: {currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1)}
              </span>
            </div>
          )}
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 mb-16 max-w-6xl mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`relative rounded-2xl p-8 transition-all duration-200 ${
                plan.popular
                  ? 'border-2 border-blue-500/50 bg-blue-500/10 shadow-2xl shadow-blue-500/20 scale-105'
                  : 'border border-gray-700/50 bg-gray-800/30 hover:border-gray-600/50 hover:bg-gray-800/50'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-2 rounded-full text-sm font-medium flex items-center gap-1">
                    <StarIcon className="w-4 h-4" />
                    Most Popular
                  </span>
                </div>
              )}

              <div className="text-center">
                <h3 className="text-2xl font-bold text-white mb-2">{plan.name}</h3>
                <div className="mb-2">
                  <span className="text-4xl font-bold text-white">{plan.price}</span>
                  {plan.period && <span className="text-gray-400">{plan.period}</span>}
                </div>
                <p className="text-gray-400 mb-1">{plan.description}</p>
                <p className="text-blue-400 font-medium text-sm mb-6">{plan.trial}</p>
              </div>

              <ul className="space-y-3 mb-8">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <CheckIcon className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-300">{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handlePlanSelection(plan.id)}
                disabled={loading === plan.id || (currentPlan === plan.id && plan.id !== 'enterprise')}
                className={`w-full py-4 px-6 rounded-xl font-semibold transition-all duration-200 ${
                  currentPlan === plan.id && plan.id !== 'enterprise'
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
              <h3 className="text-lg font-semibold text-white mb-2">How does the 14-day free trial work?</h3>
              <p className="text-gray-400">
                Start using OffCall AI immediately with full access to all features. No credit card required 
                to start. You'll only be charged after your trial ends if you choose to continue.
              </p>
            </div>

            <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-2">Can I change plans anytime?</h3>
              <p className="text-gray-400">
                Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately, 
                and we'll prorate the billing accordingly.
              </p>
            </div>

            <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-2">What happens after my trial ends?</h3>
              <p className="text-gray-400">
                If you don't upgrade during your trial, your account will be paused. You can reactivate 
                anytime by selecting a plan. Your data is safely stored for 30 days.
              </p>
            </div>

            <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-2">Do you offer annual discounts?</h3>
              <p className="text-gray-400">
                Yes! Save 20% when you choose annual billing. Contact our sales team for volume discounts 
                on Enterprise plans.
              </p>
            </div>
          </div>
        </div>

        {/* Contact Section */}
        <div className="text-center mt-16">
          <p className="text-gray-400 mb-4">
            Need help choosing the right plan?
          </p>
          <a 
            href="mailto:support@offcallai.com"
            className="text-blue-400 hover:text-blue-300 transition-colors"
          >
            Contact our team →
          </a>
        </div>
      </div>
    </div>
  );
};

export default PricingPage;