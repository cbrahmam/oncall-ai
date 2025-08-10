// frontend/src/components/OAuthCallback.tsx
import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1';


const OAuthCallback: React.FC = () => {
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

        // Redirect to dashboard after a short delay
        setTimeout(() => {
          window.location.href = '/app';
        }, 2000);

      } catch (error) {
        console.error('OAuth callback error:', error);
        setStatus('error');
        setMessage(error instanceof Error ? error.message : 'OAuth login failed');
        
        // Redirect to auth page after error
        setTimeout(() => {
          window.location.href = '/auth';
        }, 3000);
      }
    };

    handleOAuthCallback();
  }, [setToken, setUser]);

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <div className="max-w-md w-full mx-4">
        <div className="glass-card rounded-2xl p-8 text-center">
          {/* Loading State */}
          {status === 'loading' && (
            <>
              <div className="flex justify-center mb-6">
                <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
              <h2 className="text-xl font-semibold text-white mb-4">Completing Sign In</h2>
              <p className="text-gray-400">{message}</p>
            </>
          )}

          {/* Success State */}
          {status === 'success' && (
            <>
              <div className="flex justify-center mb-6">
                <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center">
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
                onClick={() => window.location.href = '/auth'}
                className="mt-4 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
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