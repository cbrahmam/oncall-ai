// frontend/oncall-frontend/src/App.tsx - UPDATED with AI Components Integration

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
import PlanSelection from './components/PlanSelection';

// NEW AI COMPONENTS
import AIAnalysisDisplay from './components/AIAnalysisDisplay';
import AIDeploymentInterface from './components/AIDeploymentInterface';

import { BellIcon, Cog6ToothIcon, LockClosedIcon, UserIcon } from '@heroicons/react/24/outline';

// UPDATED Page type with new AI pages
type Page = 'landing' | 'auth' | 'dashboard' | 'settings' | 'profile' | 'notifications' | 'incident-detail' | 'oauth-callback' | 'pricing' | 'upgrade' | 'plan-selection' | 'ai-analysis' | 'ai-deployment';

// Subscription hook (unchanged)
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

// Protected Route Component (unchanged)
interface ProtectedRouteProps {
  children: React.ReactNode;
  requireSubscription?: boolean;
  allowedPlans?: string[];
  onUpgradeRequired?: () => void;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requireSubscription = false, 
  allowedPlans = [],
  onUpgradeRequired 
}) => {
  const { subscription, hasValidSubscription, loading } = useSubscription();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (requireSubscription && !hasValidSubscription) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-8">
        <LockClosedIcon className="w-16 h-16 text-gray-400 mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">Subscription Required</h2>
        <p className="text-gray-400 text-center mb-6">
          This feature requires an active Pro or Enterprise subscription.
        </p>
        <button
          onClick={onUpgradeRequired}
          className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-6 py-3 rounded-lg font-semibold transition-all duration-200"
        >
          Upgrade Now
        </button>
      </div>
    );
  }

  return <>{children}</>;
};

const AppContent: React.FC = () => {
  const { isAuthenticated, isLoading, user, logout } = useAuth();
  const { unreadCount, showToast } = useNotifications();
  const { subscription, isFreePlan } = useSubscription();
  const [currentPage, setCurrentPage] = useState<Page>('landing');
  const [currentIncidentId, setCurrentIncidentId] = useState<string | null>(null);
  const [showNotificationCenter, setShowNotificationCenter] = useState(false);
  const [hasSelectedPlan, setHasSelectedPlan] = useState(false);
  
  // NEW STATE for AI components
  const [aiAnalysisData, setAiAnalysisData] = useState<{
    incidentId: string;
    provider?: 'claude' | 'gemini';
    solution?: any;
  } | null>(null);

  // Check if user needs to select a plan
  useEffect(() => {
    if (isAuthenticated && user && !subscription) {
      const planSelected = localStorage.getItem(`plan_selected_${user.id}`);
      if (!planSelected) {
        setCurrentPage('plan-selection');
      } else {
        setHasSelectedPlan(true);
      }
    }
  }, [isAuthenticated, user, subscription]);

  // UPDATED routing with AI pages
  useEffect(() => {
    if (currentPage === 'plan-selection' || currentPage === 'ai-analysis' || currentPage === 'ai-deployment') return;

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

  // Welcome notification
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

  // UPDATED navigation function
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
      else if (page === 'ai-analysis') url = '/ai-analysis';
      else if (page === 'ai-deployment') url = '/ai-deployment';
      else url = `/${page}`;
      window.history.pushState(null, '', url);
    }
  };

  // NEW: AI Analysis navigation handlers
  const handleShowAIAnalysis = (incidentId: string) => {
    setAiAnalysisData({ incidentId });
    setCurrentPage('ai-analysis');
  };

  const handleAIDeploymentSelect = (provider: 'claude' | 'gemini', solution: any) => {
    if (aiAnalysisData) {
      setAiAnalysisData({
        ...aiAnalysisData,
        provider,
        solution
      });
      setCurrentPage('ai-deployment');
    }
  };

  const handleDeploymentComplete = (success: boolean, deploymentId?: string) => {
    if (success) {
      showToast({
        type: 'success',
        title: 'Deployment Successful',
        message: `AI solution deployed successfully!`,
        autoClose: true,
        duration: 5000
      });
    } else {
      showToast({
        type: 'error',
        title: 'Deployment Failed',
        message: 'AI solution deployment failed. Please try again.',
        autoClose: true
      });
    }
    
    // Navigate back to incident detail
    if (aiAnalysisData?.incidentId) {
      navigate('incident-detail', aiAnalysisData.incidentId);
    } else {
      navigate('dashboard');
    }
  };

  const handleAICancel = () => {
    // Navigate back to incident or dashboard
    if (aiAnalysisData?.incidentId) {
      navigate('incident-detail', aiAnalysisData.incidentId);
    } else {
      navigate('dashboard');
    }
    setAiAnalysisData(null);
  };

  // Other handlers (unchanged)
  const handleNavigateToAuth = () => {
    navigate('auth');
  };

  const handlePlanSelected = () => {
    if (user) {
      localStorage.setItem(`plan_selected_${user.id}`, 'true');
      setHasSelectedPlan(true);
      navigate('dashboard');
    }
  };

  const handleUpgradeRequired = () => {
    navigate('pricing');
  };

  // Navigation Header (unchanged - keeping existing)
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
            {subscription && subscription.plan_type !== 'free' && (
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                subscription.plan_type === 'pro'
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

              {/* Notification Center */}
              {showNotificationCenter && (
                <div className="absolute right-0 top-full mt-2 z-50">
                  <NotificationCenter 
                    isOpen={showNotificationCenter}
                    onClose={() => setShowNotificationCenter(false)} 
                  />
                </div>
              )}
            </div>

            {/* Settings Icon Button */}
            <button
              onClick={() => navigate('settings')}
              className={`p-2 rounded-lg transition-colors ${
                currentPage === 'settings' ? 'bg-gray-700 text-blue-400' : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              <Cog6ToothIcon className="w-5 h-5" />
            </button>

            {/* User Menu */}
            <div className="relative">
              <button
                onClick={() => navigate('profile')}
                className={`p-2 rounded-lg transition-colors ${
                  currentPage === 'profile' ? 'bg-gray-700 text-blue-400' : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`}
              >
                <UserIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Logout */}
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

  // Loading spinner
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

  // UPDATED Render current page with NEW AI COMPONENTS
  const renderCurrentPage = () => {
    // NEW: AI Analysis page
    if (currentPage === 'ai-analysis') {
      if (!aiAnalysisData) {
        navigate('dashboard');
        return null;
      }
      return (
        <ProtectedRoute requireSubscription={true} onUpgradeRequired={handleUpgradeRequired}>
          <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
            <NavigationHeader />
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              <AIAnalysisDisplay
                incidentId={aiAnalysisData.incidentId}
                onDeploymentSelect={handleAIDeploymentSelect}
              />
            </div>
          </div>
        </ProtectedRoute>
      );
    }

    // NEW: AI Deployment page  
    if (currentPage === 'ai-deployment') {
      if (!aiAnalysisData || !aiAnalysisData.provider || !aiAnalysisData.solution) {
        navigate('dashboard');
        return null;
      }
      return (
        <ProtectedRoute requireSubscription={true} onUpgradeRequired={handleUpgradeRequired}>
          <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
            <NavigationHeader />
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              <AIDeploymentInterface
                incidentId={aiAnalysisData.incidentId}
                provider={aiAnalysisData.provider}
                solution={aiAnalysisData.solution}
                onDeploymentComplete={handleDeploymentComplete}
                onCancel={handleAICancel}
              />
            </div>
          </div>
        </ProtectedRoute>
      );
    }

    // Plan selection (for new users)
    if (currentPage === 'plan-selection') {
      return <PlanSelection onPlanSelected={handlePlanSelected} />;
    }

    // OAuth callback page
    if (currentPage === 'oauth-callback') {
      return <OAuthCallback onComplete={() => navigate('dashboard')} />;
    }

    // Landing page
    if (currentPage === 'landing') {
      return <LandingPage onNavigateToAuth={handleNavigateToAuth} />;
    }

    // Pricing page
    if (currentPage === 'pricing') {
      return <PricingPage onPlanSelected={handlePlanSelected} />;
    }

    // Upgrade page
    if (currentPage === 'upgrade') {
      return (
        <ProtectedRoute>
          <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
            <NavigationHeader />
            <UpgradePage onPlanSelected={handlePlanSelected} currentPlan={subscription?.plan_type || 'free'} />
          </div>
        </ProtectedRoute>
      );
    }

    // Auth pages
    if (currentPage === 'auth') {
      return (
        <AuthPages 
          onLoginSuccess={() => navigate('dashboard')} 
          onNavigateToLanding={() => navigate('landing')}
          defaultMode="login"
        />
      );
    }

    // Protected pages (require authentication)
    if (!isAuthenticated) {
      return <LandingPage onNavigateToAuth={handleNavigateToAuth} />;
    }

    // Dashboard
    if (currentPage === 'dashboard') {
      return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
          <NavigationHeader />
          <Dashboard 
            onShowAIAnalysis={handleShowAIAnalysis}
            onNavigateToIncident={(incidentId: string) => navigate('incident-detail', incidentId)}
          />
        </div>
      );
    }

    // Settings
    if (currentPage === 'settings') {
      return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
          <NavigationHeader />
          <SettingsPage />
        </div>
      );
    }

    // Profile
    if (currentPage === 'profile') {
      return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
          <NavigationHeader />
          <UserProfile />
        </div>
      );
    }

    // Notifications
    if (currentPage === 'notifications') {
      return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
          <NavigationHeader />
          <NotificationSettings />
        </div>
      );
    }

    // Incident Detail
    if (currentPage === 'incident-detail' && currentIncidentId) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
          <NavigationHeader />
          <IncidentDetail 
            incidentId={currentIncidentId}
            onShowAIAnalysis={handleShowAIAnalysis}
            onBack={() => navigate('dashboard')}
          />
        </div>
      );
    }

    // Default fallback
    return <Dashboard onShowAIAnalysis={handleShowAIAnalysis} onNavigateToIncident={(incidentId: string) => navigate('incident-detail', incidentId)} />;
  };

  return (
    <div className="App">
      {renderCurrentPage()}
      <ToastNotifications />
    </div>
  );
};

// Main App component with providers
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