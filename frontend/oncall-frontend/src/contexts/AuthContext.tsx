// frontend/src/contexts/AuthContext.tsx - Fixed with proper types
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1';



interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
  organization_id: string;
  organization_name?: string;
  is_verified?: boolean;
  created_at?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName: string, organizationName: string) => Promise<void>;
  logout: () => void;
  setToken: (token: string | null) => void;
  setUser: (user: User | null) => void;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isAuthenticated = !!token && !!user;

  // Initialize auth state from localStorage
  useEffect(() => {
    const initializeAuth = async () => {
      const savedToken = localStorage.getItem('access_token');
      if (savedToken) {
        try {
          // Verify token and get user info
          const response = await fetch(`${API_BASE_URL}/auth/me`, {
            headers: {
              'Authorization': `Bearer ${savedToken}`,
              'Content-Type': 'application/json',
            },
          });

          if (response.ok) {
            const userData = await response.json();
            setToken(savedToken);
            setUser(userData);
          } else {
            // Token is invalid, clear it
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
          }
        } catch (error) {
          console.error('Auth initialization error:', error);
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
        }
      }
    };

    initializeAuth();
  }, []);

  const login = async (email: string, password: string): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Login failed');
      }

      // Store tokens
      localStorage.setItem('access_token', data.access_token);
      if (data.refresh_token) {
        localStorage.setItem('refresh_token', data.refresh_token);
      }

      // Update state
      setToken(data.access_token);
      setUser(data.user);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      setError(errorMessage);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (
    email: string, 
    password: string, 
    fullName: string, 
    organizationName: string
  ): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          full_name: fullName,
          organization_name: organizationName,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Registration failed');
      }

      // Store tokens
      localStorage.setItem('access_token', data.access_token);
      if (data.refresh_token) {
        localStorage.setItem('refresh_token', data.refresh_token);
      }

      // Update state
      setToken(data.access_token);
      setUser(data.user);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Registration failed';
      setError(errorMessage);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = (): void => {
    // Clear tokens
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    
    // Clear state
    setToken(null);
    setUser(null);
    setError(null);
    
    // Redirect to landing page
    window.location.href = '/';
  };

  const handleSetToken = (newToken: string | null): void => {
    setToken(newToken);
    if (newToken) {
      localStorage.setItem('access_token', newToken);
    } else {
      localStorage.removeItem('access_token');
    }
  };

  const handleSetUser = (newUser: User | null): void => {
    setUser(newUser);
  };

  const clearError = (): void => {
    setError(null);
  };

  const value: AuthContextType = {
    user,
    token,
    isAuthenticated,
    isLoading,
    error,
    login,
    register,
    logout,
    setToken: handleSetToken,
    setUser: handleSetUser,
    clearError,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};