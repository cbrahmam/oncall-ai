// frontend/oncall-frontend/src/App.tsx (Updated with Notification System)
import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { NotificationProvider, useNotifications } from './contexts/NotificationContext';
import AuthPages from './components/AuthPages';
import Dashboard from './components/Dashboard';
import TeamsManagement from './components/TeamsManagement';
import SettingsPage from './components/SettingsPage';
import UserProfile from './components/UserProfile';
import LandingPage from './components/LandingPage';
import ToastNotifications from './components/ToastNotifications';
import NotificationCenter from './components/NotificationCenter';
import NotificationSettings from './components/NotificationSettings';
import IncidentDetail from './components/IncidentDetail';
import { BellIcon, Cog6ToothIcon } from '@heroicons/react/24/outline';

type Page = 'landing' | 'auth' | 'dashboard' | 'teams' | 'settings' | 'profile' | 'notifications' | 'incident-detail';

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
    
    if (incidentMatch) {
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
      
      if (newIncidentMatch) {
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

          {/* Right side actions */}
          <div className="flex items-center space-x-4">
            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={() => setShowNotificationCenter(true)}
                className="relative p-2 text-gray-300 hover:text-white transition-colors rounded-lg hover:bg-white/10"
              >
                <BellIcon className="w-6 h-6" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center animate-bounce-notification">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>
            </div>

            {/* Settings Shortcut */}
            <button
              onClick={() => navigate('notifications')}
              className="p-2 text-gray-300 hover:text-white transition-colors rounded-lg hover:bg-white/10"
              title="Notification Settings"
            >
              <Cog6ToothIcon className="w-6 h-6" />
            </button>

            {/* User Profile */}
            <div className="relative">
              <button
                onClick={() => navigate('profile')}
                className="flex items-center space-x-3 p-2 rounded-lg hover:bg-white/10 transition-colors"
              >
                <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                  {user?.full_name?.charAt(0)?.toUpperCase() || 'U'}
                </div>
                <span className="hidden md:block text-sm font-medium text-white">
                  {user?.full_name || 'User'}
                </span>
              </button>
            </div>

            {/* Logout */}
            <button
              onClick={logout}
              className="text-sm font-medium text-gray-300 hover:text-white transition-colors px-3 py-2 rounded-lg hover:bg-white/10"
            >
              Logout
            </button>
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
          <div className="w-16 h-16 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
          <div className="glass-card rounded-xl p-8 max-w-md">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">OnCall AI</h2>
            <p className="text-gray-400">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  // Show landing page if not authenticated and not on auth page
  if (!isAuthenticated) {
    if (currentPage === 'auth') {
      return <AuthPages />;
    }
    return <LandingPage onNavigateToAuth={() => navigate('auth')} />;
  }

  // Main app with navigation
  return (
    <div className="min-h-screen bg-slate-900">
      <NavigationHeader />
      <main>
        {currentPage === 'landing' && <LandingPage onNavigateToAuth={() => navigate('auth')} />}
        {currentPage === 'auth' && <AuthPages />}
        {currentPage === 'dashboard' && <Dashboard onNavigateToIncident={(id) => navigate('incident-detail', id)} />}
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

      {/* Toast Notifications - Always visible when authenticated */}
      <ToastNotifications />

      {/* Notification Center Panel */}
      <NotificationCenter 
        isOpen={showNotificationCenter}
        onClose={() => setShowNotificationCenter(false)}
      />
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <div className="App">
          <AppContent />
        </div>
      </NotificationProvider>
    </AuthProvider>
  );
}

export default App;