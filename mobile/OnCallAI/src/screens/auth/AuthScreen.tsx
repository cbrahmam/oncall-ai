// src/screens/auth/AuthScreen.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';

interface AuthScreenProps {
  onLogin: (email: string, password: string) => void;
}

const AuthScreen: React.FC<AuthScreenProps> = ({ onLogin }) => {
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    organizationName: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const validateForm = (): boolean => {
    if (!formData.email || !formData.password) {
      Alert.alert('Validation Error', 'Email and password are required');
      return false;
    }

    if (!isLoginMode && (!formData.fullName || !formData.organizationName)) {
      Alert.alert('Validation Error', 'All fields are required for registration');
      return false;
    }

    if (formData.password.length < 6) {
      Alert.alert('Validation Error', 'Password must be at least 6 characters');
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      Alert.alert('Validation Error', 'Please enter a valid email address');
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (isLoginMode) {
        onLogin(formData.email, formData.password);
      } else {
        // For now, auto-login after registration
        onLogin(formData.email, formData.password);
      }
    } catch (error) {
      Alert.alert('Error', 'Authentication failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const switchMode = () => {
    setIsLoginMode(!isLoginMode);
    setFormData({
      email: '',
      password: '',
      fullName: '',
      organizationName: '',
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo and Title */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <View style={styles.logo}>
                <Text style={styles.logoText}>⚡</Text>
              </View>
            </View>
            
            <Text style={styles.title}>OnCall AI</Text>
            <Text style={styles.subtitle}>
              {isLoginMode ? 'Welcome back' : 'Get started with AI-powered incident response'}
            </Text>
          </View>

          {/* Auth Form */}
          <View style={styles.formContainer}>
            {/* Email Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Email</Text>
              <TextInput
                style={styles.input}
                value={formData.email}
                onChangeText={(value) => handleInputChange('email', value)}
                placeholder="your@company.com"
                placeholderTextColor="#64748b"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {/* Full Name Input (Register only) */}
            {!isLoginMode && (
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Full Name</Text>
                <TextInput
                  style={styles.input}
                  value={formData.fullName}
                  onChangeText={(value) => handleInputChange('fullName', value)}
                  placeholder="John Doe"
                  placeholderTextColor="#64748b"
                  autoCapitalize="words"
                />
              </View>
            )}

            {/* Organization Name Input (Register only) */}
            {!isLoginMode && (
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Organization Name</Text>
                <TextInput
                  style={styles.input}
                  value={formData.organizationName}
                  onChangeText={(value) => handleInputChange('organizationName', value)}
                  placeholder="Your Company"
                  placeholderTextColor="#64748b"
                  autoCapitalize="words"
                />
              </View>
            )}

            {/* Password Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Password</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
                  value={formData.password}
                  onChangeText={(value) => handleInputChange('password', value)}
                  placeholder="••••••••"
                  placeholderTextColor="#64748b"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
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

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={isLoading}
            >
              <View style={styles.submitButtonContent}>
                {isLoading ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <Text style={styles.submitText}>
                    {isLoginMode ? 'Sign In' : 'Create Account'}
                  </Text>
                )}
              </View>
            </TouchableOpacity>

            {/* Switch Mode */}
            <View style={styles.switchContainer}>
              <Text style={styles.switchText}>
                {isLoginMode ? "Don't have an account?" : "Already have an account?"}
              </Text>
              <TouchableOpacity onPress={switchMode} disabled={isLoading}>
                <Text style={styles.switchButton}>
                  {isLoginMode ? 'Sign Up' : 'Sign In'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Features Preview */}
          <View style={styles.featuresContainer}>
            <Text style={styles.featuresTitle}>Why OnCall AI?</Text>
            <View style={styles.featuresList}>
              <View style={styles.feature}>
                <Text style={styles.featureIcon}>🤖</Text>
                <Text style={styles.featureText}>AI-powered incident resolution</Text>
              </View>
              <View style={styles.feature}>
                <Text style={styles.featureIcon}>⚡</Text>
                <Text style={styles.featureText}>73% faster incident response</Text>
              </View>
              <View style={styles.feature}>
                <Text style={styles.featureIcon}>📱</Text>
                <Text style={styles.featureText}>Mobile-first on-call management</Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoContainer: {
    marginBottom: 16,
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
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
    lineHeight: 24,
  },
  formContainer: {
    marginBottom: 32,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f1f5f9',
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    color: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    color: '#ffffff',
  },
  passwordToggle: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  passwordToggleText: {
    fontSize: 18,
  },
  submitButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    marginTop: 8,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonContent: {
    paddingVertical: 18,
    alignItems: 'center',
  },
  submitText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  switchText: {
    fontSize: 14,
    color: '#94a3b8',
    marginRight: 8,
  },
  switchButton: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3b82f6',
  },
  featuresContainer: {
    marginTop: 32,
  },
  featuresTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#f1f5f9',
    textAlign: 'center',
    marginBottom: 16,
  },
  featuresList: {
    gap: 12,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  featureIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  featureText: {
    fontSize: 14,
    color: '#cbd5e1',
    flex: 1,
  },
});

export default AuthScreen;