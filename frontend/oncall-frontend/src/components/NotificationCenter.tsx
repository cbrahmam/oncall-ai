// frontend/oncall-frontend/src/components/NotificationCenter.tsx
import React, { useState } from 'react';
import { 
  BellIcon,
  XMarkIcon,
  CheckIcon,
  TrashIcon,
  Cog6ToothIcon,
  FireIcon,
  ExclamationTriangleIcon,
  ExclamationCircleIcon,
  InformationCircleIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import { useNotifications } from '../contexts/NotificationContext';

type NotificationFilter = 'all' | 'unread' | 'incidents' | 'alerts';

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
}

const NotificationCenter: React.FC<NotificationCenterProps> = ({ isOpen, onClose }) => {
  const { 
    notifications, 
    unreadCount, 
    markAsRead, 
    markAllAsRead, 
    removeNotification, 
    clearAll,
    isConnected 
  } = useNotifications();
  
  const [filter, setFilter] = useState<NotificationFilter>('all');

  if (!isOpen) return null;

  const filteredNotifications = notifications.filter(notification => {
    switch (filter) {
      case 'unread':
        return !notification.read;
      case 'incidents':
        return notification.type === 'incident';
      case 'alerts':
        return notification.type === 'alert';
      default:
        return true;
    }
  });

  const getIcon = (type: string, severity?: string) => {
    if (type === 'incident' || type === 'alert') {
      switch (severity) {
        case 'critical':
          return <FireIcon className="w-5 h-5 text-red-400" />;
        case 'high':
          return <ExclamationTriangleIcon className="w-5 h-5 text-orange-400" />;
        case 'medium':
          return <ExclamationCircleIcon className="w-5 h-5 text-yellow-400" />;
        case 'low':
          return <InformationCircleIcon className="w-5 h-5 text-blue-400" />;
        default:
          return <BellIcon className="w-5 h-5 text-blue-400" />;
      }
    }

    switch (type) {
      case 'success':
        return <CheckCircleIcon className="w-5 h-5 text-green-400" />;
      case 'warning':
        return <ExclamationTriangleIcon className="w-5 h-5 text-yellow-400" />;
      case 'error':
        return <ExclamationCircleIcon className="w-5 h-5 text-red-400" />;
      default:
        return <InformationCircleIcon className="w-5 h-5 text-blue-400" />;
    }
  };

  const formatTimestamp = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 h-full w-96 bg-slate-900/95 backdrop-blur-xl border-l border-white/10 z-50 flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <BellIcon className="w-6 h-6 text-blue-400" />
              <h2 className="text-xl font-semibold text-white">Notifications</h2>
              {unreadCount > 0 && (
                <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                  {unreadCount}
                </span>
              )}
            </div>
            <div className="flex items-center space-x-2">
              {/* Connection status */}
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`} title={isConnected ? 'Connected' : 'Disconnected'} />
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Filter buttons */}
          <div className="mt-4 flex space-x-2">
            {[
              { key: 'all', label: 'All' },
              { key: 'unread', label: 'Unread' },
              { key: 'incidents', label: 'Incidents' },
              { key: 'alerts', label: 'Alerts' }
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFilter(key as NotificationFilter)}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                  filter === key
                    ? 'bg-blue-500 text-white'
                    : 'bg-white/10 text-gray-300 hover:bg-white/20'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Action buttons */}
          {notifications.length > 0 && (
            <div className="mt-4 flex space-x-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="flex items-center space-x-1 px-3 py-1 bg-green-500/20 text-green-300 rounded-lg text-sm font-medium hover:bg-green-500/30 transition-colors"
                >
                  <CheckIcon className="w-4 h-4" />
                  <span>Mark all read</span>
                </button>
              )}
              <button
                onClick={clearAll}
                className="flex items-center space-x-1 px-3 py-1 bg-red-500/20 text-red-300 rounded-lg text-sm font-medium hover:bg-red-500/30 transition-colors"
              >
                <TrashIcon className="w-4 h-4" />
                <span>Clear all</span>
              </button>
            </div>
          )}
        </div>

        {/* Notifications list */}
        <div className="flex-1 overflow-y-auto notification-scroll">
          {filteredNotifications.length === 0 ? (
            <div className="p-8 text-center">
              <BellIcon className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-400 mb-2">No notifications</h3>
              <p className="text-gray-500 text-sm">
                {filter === 'unread' 
                  ? "You're all caught up!"
                  : "Notifications will appear here when events occur."
                }
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {filteredNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer ${
                    !notification.read ? 'bg-blue-500/5 border-l-4 border-l-blue-500' : ''
                  }`}
                  onClick={() => {
                    markAsRead(notification.id);
                    if (notification.actionUrl) {
                      window.location.href = notification.actionUrl;
                    }
                  }}
                >
                  <div className="flex items-start space-x-3">
                    {/* Icon */}
                    <div className="flex-shrink-0 mt-1">
                      {getIcon(notification.type, notification.severity)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className={`text-sm font-medium ${!notification.read ? 'text-white' : 'text-gray-300'}`}>
                            {notification.title}
                          </p>
                          <p className="mt-1 text-sm text-gray-400 line-clamp-2">
                            {notification.message}
                          </p>
                          <p className="mt-2 text-xs text-gray-500">
                            {formatTimestamp(notification.timestamp)}
                          </p>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center space-x-1 ml-2">
                          {!notification.read && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                markAsRead(notification.id);
                              }}
                              className="p-1 text-gray-400 hover:text-blue-400 transition-colors"
                              title="Mark as read"
                            >
                              <CheckIcon className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              removeNotification(notification.id);
                            }}
                            className="p-1 text-gray-400 hover:text-red-400 transition-colors"
                            title="Remove"
                          >
                            <XMarkIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Severity badge for incidents */}
                      {(notification.type === 'incident' || notification.type === 'alert') && notification.severity && (
                        <div className="mt-2">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            notification.severity === 'critical' ? 'bg-red-500/20 text-red-300' :
                            notification.severity === 'high' ? 'bg-orange-500/20 text-orange-300' :
                            notification.severity === 'medium' ? 'bg-yellow-500/20 text-yellow-300' :
                            'bg-blue-500/20 text-blue-300'
                          }`}>
                            {notification.severity.toUpperCase()}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer with settings */}
        <div className="p-4 border-t border-white/10">
          <button 
            onClick={() => {
              // TODO: Open notification settings
              console.log('Opening notification settings');
            }}
            className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-gray-300 hover:text-white transition-colors"
          >
            <Cog6ToothIcon className="w-4 h-4" />
            <span className="text-sm font-medium">Notification Settings</span>
          </button>
        </div>
      </div>
    </>
  );
};

export default NotificationCenter;