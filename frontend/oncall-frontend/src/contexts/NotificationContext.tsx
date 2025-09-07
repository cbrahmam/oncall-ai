// frontend/src/contexts/ModernNotificationContext.tsx - COMPLETE API INTEGRATION
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1';

interface Notification {
  id: string;
  type: 'incident' | 'alert' | 'system' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  severity?: 'critical' | 'high' | 'medium' | 'low';
  incident_id?: string;
  action_url?: string;
  metadata: Record<string, any>;
  read: boolean;
  read_at?: string;
  created_at: string;
  // Toast-specific properties
  autoClose?: boolean;
  duration?: number;
}

interface NotificationStats {
  total_count: number;
  unread_count: number;
  incidents_count: number;
  alerts_count: number;
  system_count: number;
}

interface NotificationPreferences {
  browserNotifications: boolean;
  soundEnabled: boolean;
  emailNotifications: boolean;
  slackNotifications: boolean;
  criticalAlertsOnly: boolean;
  doNotDisturb: boolean;
  quietHours: {
    enabled: boolean;
    start: string;
    end: string;
  };
}

interface NotificationContextType {
  // State
  notifications: Notification[];
  toastNotifications: Notification[];
  stats: NotificationStats;
  preferences: NotificationPreferences;
  isConnected: boolean;
  isLoading: boolean;

  // Actions
  showToast: (notification: Omit<Notification, 'id' | 'created_at' | 'read' | 'metadata'>) => void;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  removeNotification: (id: string) => Promise<void>;
  clearAll: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
  updatePreferences: (newPreferences: Partial<NotificationPreferences>) => void;
  requestPermission: () => Promise<boolean>;

  // Computed
  unreadCount: number;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [toastNotifications, setToastNotifications] = useState<Notification[]>([]);
  const [stats, setStats] = useState<NotificationStats>({
    total_count: 0,
    unread_count: 0,
    incidents_count: 0,
    alerts_count: 0,
    system_count: 0
  });
  const [preferences, setPreferences] = useState<NotificationPreferences>(() => {
    const saved = localStorage.getItem('notification_preferences');
    return saved ? JSON.parse(saved) : {
      browserNotifications: false,
      soundEnabled: true,
      emailNotifications: true,
      slackNotifications: true,
      criticalAlertsOnly: false,
      doNotDisturb: false,
      quietHours: {
        enabled: false,
        start: '22:00',
        end: '08:00'
      }
    };
  });
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // WebSocket connection for real-time notifications
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) return;

    const wsUrl = `ws://localhost:8000/api/v1/ws/notifications?token=${token}`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      setIsConnected(true);
      console.log('Notification WebSocket connected');
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'notification') {
          const notification: Notification = {
            ...data.notification,
            autoClose: data.notification.severity !== 'critical',
            duration: data.notification.severity === 'critical' ? undefined : 5000
          };
          
          // Add to both lists
          setNotifications(prev => [notification, ...prev]);
          setToastNotifications(prev => [notification, ...prev]);
          
          // Update stats
          setStats(prev => ({
            ...prev,
            total_count: prev.total_count + 1,
            unread_count: prev.unread_count + 1,
            [`${notification.type}s_count`]: prev[`${notification.type}s_count` as keyof NotificationStats] + 1
          }));

          // Show browser notification if enabled
          showBrowserNotification(notification);
          
          // Play sound if enabled
          if (preferences.soundEnabled) {
            playNotificationSound(notification.severity || 'medium');
          }
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
      console.log('Notification WebSocket disconnected');
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setIsConnected(false);
    };

    return () => {
      ws.close();
    };
  }, [preferences.soundEnabled]);

  // Fetch initial notifications
  const refreshNotifications = useCallback(async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('access_token');
      if (!token) return;

      // Fetch notifications
      const notificationsResponse = await fetch(`${API_BASE_URL}/notifications/?limit=50`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (notificationsResponse.ok) {
        const notificationsData = await notificationsResponse.json();
        setNotifications(notificationsData);
        
        // Show only unread notifications as toasts (limit to 3)
        const unreadToasts = notificationsData
          .filter((n: Notification) => !n.read)
          .slice(0, 3)
          .map((n: Notification) => ({
            ...n,
            autoClose: n.severity !== 'critical',
            duration: n.severity === 'critical' ? undefined : 5000
          }));
        setToastNotifications(unreadToasts);
      }

      // Fetch stats
      const statsResponse = await fetch(`${API_BASE_URL}/notifications/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshNotifications();
  }, [refreshNotifications]);

  // Save preferences to localStorage
  useEffect(() => {
    localStorage.setItem('notification_preferences', JSON.stringify(preferences));
  }, [preferences]);

  const showBrowserNotification = useCallback((notification: Notification) => {
    if (!preferences.browserNotifications || Notification.permission !== 'granted') return;
    if (preferences.doNotDisturb && isQuietHours()) return;
    if (preferences.criticalAlertsOnly && notification.severity !== 'critical') return;

    const browserNotification = new Notification(notification.title, {
      body: notification.message,
      icon: '/favicon.ico',
      tag: notification.id,
      requireInteraction: notification.severity === 'critical'
    });

    browserNotification.onclick = () => {
      window.focus();
      if (notification.action_url) {
        window.location.href = notification.action_url;
      } else if (notification.incident_id) {
        window.location.href = `/incidents/${notification.incident_id}`;
      }
      browserNotification.close();
    };

    if (notification.autoClose !== false) {
      setTimeout(() => {
        browserNotification.close();
      }, notification.duration || 5000);
    }
  }, [preferences.browserNotifications, preferences.doNotDisturb, preferences.criticalAlertsOnly]);

  const playNotificationSound = useCallback((severity: string) => {
    if (!preferences.soundEnabled) return;
    if (preferences.doNotDisturb && isQuietHours()) return;

    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    const frequencies = {
      critical: [800, 600, 800],
      high: [600, 400],
      medium: [400],
      low: [300]
    };

    const pattern = frequencies[severity as keyof typeof frequencies] || frequencies.medium;
    
    let time = audioContext.currentTime;
    pattern.forEach((freq) => {
      oscillator.frequency.setValueAtTime(freq, time);
      gainNode.gain.setValueAtTime(0.1, time);
      gainNode.gain.exponentialRampToValueAtTime(0.01, time + 0.2);
      time += 0.3;
    });

    oscillator.start(audioContext.currentTime);
    oscillator.stop(time);
  }, [preferences.soundEnabled, preferences.doNotDisturb]);

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
      return currentTime >= startTime || currentTime <= endTime;
    }
  }, [preferences.quietHours]);

  const showToast = useCallback((notificationData: Omit<Notification, 'id' | 'created_at' | 'read' | 'metadata'>) => {
    const notification: Notification = {
      ...notificationData,
      id: `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      created_at: new Date().toISOString(),
      read: false,
      metadata: {},
      autoClose: notificationData.autoClose !== false,
      duration: notificationData.duration || 5000
    };

    setToastNotifications(prev => [notification, ...prev.slice(0, 2)]); // Keep max 3 toasts

    // Auto-remove toast notifications
    if (notification.autoClose) {
      setTimeout(() => {
        setToastNotifications(prev => prev.filter(n => n.id !== notification.id));
      }, notification.duration);
    }

    // Show browser notification
    showBrowserNotification(notification);

    // Play sound
    if (notification.severity && preferences.soundEnabled) {
      playNotificationSound(notification.severity);
    }
  }, [showBrowserNotification, preferences.soundEnabled]);

  const markAsRead = useCallback(async (id: string) => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${API_BASE_URL}/notifications/${id}/read`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        setNotifications(prev => 
          prev.map(n => n.id === id ? { ...n, read: true, read_at: new Date().toISOString() } : n)
        );
        setStats(prev => ({ ...prev, unread_count: Math.max(0, prev.unread_count - 1) }));
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${API_BASE_URL}/notifications/mark-all-read`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, read: true, read_at: new Date().toISOString() })));
        setStats(prev => ({ ...prev, unread_count: 0 }));
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  }, []);

  const removeNotification = useCallback(async (id: string) => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${API_BASE_URL}/notifications/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const deletedNotification = notifications.find(n => n.id === id);
        setNotifications(prev => prev.filter(n => n.id !== id));
        setToastNotifications(prev => prev.filter(n => n.id !== id));
        
        if (deletedNotification) {
          setStats(prev => ({
            ...prev,
            total_count: prev.total_count - 1,
            unread_count: !deletedNotification.read ? prev.unread_count - 1 : prev.unread_count
          }));
        }
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  }, [notifications]);

  const clearAll = useCallback(async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${API_BASE_URL}/notifications/clear-all`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        setNotifications([]);
        setToastNotifications([]);
        setStats({
          total_count: 0,
          unread_count: 0,
          incidents_count: 0,
          alerts_count: 0,
          system_count: 0
        });
      }
    } catch (error) {
      console.error('Error clearing all notifications:', error);
    }
  }, []);

  const updatePreferences = useCallback((newPreferences: Partial<NotificationPreferences>) => {
    setPreferences(prev => ({ ...prev, ...newPreferences }));
  }, []);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!('Notification' in window)) {
      console.warn('This browser does not support desktop notification');
      return false;
    }

    if (Notification.permission === 'granted') {
      updatePreferences({ browserNotifications: true });
      return true;
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      const granted = permission === 'granted';
      updatePreferences({ browserNotifications: granted });
      return granted;
    }

    return false;
  }, [updatePreferences]);

  const value: NotificationContextType = {
    // State
    notifications,
    toastNotifications,
    stats,
    preferences,
    isConnected,
    isLoading,

    // Actions
    showToast,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAll,
    refreshNotifications,
    updatePreferences,
    requestPermission,

    // Computed
    unreadCount: stats.unread_count
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