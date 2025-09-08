// frontend/src/components/UpgradePage.tsx
import React, { useState } from 'react';
import { CheckIcon, StarIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';

interface UpgradePageProps {
  onPlanSelected?: () => void;
  currentPlan?: string;
}

const UpgradePage: React.FC<UpgradePageProps> = ({ 
  onPlanSelected,
  currentPlan = 'free'
}) => {
  const { user, isAuthenticated } = useAuth();
  const { showToast } = useNotifications();
  const [loading, setLoading] = useState<string | null>(null);

  const upgradePlans = [
    {
      id: 'pro',
      name: 'Pro',
      price: '$29',
      period: '/user/month',
      description: 'Perfect for growing teams',
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
      buttonText: 'Upgrade to Pro',
      savings: currentPlan === 'free' ? 'Most Popular Upgrade' : undefined
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
      buttonText: 'Upgrade to Plus',
      savings: currentPlan === 'pro' ? 'Best Value' : undefined
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
      savings: 'Premium Support'
    }
  ];

  const currentPlanFeatures = {
    free: ['Up to 3 team members', 'Basic incident management', 'Email notifications'],
    pro: ['Up to 25 team members', 'AI-powered analysis', 'Advanced notifications'],
    plus: ['Unlimited team members', 'Advanced AI features', 'Multi-channel notifications']
  };

  const handleUpgrade = async (planId: string) => {
    if (!isAuthenticated) {
      showToast({
        type: 'warning',
        title: 'Authentication Required',
        message: 'Please log in to upgrade your plan.',
        autoClose: true,
      });
      return;
    }

    if (planId === 'enterprise') {
      // Handle enterprise contact
      window.location.href = 'mailto:sales@offcallai.com?subject=Enterprise Plan Inquiry';
      return;
    }

    setLoading(planId);

    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch('/api/v1/billing/create-checkout-session', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          plan_type: planId,
          success_url: `${window.location.origin}/dashboard?upgrade=success`,
          cancel_url: `${window.location.origin}/upgrade?upgrade=cancelled`
        }),
      });

      if (response.ok) {
        const data = await response.json();
        window.location.href = data.checkout_url;
      } else {
        throw new Error('Failed to create checkout session');
      }
    } catch (error) {
      console.error('Upgrade error:', error);
      showToast({
        type: 'error',
        title: 'Upgrade Failed',
        message: 'Unable to process upgrade. Please try again.',
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
          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            <span className="bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent">
              Upgrade Your
            </span>
            <br />
            <span className="bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 bg-clip-text text-transparent">
              OffCall AI Plan
            </span>
          </h1>
          
          <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-8">
            Unlock advanced features and scale your incident response capabilities.
          </p>

          {/* Current Plan Display */}
          <div className="inline-flex items-center px-6 py-3 rounded-full bg-gradient-to-r from-gray-800 to-gray-700 border border-gray-600">
            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-white font-medium">
                Current Plan: {currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1)}
              </span>
            </div>
          </div>
        </div>

        {/* Current Plan Summary */}
        <div className="mb-12 p-6 rounded-2xl bg-gradient-to-r from-gray-800/50 to-gray-900/50 border border-gray-700/50">
          <h3 className="text-lg font-semibold text-white mb-4">Your Current Plan Includes:</h3>
          <div className="grid md:grid-cols-3 gap-4">
            {currentPlanFeatures[currentPlan as keyof typeof currentPlanFeatures]?.map((feature, index) => (
              <div key={index} className="flex items-center space-x-2">
                <CheckIcon className="w-5 h-5 text-green-500 flex-shrink-0" />
                <span className="text-gray-300">{feature}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Upgrade Options */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          {upgradePlans.map((plan) => (
            <div
              key={plan.id}
              className={`relative rounded-2xl p-8 ${
                plan.popular
                  ? 'bg-gradient-to-br from-blue-500/20 to-purple-600/20 border-2 border-blue-500/50'
                  : 'bg-gradient-to-br from-gray-800/50 to-gray-900/50 border border-gray-700/50'
              } backdrop-blur-sm hover:transform hover:scale-105 transition-all duration-300`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="inline-flex items-center px-4 py-1 rounded-full text-sm font-medium bg-gradient-to-r from-blue-500 to-purple-600 text-white">
                    <StarIcon className="w-4 h-4 mr-1" />
                    Most Popular
                  </span>
                </div>
              )}

              {plan.savings && (
                <div className="absolute -top-4 right-4">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/30">
                    {plan.savings}
                  </span>
                </div>
              )}

              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-white mb-2">{plan.name}</h3>
                <p className="text-gray-400 mb-4">{plan.description}</p>
                <div className="mb-6">
                  <span className="text-4xl font-bold text-white">{plan.price}</span>
                  {plan.period && <span className="text-gray-400 ml-1">{plan.period}</span>}
                </div>
              </div>

              <ul className="space-y-4 mb-8">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start space-x-3">
                    <CheckIcon className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-300">{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleUpgrade(plan.id)}
                disabled={loading === plan.id}
                className={`w-full py-3 px-6 rounded-xl font-semibold transition-all duration-200 ${
                  plan.popular
                    ? 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-lg shadow-blue-500/25'
                    : 'bg-gray-700 hover:bg-gray-600 text-white'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {loading === plan.id ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Processing...</span>
                  </div>
                ) : (
                  plan.buttonText
                )}
              </button>
            </div>
          ))}
        </div>

        {/* FAQ Section */}
        <div className="text-center">
          <h3 className="text-2xl font-bold text-white mb-6">Need Help Choosing?</h3>
          <p className="text-gray-400 mb-6">
            Our team is here to help you find the perfect plan for your organization.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => window.location.href = 'mailto:support@offcallai.com?subject=Plan Recommendation Request'}
              className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-xl transition-colors"
            >
              Email Support
            </button>
            <button
              onClick={() => window.location.href = 'https://calendly.com/offcallai/consultation'}
              className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-medium rounded-xl transition-all"
            >
              Schedule a Call
            </button>
          </div>
        </div>

        {/* Money Back Guarantee */}
        <div className="mt-16 text-center p-6 rounded-2xl bg-gradient-to-r from-green-500/10 to-blue-500/10 border border-green-500/20">
          <h4 className="text-lg font-semibold text-white mb-2">30-Day Money Back Guarantee</h4>
          <p className="text-gray-400">
            Try any paid plan risk-free. If you're not satisfied, we'll refund your money within 30 days.
          </p>
        </div>
      </div>
    </div>
  );
};

export default UpgradePage;