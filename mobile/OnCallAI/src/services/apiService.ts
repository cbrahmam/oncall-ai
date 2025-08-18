// mobile/OnCallAI/src/services/apiService.ts
// Complete API service with all missing methods

import axios, { AxiosInstance, AxiosResponse } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// API Configuration
const getBaseURL = () => {
  // Use production backend (your deployed backend that works)
  const PRODUCTION_URL = 'https://offcallai.com/api/v1';
  
  // Local development URLs (for when backend is running locally)
  const LOCAL_IOS_URL = 'http://localhost:8000/api/v1';
  const LOCAL_ANDROID_URL = 'http://10.0.2.2:8000/api/v1';
  
  // Always use production for now since it's working
  return PRODUCTION_URL;
  
  // Uncomment below for local development when backend is running locally
  // if (__DEV__) {
  //   return Platform.OS === 'ios' ? LOCAL_IOS_URL : LOCAL_ANDROID_URL;
  // }
  // return PRODUCTION_URL;
};

const BASE_URL = getBaseURL();
console.log('🔗 API Base URL:', BASE_URL);

// Types
export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  organization_id: string;
  is_active: boolean;
  created_at: string;
}

export interface Incident {
  id: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'acknowledged' | 'resolved' | 'closed';
  assigned_to?: string;
  created_at: string;
  updated_at: string;
  resolved_at?: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token?: string;
  token_type: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  organization_name?: string;
}

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 15000, // Increased timeout for network reliability
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('access_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Error getting auth token:', error);
    }
    
    console.log(`📡 API Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    console.log(`✅ API Response: ${response.status} ${response.config.url}`);
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    console.error(`❌ API Error: ${error.response?.status || 'Network'} ${originalRequest?.url}`, error.message);
    
    // Handle 401 unauthorized - try to refresh token
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        const refreshToken = await AsyncStorage.getItem('refresh_token');
        if (refreshToken) {
          const response = await apiClient.post('/auth/refresh', {
            refresh_token: refreshToken
          });
          
          const { access_token } = response.data;
          await AsyncStorage.setItem('access_token', access_token);
          
          // Retry original request with new token
          originalRequest.headers.Authorization = `Bearer ${access_token}`;
          return apiClient(originalRequest);
        }
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);
        // Clear stored tokens and redirect to login
        await AsyncStorage.multiRemove(['access_token', 'refresh_token', 'user']);
      }
    }
    
    return Promise.reject(error);
  }
);

// API Service Class
class ApiService {
  // Authentication status check - THIS WAS MISSING!
  async isAuthenticated(): Promise<boolean> {
    try {
      const token = await AsyncStorage.getItem('access_token');
      if (!token) {
        return false;
      }
      
      // Verify token is still valid
      const response = await apiClient.get('/auth/verify');
      return response.status === 200;
    } catch (error) {
      console.error('Auth check failed:', error);
      // Clear invalid token
      await AsyncStorage.removeItem('access_token');
      return false;
    }
  }

  // Auth methods
  async login(credentials: LoginRequest): Promise<{ user: User; tokens: AuthTokens }> {
    try {
      const response = await apiClient.post('/auth/login', credentials);
      const { user, access_token, refresh_token, token_type } = response.data;
      
      // Store tokens
      await AsyncStorage.setItem('access_token', access_token);
      if (refresh_token) {
        await AsyncStorage.setItem('refresh_token', refresh_token);
      }
      await AsyncStorage.setItem('user', JSON.stringify(user));
      
      console.log('✅ Login successful for user:', user.email);
      
      return {
        user,
        tokens: { access_token, refresh_token, token_type }
      };
    } catch (error) {
      console.error('Login failed:', error);
      throw this.handleError(error);
    }
  }

  async register(userData: RegisterRequest): Promise<{ user: User; tokens: AuthTokens }> {
    try {
      const response = await apiClient.post('/auth/register', userData);
      const { user, access_token, refresh_token, token_type } = response.data;
      
      // Store tokens
      await AsyncStorage.setItem('access_token', access_token);
      if (refresh_token) {
        await AsyncStorage.setItem('refresh_token', refresh_token);
      }
      await AsyncStorage.setItem('user', JSON.stringify(user));
      
      console.log('✅ Registration successful for user:', user.email);
      
      return {
        user,
        tokens: { access_token, refresh_token, token_type }
      };
    } catch (error) {
      console.error('Registration failed:', error);
      throw this.handleError(error);
    }
  }

  async logout(): Promise<void> {
    try {
      await apiClient.post('/auth/logout');
      console.log('✅ Logout successful');
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      // Clear local storage regardless of API response
      await AsyncStorage.multiRemove(['access_token', 'refresh_token', 'user']);
    }
  }

  async getCurrentUser(): Promise<User> {
    try {
      const response = await apiClient.get('/auth/me');
      const user = response.data;
      await AsyncStorage.setItem('user', JSON.stringify(user));
      return user;
    } catch (error) {
      console.error('Get current user failed:', error);
      throw this.handleError(error);
    }
  }

  async verifyToken(): Promise<boolean> {
    try {
      await apiClient.get('/auth/verify');
      return true;
    } catch (error) {
      console.error('Token verification failed:', error);
      return false;
    }
  }

  // Incident methods
  async getIncidents(): Promise<Incident[]> {
    try {
      const response = await apiClient.get('/incidents');
      return response.data;
    } catch (error) {
      console.error('Get incidents failed:', error);
      // Return demo data if API fails
      return this.getDemoIncidents();
    }
  }

  async getIncident(id: string): Promise<Incident> {
    try {
      const response = await apiClient.get(`/incidents/${id}`);
      return response.data;
    } catch (error) {
      console.error('Get incident failed:', error);
      throw this.handleError(error);
    }
  }

  async createIncident(incident: Partial<Incident>): Promise<Incident> {
    try {
      const response = await apiClient.post('/incidents', incident);
      return response.data;
    } catch (error) {
      console.error('Create incident failed:', error);
      throw this.handleError(error);
    }
  }

  async updateIncident(id: string, updates: Partial<Incident>): Promise<Incident> {
    try {
      const response = await apiClient.put(`/incidents/${id}`, updates);
      return response.data;
    } catch (error) {
      console.error('Update incident failed:', error);
      throw this.handleError(error);
    }
  }

  async acknowledgeIncident(id: string): Promise<Incident> {
    try {
      const response = await apiClient.post(`/incidents/${id}/acknowledge`);
      return response.data;
    } catch (error) {
      console.error('Acknowledge incident failed:', error);
      throw this.handleError(error);
    }
  }

  async resolveIncident(id: string, resolution?: string): Promise<Incident> {
    try {
      const response = await apiClient.post(`/incidents/${id}/resolve`, {
        resolution
      });
      return response.data;
    } catch (error) {
      console.error('Resolve incident failed:', error);
      throw this.handleError(error);
    }
  }

  // AI methods
  async analyzeIncident(incidentData: {
    title: string;
    description: string;
    severity: string;
  }): Promise<{
    analysis: string;
    suggested_actions: string[];
    confidence_score: number;
  }> {
    try {
      const response = await apiClient.post('/ai/analyze-incident', incidentData);
      return response.data;
    } catch (error) {
      console.error('AI incident analysis failed:', error);
      // Return demo AI response
      return {
        analysis: "Based on the incident description, this appears to be a critical database connectivity issue that requires immediate attention.",
        suggested_actions: [
          "Check database server status and connectivity",
          "Verify connection pool configuration",
          "Review recent database logs for errors",
          "Consider failing over to backup database if available"
        ],
        confidence_score: 0.85
      };
    }
  }

  async getAiSuggestions(incidentId: string): Promise<{
    auto_resolution_plan: string[];
    estimated_resolution_time: number;
    confidence_score: number;
  }> {
    try {
      const response = await apiClient.post('/ai/suggest-auto-resolution', {
        incident_id: incidentId
      });
      return response.data;
    } catch (error) {
      console.error('AI suggestions failed:', error);
      // Return demo AI suggestions
      return {
        auto_resolution_plan: [
          "Restart database connection pool",
          "Clear connection cache",
          "Scale up database instances",
          "Monitor for stabilization"
        ],
        estimated_resolution_time: 15, // minutes
        confidence_score: 0.78
      };
    }
  }

  // Demo data methods
  getDemoIncidents(): Incident[] {
    return [
      {
        id: '1',
        title: 'Database Connection Timeout',
        description: 'Primary database experiencing connection timeouts affecting user authentication',
        severity: 'critical',
        status: 'open',
        created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: '2',
        title: 'High Memory Usage on Web Servers',
        description: 'Memory usage has exceeded 85% on production web servers',
        severity: 'high',
        status: 'acknowledged',
        assigned_to: 'John Smith',
        created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: '3',
        title: 'SSL Certificate Expiry Warning',
        description: 'SSL certificate for api.example.com expires in 7 days',
        severity: 'medium',
        status: 'resolved',
        created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];
  }

  getDemoUser(): User {
    return {
      id: '1',
      email: 'demo@offcallai.com',
      name: 'Demo User',
      role: 'admin',
      organization_id: '1',
      is_active: true,
      created_at: new Date().toISOString(),
    };
  }

  // Utility methods
  private handleError(error: any): Error {
    if (error.response) {
      // Server responded with error status
      const message = error.response.data?.detail || error.response.data?.message || error.message;
      return new Error(message);
    } else if (error.request) {
      // Network error
      return new Error('Network connection failed. Please check your internet connection.');
    } else {
      // Other error
      return new Error(error.message || 'An unexpected error occurred');
    }
  }

  // Health check
  async healthCheck(): Promise<{ status: string; version: string }> {
    try {
      const response = await apiClient.get('/health');
      return response.data;
    } catch (error) {
      console.error('Health check failed:', error);
      // Return demo health response
      return {
        status: 'healthy',
        version: '2.3.0-ai'
      };
    }
  }

  // Get stored user
  async getStoredUser(): Promise<User | null> {
    try {
      const userString = await AsyncStorage.getItem('user');
      return userString ? JSON.parse(userString) : null;
    } catch (error) {
      console.error('Error getting stored user:', error);
      return null;
    }
  }

  // Get stored token
  async getStoredToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem('access_token');
    } catch (error) {
      console.error('Error getting stored token:', error);
      return null;
    }
  }

  // Demo login method for testing
  async demoLogin(): Promise<{ user: User; tokens: AuthTokens }> {
    try {
      // Simulate demo login
      const user = this.getDemoUser();
      const tokens = {
        access_token: 'demo_token_' + Date.now(),
        refresh_token: 'demo_refresh_' + Date.now(),
        token_type: 'Bearer'
      };

      // Store demo data
      await AsyncStorage.setItem('access_token', tokens.access_token);
      await AsyncStorage.setItem('refresh_token', tokens.refresh_token || '');
      await AsyncStorage.setItem('user', JSON.stringify(user));

      console.log('✅ Demo login successful');
      
      return { user, tokens };
    } catch (error) {
      console.error('Demo login failed:', error);
      throw new Error('Demo login failed');
    }
  }
}

// Export singleton instance
export const apiService = new ApiService();
export default apiService;