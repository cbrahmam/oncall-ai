// src/App.tsx - Complete OffCall AI Mobile App
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
  RefreshControl,
  Modal,
  Dimensions,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Toast from 'react-native-toast-message';

import { apiService, User, Incident } from './src/services/apiService';

const { width, height } = Dimensions.get('window');

// Types for enhanced features
interface NotificationData {
  id: string;
  title: string;
  message: string;
  type: 'incident' | 'alert' | 'system';
  timestamp: string;
  read: boolean;
}

interface OnCallSchedule {
  id: string;
  user: string;
  start_time: string;
  end_time: string;
  is_active: boolean;
}

function App(): React.JSX.Element {
  // Authentication & User State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  
  // Data State
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [onCallSchedule, setOnCallSchedule] = useState<OnCallSchedule[]>([]);
  
  // UI State
  const [currentTab, setCurrentTab] = useState<'dashboard' | 'incidents' | 'oncall' | 'profile'>('dashboard');
  const [refreshing, setRefreshing] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showCreateIncident, setShowCreateIncident] = useState(false);
  const [showIncidentDetail, setShowIncidentDetail] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  
  // Login Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoginLoading, setIsLoginLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // Create Incident Form State
  const [newIncident, setNewIncident] = useState({
    title: '',
    description: '',
    severity: 'medium' as 'low' | 'medium' | 'high' | 'critical',
  });

  // Check authentication on app start
  useEffect(() => {
    checkAuthStatus();
  }, []);

  // Real-time updates
  useEffect(() => {
    if (isAuthenticated) {
      const interval = setInterval(() => {
        loadIncidents();
        loadNotifications();
      }, 30000); // Refresh every 30 seconds

      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  const checkAuthStatus = async () => {
    try {
      setIsLoading(true);
      const isAuth = await apiService.isAuthenticated();
      const currentUser = await apiService.getCurrentUser();
      
      if (isAuth && currentUser) {
        setIsAuthenticated(true);
        setUser(currentUser);
        await Promise.all([
          loadIncidents(),
          loadNotifications(),
          loadOnCallSchedule()
        ]);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadIncidents = async () => {
    try {
      const incidentsData = await apiService.getIncidents();
      setIncidents(incidentsData);
    } catch (error: any) {
      console.error('Failed to load incidents:', error);
      showToast('error', 'Error', 'Failed to load incidents');
    }
  };

  const loadNotifications = async () => {
    try {
      // Mock notifications for now
      const mockNotifications: NotificationData[] = [
        {
          id: '1',
          title: 'New Critical Incident',
          message: 'Database connection timeout detected',
          type: 'incident',
          timestamp: new Date().toISOString(),
          read: false,
        },
        {
          id: '2',
          title: 'System Update',
          message: 'OffCall AI has been updated with new features',
          type: 'system',
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          read: false,
        },
      ];
      setNotifications(mockNotifications);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    }
  };

  const loadOnCallSchedule = async () => {
    try {
      // Mock on-call schedule
      const mockSchedule: OnCallSchedule[] = [
        {
          id: '1',
          user: user?.full_name || 'You',
          start_time: new Date().toISOString(),
          end_time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          is_active: true,
        },
      ];
      setOnCallSchedule(mockSchedule);
    } catch (error) {
      console.error('Failed to load on-call schedule:', error);
    }
  };

  const showToast = (type: 'success' | 'error' | 'info', title: string, message: string) => {
    Toast.show({
      type,
      text1: title,
      text2: message,
      visibilityTime: 4000,
      autoHide: true,
    });
  };

  const handleLogin = async () => {
    if (!email || !password) {
      showToast('error', 'Error', 'Please enter email and password');
      return;
    }

    setIsLoginLoading(true);
    
    try {
      const response = await apiService.login(email, password);
      
      setIsAuthenticated(true);
      setUser(response.user);
      await Promise.all([
        loadIncidents(),
        loadNotifications(),
        loadOnCallSchedule()
      ]);
      
      showToast('success', 'Welcome!', `Hello ${response.user.full_name}!`);
    } catch (error: any) {
      showToast('error', 'Login Failed', error.message);
    } finally {
      setIsLoginLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await apiService.clearAuth();
      setIsAuthenticated(false);
      setUser(null);
      setIncidents([]);
      setNotifications([]);
      setOnCallSchedule([]);
      setEmail('');
      setPassword('');
      setCurrentTab('dashboard');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      loadIncidents(),
      loadNotifications(),
      loadOnCallSchedule()
    ]);
    setRefreshing(false);
  };

  const handleCreateIncident = async () => {
    if (!newIncident.title || !newIncident.description) {
      showToast('error', 'Error', 'Please fill in all fields');
      return;
    }

    try {
      await apiService.createIncident(
        newIncident.title,
        newIncident.description,
        newIncident.severity
      );
      
      setShowCreateIncident(false);
      setNewIncident({ title: '', description: '', severity: 'medium' });
      await loadIncidents();
      
      showToast('success', 'Success', 'Incident created successfully');
    } catch (error: any) {
      showToast('error', 'Error', error.message);
    }
  };

  const handleIncidentAction = async (incidentId: string, action: 'acknowledge' | 'resolve') => {
    try {
      if (action === 'acknowledge') {
        await apiService.acknowledgeIncident(incidentId);
        showToast('success', 'Success', 'Incident acknowledged');
      } else {
        await apiService.resolveIncident(incidentId);
        showToast('success', 'Success', 'Incident resolved');
      }
      
      await loadIncidents();
    } catch (error: any) {
      showToast('error', 'Error', error.message);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return '#ef4444';
      case 'high': return '#f97316';
      case 'medium': return '#eab308';
      case 'low': return '#22c55e';
      default: return '#64748b';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return '#ef4444';
      case 'acknowledged': return '#eab308';
      case 'resolved': return '#22c55e';
      default: return '#64748b';
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  const unreadNotificationsCount = notifications.filter(n => !n.read).length;
  const openIncidentsCount = incidents.filter(i => i.status === 'open').length;
  const criticalIncidentsCount = incidents.filter(i => i.severity === 'critical').length;

  // Loading Screen
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#0f172a" />
        <LinearGradient colors={['#0f172a', '#1e293b', '#334155']} style={styles.gradientContainer}>
          <View style={styles.loadingContainer}>
            <View style={styles.logo}>
              <LinearGradient colors={['#3b82f6', '#8b5cf6']} style={styles.logoGradient}>
                <Text style={styles.logoText}>⚡</Text>
              </LinearGradient>
            </View>
            <ActivityIndicator size="large" color="#3b82f6" style={{ marginTop: 20 }} />
            <Text style={styles.loadingText}>Connecting to OffCall AI...</Text>
            <Text style={styles.loadingSubtext}>Initializing AI-powered incident response</Text>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  // Login Screen
  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#0f172a" />
        <LinearGradient colors={['#0f172a', '#1e293b', '#334155']} style={styles.gradientContainer}>
          <ScrollView contentContainerStyle={styles.loginScrollContainer}>
            <View style={styles.loginContainer}>
              
              {/* Logo Section */}
              <View style={styles.logoSection}>
                <LinearGradient colors={['#3b82f6', '#8b5cf6']} style={styles.logoGradient}>
                  <Text style={styles.logoText}>⚡</Text>
                </LinearGradient>
                <Text style={styles.title}>OffCall AI</Text>
                <Text style={styles.subtitle}>AI-Powered Incident Response Platform</Text>
              </View>

              {/* Login Form */}
              <View style={styles.formCard}>
                <Text style={styles.formTitle}>Welcome Back</Text>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Email Address</Text>
                  <View style={styles.inputContainer}>
                    <Text style={styles.inputIcon}>📧</Text>
                    <TextInput
                      style={styles.input}
                      value={email}
                      onChangeText={setEmail}
                      placeholder="your@company.com"
                      placeholderTextColor="#64748b"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      editable={!isLoginLoading}
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Password</Text>
                  <View style={styles.inputContainer}>
                    <Text style={styles.inputIcon}>🔒</Text>
                    <TextInput
                      style={styles.input}
                      value={password}
                      onChangeText={setPassword}
                      placeholder="••••••••"
                      placeholderTextColor="#64748b"
                      secureTextEntry={!showPassword}
                      editable={!isLoginLoading}
                    />
                    <TouchableOpacity
                      style={styles.passwordToggle}
                      onPress={() => setShowPassword(!showPassword)}
                    >
                      <Text style={styles.passwordToggleText}>
                        {showPassword ? '🙈' : '👁️'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <TouchableOpacity 
                  style={[styles.loginButton, isLoginLoading && styles.loginButtonDisabled]} 
                  onPress={handleLogin}
                  disabled={isLoginLoading}
                >
                  <LinearGradient 
                    colors={['#3b82f6', '#8b5cf6']} 
                    style={styles.loginButtonGradient}
                  >
                    {isLoginLoading ? (
                      <ActivityIndicator color="white" />
                    ) : (
                      <Text style={styles.loginButtonText}>Sign In to OffCall AI</Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>

              {/* Features Preview */}
              <View style={styles.featuresSection}>
                <Text style={styles.featuresTitle}>Why OffCall AI?</Text>
                
                <View style={styles.featureItem}>
                  <View style={styles.featureIcon}>
                    <Text style={styles.featureEmoji}>🤖</Text>
                  </View>
                  <View style={styles.featureContent}>
                    <Text style={styles.featureTitle}>AI-Powered Resolution</Text>
                    <Text style={styles.featureDescription}>Automatically analyze and resolve incidents 73% faster</Text>
                  </View>
                </View>

                <View style={styles.featureItem}>
                  <View style={styles.featureIcon}>
                    <Text style={styles.featureEmoji}>📱</Text>
                  </View>
                  <View style={styles.featureContent}>
                    <Text style={styles.featureTitle}>Mobile-First Experience</Text>
                    <Text style={styles.featureDescription}>Manage incidents anywhere with real-time updates</Text>
                  </View>
                </View>

                <View style={styles.featureItem}>
                  <View style={styles.featureIcon}>
                    <Text style={styles.featureEmoji}>⚡</Text>
                  </View>
                  <View style={styles.featureContent}>
                    <Text style={styles.featureTitle}>Instant Notifications</Text>
                    <Text style={styles.featureDescription}>Get alerted immediately when incidents occur</Text>
                  </View>
                </View>
              </View>

            </View>
          </ScrollView>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  // Main App Content
  const renderTabContent = () => {
    switch (currentTab) {
      case 'dashboard':
        return (
          <ScrollView 
            style={styles.tabContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor="#3b82f6"
              />
            }
          >
            {/* Dashboard Header */}
            <View style={styles.dashboardHeader}>
              <View>
                <Text style={styles.welcomeText}>Welcome back,</Text>
                <Text style={styles.userNameText}>{user?.full_name}</Text>
                <Text style={styles.organizationText}>{user?.organization_name}</Text>
              </View>
              <TouchableOpacity
                style={styles.notificationButton}
                onPress={() => setShowNotifications(true)}
              >
                <Text style={styles.notificationIcon}>🔔</Text>
                {unreadNotificationsCount > 0 && (
                  <View style={styles.notificationBadge}>
                    <Text style={styles.notificationBadgeText}>{unreadNotificationsCount}</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            {/* Stats Grid */}
            <View style={styles.statsGrid}>
              <LinearGradient colors={['#ef4444', '#dc2626']} style={styles.statCard}>
                <Text style={styles.statNumber}>{openIncidentsCount}</Text>
                <Text style={styles.statLabel}>Open Incidents</Text>
                <Text style={styles.statIcon}>🚨</Text>
              </LinearGradient>

              <LinearGradient colors={['#f97316', '#ea580c']} style={styles.statCard}>
                <Text style={styles.statNumber}>{criticalIncidentsCount}</Text>
                <Text style={styles.statLabel}>Critical</Text>
                <Text style={styles.statIcon}>⚠️</Text>
              </LinearGradient>

              <LinearGradient colors={['#22c55e', '#16a34a']} style={styles.statCard}>
                <Text style={styles.statNumber}>12m</Text>
                <Text style={styles.statLabel}>Avg Response</Text>
                <Text style={styles.statIcon}>⚡</Text>
              </LinearGradient>

              <LinearGradient colors={['#3b82f6', '#2563eb']} style={styles.statCard}>
                <Text style={styles.statNumber}>94%</Text>
                <Text style={styles.statLabel}>AI Accuracy</Text>
                <Text style={styles.statIcon}>🤖</Text>
              </LinearGradient>
            </View>

            {/* Quick Actions */}
            <View style={styles.quickActionsSection}>
              <Text style={styles.sectionTitle}>Quick Actions</Text>
              
              <View style={styles.quickActionsGrid}>
                <TouchableOpacity
                  style={styles.quickActionCard}
                  onPress={() => setShowCreateIncident(true)}
                >
                  <LinearGradient colors={['#ef4444', '#dc2626']} style={styles.quickActionGradient}>
                    <Text style={styles.quickActionIcon}>🚨</Text>
                    <Text style={styles.quickActionText}>Create Incident</Text>
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity style={styles.quickActionCard}>
                  <LinearGradient colors={['#3b82f6', '#2563eb']} style={styles.quickActionGradient}>
                    <Text style={styles.quickActionIcon}>🤖</Text>
                    <Text style={styles.quickActionText}>AI Analysis</Text>
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.quickActionCard}
                  onPress={() => setCurrentTab('oncall')}
                >
                  <LinearGradient colors={['#22c55e', '#16a34a']} style={styles.quickActionGradient}>
                    <Text style={styles.quickActionIcon}>📞</Text>
                    <Text style={styles.quickActionText}>On-Call Status</Text>
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.quickActionCard}
                  onPress={() => setCurrentTab('incidents')}
                >
                  <LinearGradient colors={['#8b5cf6', '#7c3aed']} style={styles.quickActionGradient}>
                    <Text style={styles.quickActionIcon}>📊</Text>
                    <Text style={styles.quickActionText}>View All</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>

            {/* Recent Incidents */}
            <View style={styles.recentIncidentsSection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Recent Incidents</Text>
                <TouchableOpacity onPress={() => setCurrentTab('incidents')}>
                  <Text style={styles.seeAllText}>See All</Text>
                </TouchableOpacity>
              </View>
              
              {incidents.slice(0, 3).map((incident) => (
                <TouchableOpacity
                  key={incident.id}
                  style={styles.incidentPreviewCard}
                  onPress={() => {
                    setSelectedIncident(incident);
                    setShowIncidentDetail(true);
                  }}
                >
                  <View style={styles.incidentPreviewHeader}>
                    <View style={[
                      styles.severityIndicator,
                      { backgroundColor: getSeverityColor(incident.severity) }
                    ]}>
                      <Text style={styles.severityText}>{incident.severity.toUpperCase()}</Text>
                    </View>
                    <Text style={styles.incidentTimeText}>{formatTimeAgo(incident.created_at)}</Text>
                  </View>
                  
                  <Text style={styles.incidentPreviewTitle}>{incident.title}</Text>
                  <Text style={styles.incidentPreviewDescription} numberOfLines={2}>
                    {incident.description}
                  </Text>
                  
                  <View style={[
                    styles.statusIndicator,
                    { backgroundColor: getStatusColor(incident.status) }
                  ]}>
                    <Text style={styles.statusText}>{incident.status.toUpperCase()}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>

          </ScrollView>
        );

      case 'incidents':
        return (
          <ScrollView 
            style={styles.tabContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor="#3b82f6"
              />
            }
          >
            <View style={styles.incidentsHeader}>
              <Text style={styles.pageTitle}>All Incidents</Text>
              <TouchableOpacity
                style={styles.createButton}
                onPress={() => setShowCreateIncident(true)}
              >
                <Text style={styles.createButtonText}>+ Create</Text>
              </TouchableOpacity>
            </View>

            {incidents.map((incident) => (
              <TouchableOpacity
                key={incident.id}
                style={styles.fullIncidentCard}
                onPress={() => {
                  setSelectedIncident(incident);
                  setShowIncidentDetail(true);
                }}
              >
                <View style={styles.incidentCardHeader}>
                  <View style={styles.incidentBadges}>
                    <View style={[
                      styles.severityBadge,
                      { backgroundColor: getSeverityColor(incident.severity) }
                    ]}>
                      <Text style={styles.badgeText}>{incident.severity.toUpperCase()}</Text>
                    </View>
                    <View style={[
                      styles.statusBadge,
                      { backgroundColor: getStatusColor(incident.status) }
                    ]}>
                      <Text style={styles.badgeText}>{incident.status.toUpperCase()}</Text>
                    </View>
                  </View>
                  <Text style={styles.incidentTime}>{formatTimeAgo(incident.created_at)}</Text>
                </View>
                
                <Text style={styles.incidentTitle}>{incident.title}</Text>
                <Text style={styles.incidentDescription}>{incident.description}</Text>
                
                <View style={styles.incidentFooter}>
                  <Text style={styles.incidentSource}>Source: {incident.source}</Text>
                  
                  {incident.status === 'open' && (
                    <View style={styles.incidentActions}>
                      <TouchableOpacity
                        style={styles.acknowledgeBtn}
                        onPress={() => handleIncidentAction(incident.id, 'acknowledge')}
                      >
                        <Text style={styles.actionBtnText}>Acknowledge</Text>
                      </TouchableOpacity>
                      
                      <TouchableOpacity
                        style={styles.resolveBtn}
                        onPress={() => handleIncidentAction(incident.id, 'resolve')}
                      >
                        <Text style={styles.actionBtnText}>Resolve</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        );

      case 'oncall':
        return (
          <ScrollView style={styles.tabContent}>
            <Text style={styles.pageTitle}>On-Call Management</Text>
            
            {/* Current On-Call Status */}
            <LinearGradient colors={['#22c55e', '#16a34a']} style={styles.onCallStatusCard}>
              <View style={styles.onCallStatusHeader}>
                <Text style={styles.onCallStatusIcon}>📞</Text>
                <Text style={styles.onCallStatusTitle}>Currently On-Call</Text>
              </View>
              <Text style={styles.onCallStatusText}>You are currently on-call</Text>
              <Text style={styles.onCallStatusTime}>Started 2 hours ago</Text>
              
              <TouchableOpacity style={styles.onCallToggleButton}>
                <Text style={styles.onCallToggleText}>End On-Call Shift</Text>
              </TouchableOpacity>
            </LinearGradient>

            {/* On-Call Schedule */}
            <View style={styles.scheduleSection}>
              <Text style={styles.sectionTitle}>Upcoming Schedule</Text>
              
              {onCallSchedule.map((schedule) => (
                <View key={schedule.id} style={styles.scheduleItem}>
                  <View style={styles.scheduleUser}>
                    <Text style={styles.scheduleUserIcon}>👤</Text>
                    <Text style={styles.scheduleUserName}>{schedule.user}</Text>
                  </View>
                  <View style={styles.scheduleTime}>
                    <Text style={styles.scheduleTimeText}>
                      {new Date(schedule.start_time).toLocaleDateString()} - {new Date(schedule.end_time).toLocaleDateString()}
                    </Text>
                    {schedule.is_active && (
                      <View style={styles.activeIndicator}>
                        <Text style={styles.activeIndicatorText}>ACTIVE</Text>
                      </View>
                    )}
                  </View>
                </View>
              ))}
            </View>
          </ScrollView>
        );

      case 'profile':
        return (
          <ScrollView style={styles.tabContent}>
            <Text style={styles.pageTitle}>Profile & Settings</Text>
            
            {/* User Profile */}
            <View style={styles.profileSection}>
              <View style={styles.profileHeader}>
                <LinearGradient colors={['#3b82f6', '#8b5cf6']} style={styles.profileAvatar}>
                  <Text style={styles.profileAvatarText}>
                    {user?.full_name?.charAt(0) || 'U'}
                  </Text>
                </LinearGradient>
                <View style={styles.profileInfo}>
                  <Text style={styles.profileName}>{user?.full_name}</Text>
                  <Text style={styles.profileEmail}>{user?.email}</Text>
                  <Text style={styles.profileOrg}>{user?.organization_name}</Text>
                </View>
              </View>
            </View>

            {/* Settings Options */}
            <View style={styles.settingsSection}>
              <TouchableOpacity style={styles.settingItem}>
                <Text style={styles.settingIcon}>🔔</Text>
                <Text style={styles.settingText}>Notification Settings</Text>
                <Text style={styles.settingArrow}>›</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.settingItem}>
                <Text style={styles.settingIcon}>🛡️</Text>
                <Text style={styles.settingText}>Security & Privacy</Text>
                <Text style={styles.settingArrow}>›</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.settingItem}>
                <Text style={styles.settingIcon}>🎨</Text>
                <Text style={styles.settingText}>Appearance</Text>
                <Text style={styles.settingArrow}>›</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.settingItem}>
                <Text style={styles.settingIcon}>📊</Text>
                <Text style={styles.settingText}>Analytics</Text>
                <Text style={styles.settingArrow}>›</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.settingItem}>
                <Text style={styles.settingIcon}>❓</Text>
                <Text style={styles.settingText}>Help & Support</Text>
                <Text style={styles.settingArrow}>›</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.settingItem, styles.logoutItem]}
                onPress={handleLogout}
              >
                <Text style={styles.settingIcon}>🚪</Text>
                <Text style={[styles.settingText, styles.logoutText]}>Sign Out</Text>
                <Text style={styles.settingArrow}>›</Text>
              </TouchableOpacity>
            </View>

            {/* App Info */}
            <View style={styles.appInfoSection}>
              <Text style={styles.appInfoText}>OffCall AI v1.0.0</Text>
              <Text style={styles.appInfoSubtext}>Made with ⚡ for incident response teams</Text>
            </View>
          </ScrollView>
        );

      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />
      
      <LinearGradient colors={['#0f172a', '#1e293b']} style={styles.gradientContainer}>
        
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <LinearGradient colors={['#3b82f6', '#8b5cf6']} style={styles.headerLogo}>
              <Text style={styles.headerLogoText}>⚡</Text>
            </LinearGradient>
            <Text style={styles.headerTitle}>OffCall AI</Text>
          </View>
          
          <TouchableOpacity
            style={styles.notificationHeaderButton}
            onPress={() => setShowNotifications(true)}
          >
            <Text style={styles.notificationIcon}>🔔</Text>
            {unreadNotificationsCount > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>{unreadNotificationsCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Tab Content */}
        <View style={styles.mainContent}>
          {renderTabContent()}
        </View>

        {/* Bottom Tab Bar */}
        <View style={styles.bottomTabBar}>
          <TouchableOpacity
            style={[styles.tabItem, currentTab === 'dashboard' && styles.activeTabItem]}
            onPress={() => setCurrentTab('dashboard')}
          >
            <Text style={[styles.tabIcon, currentTab === 'dashboard' && styles.activeTabIcon]}>🏠</Text>
            <Text style={[styles.tabLabel, currentTab === 'dashboard' && styles.activeTabLabel]}>Dashboard</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabItem, currentTab === 'incidents' && styles.activeTabItem]}
            onPress={() => setCurrentTab('incidents')}
          >
            <Text style={[styles.tabIcon, currentTab === 'incidents' && styles.activeTabIcon]}>🚨</Text>
            <Text style={[styles.tabLabel, currentTab === 'incidents' && styles.activeTabLabel]}>Incidents</Text>
            {openIncidentsCount > 0 && (
              <View style={styles.tabBadge}>
                <Text style={styles.tabBadgeText}>{openIncidentsCount}</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabItem, currentTab === 'oncall' && styles.activeTabItem]}
            onPress={() => setCurrentTab('oncall')}
          >
            <Text style={[styles.tabIcon, currentTab === 'oncall' && styles.activeTabIcon]}>📞</Text>
            <Text style={[styles.tabLabel, currentTab === 'oncall' && styles.activeTabLabel]}>On-Call</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabItem, currentTab === 'profile' && styles.activeTabItem]}
            onPress={() => setCurrentTab('profile')}
          >
            <Text style={[styles.tabIcon, currentTab === 'profile' && styles.activeTabIcon]}>👤</Text>
            <Text style={[styles.tabLabel, currentTab === 'profile' && styles.activeTabLabel]}>Profile</Text>
          </TouchableOpacity>
        </View>

      </LinearGradient>

      {/* Modals */}
      
      {/* Notifications Modal */}
      <Modal
        visible={showNotifications}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowNotifications(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <LinearGradient colors={['#0f172a', '#1e293b']} style={styles.modalGradient}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Notifications</Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowNotifications(false)}
              >
                <Text style={styles.modalCloseText}>Done</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.notificationsList}>
              {notifications.map((notification) => (
                <View key={notification.id} style={styles.notificationItem}>
                  <View style={styles.notificationContent}>
                    <Text style={styles.notificationTitle}>{notification.title}</Text>
                    <Text style={styles.notificationMessage}>{notification.message}</Text>
                    <Text style={styles.notificationTime}>{formatTimeAgo(notification.timestamp)}</Text>
                  </View>
                  {!notification.read && <View style={styles.unreadDot} />}
                </View>
              ))}
            </ScrollView>
          </LinearGradient>
        </SafeAreaView>
      </Modal>

      {/* Create Incident Modal */}
      <Modal
        visible={showCreateIncident}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCreateIncident(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <LinearGradient colors={['#0f172a', '#1e293b']} style={styles.modalGradient}>
            <View style={styles.modalHeader}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowCreateIncident(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Create Incident</Text>
              <TouchableOpacity
                style={styles.modalSaveButton}
                onPress={handleCreateIncident}
              >
                <Text style={styles.modalSaveText}>Create</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.createIncidentForm}>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Title</Text>
                <TextInput
                  style={styles.formInput}
                  value={newIncident.title}
                  onChangeText={(text) => setNewIncident({...newIncident, title: text})}
                  placeholder="Brief description of the incident"
                  placeholderTextColor="#64748b"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Description</Text>
                <TextInput
                  style={[styles.formInput, styles.formTextArea]}
                  value={newIncident.description}
                  onChangeText={(text) => setNewIncident({...newIncident, description: text})}
                  placeholder="Detailed description of what happened..."
                  placeholderTextColor="#64748b"
                  multiline
                  numberOfLines={4}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Severity</Text>
                <View style={styles.severityOptions}>
                  {(['low', 'medium', 'high', 'critical'] as const).map((severity) => (
                    <TouchableOpacity
                      key={severity}
                      style={[
                        styles.severityOption,
                        newIncident.severity === severity && styles.selectedSeverityOption,
                        { borderColor: getSeverityColor(severity) }
                      ]}
                      onPress={() => setNewIncident({...newIncident, severity})}
                    >
                      <Text style={[
                        styles.severityOptionText,
                        newIncident.severity === severity && styles.selectedSeverityOptionText
                      ]}>
                        {severity.toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </ScrollView>
          </LinearGradient>
        </SafeAreaView>
      </Modal>

      {/* Incident Detail Modal */}
      <Modal
        visible={showIncidentDetail}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowIncidentDetail(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <LinearGradient colors={['#0f172a', '#1e293b']} style={styles.modalGradient}>
            <View style={styles.modalHeader}>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowIncidentDetail(false)}
              >
                <Text style={styles.modalCloseText}>Close</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Incident Details</Text>
              <View style={styles.modalPlaceholder} />
            </View>

            {selectedIncident && (
              <ScrollView style={styles.incidentDetailContent}>
                <View style={styles.incidentDetailHeader}>
                  <View style={styles.incidentDetailBadges}>
                    <View style={[
                      styles.detailSeverityBadge,
                      { backgroundColor: getSeverityColor(selectedIncident.severity) }
                    ]}>
                      <Text style={styles.detailBadgeText}>{selectedIncident.severity.toUpperCase()}</Text>
                    </View>
                    <View style={[
                      styles.detailStatusBadge,
                      { backgroundColor: getStatusColor(selectedIncident.status) }
                    ]}>
                      <Text style={styles.detailBadgeText}>{selectedIncident.status.toUpperCase()}</Text>
                    </View>
                  </View>
                  <Text style={styles.incidentDetailTime}>{formatTimeAgo(selectedIncident.created_at)}</Text>
                </View>

                <Text style={styles.incidentDetailTitle}>{selectedIncident.title}</Text>
                <Text style={styles.incidentDetailDescription}>{selectedIncident.description}</Text>

                <View style={styles.incidentDetailMeta}>
                  <View style={styles.metaItem}>
                    <Text style={styles.metaLabel}>Source:</Text>
                    <Text style={styles.metaValue}>{selectedIncident.source}</Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Text style={styles.metaLabel}>Created:</Text>
                    <Text style={styles.metaValue}>{new Date(selectedIncident.created_at).toLocaleString()}</Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Text style={styles.metaLabel}>Updated:</Text>
                    <Text style={styles.metaValue}>{new Date(selectedIncident.updated_at).toLocaleString()}</Text>
                  </View>
                </View>

                {selectedIncident.status === 'open' && (
                  <View style={styles.incidentDetailActions}>
                    <TouchableOpacity
                      style={styles.detailAcknowledgeButton}
                      onPress={() => {
                        handleIncidentAction(selectedIncident.id, 'acknowledge');
                        setShowIncidentDetail(false);
                      }}
                    >
                      <LinearGradient colors={['#eab308', '#f59e0b']} style={styles.detailActionGradient}>
                        <Text style={styles.detailActionText}>Acknowledge</Text>
                      </LinearGradient>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.detailResolveButton}
                      onPress={() => {
                        handleIncidentAction(selectedIncident.id, 'resolve');
                        setShowIncidentDetail(false);
                      }}
                    >
                      <LinearGradient colors={['#22c55e', '#16a34a']} style={styles.detailActionGradient}>
                        <Text style={styles.detailActionText}>Resolve</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                )}
              </ScrollView>
            )}
          </LinearGradient>
        </SafeAreaView>
      </Modal>

      {/* Toast Messages */}
      <Toast />
      
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  gradientContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  logo: {
    marginBottom: 20,
  },
  logoGradient: {
    width: 100,
    height: 100,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  logoText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: 'white',
  },
  loadingText: {
    color: '#94a3b8',
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
  },
  loadingSubtext: {
    color: '#64748b',
    marginTop: 8,
    fontSize: 14,
    textAlign: 'center',
  },
  loginScrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  loginContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 50,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: 20,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 24,
  },
  formCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
    padding: 24,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  formTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 24,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f1f5f9',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  inputIcon: {
    fontSize: 16,
    marginLeft: 16,
    marginRight: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    paddingRight: 16,
    fontSize: 16,
    color: '#ffffff',
  },
  passwordToggle: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  passwordToggleText: {
    fontSize: 16,
  },
  loginButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 8,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  loginButtonDisabled: {
    opacity: 0.7,
  },
  loginButtonGradient: {
    paddingVertical: 18,
    alignItems: 'center',
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  featuresSection: {
    marginTop: 20,
  },
  featuresTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 20,
    textAlign: 'center',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  featureEmoji: {
    fontSize: 18,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 14,
    color: '#94a3b8',
    lineHeight: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerLogo: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerLogoText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  notificationHeaderButton: {
    position: 'relative',
    padding: 8,
  },
  notificationButton: {
    position: 'relative',
    padding: 8,
  },
  notificationIcon: {
    fontSize: 24,
  },
  notificationBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  mainContent: {
    flex: 1,
  },
  tabContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  dashboardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 20,
  },
  welcomeText: {
    fontSize: 16,
    color: '#94a3b8',
  },
  userNameText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  organizationText: {
    fontSize: 14,
    color: '#64748b',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    minWidth: (width - 60) / 2,
    borderRadius: 16,
    padding: 20,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
  },
  statIcon: {
    position: 'absolute',
    top: 16,
    right: 16,
    fontSize: 24,
    opacity: 0.7,
  },
  quickActionsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 16,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  quickActionCard: {
    flex: 1,
    minWidth: (width - 60) / 2,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  quickActionGradient: {
    padding: 20,
    alignItems: 'center',
  },
  quickActionIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    textAlign: 'center',
  },
  recentIncidentsSection: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  seeAllText: {
    fontSize: 16,
    color: '#3b82f6',
    fontWeight: '600',
  },
  incidentPreviewCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  incidentPreviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  severityIndicator: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  severityText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  incidentTimeText: {
    fontSize: 12,
    color: '#64748b',
  },
  incidentPreviewTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  incidentPreviewDescription: {
    fontSize: 14,
    color: '#94a3b8',
    lineHeight: 20,
    marginBottom: 12,
  },
  statusIndicator: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  bottomTabBar: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    position: 'relative',
  },
  activeTabItem: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    borderRadius: 12,
  },
  tabIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  activeTabIcon: {
    fontSize: 22,
  },
  tabLabel: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '500',
  },
  activeTabLabel: {
    color: '#3b82f6',
    fontWeight: '600',
  },
  tabBadge: {
    position: 'absolute',
    top: 4,
    right: 8,
    backgroundColor: '#ef4444',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    marginVertical: 20,
  },
  incidentsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  createButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  createButtonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  fullIncidentCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  incidentCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  incidentBadges: {
    flexDirection: 'row',
    gap: 8,
  },
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  incidentTime: {
    fontSize: 12,
    color: '#64748b',
  },
  incidentTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 8,
  },
  incidentDescription: {
    fontSize: 14,
    color: '#94a3b8',
    lineHeight: 20,
    marginBottom: 12,
  },
  incidentFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  incidentSource: {
    fontSize: 12,
    color: '#64748b',
    fontStyle: 'italic',
  },
  incidentActions: {
    flexDirection: 'row',
    gap: 8,
  },
  acknowledgeBtn: {
    backgroundColor: 'rgba(234, 179, 8, 0.2)',
    borderWidth: 1,
    borderColor: '#eab308',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  resolveBtn: {
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    borderWidth: 1,
    borderColor: '#22c55e',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
  },
  onCallStatusCard: {
    borderRadius: 16,
    padding: 20,
    marginVertical: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  onCallStatusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  onCallStatusIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  onCallStatusTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  onCallStatusText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 4,
  },
  onCallStatusTime: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 16,
  },
  onCallToggleButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  onCallToggleText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  scheduleSection: {
    marginBottom: 24,
  },
  scheduleItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  scheduleUser: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  scheduleUserIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  scheduleUserName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  scheduleTime: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  scheduleTimeText: {
    fontSize: 14,
    color: '#94a3b8',
  },
  activeIndicator: {
    backgroundColor: '#22c55e',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  activeIndicatorText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  profileSection: {
    marginBottom: 32,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  profileAvatar: {
    width: 60,
    height: 60,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  profileAvatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 2,
  },
  profileOrg: {
    fontSize: 14,
    color: '#64748b',
  },
  settingsSection: {
    marginBottom: 32,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  logoutItem: {
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  settingIcon: {
    fontSize: 20,
    marginRight: 16,
    width: 24,
    textAlign: 'center',
  },
  settingText: {
    flex: 1,
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '500',
  },
  logoutText: {
    color: '#ef4444',
  },
  settingArrow: {
    fontSize: 20,
    color: '#64748b',
  },
  appInfoSection: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  appInfoText: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 4,
  },
  appInfoSubtext: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  modalGradient: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  modalCloseButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  modalCloseText: {
    fontSize: 16,
    color: '#3b82f6',
    fontWeight: '600',
  },
  modalCancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  modalCancelText: {
    fontSize: 16,
    color: '#94a3b8',
    fontWeight: '600',
  },
  modalSaveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  modalSaveText: {
    fontSize: 16,
    color: '#3b82f6',
    fontWeight: '600',
  },
  modalPlaceholder: {
    width: 60,
  },
  notificationsList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  notificationItem: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  notificationMessage: {
    fontSize: 14,
    color: '#94a3b8',
    lineHeight: 20,
    marginBottom: 8,
  },
  notificationTime: {
    fontSize: 12,
    color: '#64748b',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3b82f6',
    marginTop: 8,
    marginLeft: 12,
  },
  createIncidentForm: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  formGroup: {
    marginBottom: 24,
  },
  formLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 8,
  },
  formInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    color: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  formTextArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  severityOptions: {
    flexDirection: 'row',
    gap: 12,
  },
  severityOption: {
    flex: 1,
    borderWidth: 2,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  selectedSeverityOption: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  severityOptionText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#94a3b8',
  },
  selectedSeverityOptionText: {
    color: '#ffffff',
  },
  incidentDetailContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  incidentDetailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  incidentDetailBadges: {
    flexDirection: 'row',
    gap: 8,
  },
  detailSeverityBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  detailStatusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  detailBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  incidentDetailTime: {
    fontSize: 14,
    color: '#64748b',
  },
  incidentDetailTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 16,
    lineHeight: 32,
  },
  incidentDetailDescription: {
    fontSize: 16,
    color: '#94a3b8',
    lineHeight: 24,
    marginBottom: 24,
  },
  incidentDetailMeta: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  metaItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  metaLabel: {
    fontSize: 14,
    color: '#94a3b8',
    fontWeight: '500',
  },
  metaValue: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  incidentDetailActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  detailAcknowledgeButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  detailResolveButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  detailActionGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  detailActionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
});

export default App;