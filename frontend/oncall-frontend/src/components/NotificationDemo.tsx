// frontend/oncall-frontend/src/components/NotificationDemo.tsx
// Add this to your SettingsPage or create a new demo page
import React from 'react';
import { useNotifications, Notification } from '../contexts/NotificationContext';
import { 
  FireIcon, 
  ExclamationTriangleIcon, 
  ExclamationCircleIcon, 
  InformationCircleIcon,
  CheckCircleIcon,
  BellIcon
} from '@heroicons/react/24/outline';

const NotificationDemo: React.FC = () => {
  const { showToast, isConnected } = useNotifications();

  const demoNotifications: Omit<Notification, 'id' | 'timestamp' | 'read'>[] = [
    {
      type: 'incident',
      severity: 'critical',
      title: 'Critical: Database Server Down',
      message: 'Primary database server is unresponsive. All write operations are failing.',
      actionUrl: '/incidents/demo-critical',
      incidentId: 'demo-critical'
    },
    {
      type: 'incident',
      severity: 'high',
      title: 'High: API Response Time Degraded',
      message: 'Average API response time has increased to 3.2 seconds (normal: 150ms).',
      actionUrl: '/incidents/demo-high',
      incidentId: 'demo-high'
    },
    {
      type: 'incident',
      severity: 'medium',
      title: 'Medium: Disk Usage at 85%',
      message: 'Server disk usage is approaching capacity. Consider cleanup or scaling.',
      actionUrl: '/incidents/demo-medium',
      incidentId: 'demo-medium'
    },
    {
      type: 'incident',
      severity: 'low',
      title: 'Low: SSL Certificate Expiry Warning',
      message: 'SSL certificate for api.example.com expires in 15 days.',
      actionUrl: '/incidents/demo-low',
      incidentId: 'demo-low'
    },
    {
      type: 'success',
      title: 'Incident Resolved',
      message: 'Payment processing issue has been successfully resolved.',
      autoClose: true,
      duration: 4000
    },
    {
      type: 'alert',
      severity: 'high',
      title: 'New Alert from Datadog',
      message: 'Memory usage on web-server-01 exceeded 90% threshold.',
      actionUrl: '/alerts/demo-alert'
    },
    {
      type: 'system',
      title: 'System Maintenance Scheduled',
      message: 'Scheduled maintenance window: Tonight 2:00 AM - 4:00 AM EST.',
      autoClose: true,
      duration: 6000
    },
    {
      type: 'warning',
      title: 'Integration Health Check Failed',
      message: 'Slack integration health check failed. Notifications may be delayed.',
      autoClose: true,
      duration: 5000
    }
  ];

  const sendTestNotification = (notification: any) => {
    showToast(notification);
  };

  const sendRandomNotification = () => {
    const randomNotification = demoNotifications[Math.floor(Math.random() * demoNotifications.length)];
    showToast(randomNotification);
  };

  const sendCriticalSequence = async () => {
    // Simulate a real incident scenario
    showToast({
      type: 'alert',
      severity: 'critical',
      title: 'ALERT: High Error Rate Detected',
      message: 'Error rate spiked to 25% in the last 5 minutes.',
      autoClose: false
    });

    setTimeout(() => {
      showToast({
        type: 'incident',
        severity: 'critical', 
        title: 'INCIDENT: Service Degradation',
        message: 'Auto-created incident from critical alert. Immediate response required.',
        actionUrl: '/incidents/auto-generated',
        incidentId: 'auto-generated',
        autoClose: false
      });
    }, 2000);

    setTimeout(() => {
      showToast({
        type: 'system',
        title: 'On-call Engineer Notified',
        message: 'Sarah Chen has been paged for immediate response.',
        autoClose: true,
        duration: 4000
      });
    }, 4000);
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white mb-2">🔔 Notification System Demo</h2>
        <p className="text-gray-400">Test the real-time notification system with various alert types and severities.</p>
        
        {/* Connection Status */}
        <div className="mt-4 flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`}></div>
          <span className="text-sm text-gray-300">
            WebSocket: {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <button
          onClick={sendRandomNotification}
          className="glass-card p-4 rounded-xl hover:scale-105 transition-transform duration-200 text-center"
        >
          <BellIcon className="w-8 h-8 text-blue-400 mx-auto mb-2" />
          <h3 className="text-lg font-semibold text-white mb-1">Random Notification</h3>
          <p className="text-gray-400 text-sm">Send a random test notification</p>
        </button>

        <button
          onClick={sendCriticalSequence}
          className="glass-card p-4 rounded-xl hover:scale-105 transition-transform duration-200 text-center border border-red-500/30"
        >
          <FireIcon className="w-8 h-8 text-red-400 mx-auto mb-2" />
          <h3 className="text-lg font-semibold text-white mb-1">Critical Sequence</h3>
          <p className="text-gray-400 text-sm">Simulate a real incident flow</p>
        </button>

        <button
          onClick={() => showToast({
            type: 'success',
            title: 'Test Successful! ✅',
            message: 'Your notification system is working perfectly.',
            autoClose: true,
            duration: 3000
          })}
          className="glass-card p-4 rounded-xl hover:scale-105 transition-transform duration-200 text-center border border-green-500/30"
        >
          <CheckCircleIcon className="w-8 h-8 text-green-400 mx-auto mb-2" />
          <h3 className="text-lg font-semibold text-white mb-1">Success Test</h3>
          <p className="text-gray-400 text-sm">Send a success notification</p>
        </button>
      </div>

      {/* Individual Notification Tests */}
      <div className="space-y-6">
        <h3 className="text-xl font-semibold text-white mb-4">Individual Notification Types</h3>
        
        <div className="grid gap-4">
          {demoNotifications.map((notification, index) => {
            const getIcon = () => {
              if (notification.type === 'incident' || notification.type === 'alert') {
                switch (notification.severity) {
                  case 'critical': return <FireIcon className="w-5 h-5 text-red-400" />;
                  case 'high': return <ExclamationTriangleIcon className="w-5 h-5 text-orange-400" />;
                  case 'medium': return <ExclamationCircleIcon className="w-5 h-5 text-yellow-400" />;
                  case 'low': return <InformationCircleIcon className="w-5 h-5 text-blue-400" />;
                  default: return <BellIcon className="w-5 h-5 text-blue-400" />;
                }
              }
              switch (notification.type) {
                case 'success': return <CheckCircleIcon className="w-5 h-5 text-green-400" />;
                case 'warning': return <ExclamationTriangleIcon className="w-5 h-5 text-yellow-400" />;
                case 'error': return <ExclamationCircleIcon className="w-5 h-5 text-red-400" />;
                default: return <InformationCircleIcon className="w-5 h-5 text-blue-400" />;
              }
            };

            const getBadgeColor = () => {
              if (notification.type === 'incident' || notification.type === 'alert') {
                switch (notification.severity) {
                  case 'critical': return 'bg-red-500/20 text-red-300 border-red-500/30';
                  case 'high': return 'bg-orange-500/20 text-orange-300 border-orange-500/30';
                  case 'medium': return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
                  case 'low': return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
                  default: return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
                }
              }
              switch (notification.type) {
                case 'success': return 'bg-green-500/20 text-green-300 border-green-500/30';
                case 'warning': return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
                case 'error': return 'bg-red-500/20 text-red-300 border-red-500/30';
                default: return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
              }
            };

            return (
              <div 
                key={index}
                className="glass-card p-4 rounded-xl hover:bg-white/10 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {getIcon()}
                    <div className="flex-1">
                      <h4 className="text-white font-medium">{notification.title}</h4>
                      <p className="text-gray-400 text-sm mt-1">{notification.message}</p>
                      <div className="flex items-center space-x-2 mt-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getBadgeColor()}`}>
                          {notification.type.toUpperCase()}
                        </span>
                        {notification.severity && (
                          <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getBadgeColor()}`}>
                            {notification.severity.toUpperCase()}
                          </span>
                        )}
                        {notification.autoClose !== false && (
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-500/20 text-purple-300 border border-purple-500/30">
                            AUTO-CLOSE
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => sendTestNotification(notification)}
                    className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    Send
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Usage Instructions */}
      <div className="mt-8 glass-card p-6 rounded-xl border border-blue-500/30">
        <h3 className="text-lg font-semibold text-white mb-3">💡 How to Use</h3>
        <div className="space-y-2 text-sm text-gray-300">
          <p>• <strong>Toast Notifications:</strong> Appear in the top-right corner with auto-dismiss</p>
          <p>• <strong>Critical Incidents:</strong> Show action buttons and don't auto-dismiss</p>
          <p>• <strong>Browser Notifications:</strong> Require permission (click bell icon in header)</p>
          <p>• <strong>Sound Alerts:</strong> Different tones for different severity levels</p>
          <p>• <strong>Notification Center:</strong> Click the bell icon to see all notifications</p>
          <p>• <strong>Real-time Updates:</strong> Connect via WebSocket for live incident updates</p>
        </div>
      </div>

      {/* Developer Info */}
      <div className="mt-6 glass-card p-6 rounded-xl border border-green-500/30 bg-green-500/5">
        <h3 className="text-lg font-semibold text-white mb-3">🔧 Developer Information</h3>
        <div className="space-y-2 text-sm text-gray-300">
          <p>• <strong>WebSocket URL:</strong> ws://localhost:8000/api/v1/ws/notifications</p>
          <p>• <strong>Auth Required:</strong> JWT token as query parameter</p>
          <p>• <strong>Backend Testing:</strong> POST /api/v1/ws/test-notification</p>
          <p>• <strong>Connection Stats:</strong> GET /api/v1/ws/stats</p>
          <p>• <strong>Local Storage:</strong> Notification preferences saved in browser</p>
        </div>
      </div>
    </div>
  );
};

export default NotificationDemo;