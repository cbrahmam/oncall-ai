// src/services/apiService.ts
import axios, { AxiosInstance, AxiosResponse } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Configuration - iOS simulator uses localhost, real device needs your computer's IP
const API_BASE_URL = Platform.OS === 'ios' 
  ? 'http://localhost:8000'  // iOS simulator
  : 'http://10.0.2.2:8000';  // Android emulator

// Types
interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
  organization_id: string;
  organization_name?: string;
}

interface LoginResponse {
  access_token: string;
  token_type: string;
  user: User;
}

interface Incident {
  id: string;
  title: string;
  description: string;
  status: 'open' | 'acknowledged' | 'resolved';
  severity: 'low' | 'medium' | 'high' | 'critical';
  created_at: string;
  updated_at: string;
  assigned_to?: string;
  source: string;
}

class ApiService {
  private api: AxiosInstance;
  private token: string | null = null;

  constructor() {
    this.api = axios.create({
      baseURL: API_BASE_URL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor to add auth token
    this.api.interceptors.request.use(
      async (config) => {
        if (!this.token) {
          this.token = await AsyncStorage.getItem('access_token');
        }
        
        if (this.token) {
          config.headers.Authorization = `Bearer ${this.token}`;
        }
        
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor for error handling
    this.api.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401) {
          // Token expired, clear storage and redirect to login
          await this.clearAuth();
        }
        return Promise.reject(error);
      }
    );
  }

  // Authentication Methods
  async login(email: string, password: string): Promise<LoginResponse> {
    try {
      const response: AxiosResponse<LoginResponse> = await this.api.post('/api/v1/auth/login', {
        email,
        password,
      });

      const { access_token, user } = response.data;
      
      // Store token and user data
      await AsyncStorage.setItem('access_token', access_token);
      await AsyncStorage.setItem('user', JSON.stringify(user));
      
      this.token = access_token;
      
      console.log('✅ Login successful:', user.email);
      return response.data;
    } catch (error: any) {
      console.error('❌ Login failed:', error.response?.data || error.message);
      throw new Error(error.response?.data?.detail || 'Login failed');
    }
  }

  async register(
    email: string,
    password: string,
    fullName: string,
    organizationName: string
  ): Promise<LoginResponse> {
    try {
      const response: AxiosResponse<LoginResponse> = await this.api.post('/api/v1/auth/register', {
        email,
        password,
        full_name: fullName,
        organization_name: organizationName,
      });

      const { access_token, user } = response.data;
      
      // Store token and user data
      await AsyncStorage.setItem('access_token', access_token);
      await AsyncStorage.setItem('user', JSON.stringify(user));
      
      this.token = access_token;
      
      console.log('✅ Registration successful:', user.email);
      return response.data;
    } catch (error: any) {
      console.error('❌ Registration failed:', error.response?.data || error.message);
      throw new Error(error.response?.data?.detail || 'Registration failed');
    }
  }

  async clearAuth(): Promise<void> {
    await AsyncStorage.removeItem('access_token');
    await AsyncStorage.removeItem('user');
    this.token = null;
  }

  async getCurrentUser(): Promise<User | null> {
    try {
      const userString = await AsyncStorage.getItem('user');
      return userString ? JSON.parse(userString) : null;
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  }

  async isAuthenticated(): Promise<boolean> {
    const token = await AsyncStorage.getItem('access_token');
    return !!token;
  }

  // Incident Methods
  async getIncidents(): Promise<Incident[]> {
    try {
      const response: AxiosResponse<Incident[]> = await this.api.get('/api/v1/incidents');
      console.log('✅ Incidents loaded:', response.data.length);
      return response.data;
    } catch (error: any) {
      console.error('❌ Failed to load incidents:', error.response?.data || error.message);
      throw new Error('Failed to load incidents');
    }
  }

  async getIncident(incidentId: string): Promise<Incident> {
    try {
      const response: AxiosResponse<Incident> = await this.api.get(`/api/v1/incidents/${incidentId}`);
      return response.data;
    } catch (error: any) {
      console.error('❌ Failed to load incident:', error.response?.data || error.message);
      throw new Error('Failed to load incident');
    }
  }

  async acknowledgeIncident(incidentId: string): Promise<Incident> {
    try {
      const response: AxiosResponse<Incident> = await this.api.patch(`/api/v1/incidents/${incidentId}`, {
        status: 'acknowledged',
      });
      console.log('✅ Incident acknowledged:', incidentId);
      return response.data;
    } catch (error: any) {
      console.error('❌ Failed to acknowledge incident:', error.response?.data || error.message);
      throw new Error('Failed to acknowledge incident');
    }
  }

  async resolveIncident(incidentId: string): Promise<Incident> {
    try {
      const response: AxiosResponse<Incident> = await this.api.patch(`/api/v1/incidents/${incidentId}`, {
        status: 'resolved',
      });
      console.log('✅ Incident resolved:', incidentId);
      return response.data;
    } catch (error: any) {
      console.error('❌ Failed to resolve incident:', error.response?.data || error.message);
      throw new Error('Failed to resolve incident');
    }
  }

  async createIncident(title: string, description: string, severity: string): Promise<Incident> {
    try {
      const response: AxiosResponse<Incident> = await this.api.post('/api/v1/incidents', {
        title,
        description,
        severity,
        source: 'mobile_app',
      });
      console.log('✅ Incident created:', response.data.id);
      return response.data;
    } catch (error: any) {
      console.error('❌ Failed to create incident:', error.response?.data || error.message);
      throw new Error('Failed to create incident');
    }
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.api.get('/health');
      console.log('✅ Backend health check passed:', response.data);
      return response.status === 200;
    } catch (error: any) {
      console.error('❌ Backend health check failed:', error.message);
      return false;
    }
  }

  // WebSocket connection for real-time updates
  createWebSocket(token: string): WebSocket {
    const wsUrl = Platform.OS === 'ios' 
      ? `ws://localhost:8000/api/v1/ws/notifications?token=${token}`
      : `ws://10.0.2.2:8000/api/v1/ws/notifications?token=${token}`;

    const ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
      console.log('✅ WebSocket connected');
    };
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log('📨 WebSocket message:', data);
      // Handle real-time updates here
    };
    
    ws.onerror = (error) => {
      console.error('❌ WebSocket error:', error);
    };
    
    ws.onclose = () => {
      console.log('🔌 WebSocket disconnected');
    };

    return ws;
  }
}

// Export singleton instance
export const apiService = new ApiService();

// Export types
export type { User, Incident, LoginResponse };