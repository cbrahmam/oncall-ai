// Enhanced App.tsx - Building on your existing design
import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
  FlatList,
  RefreshControl,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';

// Keep your existing beautiful dark theme and enhance it
const COLORS = {
  background: '#0f172a',
  surface: 'rgba(255, 255, 255, 0.05)',
  border: 'rgba(255, 255, 255, 0.1)',
  primary: '#3b82f6',
  text: '#ffffff',
  textSecondary: '#94a3b8',
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',
  blue: '#3b82f6',
  shadow: 'rgba(59, 130, 246, 0.3)',
};

// Types (keeping it simple for now)
interface User {
  id: string;
  email: string;
  full_name: string;
  organization?: { name: string };
}

interface Incident {
  id: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'acknowledged' | 'resolved';
  created_at: string;
}

function App(): React.JSX.Element {
  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // UI state
  const [currentView, setCurrentView] = useState<'landing' | 'auth' | 'dashboard'>('landing');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isLoginMode, setIsLoginMode] = useState(true);
  
  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [orgName, setOrgName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Data state
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // Initialize app
  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      // Check if user is already logged in
      const token = await AsyncStorage.getItem('auth_token');
      const userData = await AsyncStorage.getItem('user_data');
      
      if (token && userData) {
        setUser(JSON.parse(userData));
        setIsAuthenticated(true);
        setCurrentView('dashboard');
        await loadMockData(); // Load some mock data for now
      } else {
        setCurrentView('landing');
      }
    } catch (error) {
      console.error('App initialization error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Mock authentication (replace with real API later)
  const handleAuth = async () => {
    if (!email || !password) {
      Toast.show({
        type: 'error',
        text1: 'Missing Fields',
        text2: 'Please fill in all required fields',
      });
      return;
    }

    setIsSubmitting(true);
    
    // Simulate API call
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const mockUser: User = {
        id: '1',
        email,
        full_name: fullName || 'Demo User',
        organization: { name: orgName || 'Demo Organization' },
      };

      // Store mock data
      await AsyncStorage.setItem('auth_token', 'mock-token-123');
      await AsyncStorage.setItem('user_data', JSON.stringify(mockUser));
      
      setUser(mockUser);
      setIsAuthenticated(true);
      setCurrentView('dashboard');
      setShowAuthModal(false);
      
      await loadMockData();
      
      Toast.show({
        type: 'success',
        text1: isLoginMode ? 'Login Successful' : 'Registration Successful',
        text2: `Welcome ${isLoginMode ? 'back' : 'to OnCall AI'}!`,
      });
      
      // Clear form
      setEmail('');
      setPassword('');
      setFullName('');
      setOrgName('');
      
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Authentication Error',
        text2: 'Please try again',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Load mock data
  const loadMockData = async () => {
    const mockIncidents: Incident[] = [
      {
        id: '1',
        title: 'Database Connection Timeout',
        description: 'Production database experiencing high latency',
        severity: 'critical',
        status: 'open',
        created_at: new Date().toISOString(),
      },
      {
        id: '2',
        title: 'API Rate Limit Exceeded',
        description: 'Payment service API hitting rate limits',
        severity: 'high',
        status: 'acknowledged',
        created_at: new Date(Date.now() - 3600000).toISOString(),
      },
      {
        id: '3',
        title: 'Memory Usage High',
        description: 'Server memory usage above 85%',
        severity: 'medium',
        status: 'resolved',
        created_at: new Date(Date.now() - 7200000).toISOString(),
      },
    ];
    
    setIncidents(mockIncidents);
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.removeItem('auth_token');
            await AsyncStorage.removeItem('user_data');
            setUser(null);
            setIsAuthenticated(false);
            setCurrentView('landing');
            setIncidents([]);
            
            Toast.show({
              type: 'success',
              text1: 'Logged Out',
              text2: 'See you next time!',
            });
          },
        },
      ]
    );
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadMockData();
    setRefreshing(false);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return '#ef4444';
      case 'high': return '#f59e0b';
      case 'medium': return '#3b82f6';
      case 'low': return '#22c55e';
      default: return '#64748b';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return '#ef4444';
      case 'acknowledged': return '#f59e0b';
      case 'resolved': return '#22c55e';
      default: return '#64748b';
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
        <View style={styles.loadingContainer}>
          <View style={styles.logo}>
            <Text style={styles.logoText}>⚡</Text>
          </View>
          <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 20 }} />
          <Text style={styles.loadingText}>Loading OnCall AI...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Landing Screen (your existing beautiful design)
  if (currentView === 'landing') {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
        
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logo}>
            <Text style={styles.logoText}>⚡</Text>
          </View>
          <Text style={styles.title}>OnCall AI</Text>
          <Text style={styles.subtitle}>AI-Powered Incident Response</Text>
        </View>

        <ScrollView style={styles.scrollView}>
          <View style={styles.body}>
            
            {/* Status Card */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>🚀 Ready to Get Started</Text>
              <Text style={styles.cardText}>Sign in or create an account</Text>
              <Text style={styles.cardSubtext}>Experience the future of incident management</Text>
            </View>

            {/* Authentication Button */}
            <TouchableOpacity 
              style={styles.primaryButton}
              onPress={() => setShowAuthModal(true)}
            >
              <Text style={styles.primaryButtonText}>Get Started</Text>
            </TouchableOpacity>

            {/* Quick Actions - keeping your existing design */}
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            
            <TouchableOpacity style={styles.actionButton}>
              <Text style={styles.actionIcon}>🚨</Text>
              <View style={styles.actionContent}>
                <Text style={styles.actionTitle}>Create Incident</Text>
                <Text style={styles.actionSubtitle}>Report a new incident</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton}>
              <Text style={styles.actionIcon}>🤖</Text>
              <View style={styles.actionContent}>
                <Text style={styles.actionTitle}>AI Analysis</Text>
                <Text style={styles.actionSubtitle}>Get AI-powered insights</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton}>
              <Text style={styles.actionIcon}>📊</Text>
              <View style={styles.actionContent}>
                <Text style={styles.actionTitle}>Dashboard</Text>
                <Text style={styles.actionSubtitle}>View incident metrics</Text>
              </View>
            </TouchableOpacity>

            {/* Features Preview - keeping your existing design */}
            <Text style={styles.sectionTitle}>Why OnCall AI?</Text>
            
            <View style={styles.featureCard}>
              <Text style={styles.featureIcon}>🤖</Text>
              <Text style={styles.featureTitle}>AI-Powered Resolution</Text>
              <Text style={styles.featureText}>Automatically analyze and suggest solutions for incidents</Text>
            </View>

            <View style={styles.featureCard}>
              <Text style={styles.featureIcon}>⚡</Text>
              <Text style={styles.featureTitle}>73% Faster Response</Text>
              <Text style={styles.featureText}>Reduce mean time to resolution with intelligent automation</Text>
            </View>

            <View style={styles.featureCard}>
              <Text style={styles.featureIcon}>📱</Text>
              <Text style={styles.featureTitle}>Mobile-First Design</Text>
              <Text style={styles.featureText}>Manage incidents on-the-go with our native mobile app</Text>
            </View>

          </View>
        </ScrollView>

        {/* Authentication Modal */}
        <Modal
          visible={showAuthModal}
          animationType="slide"
          presentationStyle="pageSheet"
        >
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowAuthModal(false)}>
                <Text style={styles.modalCancel}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>
                {isLoginMode ? 'Welcome Back' : 'Create Account'}
              </Text>
              <View style={{ width: 60 }} />
            </View>

            <ScrollView style={styles.modalContent}>
              <Text style={styles.authSubtitle}>
                {isLoginMode ? 'Sign in to your account' : 'Join OnCall AI today'}
              </Text>

              <Text style={styles.inputLabel}>Email</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="Enter your email"
                placeholderTextColor={COLORS.textSecondary}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <Text style={styles.inputLabel}>Password</Text>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="Enter your password"
                placeholderTextColor={COLORS.textSecondary}
                secureTextEntry
              />

              {!isLoginMode && (
                <>
                  <Text style={styles.inputLabel}>Full Name</Text>
                  <TextInput
                    style={styles.input}
                    value={fullName}
                    onChangeText={setFullName}
                    placeholder="Enter your full name"
                    placeholderTextColor={COLORS.textSecondary}
                  />

                  <Text style={styles.inputLabel}>Organization</Text>
                  <TextInput
                    style={styles.input}
                    value={orgName}
                    onChangeText={setOrgName}
                    placeholder="Enter your organization name"
                    placeholderTextColor={COLORS.textSecondary}
                  />
                </>
              )}

              <TouchableOpacity
                style={styles.primaryButton}
                onPress={handleAuth}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.primaryButtonText}>
                    {isLoginMode ? 'Sign In' : 'Create Account'}
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.switchAuth}
                onPress={() => setIsLoginMode(!isLoginMode)}
              >
                <Text style={styles.switchAuthText}>
                  {isLoginMode 
                    ? "Don't have an account? Sign up" 
                    : "Already have an account? Sign in"}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </SafeAreaView>
        </Modal>
      </SafeAreaView>
    );
  }

  // Dashboard Screen (new enhanced version)
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      
      {/* Header with user info */}
      <View style={styles.dashboardHeader}>
        <View>
          <Text style={styles.welcomeText}>Welcome back,</Text>
          <Text style={styles.userName}>{user?.full_name || 'User'}</Text>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.scrollView}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
          />
        }
      >
        <View style={styles.body}>
          
          {/* Stats Cards */}
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{incidents.filter(i => i.status === 'open').length}</Text>
              <Text style={styles.statLabel}>Open</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{incidents.filter(i => i.severity === 'critical').length}</Text>
              <Text style={styles.statLabel}>Critical</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{incidents.length}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
          </View>

          {/* Recent Incidents */}
          <Text style={styles.sectionTitle}>Recent Incidents</Text>
          
          {incidents.map((incident) => (
            <View key={incident.id} style={[styles.incidentCard, { borderLeftColor: getSeverityColor(incident.severity) }]}>
              <View style={styles.incidentHeader}>
                <Text style={styles.incidentTitle}>{incident.title}</Text>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(incident.status) }]}>
                  <Text style={styles.statusText}>{incident.status.toUpperCase()}</Text>
                </View>
              </View>
              
              <Text style={styles.incidentDescription} numberOfLines={2}>
                {incident.description}
              </Text>
              
              <View style={styles.incidentMeta}>
                <Text style={[styles.severityText, { color: getSeverityColor(incident.severity) }]}>
                  {incident.severity.toUpperCase()}
                </Text>
                <Text style={styles.timeText}>
                  {new Date(incident.created_at).toLocaleTimeString()}
                </Text>
              </View>
            </View>
          ))}

          {incidents.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateIcon}>🎉</Text>
              <Text style={styles.emptyStateTitle}>No incidents!</Text>
              <Text style={styles.emptyStateText}>Your systems are running smoothly</Text>
            </View>
          )}

        </View>
      </ScrollView>

      <Toast />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: COLORS.textSecondary,
    marginTop: 10,
    fontSize: 16,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  logoText: {
    fontSize: 36,
    fontWeight: 'bold',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  body: {
    padding: 20,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  cardText: {
    fontSize: 16,
    color: COLORS.success,
    marginBottom: 4,
  },
  cardSubtext: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 16,
    marginTop: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  actionIcon: {
    fontSize: 24,
    marginRight: 16,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  actionSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  featureCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  featureIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  featureText: {
    fontSize: 14,
    color: '#cbd5e1',
    lineHeight: 20,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  modalCancel: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  authSubtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 30,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: COLORS.text,
    backgroundColor: COLORS.surface,
  },
  switchAuth: {
    alignItems: 'center',
    marginTop: 20,
  },
  switchAuthText: {
    color: COLORS.primary,
    fontSize: 14,
  },
  dashboardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  welcomeText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  logoutButton: {
    padding: 8,
  },
  logoutText: {
    color: COLORS.primary,
    fontSize: 14,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  statCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 5,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 5,
  },
  incidentCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  incidentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  incidentTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    flex: 1,
    marginRight: 10,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  incidentDescription: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 12,
    lineHeight: 20,
  },
  incidentMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  severityText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  timeText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
});

export default App;