import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import AuthPages from './components/AuthPages';
import Dashboard from './components/Dashboard';
import TeamsManagement from './components/TeamsManagement';
import SettingsPage from './components/SettingsPage';
import UserProfile from './components/UserProfile';
import LandingPage from './components/LandingPage';

type Page = 'landing' | 'auth' | 'dashboard' | 'teams' | 'settings' | 'profile';

const AppContent: React.FC = () => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const [currentPage, setCurrentPage] = useState<Page>('landing');

  // Simple client-side routing
  useEffect(() => {
    const path = window.location.pathname;
    if (path.includes('/teams')) setCurrentPage('teams');
    else if (path.includes('/settings')) setCurrentPage('settings');
    else if (path.includes('/profile')) setCurrentPage('profile');
    else if (path.includes('/app') || path.includes('/dashboard')) setCurrentPage('dashboard');
    else if (path.includes('/auth') || path.includes('/login') || path.includes('/register')) setCurrentPage('auth');
    else setCurrentPage('landing');

    // Update URL without page reload
    const handlePopState = () => {
      const newPath = window.location.pathname;
      if (newPath.includes('/teams')) setCurrentPage('teams');
      else if (newPath.includes('/settings')) setCurrentPage('settings');
      else if (newPath.includes('/profile')) setCurrentPage('profile');
      else if (newPath.includes('/app') || newPath.includes('/dashboard')) setCurrentPage('dashboard');
      else if (newPath.includes('/auth') || newPath.includes('/login') || newPath.includes('/register')) setCurrentPage('auth');
      else setCurrentPage('landing');
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Navigation function
  const navigate = (page: Page) => {
    setCurrentPage(page);
    let url = '/';
    if (page === 'dashboard') url = '/app';
    else if (page === 'auth') url = '/auth';
    else if (page === 'landing') url = '/';
    else url = `/${page}`;
    window.history.pushState(null, '', url);
  };

  // Navigation Header Component
  const NavigationHeader = () => (
    <header className="glass-dark border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          <div className="flex items-center space-x-8">
            <div className="flex items-center cursor-pointer" onClick={() => navigate('dashboard')}>
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center mr-3">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h1 className="text-xl font-bold text-white">OnCall AI</h1>
            </div>

            {/* Navigation Links */}
            <nav className="hidden md:flex space-x-6">
              <button
                onClick={() => navigate('dashboard')}
                className={`px-3 py-2 rounded-lg font-medium transition-colors ${
                  currentPage === 'dashboard' 
                    ? 'bg-blue-500/20 text-blue-300' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Dashboard
              </button>
              <button
                onClick={() => navigate('teams')}
                className={`px-3 py-2 rounded-lg font-medium transition-colors ${
                  currentPage === 'teams' 
                    ? 'bg-blue-500/20 text-blue-300' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Teams
              </button>
              <button
                onClick={() => navigate('settings')}
                className={`px-3 py-2 rounded-lg font-medium transition-colors ${
                  currentPage === 'settings' 
                    ? 'bg-blue-500/20 text-blue-300' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Settings
              </button>
            </nav>
          </div>

          <div className="flex items-center space-x-4">
            {/* User Profile Dropdown */}
            <div className="relative">
              <button 
                onClick={() => navigate('profile')}
                className="flex items-center space-x-3 text-white hover:bg-white/10 px-3 py-2 rounded-lg transition-colors"
              >
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium">{user?.full_name?.charAt(0) || 'U'}</span>
                </div>
                <span className="hidden md:block font-medium">{user?.full_name}</span>
              </button>
            </div>

            {/* Logout Button */}
            <button
              onClick={() => {
                // Clear localStorage
                localStorage.removeItem('access_token');
                localStorage.removeItem('user');
                // Navigate to landing page
                setCurrentPage('landing');
                window.history.pushState(null, '', '/');
                // Force a small delay to ensure state updates
                setTimeout(() => window.location.reload(), 100);
              }}
              className="bg-red-500/20 text-red-300 hover:bg-red-500/30 px-4 py-2 rounded-lg transition-colors font-medium"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </header>
  );

  // Loading screen
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mb-4 mx-auto">
            <svg className="w-8 h-8 text-white animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">OnCall AI</h2>
          <p className="text-gray-400">Loading...</p>
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
        {currentPage === 'dashboard' && <Dashboard />}
        {currentPage === 'teams' && <TeamsManagement />}
        {currentPage === 'settings' && <SettingsPage />}
        {currentPage === 'profile' && <UserProfile />}
      </main>
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <div className="App">
        <AppContent />
      </div>
    </AuthProvider>
  );
}

export default App;