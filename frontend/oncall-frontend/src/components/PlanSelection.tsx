// PlanSelection.tsx - Component for new users to select their plan
import React, { useState } from 'react';
import { CheckIcon, StarIcon } from '@heroicons/react/24/outline';
import { useNotifications } from '../contexts/NotificationContext';

interface PlanSelectionProps {
  onPlanSelected: () => void;
}

const PlanSelection: React.FC<PlanSelectionProps> = ({ onPlanSelected }) => {
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
    setLoading(planId);
    
    try {
      if (planId === 'enterprise') {
        // For enterprise, just show contact message
        showToast({
          type: 'info',
          title: 'Enterprise Contact',
          message: 'Our sales team will contact you within 24 hours to discuss your enterprise needs.',
          autoClose: true,
        });
        onPlanSelected();
        return;
      }

      const token = localStorage.getItem('access_token');
      
      // For Pro and Plus plans, create Stripe checkout session
      const response = await fetch('/api/v1/billing/create-checkout-session', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          plan_type: planId,
          trial_days: 14 
        }),
      });

      if (response.ok) {
        const data = await response.json();
        
        if (data.checkout_url) {
          // Redirect to Stripe checkout
          window.location.href = data.checkout_url;
        } else {
          throw new Error('No checkout URL received');
        }
      } else {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to create checkout session');
      }
    } catch (error: any) {
      console.error('Plan selection error:', error);
      showToast({
        type: 'error',
        title: 'Error',
        message: error.message || 'Failed to process plan selection. Please try again.',
        autoClose: true,
      });
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center p-4">
      <div className="max-w-7xl mx-auto w-full">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="w-16 h-16 bg-gradient-to-r from-blue-500 via-purple-600 to-pink-500 rounded-xl flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
            <span className="bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
              Choose Your
            </span>{' '}
            <span className="bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 bg-clip-text text-transparent">
              Plan
            </span>
          </h1>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto">
            Select the plan that best fits your team's needs. Start with a 14-day free trial.
          </p>
        </div>

        {/* Plans Grid */}
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan) => (
            <div 
              key={plan.id}
              className={`relative p-8 rounded-2xl border transition-all duration-300 hover:transform hover:scale-105 ${
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
                disabled={loading === plan.id}
                className={`w-full py-4 px-6 rounded-xl font-semibold transition-all duration-200 ${
                  plan.buttonStyle
                } ${loading === plan.id ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {loading === plan.id ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Processing...
                  </div>
                ) : (
                  plan.buttonText
                )}
              </button>
            </div>
          ))}
        </div>

        {/* Skip Option */}
        <div className="text-center mt-12">
          <button
            onClick={onPlanSelected}
            className="text-gray-400 hover:text-gray-300 underline"
          >
            I'll choose a plan later
          </button>
        </div>
      </div>
    </div>
  );
};

export default PlanSelection;