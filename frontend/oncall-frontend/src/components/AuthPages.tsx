// AuthPages.tsx - Fixed OAuth endpoints and default login mode
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import { 
  EyeIcon, 
  EyeSlashIcon, 
  BoltIcon,
  UserIcon,
  EnvelopeIcon,
  LockClosedIcon,
  BuildingOfficeIcon
} from '@heroicons/react/24/outline';

interface AuthPagesProps {
  onLoginSuccess: () => void;
  onNavigateToLanding: () => void;
  defaultMode?: 'login' | 'register';
}

const AuthPages: React.FC<AuthPagesProps> = ({ 
  onLoginSuccess, 
  onNavigateToLanding, 
  defaultMode = 'login'  // FIXED: Changed from 'register' to 'login'
}) => {
  const [currentMode, setCurrentMode] = useState<'login' | 'register'>(defaultMode);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const { login, register } = useAuth();
  const { showToast } = useNotifications();
  
  // Form data
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    full_name: '',
    organization_name: ''
  });

  // Update mode based on URL or defaultMode prop
  useEffect(() => {
    const path = window.location.pathname;
    if (path.includes('/login')) {
      setCurrentMode('login');
    } else if (path.includes('/register')) {
      setCurrentMode('register');
    } else {
      setCurrentMode(defaultMode);
    }
  }, [defaultMode]);

  // Update URL when mode changes
  const switchMode = (mode: 'login' | 'register') => {
    setCurrentMode(mode);
    setErrors({});
    const url = mode === 'login' ? '/auth/login' : '/auth/register';
    window.history.pushState(null, '', url);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear specific field error when user types
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    if (currentMode === 'register') {
      if (!formData.full_name) {
        newErrors.full_name = 'Full name is required';
      }
      if (!formData.organization_name) {
        newErrors.organization_name = 'Organization name is required';
      }
      if (!formData.confirmPassword) {
        newErrors.confirmPassword = 'Please confirm your password';
      } else if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      if (currentMode === 'login') {
        await login(formData.email, formData.password);
        showToast({
          type: 'success',
          title: 'Welcome back!',
          message: 'Successfully signed in to OffCall AI',
          autoClose: true,
        });
      } else {
        await register(
          formData.email, 
          formData.password, 
          formData.full_name, 
          formData.organization_name
        );
        showToast({
          type: 'success',
          title: 'Account Created!',
          message: 'Welcome to OffCall AI. You can now start managing incidents.',
          autoClose: true,
        });
      }
      onLoginSuccess();
    } catch (error: any) {
      console.error('Authentication error:', error);
      showToast({
        type: 'error',
        title: currentMode === 'login' ? 'Sign In Failed' : 'Registration Failed',
        message: error.message || 'Please check your information and try again.',
        autoClose: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // FIXED: OAuth handlers with proper error handling and redirect URI
  const handleOAuthLogin = async (provider: 'google' | 'microsoft' | 'github') => {
    try {
      const baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:8000';
      const redirectUri = `${window.location.origin}/auth/oauth/callback`;
      
      showToast({
        type: 'info',
        title: 'Redirecting...',
        message: `Connecting to ${provider.charAt(0).toUpperCase() + provider.slice(1)}`,
        autoClose: true,
      });

      // FIXED: Use the correct OAuth authorize endpoint from your backend
      const response = await fetch(`${baseUrl}/api/v1/oauth/authorize/${provider}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          redirect_uri: redirectUri
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.authorization_url) {
          window.location.href = data.authorization_url;
        } else {
          throw new Error('No authorization URL received');
        }
      } else {
        const errorData = await response.json();
        throw new Error(errorData.detail || `${provider} OAuth not configured`);
      }
    } catch (error: any) {
      console.error('OAuth error:', error);
      showToast({
        type: 'error',
        title: 'OAuth Error',
        message: `${provider.charAt(0).toUpperCase() + provider.slice(1)} sign-in is not available yet. Please use email/password.`,
        autoClose: true,
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-r from-blue-500 via-purple-600 to-pink-500 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <BoltIcon className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-white">
            {currentMode === 'login' ? 'Welcome back' : 'Get started'}
          </h2>
          <p className="text-gray-400 mt-2">
            {currentMode === 'login' 
              ? 'Sign in to your OffCall AI account' 
              : 'Create your OffCall AI account'
            }
          </p>
        </div>

        {/* Auth Card */}
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-8">
          
          {/* OAuth Buttons - FIXED: Proper API integration */}
          <div className="space-y-3 mb-6">
            <button
              onClick={() => handleOAuthLogin('google')}
              className="w-full flex items-center justify-center space-x-3 px-4 py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg transition-all duration-200 text-white font-medium"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <span>Continue with Google</span>
            </button>
            
            <button
              onClick={() => handleOAuthLogin('microsoft')}
              className="w-full flex items-center justify-center space-x-3 px-4 py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg transition-all duration-200 text-white font-medium"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="currentColor" d="M11.4 24H0V12.6h11.4V24zM24 24H12.6V12.6H24V24zM11.4 11.4H0V0h11.4v11.4zM24 11.4H12.6V0H24v11.4z"/>
              </svg>
              <span>Continue with Microsoft</span>
            </button>
            
            <button
              onClick={() => handleOAuthLogin('github')}
              className="w-full flex items-center justify-center space-x-3 px-4 py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg transition-all duration-200 text-white font-medium"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
              <span>Continue with GitHub</span>
            </button>
          </div>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/20"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-gray-900 text-gray-400">or continue with email</span>
            </div>
          </div>

          {/* Email Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Register-only fields */}
            {currentMode === 'register' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Full Name</label>
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      name="full_name"
                      value={formData.full_name}
                      onChange={handleInputChange}
                      className={`w-full pl-10 pr-4 py-3 bg-white/10 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent ${
                        errors.full_name ? 'border-red-500' : 'border-white/20'
                      }`}
                      placeholder="Enter your full name"
                    />
                  </div>
                  {errors.full_name && <p className="text-red-400 text-sm mt-1">{errors.full_name}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Organization Name</label>
                  <div className="relative">
                    <BuildingOfficeIcon className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      name="organization_name"
                      value={formData.organization_name}
                      onChange={handleInputChange}
                      className={`w-full pl-10 pr-4 py-3 bg-white/10 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent ${
                        errors.organization_name ? 'border-red-500' : 'border-white/20'
                      }`}
                      placeholder="Enter your organization name"
                    />
                  </div>
                  {errors.organization_name && <p className="text-red-400 text-sm mt-1">{errors.organization_name}</p>}
                </div>
              </>
            )}

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
              <div className="relative">
                <EnvelopeIcon className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className={`w-full pl-10 pr-4 py-3 bg-white/10 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent ${
                    errors.email ? 'border-red-500' : 'border-white/20'
                  }`}
                  placeholder="Enter your email"
                />
              </div>
              {errors.email && <p className="text-red-400 text-sm mt-1">{errors.email}</p>}
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Password</label>
              <div className="relative">
                <LockClosedIcon className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className={`w-full pl-10 pr-12 py-3 bg-white/10 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent ${
                    errors.password ? 'border-red-500' : 'border-white/20'
                  }`}
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-gray-400 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                </button>
              </div>
              {errors.password && <p className="text-red-400 text-sm mt-1">{errors.password}</p>}
            </div>

            {/* Confirm Password - Register only */}
            {currentMode === 'register' && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Confirm Password</label>
                <div className="relative">
                  <LockClosedIcon className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    className={`w-full pl-10 pr-12 py-3 bg-white/10 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent ${
                      errors.confirmPassword ? 'border-red-500' : 'border-white/20'
                    }`}
                    placeholder="Confirm your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-3 text-gray-400 hover:text-white transition-colors"
                  >
                    {showConfirmPassword ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                  </button>
                </div>
                {errors.confirmPassword && <p className="text-red-400 text-sm mt-1">{errors.confirmPassword}</p>}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-4 py-3 rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>{currentMode === 'login' ? 'Signing in...' : 'Creating account...'}</span>
                </>
              ) : (
                <span>{currentMode === 'login' ? 'Sign In' : 'Create Account'}</span>
              )}
            </button>
          </form>

          {/* Switch Mode */}
          <div className="mt-6 text-center">
            <p className="text-gray-400">
              {currentMode === 'login' ? "Don't have an account? " : "Already have an account? "}
              <button
                onClick={() => switchMode(currentMode === 'login' ? 'register' : 'login')}
                className="text-blue-400 hover:text-blue-300 font-medium transition-colors"
              >
                {currentMode === 'login' ? 'Sign up' : 'Sign in'}
              </button>
            </p>
          </div>

          {/* Back to Landing */}
          <div className="mt-4 text-center">
            <button
              onClick={onNavigateToLanding}
              className="text-gray-500 hover:text-gray-400 text-sm transition-colors"
            >
              ← Back to home
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPages;