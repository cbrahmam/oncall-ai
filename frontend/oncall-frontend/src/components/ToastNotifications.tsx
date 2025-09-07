// frontend/oncall-frontend/src/components/ToastNotifications.tsx
import React from 'react';
import { 
  XMarkIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ExclamationCircleIcon,
  InformationCircleIcon,
  FireIcon,
  BellIcon
} from '@heroicons/react/24/outline';
import { useNotifications } from '../contexts/NotificationContext';

const ToastNotifications: React.FC = () => {
  const { notifications, removeNotification, markAsRead } = useNotifications();

  // Only show unread notifications as toasts
  const toastNotifications = notifications.filter(n => !n.read && n.autoClose !== false);

  const getIcon = (type: string, severity?: string) => {
    if (type === 'incident' || type === 'alert') {
      switch (severity) {
        case 'critical':
          return <FireIcon className="w-6 h-6 text-red-400" />;
        case 'high':
          return <ExclamationTriangleIcon className="w-6 h-6 text-orange-400" />;
        case 'medium':
          return <ExclamationCircleIcon className="w-6 h-6 text-yellow-400" />;
        case 'low':
          return <InformationCircleIcon className="w-6 h-6 text-blue-400" />;
        default:
          return <BellIcon className="w-6 h-6 text-blue-400" />;
      }
    }

    switch (type) {
      case 'success':
        return <CheckCircleIcon className="w-6 h-6 text-green-400" />;
      case 'warning':
        return <ExclamationTriangleIcon className="w-6 h-6 text-yellow-400" />;
      case 'error':
        return <ExclamationCircleIcon className="w-6 h-6 text-red-400" />;
      default:
        return <InformationCircleIcon className="w-6 h-6 text-blue-400" />;
    }
  };

  const getToastStyle = (type: string, severity?: string) => {
    const baseStyle = "glass-card border-l-4 shadow-xl";
    
    if (type === 'incident' || type === 'alert') {
      switch (severity) {
        case 'critical':
          return `${baseStyle} border-l-red-500 bg-red-500/10`;
        case 'high':
          return `${baseStyle} border-l-orange-500 bg-orange-500/10`;
        case 'medium':
          return `${baseStyle} border-l-yellow-500 bg-yellow-500/10`;
        case 'low':
          return `${baseStyle} border-l-blue-500 bg-blue-500/10`;
        default:
          return `${baseStyle} border-l-blue-500 bg-blue-500/10`;
      }
    }

    switch (type) {
      case 'success':
        return `${baseStyle} border-l-green-500 bg-green-500/10`;
      case 'warning':
        return `${baseStyle} border-l-yellow-500 bg-yellow-500/10`;
      case 'error':
        return `${baseStyle} border-l-red-500 bg-red-500/10`;
      default:
        return `${baseStyle} border-l-blue-500 bg-blue-500/10`;
    }
  };

  const handleToastClick = (notification: any) => {
    markAsRead(notification.id);
    if (notification.action_url) {
      window.location.href = notification.action_url;
    }
  };

  const handleDismiss = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    removeNotification(id);
  };

  if (toastNotifications.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 space-y-3 max-w-sm w-full">
      {toastNotifications.slice(0, 5).map((notification) => (
        <div
          key={notification.id}
          className={`${getToastStyle(notification.type, notification.severity)} p-4 rounded-xl cursor-pointer transform transition-all duration-300 ease-out animate-slide-in-right hover:scale-105`}
          onClick={() => handleToastClick(notification)}
        >
          <div className="flex items-start space-x-3">
            {/* Icon */}
            <div className="flex-shrink-0 mt-0.5">
              {getIcon(notification.type, notification.severity)}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm font-semibold text-white truncate">
                    {notification.title}
                  </p>
                  <p className="mt-1 text-sm text-gray-300 line-clamp-2">
                    {notification.message}
                  </p>
                  
                  {/* Timestamp */}
                  <p className="mt-2 text-xs text-gray-400">
                    {new Date(notification.created_at).toLocaleTimeString()}
                  </p>
                </div>

                {/* Close button */}
                <button
                  onClick={(e) => handleDismiss(notification.id, e)}
                  className="ml-3 flex-shrink-0 text-gray-400 hover:text-white transition-colors duration-200"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>

              {/* Progress bar for auto-dismiss */}
              {notification.autoClose && notification.duration && (
                <div className="mt-3 w-full bg-white/10 rounded-full h-1 overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-blue-400 to-purple-400 rounded-full animate-progress"
                    style={{ 
                      animationDuration: `${notification.duration}ms`,
                      animationTimingFunction: 'linear'
                    }}
                  ></div>
                </div>
              )}

              {/* Action buttons for critical incidents */}
              {notification.severity === 'critical' && notification.type === 'incident' && (
                <div className="mt-3 flex space-x-2">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      // TODO: Add acknowledge functionality
                      console.log('Acknowledging incident:', notification.incident_id);
                    }}
                    className="px-3 py-1 bg-yellow-500/20 text-yellow-300 rounded-lg text-xs font-medium hover:bg-yellow-500/30 transition-colors"
                  >
                    Acknowledge
                  </button>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      if (notification.action_url) {
                        window.location.href = notification.action_url;
                      }
                    }}
                    className="px-3 py-1 bg-blue-500/20 text-blue-300 rounded-lg text-xs font-medium hover:bg-blue-500/30 transition-colors"
                  >
                    View Details
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}

      {/* Show indicator if there are more notifications */}
      {toastNotifications.length > 5 && (
        <div className="glass-card p-3 rounded-xl text-center">
          <p className="text-sm text-gray-300">
            +{toastNotifications.length - 5} more notifications
          </p>
        </div>
      )}
    </div>
  );
};

export default ToastNotifications;