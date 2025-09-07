// frontend/src/components/CleanNotificationSettings.tsx - SIMPLIFIED & MODERN
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
  const { preferences, updatePreferences, requestPermission } = useNotifications();
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
    
    // Play test sound
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.setValueAtTime(600, audioContext.currentTime);
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);

    setTimeout(() => setIsTestingSound(false), 300);
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

  const SettingRow: React.FC<{
    icon: React.ReactNode;
    title: string;
    description: string;
    enabled: boolean;
    onChange: (enabled: boolean) => void;
    disabled?: boolean;
    children?: React.ReactNode;
  }> = ({ icon, title, description, enabled, onChange, disabled, children }) => (
    <div className="bg-gray-800/30 border border-gray-700/50 rounded-xl p-4 hover:bg-gray-800/50 transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="p-2 bg-gray-700/50 rounded-lg">
            {icon}
          </div>
          <div>
            <h3 className="text-white font-medium">{title}</h3>
            <p className="text-gray-400 text-sm">{description}</p>
          </div>
        </div>
        <ToggleSwitch enabled={enabled} onChange={onChange} disabled={disabled} />
      </div>
      {children && <div className="mt-4 pl-14">{children}</div>}
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-white mb-2">Notification Settings</h2>
        <p className="text-gray-400">Customize how you receive alerts and updates from OffCall AI</p>
      </div>

      {/* Browser Notifications */}
      <div className="space-y-4">
        <h3 className="text-xl font-semibold text-white mb-4">Browser & Desktop</h3>
        
        <SettingRow
          icon={<DevicePhoneMobileIcon className="w-5 h-5 text-blue-400" />}
          title="Browser Notifications"
          description="Get instant notifications in your browser and desktop"
          enabled={preferences.browserNotifications && permissionStatus === 'granted'}
          onChange={(enabled) => {
            if (enabled && permissionStatus !== 'granted') {
              handlePermissionRequest();
            } else {
              updatePreferences({ browserNotifications: enabled });
            }
          }}
        >
          {permissionStatus === 'denied' && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
              <p className="text-sm text-red-300">
                Browser notifications are blocked. Please enable them in your browser settings and refresh the page.
              </p>
            </div>
          )}

          {permissionStatus === 'default' && (
            <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
              <p className="text-sm text-yellow-300 mb-2">
                Enable browser notifications to receive real-time alerts for critical incidents.
              </p>
              <button
                onClick={handlePermissionRequest}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors"
              >
                Enable Notifications
              </button>
            </div>
          )}

          {permissionStatus === 'granted' && preferences.browserNotifications && (
            <div className="flex items-center space-x-2 text-green-300 text-sm">
              <CheckIcon className="w-4 h-4" />
              <span>Browser notifications are enabled</span>
            </div>
          )}
        </SettingRow>

        <SettingRow
          icon={<SpeakerWaveIcon className="w-5 h-5 text-green-400" />}
          title="Notification Sounds"
          description="Play audio alerts for different types of notifications"
          enabled={preferences.soundEnabled}
          onChange={(enabled) => updatePreferences({ soundEnabled: enabled })}
        >
          <button
            onClick={testNotificationSound}
            disabled={!preferences.soundEnabled || isTestingSound}
            className="px-4 py-2 bg-green-500/20 text-green-300 rounded-lg text-sm font-medium hover:bg-green-500/30 transition-colors disabled:opacity-50"
          >
            {isTestingSound ? 'Playing...' : 'Test Sound'}
          </button>
        </SettingRow>
      </div>

      {/* External Integrations */}
      <div className="space-y-4">
        <h3 className="text-xl font-semibold text-white mb-4">External Notifications</h3>
        
        <SettingRow
          icon={<EnvelopeIcon className="w-5 h-5 text-blue-400" />}
          title="Email Notifications"
          description="Receive incident alerts and updates via email"
          enabled={preferences.emailNotifications}
          onChange={(enabled) => updatePreferences({ emailNotifications: enabled })}
        />

        <SettingRow
          icon={<ChatBubbleLeftRightIcon className="w-5 h-5 text-green-400" />}
          title="Slack Notifications"
          description="Send alerts to your Slack channels and DMs"
          enabled={preferences.slackNotifications}
          onChange={(enabled) => updatePreferences({ slackNotifications: enabled })}
        />
      </div>

      {/* Filtering & Priority */}
      <div className="space-y-4">
        <h3 className="text-xl font-semibold text-white mb-4">Filtering & Priority</h3>
        
        <SettingRow
          icon={<BellIcon className="w-5 h-5 text-red-400" />}
          title="Critical Incidents Only"
          description="Only receive notifications for critical severity incidents"
          enabled={preferences.criticalAlertsOnly}
          onChange={(enabled) => updatePreferences({ criticalAlertsOnly: enabled })}
        />

        <SettingRow
          icon={<MoonIcon className="w-5 h-5 text-purple-400" />}
          title="Do Not Disturb"
          description="Silence all non-critical notifications"
          enabled={preferences.doNotDisturb}
          onChange={(enabled) => updatePreferences({ doNotDisturb: enabled })}
        />
      </div>

      {/* Quiet Hours */}
      <div className="space-y-4">
        <h3 className="text-xl font-semibold text-white mb-4">Quiet Hours</h3>
        
        <SettingRow
          icon={<ClockIcon className="w-5 h-5 text-indigo-400" />}
          title="Scheduled Quiet Hours"
          description="Automatically enable DND during specified times"
          enabled={preferences.quietHours.enabled}
          onChange={(enabled) => updatePreferences({ 
            quietHours: { ...preferences.quietHours, enabled }
          })}
        >
          {preferences.quietHours.enabled && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Start Time</label>
                <input
                  type="time"
                  value={preferences.quietHours.start}
                  onChange={(e) => updatePreferences({
                    quietHours: { ...preferences.quietHours, start: e.target.value }
                  })}
                  className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">End Time</label>
                <input
                  type="time"
                  value={preferences.quietHours.end}
                  onChange={(e) => updatePreferences({
                    quietHours: { ...preferences.quietHours, end: e.target.value }
                  })}
                  className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                />
              </div>
            </div>
          )}
        </SettingRow>
      </div>

      {/* Security Notice */}
      <div className="bg-gray-800/30 border border-green-500/30 rounded-xl p-6">
        <div className="flex items-start space-x-4">
          <div className="p-2 bg-green-500/20 rounded-lg">
            <ShieldCheckIcon className="w-6 h-6 text-green-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white mb-2">Privacy & Security</h3>
            <p className="text-sm text-gray-300 mb-3">
              Your notification preferences are stored securely and encrypted. We respect your privacy and never share your notification data.
            </p>
            <div className="space-y-1 text-xs text-gray-400">
              <p>• Browser notifications use your browser's secure notification API</p>
              <p>• Preferences are stored locally in your browser</p>
              <p>• External integrations require separate authentication</p>
              <p>• All data is encrypted in transit and at rest</p>
            </div>
          </div>
        </div>
      </div>

      {/* Test Notifications */}
      <div className="bg-gray-800/30 border border-blue-500/30 rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white mb-2">Test Your Settings</h3>
            <p className="text-sm text-gray-400">
              Send a test notification to verify your settings are working correctly.
            </p>
          </div>
          <button
            onClick={() => {
              // Use the showToast function from context
              const { showToast } = useNotifications();
              showToast({
                type: 'system',
                title: 'Test Notification',
                message: 'Your notification settings are working perfectly!',
                autoClose: true,
                duration: 4000
              });
            }}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors"
          >
            Send Test Notification
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotificationSettings;