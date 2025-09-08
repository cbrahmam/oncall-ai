// STEP 4: Frontend Route Protection
// Create frontend/src/components/ProtectedRoute.tsx

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireSubscription?: boolean;
  allowedPlans?: string[];
  requireMFA?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requireSubscription = false,
  allowedPlans = ['free', 'pro', 'enterprise'],
  requireMFA = false
}) => {
  const { user, isAuthenticated, subscription, loading } = useAuth();
  const location = useLocation();

  // Show loading spinner while checking auth
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check if user email is verified
  if (!user.email_verified_at) {
    return <Navigate to="/verify-email" replace />;
  }

  // Check subscription requirements
  if (requireSubscription && (!subscription || !subscription.active)) {
    return <Navigate to="/pricing" replace />;
  }

  // Check plan requirements
  if (subscription && !allowedPlans.includes(subscription.plan_type)) {
    return <Navigate to="/upgrade" replace />;
  }

  // Check MFA requirements for sensitive pages
  if (requireMFA && user.mfa_enabled && !user.mfa_verified_session) {
    return <Navigate to="/mfa-verify" replace />;
  }

  // All checks passed, render the protected content
  return <>{children}</>;
};
