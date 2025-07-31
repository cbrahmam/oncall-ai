// src/App.tsx
import React from 'react';
import {
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
} from 'react-native';

function App(): React.JSX.Element {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="#0f172a"
      />
      
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
            <Text style={styles.cardTitle}>🟢 System Status</Text>
            <Text style={styles.cardText}>All systems operational</Text>
            <Text style={styles.cardSubtext}>No active incidents</Text>
          </View>

          {/* Quick Actions */}
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

          {/* Features Preview */}
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

          {/* Coming Soon */}
          <View style={styles.comingSoon}>
            <Text style={styles.comingSoonText}>🚀 Coming Soon</Text>
            <Text style={styles.comingSoonSubtext}>Authentication • Real-time updates • Push notifications</Text>
          </View>

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  header: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#3b82f6',
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
    color: '#ffffff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#94a3b8',
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  body: {
    padding: 20,
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 8,
  },
  cardText: {
    fontSize: 16,
    color: '#22c55e',
    marginBottom: 4,
  },
  cardSubtext: {
    fontSize: 14,
    color: '#64748b',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 16,
    marginTop: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
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
    color: '#ffffff',
    marginBottom: 4,
  },
  actionSubtitle: {
    fontSize: 14,
    color: '#94a3b8',
  },
  featureCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  featureIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 8,
  },
  featureText: {
    fontSize: 14,
    color: '#cbd5e1',
    lineHeight: 20,
  },
  comingSoon: {
    alignItems: 'center',
    paddingVertical: 32,
    marginTop: 20,
  },
  comingSoonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#3b82f6',
    marginBottom: 8,
  },
  comingSoonSubtext: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
  },
});

export default App;
