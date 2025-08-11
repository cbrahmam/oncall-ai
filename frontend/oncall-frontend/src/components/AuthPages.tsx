// frontend/src/components/AuthPages.tsx - Updated with SSO
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

import { 

  EyeIcon, 
  EyeSlashIcon, 
  ArrowRightIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';

const API_BASE_URL = process.env.REACT_APP_API_URL || '/api/v1';

interface AuthPagesProps {
  onNavigateToLanding?: () => void;
}

const AuthPages: React.FC<AuthPagesProps> = ({ onNavigateToLanding }) => {
  const { login, register, isLoading, error } = useAuth();
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    organizationName: ''
  });
  const [ssoProviders, setSsoProviders] = useState([]);
  const [ssoLoading, setSsoLoading] = useState(false);

  // Fetch available SSO providers
  useEffect(() => {
    const fetchSsoProviders = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/oauth/providers`);
        if (response.ok) {
          const data = await response.json();
          setSsoProviders(data.providers);
        }
      } catch (error) {
        console.error('Failed to fetch SSO providers:', error);
      }
    };

    fetchSsoProviders();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isLoginMode) {
      await login(formData.email, formData.password);
    } else {
      await register(
        formData.email, 
        formData.password, 
        formData.fullName, 
        formData.organizationName
      );
    }
  };

  const handleSsoLogin = async (provider: string) => {
    setSsoLoading(true);
    try {
      // Start OAuth flow
      const response = await fetch(`${API_BASE_URL}/oauth/authorize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          provider: provider,
          redirect_uri: `${window.location.origin}/auth/oauth/callback`
        }),
      });

      if (response.ok) {
        const data = await response.json();
        // Store state for security verification
        localStorage.setItem('oauth_state', data.state);
        localStorage.setItem('oauth_provider', provider);
        // Redirect to OAuth provider
        window.location.href = data.authorization_url;
      } else {
        throw new Error('Failed to start OAuth flow');
      }
    } catch (error) {
      console.error('SSO login failed:', error);
      setSsoLoading(false);
    }
  };

  const getSsoIcon = (provider: string) => {
    switch (provider) {
      case 'google':
        return (
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
        );
      case 'microsoft':
        return (
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#F25022" d="M0 0h11.5v11.5H0z"/>
            <path fill="#00A4EF" d="M12.5 0H24v11.5H12.5z"/>
            <path fill="#7FBA00" d="M0 12.5h11.5V24H0z"/>
            <path fill="#FFB900" d="M12.5 12.5H24V24H12.5z"/>
          </svg>
        );
      case 'github':
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
          </svg>
        );
      default:
        return null;
    }
  };

  const getSsoProviderName = (provider: string) => {
    switch (provider) {
      case 'google': return 'Google';
      case 'microsoft': return 'Microsoft';
      case 'github': return 'GitHub';
      default: return provider;
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center">
              <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
            </div>
          </div>
          <h2 className="text-3xl font-bold text-white">
            {isLoginMode ? 'Welcome back' : 'Get started'}
          </h2>
          <p className="mt-2 text-gray-400">
            {isLoginMode 
              ? 'Sign in to your OffCall AI account' 
              : 'Create your OffCall AI account'
            }
          </p>
        </div>

        {/* Auth Form */}
        <div className="glass-card rounded-2xl p-8 space-y-6">
          {/* SSO Buttons */}
          {ssoProviders.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm text-gray-400 text-center">
                {isLoginMode ? 'Sign in with' : 'Sign up with'}
              </p>
              {ssoProviders.map((provider: any) => (
                <button
                  key={provider.name}
                  onClick={() => handleSsoLogin(provider.name)}
                  disabled={ssoLoading}
                  className="w-full flex items-center justify-center px-4 py-3 border border-gray-600 rounded-lg bg-gray-800/50 hover:bg-gray-700/50 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="flex items-center space-x-3">
                    {getSsoIcon(provider.name)}
                    <span className="font-medium">
                      Continue with {getSsoProviderName(provider.name)}
                    </span>
                  </div>
                </button>
              ))}
              
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-600"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-slate-900 text-gray-400">Or continue with email</span>
                </div>
              </div>
            </div>
          )}

          {/* Error/Success Messages */}
          {error && (
            <div className="flex items-center space-x-2 text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-3">
              <ExclamationTriangleIcon className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {/* Email/Password Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {!isLoginMode && (
              <>
                <div>
                  <label htmlFor="fullName" className="block text-sm font-medium text-gray-300 mb-2">
                    Full Name
                  </label>
                  <input
                    id="fullName"
                    name="fullName"
                    type="text"
                    required={!isLoginMode}
                    value={formData.fullName}
                    onChange={handleInputChange}
                    className="w-full px-3 py-3 bg-gray-800/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter your full name"
                  />
                </div>

                <div>
                  <label htmlFor="organizationName" className="block text-sm font-medium text-gray-300 mb-2">
                    Organization Name
                  </label>
                  <input
                    id="organizationName"
                    name="organizationName"
                    type="text"
                    required={!isLoginMode}
                    value={formData.organizationName}
                    onChange={handleInputChange}
                    className="w-full px-3 py-3 bg-gray-800/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter your organization name"
                  />
                </div>
              </>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={formData.email}
                onChange={handleInputChange}
                className="w-full px-3 py-3 bg-gray-800/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter your email"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete={isLoginMode ? "current-password" : "new-password"}
                  required
                  value={formData.password}
                  onChange={handleInputChange}
                  className="w-full px-3 py-3 bg-gray-800/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-white"
                >
                  {showPassword ? (
                    <EyeSlashIcon className="h-5 w-5" />
                  ) : (
                    <EyeIcon className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || ssoLoading}
              className="w-full flex justify-center items-center px-4 py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-medium rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  {isLoginMode ? 'Signing in...' : 'Creating account...'}
                </>
              ) : (
                <>
                  {isLoginMode ? 'Sign In' : 'Create Account'}
                  <ArrowRightIcon className="ml-2 h-5 w-5" />
                </>
              )}
            </button>
          </form>

          {/* Toggle Mode */}
          <div className="text-center">
            <button
              onClick={() => setIsLoginMode(!isLoginMode)}
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              {isLoginMode 
                ? "Don't have an account? Sign up" 
                : "Already have an account? Sign in"
              }
            </button>
          </div>

          {/* Back to Landing */}
          {onNavigateToLanding && (
            <div className="text-center">
              <button
                onClick={onNavigateToLanding}
                className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
              >
                ← Back to home
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthPages;