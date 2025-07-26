import React, { useState } from 'react';
import { EyeIcon, EyeSlashIcon, BoltIcon, BuildingOfficeIcon, UserIcon, EnvelopeIcon } from '@heroicons/react/24/outline';

interface RegisterFormData {
  email: string;
  password: string;
  confirmPassword: string;
  full_name: string;
  organization_name: string;
  organization_slug?: string;
}

interface ModernRegisterProps {
  onRegister?: (token: string, user: any) => void;
  onSwitchToLogin?: () => void;
}

const ModernRegister: React.FC<ModernRegisterProps> = ({ onRegister, onSwitchToLogin }) => {
  const [formData, setFormData] = useState<RegisterFormData>({
    email: '',
    password: '',
    confirmPassword: '',
    full_name: '',
    organization_name: '',
    organization_slug: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (error) setError(null);
  };

  const validateForm = () => {
    if (!formData.email || !formData.password || !formData.full_name || !formData.organization_name) {
      setError('Please fill in all required fields');
      return false;
    }
    
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long');
      return false;
    }
    
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('http://localhost:8000/api/v1/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          full_name: formData.full_name,
          organization_name: formData.organization_name,
          organization_slug: formData.organization_slug || undefined
        }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        // Store token in localStorage
        localStorage.setItem('access_token', data.access_token);
        localStorage.setItem('user', JSON.stringify(data.user));
        
        // Call the onRegister callback if provided
        if (onRegister) {
          onRegister(data.access_token, data.user);
        } else {
          // Fallback: redirect to dashboard
          window.location.href = '/dashboard';
        }
      } else {
        setError(data.detail || 'Registration failed. Please try again.');
      }
    } catch (error) {
      console.error('Registration error:', error);
      setError('Unable to connect to server. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-600 via-blue-600 to-teal-600 animate-gradient"></div>
      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-purple-500/30 to-transparent"></div>
      
      {/* Floating Elements */}
      <div className="absolute top-20 left-20 w-72 h-72 bg-purple-400/20 rounded-full blur-3xl animate-pulse-slow"></div>
      <div className="absolute bottom-20 right-20 w-96 h-96 bg-blue-400/20 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '1s' }}></div>
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-teal-400/20 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '2s' }}></div>

      {/* Register Card */}
      <div className="relative z-10 w-full max-w-lg p-8">
        <div className="glass rounded-2xl p-8 shadow-2xl">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-purple-500 to-blue-600 rounded-2xl mb-4 shadow-lg">
              <BoltIcon className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Join OnCall AI</h1>
            <p className="text-purple-100">Create your account and organization</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-xl">
              <p className="text-red-200 text-sm text-center">{error}</p>
            </div>
          )}

          {/* Registration Form */}
          <div className="space-y-6">
            {/* Personal Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white mb-3">Personal Information</h3>
              
              {/* Full Name */}
              <div>
                <label htmlFor="full_name" className="block text-sm font-medium text-purple-100 mb-2">
                  Full Name
                </label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-purple-200" />
                  <input
                    type="text"
                    id="full_name"
                    name="full_name"
                    value={formData.full_name}
                    onChange={handleInputChange}
                    onKeyPress={handleKeyPress}
                    className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-all duration-200"
                    placeholder="Enter your full name"
                    disabled={isLoading}
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-purple-100 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <EnvelopeIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-purple-200" />
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    onKeyPress={handleKeyPress}
                    className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-all duration-200"
                    placeholder="Enter your email"
                    disabled={isLoading}
                  />
                </div>
              </div>
            </div>

            {/* Organization Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white mb-3">Organization</h3>
              
              {/* Organization Name */}
              <div>
                <label htmlFor="organization_name" className="block text-sm font-medium text-purple-100 mb-2">
                  Organization Name
                </label>
                <div className="relative">
                  <BuildingOfficeIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-purple-200" />
                  <input
                    type="text"
                    id="organization_name"
                    name="organization_name"
                    value={formData.organization_name}
                    onChange={handleInputChange}
                    onKeyPress={handleKeyPress}
                    className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-all duration-200"
                    placeholder="Enter your organization name"
                    disabled={isLoading}
                  />
                </div>
              </div>

              {/* Organization Slug (Optional) */}
              <div>
                <label htmlFor="organization_slug" className="block text-sm font-medium text-purple-100 mb-2">
                  Organization Slug <span className="text-purple-300">(optional)</span>
                </label>
                <input
                  type="text"
                  id="organization_slug"
                  name="organization_slug"
                  value={formData.organization_slug}
                  onChange={handleInputChange}
                  onKeyPress={handleKeyPress}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-all duration-200"
                  placeholder="custom-org-url"
                  disabled={isLoading}
                />
                <p className="text-xs text-purple-300 mt-1">Used for your organization's custom URL</p>
              </div>
            </div>

            {/* Password Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white mb-3">Security</h3>
              
              {/* Password */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-purple-100 mb-2">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    onKeyPress={handleKeyPress}
                    className="w-full px-4 py-3 pr-12 bg-white/10 border border-white/20 rounded-xl text-white placeholder-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-all duration-200"
                    placeholder="Create a secure password"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-purple-200 hover:text-white transition-colors"
                    disabled={isLoading}
                  >
                    {showPassword ? (
                      <EyeSlashIcon className="w-5 h-5" />
                    ) : (
                      <EyeIcon className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-purple-100 mb-2">
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    id="confirmPassword"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    onKeyPress={handleKeyPress}
                    className="w-full px-4 py-3 pr-12 bg-white/10 border border-white/20 rounded-xl text-white placeholder-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-all duration-200"
                    placeholder="Confirm your password"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-purple-200 hover:text-white transition-colors"
                    disabled={isLoading}
                  >
                    {showConfirmPassword ? (
                      <EyeSlashIcon className="w-5 h-5" />
                    ) : (
                      <EyeIcon className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-purple-500 to-blue-600 hover:from-purple-600 hover:to-blue-700 text-white font-semibold py-3 px-4 rounded-xl transition-all duration-200 transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-2 focus:ring-offset-transparent disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating account...
                </div>
              ) : (
                'Create Account'
              )}
            </button>
          </div>

          {/* Divider */}
          <div className="mt-8 flex items-center">
            <div className="flex-1 border-t border-white/20"></div>
            <span className="px-4 text-sm text-purple-200">or</span>
            <div className="flex-1 border-t border-white/20"></div>
          </div>

          {/* Sign In Link */}
          <div className="mt-6 text-center">
            <p className="text-purple-100">
              Already have an account?{' '}
              <button
                type="button"
                onClick={onSwitchToLogin}
                className="text-white font-semibold hover:text-purple-200 transition-colors"
                disabled={isLoading}
              >
                Sign in
              </button>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-purple-200 text-sm">
            Start your 14-day free trial • No credit card required
          </p>
        </div>
      </div>
    </div>
  );
};

export default ModernRegister;