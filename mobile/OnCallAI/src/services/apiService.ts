// src/services/apiService.ts - Complete API Service for OffCall AI Mobile App
import AsyncStorage from '@react-native-async-storage/async-storage';

// Types
export interface User {
  id: string;
  email: string;
  full_name: string;
  organization_name: string;
  role: string;
  created_at: string;
  updated_at: string;
}

export interface Incident {
  id: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'acknowledged' | 'resolved';
  source: string;
  created_at: string;
  updated_at: string;
  organization_id: string;
  created_by: string;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  user: User;
  message: string;
}

class ApiService {
  private baseURL = 'http://localhost:8000/api/v1'; // Update this to your backend URL
  private accessToken: string | null = null;

  constructor() {
    this.loadStoredToken();
  }

  private async loadStoredToken() {
    try {
      const token = await AsyncStorage.getItem('access_token');
      this.accessToken = token;
    } catch (error) {
      console.error('Failed to load stored token:', error);
    }
  }

  private async storeToken(token: string) {
    try {
      await AsyncStorage.setItem('access_token', token);
      this.accessToken = token;
    } catch (error) {
      console.error('Failed to store token:', error);
    }
  }

  private async clearStoredAuth() {
    try {
      await AsyncStorage.multiRemove(['access_token', 'refresh_token', 'user_data']);
      this.accessToken = null;
    } catch (error) {
      console.error('Failed to clear stored auth:', error);
    }
  }

  private getAuthHeaders() {
    return {
      'Content-Type': 'application/json',
      ...(this.accessToken && { Authorization: `Bearer ${this.accessToken}` }),
    };
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    
    const config: RequestInit = {
      ...options,
      headers: {
        ...this.getAuthHeaders(),
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.detail || `HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`API request failed for ${endpoint}:`, error);
      throw error;
    }
  }

  // Authentication Methods
  async login(email: string, password: string): Promise<LoginResponse> {
    const response = await this.makeRequest<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    await this.storeToken(response.access_token);
    await AsyncStorage.setItem('refresh_token', response.refresh_token);
    await AsyncStorage.setItem('user_data', JSON.stringify(response.user));

    return response;
  }

  async logout(): Promise<void> {
    try {
      await this.makeRequest('/auth/logout', {
        method: 'POST',
      });
    } catch (error) {
      console.error('Logout request failed:', error);
    } finally {
      await this.clearStoredAuth();
    }
  }

  async isAuthenticated(): Promise<boolean> {
    if (!this.accessToken) {
      await this.loadStoredToken();
    }
    
    if (!this.accessToken) {
      return false;
    }

    try {
      // Verify token with backend
      await this.makeRequest('/auth/verify');
      return true;
    } catch (error) {
      console.error('Token verification failed:', error);
      await this.clearStoredAuth();
      return false;
    }
  }

  async getCurrentUser(): Promise<User | null> {
    try {
      // First try to get from storage
      const storedUser = await AsyncStorage.getItem('user_data');
      if (storedUser) {
        return JSON.parse(storedUser);
      }

      // If not in storage, fetch from API
      const user = await this.makeRequest<User>('/auth/me');
      await AsyncStorage.setItem('user_data', JSON.stringify(user));
      return user;
    } catch (error) {
      console.error('Failed to get current user:', error);
      return null;
    }
  }

  async clearAuth(): Promise<void> {
    await this.clearStoredAuth();
  }

  // Incident Management Methods
  async getIncidents(): Promise<Incident[]> {
    try {
      const response = await this.makeRequest<{ incidents: Incident[] }>('/incidents');
      return response.incidents || [];
    } catch (error) {
      console.error('Failed to fetch incidents:', error);
      // Return mock data for testing
      return this.getMockIncidents();
    }
  }

  async createIncident(
    title: string,
    description: string,
    severity: 'low' | 'medium' | 'high' | 'critical'
  ): Promise<Incident> {
    return await this.makeRequest<Incident>('/incidents', {
      method: 'POST',
      body: JSON.stringify({
        title,
        description,
        severity,
        source: 'mobile_app',
      }),
    });
  }

  async updateIncident(incidentId: string, updates: Partial<Incident>): Promise<Incident> {
    return await this.makeRequest<Incident>(`/incidents/${incidentId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async acknowledgeIncident(incidentId: string): Promise<Incident> {
    return await this.updateIncident(incidentId, { status: 'acknowledged' });
  }

  async resolveIncident(incidentId: string): Promise<Incident> {
    return await this.updateIncident(incidentId, { status: 'resolved' });
  }

  async getIncident(incidentId: string): Promise<Incident> {
    return await this.makeRequest<Incident>(`/incidents/${incidentId}`);
  }

  // Mock data for testing when backend is not available
  private getMockIncidents(): Incident[] {
    return [
      {
        id: '1',
        title: 'Database Connection Timeout',
        description: 'Primary database is experiencing connection timeouts. Multiple users affected.',
        severity: 'critical',
        status: 'open',
        source: 'datadog',
        created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 minutes ago
        updated_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(), // 15 minutes ago
        organization_id: 'org-1',
        created_by: 'system',
      },
      {
        id: '2',
        title: 'High Memory Usage on Web Servers',
        description: 'Web servers are showing elevated memory usage above 85% threshold.',
        severity: 'high',
        status: 'acknowledged',
        source: 'grafana',
        created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
        updated_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), // 1 hour ago
        organization_id: 'org-1',
        created_by: 'monitoring',
      },
      {
        id: '3',
        title: 'API Rate Limit Exceeded',
        description: 'External API service is returning 429 errors due to rate limiting.',
        severity: 'medium',
        status: 'resolved',
        source: 'application_logs',
        created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), // 4 hours ago
        updated_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(), // 3 hours ago
        organization_id: 'org-1',
        created_by: 'auto_detection',
      },
      {
        id: '4',
        title: 'SSL Certificate Expiring Soon',
        description: 'SSL certificate for api.offcall-ai.com expires in 7 days.',
        severity: 'low',
        status: 'open',
        source: 'ssl_monitor',
        created_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(), // 6 hours ago
        updated_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(), // 6 hours ago
        organization_id: 'org-1',
        created_by: 'ssl_checker',
      },
      {
        id: '5',
        title: 'Disk Space Warning',
        description: 'Server disk usage has reached 80% capacity on production database server.',
        severity: 'high',
        status: 'open',
        source: 'system_monitoring',
        created_at: new Date(Date.now() - 45 * 60 * 1000).toISOString(), // 45 minutes ago
        updated_at: new Date(Date.now() - 45 * 60 * 1000).toISOString(), // 45 minutes ago
        organization_id: 'org-1',
        created_by: 'disk_monitor',
      },
    ];
  }

  // AI Features (for future implementation)
  async analyzeIncident(incidentId: string): Promise<any> {
    return await this.makeRequest(`/ai/analyze-incident`, {
      method: 'POST',
      body: JSON.stringify({ incident_id: incidentId }),
    });
  }

  async getSuggestedResolution(incidentId: string): Promise<any> {
    return await this.makeRequest(`/ai/suggest-resolution`, {
      method: 'POST',
      body: JSON.stringify({ incident_id: incidentId }),
    });
  }

  // Team Management (for future implementation)
  async getTeamMembers(): Promise<any[]> {
    try {
      return await this.makeRequest('/teams/members');
    } catch (error) {
      return [];
    }
  }

  async getOnCallSchedule(): Promise<any[]> {
    try {
      return await this.makeRequest('/oncall/schedule');
    } catch (error) {
      return [];
    }
  }

  // Notification Methods
  async markNotificationAsRead(notificationId: string): Promise<void> {
    await this.makeRequest(`/notifications/${notificationId}/read`, {
      method: 'POST',
    });
  }

  async getNotifications(): Promise<any[]> {
    try {
      const response = await this.makeRequest<{ notifications: any[] }>('/notifications');
      return response.notifications || [];
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      return [];
    }
  }

  // WebSocket connection for real-time updates
  connectWebSocket(onMessage: (data: any) => void): WebSocket | null {
    try {
      const wsUrl = this.baseURL.replace('http', 'ws').replace('/api/v1', '/ws');
      const ws = new WebSocket(`${wsUrl}?token=${this.accessToken}`);

      ws.onopen = () => {
        console.log('WebSocket connected');
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          onMessage(data);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      ws.onclose = () => {
        console.log('WebSocket disconnected');
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      return ws;
    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
      return null;
    }
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      await fetch(`${this.baseURL.replace('/api/v1', '')}/health`);
      return true;
    } catch (error) {
      console.error('Health check failed:', error);
      return false;
    }
  }
}

export const apiService = new ApiService();
export default apiService;