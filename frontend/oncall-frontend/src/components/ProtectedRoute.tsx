// frontend/src/components/ProtectedRoute.tsx - Fixed component for App.tsx integration
import React from 'react';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireSubscription?: boolean;
  allowedPlans?: string[];
  onUpgradeRequired?: () => void;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requireSubscription = false,
  allowedPlans = ['free', 'pro', 'plus', 'enterprise'],
  onUpgradeRequired
}) => {
  const { user, isAuthenticated, subscription, loading } = useAuth();

  // Show loading spinner while checking auth
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // If not authenticated, return null - App.tsx handles the redirect
  if (!isAuthenticated || !user) {
    return null;
  }

  // Check if user email is verified (optional check)
  if (user.email_verified_at === null) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Email Verification Required</h2>
          <p className="text-gray-400 mb-6">
            Please check your email and verify your account to continue.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            I've verified my email
          </button>
        </div>
      </div>
    );
  }

  // Check subscription requirements
  if (requireSubscription) {
    // If no subscription or not active, trigger upgrade flow
    if (!subscription || !subscription.active) {
      if (onUpgradeRequired) {
        onUpgradeRequired();
        return null;
      }
      
      return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center">
          <div className="max-w-md mx-auto text-center">
            <h2 className="text-2xl font-bold text-white mb-4">Subscription Required</h2>
            <p className="text-gray-400 mb-6">
              This feature requires an active subscription. Please upgrade your plan to continue.
            </p>
            <button
              onClick={onUpgradeRequired}
              className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-lg transition-all"
            >
              Upgrade Now
            </button>
          </div>
        </div>
      );
    }

    // Check plan requirements
    if (!allowedPlans.includes(subscription.plan_type)) {
      if (onUpgradeRequired) {
        onUpgradeRequired();
        return null;
      }
      
      return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center">
          <div className="max-w-md mx-auto text-center">
            <h2 className="text-2xl font-bold text-white mb-4">Plan Upgrade Required</h2>
            <p className="text-gray-400 mb-6">
              Your current plan ({subscription.plan_type}) doesn't include access to this feature. 
              Please upgrade to continue.
            </p>
            <button
              onClick={onUpgradeRequired}
              className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-lg transition-all"
            >
              Upgrade Plan
            </button>
          </div>
        </div>
      );
    }
  }

  // Check MFA requirements for sensitive pages (if implemented)
  if (user.mfa_enabled && !user.mfa_verified_session) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center">
          <h2 className="text-2xl font-bold text-white mb-4">MFA Verification Required</h2>
          <p className="text-gray-400 mb-6">
            Please verify your identity using your configured MFA method.
          </p>
          <button
            onClick={() => {
              // Redirect to MFA verification page when implemented
              console.log('Redirect to MFA verification');
            }}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Verify Identity
          </button>
        </div>
      </div>
    );
  }

  // All checks passed, render the protected content
  return <>{children}</>;
};

// Default export for easy importing
export default ProtectedRoute;