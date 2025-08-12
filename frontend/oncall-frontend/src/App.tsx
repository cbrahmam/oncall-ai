// frontend/src/App.tsx - Updated with proper routing and authentication flow
import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { NotificationProvider, useNotifications } from './contexts/NotificationContext';
import AuthPages from './components/AuthPages';
import Dashboard from './components/Dashboard';
import TeamsManagement from './components/TeamsManagement';
import SettingsPage from './components/SettingsPage';
import UserProfile from './components/UserProfile';
import LandingPage from './components/LandingPage';
import OAuthCallback from './components/OAuthCallback';
import ToastNotifications from './components/ToastNotifications';
import NotificationCenter from './components/NotificationCenter';
import NotificationSettings from './components/NotificationSettings';
import IncidentDetail from './components/IncidentDetail';
import { BellIcon, Cog6ToothIcon } from '@heroicons/react/24/outline';

type Page = 'landing' | 'auth' | 'dashboard' | 'teams' | 'settings' | 'profile' | 'notifications' | 'incident-detail' | 'oauth-callback';

const AppContent: React.FC = () => {
  const { isAuthenticated, isLoading, user, logout } = useAuth();
  const { unreadCount, showToast } = useNotifications();
  const [currentPage, setCurrentPage] = useState<Page>('landing');
  const [currentIncidentId, setCurrentIncidentId] = useState<string | null>(null);
  const [showNotificationCenter, setShowNotificationCenter] = useState(false);

  // Simple client-side routing with proper navigation
  useEffect(() => {
    const path = window.location.pathname;
    const incidentMatch = path.match(/\/incidents\/([a-zA-Z0-9-]+)/);
    
    if (path.includes('/auth/oauth/callback')) {
      setCurrentPage('oauth-callback');
    } else if (incidentMatch) {
      setCurrentIncidentId(incidentMatch[1]);
      setCurrentPage('incident-detail');
    } else if (path.includes('/teams')) setCurrentPage('teams');
    else if (path.includes('/settings')) setCurrentPage('settings');
    else if (path.includes('/profile')) setCurrentPage('profile');
    else if (path.includes('/notifications')) setCurrentPage('notifications');
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
      } else if (newPath.includes('/teams')) setCurrentPage('teams');
      else if (newPath.includes('/settings')) setCurrentPage('settings');
      else if (newPath.includes('/profile')) setCurrentPage('profile');
      else if (newPath.includes('/notifications')) setCurrentPage('notifications');
      else if (newPath.includes('/app') || newPath.includes('/dashboard')) setCurrentPage('dashboard');
      else if (newPath.includes('/auth') || newPath.includes('/login') || newPath.includes('/register')) setCurrentPage('auth');
      else setCurrentPage('landing');
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Redirect authenticated users from landing page to dashboard
  useEffect(() => {
    if (isAuthenticated && currentPage === 'landing') {
      navigate('dashboard');
    }
  }, [isAuthenticated, currentPage]);

  // Demo notification on successful login
  useEffect(() => {
    if (isAuthenticated && user && currentPage === 'dashboard') {
      const timer = setTimeout(() => {
        showToast({
          type: 'system',
          title: 'Welcome to OffCall AI! 🚀',
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
      else url = `/${page}`;
      window.history.pushState(null, '', url);
    }
  };

  // Handle navigation from landing page to register (not login)
  const handleNavigateToAuth = () => {
    navigate('auth');
    // You can add a state to show register form by default
    // or update the AuthPages component to show register first
  };

  // Navigation Header Component for authenticated users
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
              onClick={() => navigate('teams')}
              className={`text-sm font-medium transition-colors ${
                currentPage === 'teams' ? 'text-blue-400' : 'text-gray-400 hover:text-white'
              }`}
            >
              Teams
            </button>
            <button
              onClick={() => navigate('settings')}
              className={`text-sm font-medium transition-colors ${
                currentPage === 'settings' ? 'text-blue-400' : 'text-gray-400 hover:text-white'
              }`}
            >
              Settings
            </button>
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
    // OAuth callback page (always accessible)
    if (currentPage === 'oauth-callback') {
      return <OAuthCallback onComplete={() => navigate('dashboard')} />;
    }

    // Landing page (only for non-authenticated users)
    if (currentPage === 'landing') {
      return <LandingPage onNavigateToAuth={handleNavigateToAuth} />;
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

    // Authenticated user pages
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard onNavigateToIncident={(id) => navigate('incident-detail', id)} />;
      case 'teams':
        return <TeamsManagement />;
      case 'settings':
        return <SettingsPage />;
      case 'profile':
        return <UserProfile />;
      case 'notifications':
        return <NotificationSettings />;
      case 'incident-detail':
        return currentIncidentId ? (
          <IncidentDetail 
            incidentId={currentIncidentId} 
            onBack={() => navigate('dashboard')} 
          />
        ) : null;
      default:
        return <Dashboard onNavigateToIncident={(id) => navigate('incident-detail', id)} />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
      {/* Show navigation header only for authenticated users and not on landing/auth pages */}
      {isAuthenticated && currentPage !== 'landing' && currentPage !== 'auth' && <NavigationHeader />}
      
      {/* Main content */}
      <main className={isAuthenticated && currentPage !== 'landing' && currentPage !== 'auth' ? '' : 'min-h-screen'}>
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