// frontend/oncall-frontend/src/contexts/NotificationContext.tsx
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useAuth } from './AuthContext';

// Define all types directly in this file
export type NotificationType = 'incident' | 'alert' | 'system' | 'success' | 'warning' | 'error';
export type NotificationSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  severity?: NotificationSeverity;
  timestamp: Date;
  read: boolean;
  actionUrl?: string;
  incidentId?: string;
  autoClose?: boolean;
  duration?: number; // in milliseconds
}

export interface NotificationPreferences {
  browserNotifications: boolean;
  soundEnabled: boolean;
  emailNotifications: boolean;
  slackNotifications: boolean;
  incidentCreated: boolean;
  incidentAcknowledged: boolean;
  incidentResolved: boolean;
  criticalAlertsOnly: boolean;
  doNotDisturb: boolean;
  quietHours: {
    enabled: boolean;
    start: string; // HH:MM format
    end: string;   // HH:MM format
  };
}

export interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  preferences: NotificationPreferences;
  showToast: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
  updatePreferences: (prefs: Partial<NotificationPreferences>) => void;
  requestPermission: () => Promise<boolean>;
  isConnected: boolean;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

const defaultPreferences: NotificationPreferences = {
  browserNotifications: true,
  soundEnabled: true,
  emailNotifications: true,
  slackNotifications: false,
  incidentCreated: true,
  incidentAcknowledged: true,
  incidentResolved: true,
  criticalAlertsOnly: false,
  doNotDisturb: false,
  quietHours: {
    enabled: false,
    start: '22:00',
    end: '08:00'
  }
};

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [preferences, setPreferences] = useState<NotificationPreferences>(defaultPreferences);
  const [isConnected, setIsConnected] = useState(false);

  // Calculate unread count
  const unreadCount = notifications.filter(n => !n.read).length;

  // Load preferences from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('notification-preferences');
    if (saved) {
      try {
        setPreferences({ ...defaultPreferences, ...JSON.parse(saved) });
      } catch (error) {
        console.error('Error loading notification preferences:', error);
      }
    }
  }, []);

  // Save preferences to localStorage
  const updatePreferences = useCallback((newPrefs: Partial<NotificationPreferences>) => {
    const updated = { ...preferences, ...newPrefs };
    setPreferences(updated);
    localStorage.setItem('notification-preferences', JSON.stringify(updated));
  }, [preferences]);

  // Check if we're in quiet hours
  const isQuietHours = useCallback(() => {
    if (!preferences.quietHours.enabled) return false;
    
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    
    const [startHour, startMin] = preferences.quietHours.start.split(':').map(Number);
    const [endHour, endMin] = preferences.quietHours.end.split(':').map(Number);
    
    const startTime = startHour * 60 + startMin;
    const endTime = endHour * 60 + endMin;
    
    if (startTime <= endTime) {
      return currentTime >= startTime && currentTime <= endTime;
    } else {
      // Spans midnight
      return currentTime >= startTime || currentTime <= endTime;
    }
  }, [preferences.quietHours]);

  // Request browser notification permission
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!('Notification' in window)) {
      console.warn('Browser does not support notifications');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission === 'denied') {
      return false;
    }

    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }, []);

  // Show browser notification
  const showBrowserNotification = useCallback(async (notification: Notification) => {
    if (!preferences.browserNotifications) return;
    if (preferences.doNotDisturb && isQuietHours()) return;
    if (preferences.criticalAlertsOnly && notification.severity !== 'critical') return;

    const hasPermission = await requestPermission();
    if (!hasPermission) return;

    const options: NotificationOptions = {
      body: notification.message,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: notification.id,
      requireInteraction: notification.severity === 'critical',
      silent: !preferences.soundEnabled || isQuietHours(),
      data: {
        incidentId: notification.incidentId,
        actionUrl: notification.actionUrl
      }
    };

    const browserNotification = new Notification(notification.title, options);

    browserNotification.onclick = () => {
      window.focus();
      if (notification.actionUrl) {
        window.location.href = notification.actionUrl;
      }
      browserNotification.close();
    };

    // Auto-close after duration
    if (notification.autoClose !== false) {
      setTimeout(() => {
        browserNotification.close();
      }, notification.duration || 5000);
    }
  }, [preferences.browserNotifications, preferences.doNotDisturb, preferences.criticalAlertsOnly, preferences.soundEnabled, isQuietHours, requestPermission]);

  // Play notification sound
  const playNotificationSound = useCallback((severity: string) => {
    if (!preferences.soundEnabled) return;
    if (preferences.doNotDisturb && isQuietHours()) return;

    // Create audio context for different sounds based on severity
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // Different frequencies for different severities
    const frequencies = {
      critical: [800, 600, 800], // Urgent pattern
      high: [600, 400],          // Alert pattern
      medium: [400],             // Single tone
      low: [300]                 // Subtle tone
    };

    const pattern = frequencies[severity as keyof typeof frequencies] || frequencies.medium;
    
    let time = audioContext.currentTime;
    pattern.forEach((freq, index) => {
      oscillator.frequency.setValueAtTime(freq, time);
      gainNode.gain.setValueAtTime(0.1, time);
      gainNode.gain.exponentialRampToValueAtTime(0.01, time + 0.2);
      time += 0.3;
    });

    oscillator.start(audioContext.currentTime);
    oscillator.stop(time);
  }, [preferences.soundEnabled, preferences.doNotDisturb, isQuietHours]);

  // Add notification
  const showToast = useCallback((notificationData: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    const notification: Notification = {
      ...notificationData,
      id: `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      read: false,
      autoClose: notificationData.autoClose !== false,
      duration: notificationData.duration || 5000
    };

    setNotifications(prev => [notification, ...prev]);

    // Show browser notification
    showBrowserNotification(notification);

    // Play sound
    if (notification.severity) {
      playNotificationSound(notification.severity);
    }

    // Auto-remove toast notifications
    if (notification.autoClose) {
      setTimeout(() => {
        setNotifications(prevNotifications => 
          prevNotifications.filter(n => n.id !== notification.id)
        );
      }, notification.duration);
    }
  }, [showBrowserNotification, playNotificationSound]);

  // Mark notification as read
  const markAsRead = useCallback((id: string) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === id 
          ? { ...notification, read: true }
          : notification
      )
    );
  }, []);

  // Mark all notifications as read
  const markAllAsRead = useCallback(() => {
    setNotifications(prev => 
      prev.map(notification => ({ ...notification, read: true }))
    );
  }, []);

  // Remove notification
  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  }, []);

  // Clear all notifications
  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  // WebSocket connection for real-time updates
  useEffect(() => {
    if (!isAuthenticated || !user) return;

    const token = localStorage.getItem('access_token');
    if (!token) return;

    // WebSocket URL (we'll need to implement this on the backend)
    const wsUrl = `ws://localhost:8000/api/v1/ws/notifications?token=${token}`;
    
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('🔗 WebSocket connected for notifications');
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        // Handle different types of real-time updates
        switch (data.type) {
          case 'incident_created':
            if (preferences.incidentCreated) {
              showToast({
                type: 'incident',
                title: 'New Incident Created',
                message: `${data.incident.title} - ${data.incident.severity}`,
                severity: data.incident.severity,
                actionUrl: `/incidents/${data.incident.id}`,
                incidentId: data.incident.id
              });
            }
            break;
            
          case 'incident_acknowledged':
            if (preferences.incidentAcknowledged) {
              showToast({
                type: 'incident',
                title: 'Incident Acknowledged',
                message: `${data.incident.title} acknowledged by ${data.acknowledged_by}`,
                severity: data.incident.severity,
                actionUrl: `/incidents/${data.incident.id}`,
                incidentId: data.incident.id
              });
            }
            break;
            
          case 'incident_resolved':
            if (preferences.incidentResolved) {
              showToast({
                type: 'success',
                title: 'Incident Resolved',
                message: `${data.incident.title} has been resolved`,
                actionUrl: `/incidents/${data.incident.id}`,
                incidentId: data.incident.id
              });
            }
            break;
            
          case 'alert_received':
            showToast({
              type: 'alert',
              title: 'New Alert Received',
              message: data.alert.summary,
              severity: data.alert.severity,
              actionUrl: `/alerts/${data.alert.id}`
            });
            break;
            
          default:
            console.log('Unknown notification type:', data.type);
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    ws.onclose = () => {
      console.log('🔌 WebSocket disconnected');
      setIsConnected(false);
      
      // Attempt to reconnect after 5 seconds
      setTimeout(() => {
        if (isAuthenticated) {
          // Reconnect by creating a new WebSocket
          const newWs = new WebSocket(wsUrl);
          // Set up event handlers for the new connection
          setupWebSocketHandlers(newWs);
        }
      }, 5000);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setIsConnected(false);
    };

    const setupWebSocketHandlers = (websocket: WebSocket) => {
      websocket.onopen = () => {
        console.log('🔗 WebSocket reconnected');
        setIsConnected(true);
      };
      websocket.onmessage = ws.onmessage;
      websocket.onclose = ws.onclose;
      websocket.onerror = ws.onerror;
    };

    return () => {
      ws.close();
    };
  }, [isAuthenticated, user, preferences, showToast]);

  const value: NotificationContextType = {
    notifications,
    unreadCount,
    preferences,
    showToast,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAll,
    updatePreferences,
    requestPermission,
    isConnected
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};