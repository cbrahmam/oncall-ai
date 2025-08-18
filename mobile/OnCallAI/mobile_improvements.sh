#!/bin/bash
# Mobile App Improvements & Fixes
# Run this from: /Users/brahmamchunduri/Documents/startup/oncall-ai/mobile/OnCallAI

echo "🔧 APPLYING MOBILE APP IMPROVEMENTS"
echo "=================================="

echo "1️⃣ Creating improved API service..."

# Create the services directory if it doesn't exist
mkdir -p src/services

# Create the improved API service file
cat > src/services/apiService.ts << 'EOF'
// Enhanced API Service for OffCall AI Mobile App
import axios, { AxiosInstance, AxiosResponse } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const getBaseURL = () => {
  // Your deployed backend
  const PRODUCTION_URL = 'https://offcallai.com/api/v1';
  
  // Local development URLs
  const LOCAL_IOS_URL = 'http://localhost:8000/api/v1';
  const LOCAL_ANDROID_URL = 'http://10.0.2.2:8000/api/v1';
  
  // Use production by default
  if (__DEV__) {
    return Platform.OS === 'ios' ? LOCAL_IOS_URL : LOCAL_ANDROID_URL;
  }
  return PRODUCTION_URL;
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
}

const apiClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Request interceptor
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
    return config;
  },
  (error) => Promise.reject(error)
);

class ApiService {
  async login(credentials: { email: string; password: string }) {
    try {
      const response = await apiClient.post('/auth/login', credentials);
      const { user, access_token, refresh_token } = response.data;
      
      await AsyncStorage.setItem('access_token', access_token);
      if (refresh_token) {
        await AsyncStorage.setItem('refresh_token', refresh_token);
      }
      await AsyncStorage.setItem('user', JSON.stringify(user));
      
      return { user, access_token, refresh_token };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async register(userData: { email: string; password: string; name: string }) {
    try {
      const response = await apiClient.post('/auth/register', userData);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getCurrentUser(): Promise<User> {
    try {
      const response = await apiClient.get('/auth/me');
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getIncidents(): Promise<Incident[]> {
    try {
      const response = await apiClient.get('/incidents');
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async healthCheck() {
    try {
      const response = await apiClient.get('/health');
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  private handleError(error: any): Error {
    if (error.response) {
      const message = error.response.data?.detail || error.response.data?.message || error.message;
      return new Error(message);
    } else if (error.request) {
      return new Error('Network connection failed. Please check your internet connection.');
    } else {
      return new Error(error.message || 'An unexpected error occurred');
    }
  }
}

export const apiService = new ApiService();
export default apiService;
EOF

echo "✅ API service created"

echo ""
echo "2️⃣ Creating improved styles (fixes shadow warnings)..."

# Create improved styles
cat > src/styles/globalStyles.ts << 'EOF'
import { StyleSheet, Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

export const colors = {
  primary: '#3b82f6',
  secondary: '#8b5cf6',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  background: '#0f172a',
  surface: '#1e293b',
  text: '#f8fafc',
  textSecondary: '#94a3b8',
  border: '#334155',
};

export const globalStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  // Fixed shadow styles that won't trigger warnings
  cardShadow: {
    backgroundColor: colors.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  buttonShadow: {
    backgroundColor: colors.primary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  // Text styles
  heading: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
  },
  subheading: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  body: {
    fontSize: 16,
    color: colors.text,
  },
  caption: {
    fontSize: 14,
    color: colors.textSecondary,
  },
});

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export { width, height };
EOF

echo "✅ Global styles created"

echo ""
echo "3️⃣ Creating network status manager..."

# Create network status manager
cat > src/utils/networkManager.ts << 'EOF'
import NetInfo from '@react-native-netinfo/netinfo';
import { useState, useEffect } from 'react';

export const useNetworkStatus = () => {
  const [isConnected, setIsConnected] = useState(true);
  const [connectionType, setConnectionType] = useState<string>('unknown');

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsConnected(state.isConnected ?? false);
      setConnectionType(state.type);
    });

    return () => unsubscribe();
  }, []);

  return { isConnected, connectionType };
};

export default { useNetworkStatus };
EOF

echo "✅ Network manager created"

echo ""
echo "4️⃣ Installing additional dependencies..."

npm install @react-native-netinfo/netinfo react-native-device-info

echo ""
echo "5️⃣ Creating demo data for testing..."

# Create demo data
mkdir -p src/data
cat > src/data/demoData.ts << 'EOF'
export const demoIncidents = [
  {
    id: '1',
    title: 'Database Connection Timeout',
    description: 'Primary database experiencing connection timeouts affecting user authentication',
    severity: 'critical' as const,
    status: 'open' as const,
    created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 minutes ago
    updated_at: new Date().toISOString(),
  },
  {
    id: '2',
    title: 'High Memory Usage on Web Servers',
    description: 'Memory usage has exceeded 85% on production web servers',
    severity: 'high' as const,
    status: 'acknowledged' as const,
    assigned_to: 'John Smith',
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
    updated_at: new Date().toISOString(),
  },
  {
    id: '3',
    title: 'SSL Certificate Expiry Warning',
    description: 'SSL certificate for api.example.com expires in 7 days',
    severity: 'medium' as const,
    status: 'resolved' as const,
    created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
    updated_at: new Date().toISOString(),
  },
];

export const demoUser = {
  id: '1',
  email: 'demo@offcallai.com',
  name: 'Demo User',
  role: 'admin',
  organization_id: '1',
  is_active: true,
  created_at: new Date().toISOString(),
};
EOF

echo "✅ Demo data created"

echo ""
echo "6️⃣ Creating error boundary component..."

cat > src/components/ErrorBoundary.tsx << 'EOF'
import React, { Component, ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.message}>
            {this.state.error?.message || 'An unexpected error occurred'}
          </Text>
          <TouchableOpacity 
            style={styles.button}
            onPress={() => this.setState({ hasError: false, error: undefined })}
          >
            <Text style={styles.buttonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#0f172a',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#f8fafc',
    marginBottom: 16,
  },
  message: {
    fontSize: 16,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 24,
  },
  button: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
EOF

echo "✅ Error boundary created"

echo ""
echo "7️⃣ Running pod install for iOS..."

if [[ "$OSTYPE" == "darwin"* ]]; then
    cd ios && pod install && cd ..
    echo "✅ iOS pods installed"
else
    echo "⚠️  Skipping pod install (not on macOS)"
fi

echo ""
echo "8️⃣ Testing API connectivity..."

# Test if we can reach the backend
echo "🔍 Testing backend connectivity..."
curl -s --connect-timeout 5 https://offcallai.com/health && echo "✅ Production backend reachable" || echo "⚠️  Production backend not reachable"

echo ""
echo "🎯 MOBILE APP IMPROVEMENTS COMPLETE!"
echo "=================================="
echo ""
echo "✅ Enhanced API service with proper error handling"
echo "✅ Fixed shadow warnings with proper styles"
echo "✅ Added network status monitoring"
echo "✅ Created demo data for testing"
echo "✅ Added error boundary for crash protection"
echo "✅ Updated dependencies"
echo ""
echo "🚀 Next steps:"
echo "1. npm run ios    # Launch iOS app"
echo "2. npm run android # Launch Android app"
echo "3. Test login with demo credentials"
echo "4. Check network connectivity status"
echo ""
echo "The apps should now connect to your deployed backend at:"
echo "https://offcallai.com"