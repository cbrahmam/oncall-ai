// frontend/src/App.tsx - Updated with OAuth callback route
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

  // Simple client-side routing
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

    // Update URL without page reload
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

  // Demo notification on page load (remove in production)
  useEffect(() => {
    if (isAuthenticated && user) {
      const timer = setTimeout(() => {
        showToast({
          type: 'system',
          title: 'Welcome to OnCall AI! 🚀',
          message: 'Real-time notifications are now active. You\'ll receive instant alerts for incidents and system updates.',
          autoClose: true,
          duration: 8000
        });
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, user, showToast]);

  // Navigation function
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

  // Navigation Header Component
  const NavigationHeader = () => (
    <nav className="glass-card border-b border-white/10 sticky top-0 z-30 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
            </div>
            <button 
              onClick={() => navigate('dashboard')}
              className="text-xl font-bold text-white hover:text-blue-400 transition-colors"
            >
              OnCall AI
            </button>
          </div>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center space-x-8">
            <button
              onClick={() => navigate('dashboard')}
              className={`text-sm font-medium transition-colors ${
                currentPage === 'dashboard' ? 'text-blue-400' : 'text-gray-300 hover:text-white'
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => navigate('teams')}
              className={`text-sm font-medium transition-colors ${
                currentPage === 'teams' ? 'text-blue-400' : 'text-gray-300 hover:text-white'
              }`}
            >
              Teams
            </button>
            <button
              onClick={() => navigate('settings')}
              className={`text-sm font-medium transition-colors ${
                currentPage === 'settings' ? 'text-blue-400' : 'text-gray-300 hover:text-white'
              }`}
            >
              Settings
            </button>
          </div>

          {/* User Actions */}
          <div className="flex items-center space-x-4">
            {/* Notifications */}
            <button
              onClick={() => setShowNotificationCenter(!showNotificationCenter)}
              className="relative p-2 text-gray-300 hover:text-white transition-colors"
            >
              <BellIcon className="w-6 h-6" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* Settings */}
            <button
              onClick={() => navigate('settings')}
              className="p-2 text-gray-300 hover:text-white transition-colors"
            >
              <Cog6ToothIcon className="w-6 h-6" />
            </button>

            {/* User Menu */}
            <div className="flex items-center space-x-3">
              <button
                onClick={() => navigate('profile')}
                className="flex items-center space-x-2 text-gray-300 hover:text-white transition-colors"
              >
                <div className="w-8 h-8 bg-gradient-to-r from-green-400 to-blue-500 rounded-full flex items-center justify-center text-white font-medium text-sm">
                  {user?.full_name?.charAt(0).toUpperCase() || 'U'}
                </div>
                <span className="hidden sm:block font-medium">{user?.full_name}</span>
              </button>
              
              <button
                onClick={logout}
                className="text-sm text-gray-300 hover:text-white transition-colors ml-4"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white">Loading OnCall AI...</p>
        </div>
      </div>
    );
  }

  // OAuth Callback - Always show regardless of auth state
  if (currentPage === 'oauth-callback') {
    return <OAuthCallback />;
  }

  // Authenticated routes
  if (isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-900">
        <NavigationHeader />
        
        <main className="relative">
          {currentPage === 'dashboard' && (
            <Dashboard onNavigateToIncident={(id) => navigate('incident-detail', id)} />
          )}
          {currentPage === 'teams' && <TeamsManagement />}
          {currentPage === 'settings' && <SettingsPage />}
          {currentPage === 'profile' && <UserProfile />}
          {currentPage === 'notifications' && <NotificationSettings />}
          {currentPage === 'incident-detail' && currentIncidentId && (
            <IncidentDetail 
              incidentId={currentIncidentId}
              onBack={() => navigate('dashboard')}
            />
          )}
        </main>

        {/* Notification Center */}
        {showNotificationCenter && (
          <NotificationCenter
            isOpen={showNotificationCenter}
            onClose={() => setShowNotificationCenter(false)}
          />
        )}

        {/* Toast Notifications */}
        <ToastNotifications />
      </div>
    );
  }

  // Unauthenticated routes
  if (currentPage === 'auth') {
    return <AuthPages onNavigateToLanding={() => navigate('landing')} />;
  }

  // Default to landing page
  return <LandingPage onNavigateToAuth={() => navigate('auth')} />;
};

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