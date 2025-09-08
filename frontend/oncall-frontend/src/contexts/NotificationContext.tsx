// frontend/src/contexts/NotificationContext.tsx - Fixed with proper interface for all required properties
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1';

interface Notification {
  id: string;
  type: 'incident' | 'alert' | 'system' | 'success' | 'warning' | 'error' | 'info'; // Added 'info' type
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

  // Initialize WebSocket connection
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) return;

    // Note: WebSocket URL would be ws:// in development, wss:// in production
    const wsUrl = `ws://localhost:8000/api/v1/ws/notifications?token=${token}`;
    
    let ws: WebSocket;
    try {
      ws = new WebSocket(wsUrl);

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
              metadata: data.notification.metadata || {},
              autoClose: data.notification.severity !== 'critical',
              duration: data.notification.severity === 'critical' ? 0 : 5000
            };
            
            // Add to notifications list
            setNotifications(prev => [notification, ...prev]);
            
            // Show as toast
            setToastNotifications(prev => [...prev, notification]);
            
            // Update stats
            setStats(prev => ({
              ...prev,
              total_count: prev.total_count + 1,
              unread_count: prev.unread_count + 1
            }));
            
            // Show browser notification if enabled
            if (preferences.browserNotifications && 'Notification' in window && Notification.permission === 'granted') {
              new Notification(notification.title, {
                body: notification.message,
                icon: '/favicon.ico'
              });
            }
          }
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
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
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
    }

    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, [preferences.browserNotifications]);

  // Load initial notifications
  useEffect(() => {
    refreshNotifications();
  }, []);

  const refreshNotifications = useCallback(async () => {
    const token = localStorage.getItem('access_token');
    if (!token) return;

    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/notifications`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications || []);
        setStats(data.stats || stats);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setIsLoading(false);
    }
  }, [stats]);

  const showToast = useCallback((notificationData: Omit<Notification, 'id' | 'created_at' | 'read' | 'metadata'>) => {
    const notification: Notification = {
      id: `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      created_at: new Date().toISOString(),
      read: false,
      metadata: {},
      autoClose: notificationData.autoClose !== false,
      duration: notificationData.duration || 5000,
      ...notificationData
    };

    setToastNotifications(prev => [...prev, notification]);

    // Auto remove toast
    if (notification.autoClose) {
      setTimeout(() => {
        setToastNotifications(prev => prev.filter(t => t.id !== notification.id));
      }, notification.duration);
    }
  }, []);

  const markAsRead = useCallback(async (id: string) => {
    const token = localStorage.getItem('access_token');
    if (!token) return;

    try {
      const response = await fetch(`${API_BASE_URL}/notifications/${id}/read`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        setNotifications(prev => 
          prev.map(n => n.id === id ? { ...n, read: true, read_at: new Date().toISOString() } : n)
        );
        setStats(prev => ({
          ...prev,
          unread_count: Math.max(0, prev.unread_count - 1)
        }));
      }
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    const token = localStorage.getItem('access_token');
    if (!token) return;

    try {
      const response = await fetch(`${API_BASE_URL}/notifications/read-all`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const readAt = new Date().toISOString();
        setNotifications(prev => 
          prev.map(n => ({ ...n, read: true, read_at: readAt }))
        );
        setStats(prev => ({
          ...prev,
          unread_count: 0
        }));
      }
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  }, []);

  const removeNotification = useCallback(async (id: string) => {
    const token = localStorage.getItem('access_token');
    if (!token) return;

    try {
      const response = await fetch(`${API_BASE_URL}/notifications/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        setNotifications(prev => prev.filter(n => n.id !== id));
        setToastNotifications(prev => prev.filter(n => n.id !== id));
        setStats(prev => {
          const notification = notifications.find(n => n.id === id);
          return {
            ...prev,
            total_count: Math.max(0, prev.total_count - 1),
            unread_count: notification && !notification.read ? Math.max(0, prev.unread_count - 1) : prev.unread_count
          };
        });
      }
    } catch (error) {
      console.error('Failed to remove notification:', error);
    }
  }, [notifications]);

  const clearAll = useCallback(async () => {
    const token = localStorage.getItem('access_token');
    if (!token) return;

    try {
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
      console.error('Failed to clear all notifications:', error);
    }
  }, []);

  const updatePreferences = useCallback((newPreferences: Partial<NotificationPreferences>) => {
    setPreferences(prev => {
      const updated = { ...prev, ...newPreferences };
      localStorage.setItem('notification_preferences', JSON.stringify(updated));
      return updated;
    });
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