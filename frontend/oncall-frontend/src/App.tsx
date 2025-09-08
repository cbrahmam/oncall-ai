// frontend/src/App.tsx - Updated with subscription enforcement and protected routes
import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { NotificationProvider, useNotifications } from './contexts/NotificationContext';
import AuthPages from './components/AuthPages';
import Dashboard from './components/Dashboard';
import SettingsPage from './components/SettingsPage';
import UserProfile from './components/UserProfile';
import LandingPage from './components/LandingPage';
import OAuthCallback from './components/OAuthCallback';
import ToastNotifications from './components/ToastNotifications';
import NotificationCenter from './components/NotificationCenter';
import NotificationSettings from './components/NotificationSettings';
import IncidentDetail from './components/IncidentDetail';
import PricingPage from './components/PricingPage';
import UpgradePage from './components/UpgradePage';
import { BellIcon, Cog6ToothIcon, LockClosedIcon } from '@heroicons/react/24/outline';

// Updated Page type to include new pages
type Page = 'landing' | 'auth' | 'dashboard' | 'settings' | 'profile' | 'notifications' | 'incident-detail' | 'oauth-callback' | 'pricing' | 'upgrade' | 'plan-selection';

// Subscription check hook
const useSubscription = () => {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSubscription = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const token = localStorage.getItem('access_token');
        const response = await fetch('/api/v1/billing/subscription', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          setSubscription(data);
        }
      } catch (error) {
        console.error('Failed to fetch subscription:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSubscription();
  }, [user]);

  const hasValidSubscription = subscription?.active && ['pro', 'enterprise'].includes(subscription?.plan_type);
  const isFreePlan = !subscription || subscription?.plan_type === 'free';

  return { subscription, hasValidSubscription, isFreePlan, loading };
};

// Protected Route Component
interface ProtectedRouteProps {
  children: React.ReactNode;
  requireSubscription?: boolean;
  allowedPlans?: string[];
  onUpgradeRequired?: () => void;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requireSubscription = false, 
  allowedPlans = ['free', 'pro', 'enterprise'],
  onUpgradeRequired 
}) => {
  const { isAuthenticated, user } = useAuth();
  const { subscription, loading } = useSubscription();
  const { showToast } = useNotifications();

  // Show loading while checking subscription
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Check authentication
  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl text-white mb-4">Authentication Required</h2>
          <p className="text-gray-400">Please log in to access this page.</p>
        </div>
      </div>
    );
  }

  // Check subscription requirements
  if (requireSubscription && (!subscription || !subscription.active)) {
    showToast({
      type: 'warning',
      title: 'Subscription Required',
      message: 'This feature requires an active subscription. Please upgrade your plan.',
      autoClose: true,
      duration: 5000
    });

    if (onUpgradeRequired) onUpgradeRequired();

    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <LockClosedIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-4">Subscription Required</h2>
          <p className="text-gray-400 mb-6">
            This feature is available for Pro and Enterprise subscribers. Upgrade your plan to access advanced functionality.
          </p>
          <button
            onClick={onUpgradeRequired}
            className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-6 py-3 rounded-xl font-medium transition-all duration-200"
          >
            Upgrade Now
          </button>
        </div>
      </div>
    );
  }

  // Check plan requirements
  if (subscription && !allowedPlans.includes(subscription.plan_type)) {
    showToast({
      type: 'warning',
      title: 'Plan Upgrade Required',
      message: `This feature requires ${allowedPlans.filter(p => p !== 'free').join(' or ')} plan.`,
      autoClose: true,
      duration: 5000
    });

    if (onUpgradeRequired) onUpgradeRequired();

    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <LockClosedIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-4">Plan Upgrade Required</h2>
          <p className="text-gray-400 mb-6">
            This feature requires {allowedPlans.filter(p => p !== 'free').join(' or ')} plan. 
            Current plan: {subscription?.plan_type || 'Free'}
          </p>
          <button
            onClick={onUpgradeRequired}
            className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-6 py-3 rounded-xl font-medium transition-all duration-200"
          >
            Upgrade Plan
          </button>
        </div>
      </div>
    );
  }

  // All checks passed, render the protected content
  return <>{children}</>;
};

// Plan Selection Component (shown after signup)
const PlanSelection: React.FC<{ onPlanSelected: () => void }> = ({ onPlanSelected }) => {
  const { showToast } = useNotifications();
  const [loading, setLoading] = useState(false);

  const handlePlanSelection = async (planType: string) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('access_token');
      
      if (planType === 'free') {
        // For free plan, just mark as selected
        onPlanSelected();
        showToast({
          type: 'success',
          title: 'Plan Selected',
          message: 'Welcome to OffCall AI! You can upgrade anytime from settings.',
          autoClose: true,
        });
        return;
      }

      // For paid plans, redirect to Stripe
      const response = await fetch('/api/v1/billing/create-checkout-session', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ plan_type: planType }),
      });

      if (response.ok) {
        const data = await response.json();
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
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center p-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">Choose Your Plan</h1>
          <p className="text-xl text-gray-400">Select the plan that best fits your needs to get started</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Free Plan */}
          <div className="border border-gray-700 rounded-xl p-6 bg-gray-800/50">
            <h3 className="text-xl font-bold text-white mb-2">Free</h3>
            <p className="text-3xl font-bold text-white mb-4">$0<span className="text-sm text-gray-400">/month</span></p>
            <ul className="text-gray-300 mb-6 space-y-2">
              <li>• Up to 5 incidents/month</li>
              <li>• Basic notifications</li>
              <li>• Email support</li>
              <li>• Community access</li>
            </ul>
            <button
              onClick={() => handlePlanSelection('free')}
              disabled={loading}
              className="w-full bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-lg font-medium transition-colors"
            >
              Get Started Free
            </button>
          </div>

          {/* Pro Plan */}
          <div className="border border-blue-500 rounded-xl p-6 bg-blue-500/10 relative">
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
              <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm">Most Popular</span>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Pro</h3>
            <p className="text-3xl font-bold text-white mb-4">$49<span className="text-sm text-gray-400">/month</span></p>
            <ul className="text-gray-300 mb-6 space-y-2">
              <li>• Unlimited incidents</li>
              <li>• AI-powered insights</li>
              <li>• Advanced integrations</li>
              <li>• Priority support</li>
              <li>• Custom alerting</li>
            </ul>
            <button
              onClick={() => handlePlanSelection('pro')}
              disabled={loading}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-lg font-medium transition-colors"
            >
              Start Pro Trial
            </button>
          </div>

          {/* Enterprise Plan */}
          <div className="border border-gray-700 rounded-xl p-6 bg-gray-800/50">
            <h3 className="text-xl font-bold text-white mb-2">Enterprise</h3>
            <p className="text-3xl font-bold text-white mb-4">Custom</p>
            <ul className="text-gray-300 mb-6 space-y-2">
              <li>• Everything in Pro</li>
              <li>• SSO integration</li>
              <li>• Custom workflows</li>
              <li>• Dedicated support</li>
              <li>• SLA guarantees</li>
            </ul>
            <button
              onClick={() => handlePlanSelection('enterprise')}
              disabled={loading}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-lg font-medium transition-colors"
            >
              Contact Sales
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const AppContent: React.FC = () => {
  const { isAuthenticated, isLoading, user, logout } = useAuth();
  const { unreadCount, showToast } = useNotifications();
  const { subscription, isFreePlan } = useSubscription();
  const [currentPage, setCurrentPage] = useState<Page>('landing');
  const [currentIncidentId, setCurrentIncidentId] = useState<string | null>(null);
  const [showNotificationCenter, setShowNotificationCenter] = useState(false);
  const [hasSelectedPlan, setHasSelectedPlan] = useState(false);

  // Check if user needs to select a plan (new users)
  useEffect(() => {
    if (isAuthenticated && user && !subscription) {
      // New user without subscription - show plan selection
      const planSelected = localStorage.getItem(`plan_selected_${user.id}`);
      if (!planSelected) {
        setCurrentPage('plan-selection');
      } else {
        setHasSelectedPlan(true);
      }
    }
  }, [isAuthenticated, user, subscription]);

  // Simple client-side routing with proper navigation
  useEffect(() => {
    if (currentPage === 'plan-selection') return; // Don't override plan selection

    const path = window.location.pathname;
    const incidentMatch = path.match(/\/incidents\/([a-zA-Z0-9-]+)/);
    
    if (path.includes('/auth/oauth/callback')) {
      setCurrentPage('oauth-callback');
    } else if (incidentMatch) {
      setCurrentIncidentId(incidentMatch[1]);
      setCurrentPage('incident-detail');
    } else if (path.includes('/settings')) setCurrentPage('settings');
    else if (path.includes('/profile')) setCurrentPage('profile');
    else if (path.includes('/notifications')) setCurrentPage('notifications');
    else if (path.includes('/pricing')) setCurrentPage('pricing');
    else if (path.includes('/upgrade')) setCurrentPage('upgrade');
    else if (path.includes('/app') || path.includes('/dashboard')) setCurrentPage('dashboard');
    else if (path.includes('/auth') || path.includes('/login') || path.includes('/register')) setCurrentPage('auth');
    else setCurrentPage('landing');

    // Handle browser back/forward navigation
    const handlePopState = () => {
      const newPath = window.location.pathname;
      const newIncidentMatch = newPath.match(/\/incidents\/([a-zA-Z0-9-]+)/);
      
      if (newPath.includes('/auth/oauth/callback')) {
        setCurrentPage('oauth-callback');
      } else if (newIncidentMatch) {
        setCurrentIncidentId(newIncidentMatch[1]);
        setCurrentPage('incident-detail');
      } else if (newPath.includes('/settings')) setCurrentPage('settings');
      else if (newPath.includes('/profile')) setCurrentPage('profile');
      else if (newPath.includes('/notifications')) setCurrentPage('notifications');
      else if (newPath.includes('/pricing')) setCurrentPage('pricing');
      else if (newPath.includes('/upgrade')) setCurrentPage('upgrade');
      else if (newPath.includes('/app') || newPath.includes('/dashboard')) setCurrentPage('dashboard');
      else if (newPath.includes('/auth') || newPath.includes('/login') || newPath.includes('/register')) setCurrentPage('auth');
      else setCurrentPage('landing');
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [currentPage]);

  // Welcome notification for authenticated users (only show once)
  useEffect(() => {
    if (isAuthenticated && user && currentPage === 'dashboard') {
      const timer = setTimeout(() => {
        showToast({
          type: 'success',
          title: 'Welcome to OffCall AI',
          message: 'Real-time notifications are now active. You\'ll receive instant alerts for incidents and system updates.',
          autoClose: true,
          duration: 8000
        });
      }, 1500);

      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, user, currentPage, showToast]);

  // Navigation function with proper URL updates
  const navigate = (page: Page, incidentId?: string) => {
    setCurrentPage(page);
    if (page === 'incident-detail' && incidentId) {
      setCurrentIncidentId(incidentId);
      window.history.pushState(null, '', `/incidents/${incidentId}`);
    } else {
      setCurrentIncidentId(null);
      let url = '/';
      if (page === 'dashboard') url = '/app';
      else if (page === 'auth') url = '/auth';
      else if (page === 'landing') url = '/';
      else if (page === 'oauth-callback') url = '/auth/oauth/callback';
      else if (page === 'pricing') url = '/pricing';
      else if (page === 'upgrade') url = '/upgrade';
      else url = `/${page}`;
      window.history.pushState(null, '', url);
    }
  };

  // Handle navigation from landing page to register (not login)
  const handleNavigateToAuth = () => {
    navigate('auth');
  };

  // Handle plan selection completion
  const handlePlanSelected = () => {
    if (user) {
      localStorage.setItem(`plan_selected_${user.id}`, 'true');
      setHasSelectedPlan(true);
      navigate('dashboard');
    }
  };

  // Handle upgrade requirement
  const handleUpgradeRequired = () => {
    navigate('pricing');
  };

  // Navigation Header Component for authenticated users with subscription indicators
  const NavigationHeader = () => (
    <nav className="backdrop-blur-xl border-b border-gray-800/50 sticky top-0 z-30 bg-black/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 via-purple-600 to-pink-500 rounded-lg flex items-center justify-center shadow-lg">
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
            </div>
            <button 
              onClick={() => navigate('dashboard')}
              className="text-xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent hover:from-blue-400 hover:to-purple-500 transition-all duration-300"
            >
              OffCall AI
            </button>
            
            {/* Plan Badge */}
            {subscription && (
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                subscription.plan_type === 'free' 
                  ? 'bg-gray-700 text-gray-300' 
                  : subscription.plan_type === 'pro'
                  ? 'bg-blue-500/20 text-blue-300'
                  : 'bg-purple-500/20 text-purple-300'
              }`}>
                {subscription.plan_type.toUpperCase()}
              </span>
            )}
          </div>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center space-x-8">
            <button
              onClick={() => navigate('dashboard')}
              className={`text-sm font-medium transition-colors ${
                currentPage === 'dashboard' ? 'text-blue-400' : 'text-gray-400 hover:text-white'
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => navigate('settings')}
              className={`text-sm font-medium transition-colors ${
                currentPage === 'settings' ? 'text-blue-400' : 'text-gray-400 hover:text-white'
              }`}
            >
              Settings
            </button>
            
            {/* Upgrade Button for Free Plan */}
            {isFreePlan && (
              <button
                onClick={() => navigate('pricing')}
                className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200"
              >
                Upgrade
              </button>
            )}
          </div>

          {/* User Actions */}
          <div className="flex items-center space-x-4">
            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => setShowNotificationCenter(!showNotificationCenter)}
                className={`p-2 rounded-lg transition-colors ${
                  showNotificationCenter ? 'bg-gray-700 text-blue-400' : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`}
              >
                <BellIcon className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
              
              {showNotificationCenter && (
                <div className="absolute right-0 top-12 z-50">
                  <NotificationCenter 
                    isOpen={showNotificationCenter}
                    onClose={() => setShowNotificationCenter(false)} 
                  />
                </div>
              )}
            </div>

            {/* Settings */}
            <button
              onClick={() => navigate('settings')}
              className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
            >
              <Cog6ToothIcon className="w-5 h-5" />
            </button>

            {/* User Profile */}
            <div className="relative">
              <button
                onClick={() => navigate('profile')}
                className="flex items-center space-x-2 p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
              >
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-medium">
                    {user?.full_name?.charAt(0)?.toUpperCase() || 'U'}
                  </span>
                </div>
                <span className="hidden sm:block text-sm font-medium">
                  {user?.full_name || 'User'}
                </span>
              </button>
            </div>

            {/* Logout Button */}
            <button
              onClick={logout}
              className="text-gray-400 hover:text-red-400 transition-colors px-3 py-2 text-sm font-medium"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );

  // Show loading spinner
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 bg-gradient-to-r from-blue-500 via-purple-600 to-pink-500 rounded-xl flex items-center justify-center animate-pulse">
            <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
          </div>
          <p className="text-gray-400">Loading OffCall AI...</p>
        </div>
      </div>
    );
  }

  // Render current page
  const renderCurrentPage = () => {
    // Plan selection (for new users)
    if (currentPage === 'plan-selection') {
      return <PlanSelection onPlanSelected={handlePlanSelected} />;
    }

    // OAuth callback page (always accessible)
    if (currentPage === 'oauth-callback') {
      return <OAuthCallback onComplete={() => navigate('dashboard')} />;
    }

    // Landing page (only for non-authenticated users)
    if (currentPage === 'landing') {
      return <LandingPage onNavigateToAuth={handleNavigateToAuth} />;
    }

    // Pricing page (accessible to all)
    if (currentPage === 'pricing') {
      return <PricingPage onPlanSelected={handlePlanSelected} />;
    }

    // Auth pages (login/register)
    if (currentPage === 'auth') {
      return (
        <AuthPages 
          onLoginSuccess={() => navigate('dashboard')} 
          onNavigateToLanding={() => navigate('landing')}
          defaultMode="register"
        />
      );
    }

    // Protected pages (require authentication)
    if (!isAuthenticated) {
      // Redirect to auth if trying to access protected page
      navigate('auth');
      return (
        <AuthPages 
          onLoginSuccess={() => navigate('dashboard')} 
          onNavigateToLanding={() => navigate('landing')}
          defaultMode="login"
        />
      );
    }

    // Authenticated user pages with subscription protection
    switch (currentPage) {
      case 'dashboard':
        return (
          <ProtectedRoute>
            <Dashboard onNavigateToIncident={(id) => navigate('incident-detail', id)} />
          </ProtectedRoute>
        );

      case 'settings':
        return (
          <ProtectedRoute>
            <SettingsPage />
          </ProtectedRoute>
        );

      case 'profile':
        return (
          <ProtectedRoute>
            <UserProfile />
          </ProtectedRoute>
        );

      case 'notifications':
        return (
          <ProtectedRoute 
            requireSubscription 
            allowedPlans={['pro', 'enterprise']}
            onUpgradeRequired={handleUpgradeRequired}
          >
            <NotificationSettings />
          </ProtectedRoute>
        );

      case 'incident-detail':
        return currentIncidentId ? (
          <ProtectedRoute>
            <IncidentDetail 
              incidentId={currentIncidentId} 
              onBack={() => navigate('dashboard')} 
            />
          </ProtectedRoute>
        ) : null;

      case 'upgrade':
        return <UpgradePage onPlanSelected={handlePlanSelected} />;

      default:
        return (
          <ProtectedRoute>
            <Dashboard onNavigateToIncident={(id) => navigate('incident-detail', id)} />
          </ProtectedRoute>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
      {/* Show navigation header only for authenticated users and not on landing/auth pages */}
      {isAuthenticated && currentPage !== 'landing' && currentPage !== 'auth' && currentPage !== 'plan-selection' && <NavigationHeader />}
      
      {/* Main content */}
      <main className={isAuthenticated && currentPage !== 'landing' && currentPage !== 'auth' && currentPage !== 'plan-selection' ? '' : 'min-h-screen'}>
        {renderCurrentPage()}
      </main>

      {/* Toast notifications */}
      <ToastNotifications />
    </div>
  );
};

// Main App component
const App: React.FC = () => {
  return (
    <AuthProvider>
      <NotificationProvider>
        <AppContent />
      </NotificationProvider>
    </AuthProvider>
  );
};

export default App;