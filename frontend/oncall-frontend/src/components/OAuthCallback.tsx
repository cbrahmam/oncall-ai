// frontend/src/components/OAuthCallback.tsx - Fixed with onComplete prop
import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { CheckCircleIcon, ExclamationTriangleIcon, BoltIcon } from '@heroicons/react/24/outline';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1';

interface OAuthCallbackProps {
  onComplete: () => void;
}

const OAuthCallback: React.FC<OAuthCallbackProps> = ({ onComplete }) => {
  const { setToken, setUser } = useAuth();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Processing OAuth login...');

  useEffect(() => {
    const handleOAuthCallback = async () => {
      try {
        // Get URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const state = urlParams.get('state');
        const error = urlParams.get('error');

        // Check for OAuth errors
        if (error) {
          throw new Error(`OAuth Error: ${error}`);
        }

        if (!code) {
          throw new Error('No authorization code received');
        }

        // Get stored OAuth state and provider
        const storedState = localStorage.getItem('oauth_state');
        const storedProvider = localStorage.getItem('oauth_provider');

        if (!storedProvider) {
          throw new Error('No OAuth provider information found');
        }

        // Verify state parameter for security
        if (state && storedState && state !== storedState) {
          throw new Error('Invalid state parameter - possible CSRF attack');
        }

        // Clean up localStorage
        localStorage.removeItem('oauth_state');
        localStorage.removeItem('oauth_provider');

        setMessage('Exchanging authorization code...');

        // Exchange code for token
        const response = await fetch(`${API_BASE_URL}/oauth/callback`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            provider: storedProvider,
            code: code,
            state: state,
            redirect_uri: `${window.location.origin}/auth/oauth/callback`
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.detail || 'OAuth login failed');
        }

        // Store tokens and user data
        localStorage.setItem('access_token', data.access_token);
        if (data.refresh_token) {
          localStorage.setItem('refresh_token', data.refresh_token);
        }

        // Update auth context
        setToken(data.access_token);
        setUser(data.user);

        setStatus('success');
        setMessage(data.is_new_user ? 'Account created successfully!' : 'Login successful!');

        // Call onComplete after a short delay
        setTimeout(() => {
          onComplete();
        }, 2000);

      } catch (error) {
        console.error('OAuth callback error:', error);
        setStatus('error');
        setMessage(error instanceof Error ? error.message : 'OAuth login failed');
        
        // Redirect to auth page after error
        setTimeout(() => {
          onComplete(); // Still call onComplete to handle navigation
        }, 3000);
      }
    };

    handleOAuthCallback();
  }, [setToken, setUser, onComplete]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
      <div className="max-w-md w-full mx-4">
        <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 border border-gray-700/50 backdrop-blur-sm rounded-2xl p-8 text-center">
          {/* Loading State */}
          {status === 'loading' && (
            <>
              <div className="flex justify-center mb-6">
                <div className="w-16 h-16 bg-gradient-to-r from-blue-500 via-purple-600 to-pink-500 rounded-full flex items-center justify-center animate-pulse">
                  <BoltIcon className="w-8 h-8 text-white" />
                </div>
              </div>
              <h2 className="text-xl font-semibold text-white mb-4">Completing Sign In</h2>
              <p className="text-gray-400">{message}</p>
              <div className="mt-4">
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
                </div>
              </div>
            </>
          )}

          {/* Success State */}
          {status === 'success' && (
            <>
              <div className="flex justify-center mb-6">
                <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center animate-pulse">
                  <CheckCircleIcon className="w-8 h-8 text-white" />
                </div>
              </div>
              <h2 className="text-xl font-semibold text-white mb-4">Welcome to OffCall AI!</h2>
              <p className="text-gray-400 mb-4">{message}</p>
              <p className="text-sm text-gray-500">Redirecting to dashboard...</p>
            </>
          )}

          {/* Error State */}
          {status === 'error' && (
            <>
              <div className="flex justify-center mb-6">
                <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center">
                  <ExclamationTriangleIcon className="w-8 h-8 text-white" />
                </div>
              </div>
              <h2 className="text-xl font-semibold text-white mb-4">Sign In Failed</h2>
              <p className="text-gray-400 mb-4">{message}</p>
              <p className="text-sm text-gray-500">Redirecting to sign in page...</p>
              <button
                onClick={onComplete}
                className="mt-4 px-6 py-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-lg transition-all duration-300 transform hover:scale-105"
              >
                Try Again
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default OAuthCallback;