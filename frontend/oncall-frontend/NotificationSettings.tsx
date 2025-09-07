// frontend/src/components/NotificationSettings.tsx - Fixed React Hooks issue
import React, { useState } from 'react';
import { 
  BellIcon,
  SpeakerWaveIcon,
  EnvelopeIcon,
  ChatBubbleLeftRightIcon,
  MoonIcon,
  ClockIcon,
  ShieldCheckIcon,
  DevicePhoneMobileIcon,
  CheckIcon
} from '@heroicons/react/24/outline';
import { useNotifications } from '../contexts/NotificationContext';

const NotificationSettings: React.FC = () => {
  const { preferences, updatePreferences, requestPermission, showToast } = useNotifications(); // FIXED: Moved hook to component level
  const [permissionStatus, setPermissionStatus] = useState<string>(
    typeof Notification !== 'undefined' ? Notification.permission : 'unsupported'
  );
  const [isTestingSound, setIsTestingSound] = useState(false);

  const handlePermissionRequest = async () => {
    const granted = await requestPermission();
    setPermissionStatus(granted ? 'granted' : 'denied');
  };

  const testNotificationSound = () => {
    setIsTestingSound(true);
    setTimeout(() => setIsTestingSound(false), 300);
  };

  // FIXED: Moved test notification handler to component level
  const handleTestNotification = () => {
    showToast({
      type: 'system',
      title: 'Test Notification',
      message: 'Your notification settings are working perfectly!',
      autoClose: true,
      duration: 4000
    });
  };

  const ToggleSwitch: React.FC<{ 
    enabled: boolean; 
    onChange: (enabled: boolean) => void;
    disabled?: boolean;
  }> = ({ enabled, onChange, disabled = false }) => (
    <button
      onClick={() => !disabled && onChange(!enabled)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900 ${
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      } ${
        enabled ? 'bg-blue-600' : 'bg-gray-600'
      }`}
      disabled={disabled}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          enabled ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">Notification Settings</h1>
          <p className="text-gray-400 mt-1">Manage how you receive notifications and alerts</p>
        </div>

        {/* Settings */}
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-8">
          
          {/* Browser Notifications */}
          <div className="flex items-center justify-between py-4 border-b border-white/10">
            <div className="flex items-center space-x-3">
              <BellIcon className="w-5 h-5 text-blue-400" />
              <div>
                <h3 className="text-white font-medium">Browser Notifications</h3>
                <p className="text-gray-400 text-sm">Get desktop notifications for important alerts</p>
              </div>
            </div>
            <ToggleSwitch
              enabled={preferences.browserNotifications}
              onChange={(enabled) => updatePreferences({ browserNotifications: enabled })}
            />
          </div>

          {/* Sound Notifications */}
          <div className="flex items-center justify-between py-4 border-b border-white/10">
            <div className="flex items-center space-x-3">
              <SpeakerWaveIcon className="w-5 h-5 text-green-400" />
              <div>
                <h3 className="text-white font-medium">Sound Alerts</h3>
                <p className="text-gray-400 text-sm">Play sounds for critical incidents</p>
              </div>
            </div>
            <ToggleSwitch
              enabled={preferences.soundEnabled}
              onChange={(enabled) => updatePreferences({ soundEnabled: enabled })}
            />
          </div>

          {/* Test Section */}
          <div className="py-6 border-b border-white/10">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-white font-medium mb-2">Test Notifications</h3>
                <p className="text-gray-400 text-sm">Send a test notification to verify your settings</p>
              </div>
              <button
                onClick={handleTestNotification} // FIXED: Using component-level handler
                className="px-4 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors"
              >
                Send Test Notification
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationSettings;
