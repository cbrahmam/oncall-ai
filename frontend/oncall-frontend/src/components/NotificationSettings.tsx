// frontend/oncall-frontend/src/components/NotificationSettings.tsx
import React, { useState } from 'react';
import { 
  BellIcon,
  SpeakerWaveIcon,
  EnvelopeIcon,
  ChatBubbleLeftRightIcon,
  MoonIcon,
  ClockIcon,
  ShieldCheckIcon,
  DevicePhoneMobileIcon
} from '@heroicons/react/24/outline';
import { useNotifications } from '../contexts/NotificationContext';

const NotificationSettings: React.FC = () => {
  const { preferences, updatePreferences, requestPermission } = useNotifications();
  const [permissionStatus, setPermissionStatus] = useState<string>(
    typeof Notification !== 'undefined' ? Notification.permission : 'unsupported'
  );

  const handlePermissionRequest = async () => {
    const granted = await requestPermission();
    setPermissionStatus(granted ? 'granted' : 'denied');
  };

  const ToggleSwitch: React.FC<{ 
    enabled: boolean; 
    onChange: (enabled: boolean) => void;
    disabled?: boolean;
  }> = ({ enabled, onChange, disabled = false }) => (
    <button
      onClick={() => !disabled && onChange(!enabled)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-900 ${
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

  const TimeInput: React.FC<{
    value: string;
    onChange: (value: string) => void;
    label: string;
  }> = ({ value, onChange, label }) => (
    <div className="flex items-center space-x-2">
      <label className="text-sm text-gray-300 w-12">{label}</label>
      <input
        type="time"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
      />
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white mb-2">Notification Preferences</h2>
        <p className="text-gray-400">Customize how you receive alerts and updates</p>
      </div>

      {/* Browser Permissions */}
      <div className="glass-card rounded-xl p-6">
        <div className="flex items-center space-x-3 mb-4">
          <DevicePhoneMobileIcon className="w-6 h-6 text-blue-400" />
          <h3 className="text-lg font-semibold text-white">Browser Notifications</h3>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-white">Enable Browser Notifications</p>
              <p className="text-xs text-gray-400">Get instant notifications in your browser</p>
            </div>
            <ToggleSwitch
              enabled={preferences.browserNotifications && permissionStatus === 'granted'}
              onChange={(enabled) => {
                if (enabled && permissionStatus !== 'granted') {
                  handlePermissionRequest();
                } else {
                  updatePreferences({ browserNotifications: enabled });
                }
              }}
            />
          </div>

          {permissionStatus === 'denied' && (
            <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
              <p className="text-sm text-red-300">
                Browser notifications are blocked. Please enable them in your browser settings.
              </p>
            </div>
          )}

          {permissionStatus === 'default' && (
            <div className="p-3 bg-yellow-500/20 border border-yellow-500/30 rounded-lg">
              <p className="text-sm text-yellow-300 mb-2">
                Browser notifications permission is required for real-time alerts.
              </p>
              <button
                onClick={handlePermissionRequest}
                className="px-3 py-1 bg-blue-500 text-white rounded text-sm font-medium hover:bg-blue-600 transition-colors"
              >
                Enable Notifications
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Sound Settings */}
      <div className="glass-card rounded-xl p-6">
        <div className="flex items-center space-x-3 mb-4">
          <SpeakerWaveIcon className="w-6 h-6 text-green-400" />
          <h3 className="text-lg font-semibold text-white">Sound & Audio</h3>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-white">Notification Sounds</p>
              <p className="text-xs text-gray-400">Play audio alerts for notifications</p>
            </div>
            <ToggleSwitch
              enabled={preferences.soundEnabled}
              onChange={(enabled) => updatePreferences({ soundEnabled: enabled })}
            />
          </div>
        </div>
      </div>

      {/* External Integrations */}
      <div className="glass-card rounded-xl p-6">
        <div className="flex items-center space-x-3 mb-4">
          <ChatBubbleLeftRightIcon className="w-6 h-6 text-purple-400" />
          <h3 className="text-lg font-semibold text-white">External Notifications</h3>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <EnvelopeIcon className="w-5 h-5 text-blue-400" />
              <div>
                <p className="text-sm font-medium text-white">Email Notifications</p>
                <p className="text-xs text-gray-400">Receive updates via email</p>
              </div>
            </div>
            <ToggleSwitch
              enabled={preferences.emailNotifications}
              onChange={(enabled) => updatePreferences({ emailNotifications: enabled })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-5 h-5 bg-green-500 rounded text-white text-xs flex items-center justify-center font-bold">S</div>
              <div>
                <p className="text-sm font-medium text-white">Slack Notifications</p>
                <p className="text-xs text-gray-400">Send alerts to Slack channels</p>
              </div>
            </div>
            <ToggleSwitch
              enabled={preferences.slackNotifications}
              onChange={(enabled) => updatePreferences({ slackNotifications: enabled })}
            />
          </div>
        </div>
      </div>

      {/* Incident Types */}
      <div className="glass-card rounded-xl p-6">
        <div className="flex items-center space-x-3 mb-4">
          <BellIcon className="w-6 h-6 text-orange-400" />
          <h3 className="text-lg font-semibold text-white">Incident Notifications</h3>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-white">Incident Created</p>
              <p className="text-xs text-gray-400">New incidents in your organization</p>
            </div>
            <ToggleSwitch
              enabled={preferences.incidentCreated}
              onChange={(enabled) => updatePreferences({ incidentCreated: enabled })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-white">Incident Acknowledged</p>
              <p className="text-xs text-gray-400">When incidents are acknowledged</p>
            </div>
            <ToggleSwitch
              enabled={preferences.incidentAcknowledged}
              onChange={(enabled) => updatePreferences({ incidentAcknowledged: enabled })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-white">Incident Resolved</p>
              <p className="text-xs text-gray-400">When incidents are resolved</p>
            </div>
            <ToggleSwitch
              enabled={preferences.incidentResolved}
              onChange={(enabled) => updatePreferences({ incidentResolved: enabled })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-white">Critical Alerts Only</p>
              <p className="text-xs text-gray-400">Only notify for critical severity incidents</p>
            </div>
            <ToggleSwitch
              enabled={preferences.criticalAlertsOnly}
              onChange={(enabled) => updatePreferences({ criticalAlertsOnly: enabled })}
            />
          </div>
        </div>
      </div>

      {/* Do Not Disturb */}
      <div className="glass-card rounded-xl p-6">
        <div className="flex items-center space-x-3 mb-4">
          <MoonIcon className="w-6 h-6 text-indigo-400" />
          <h3 className="text-lg font-semibold text-white">Do Not Disturb</h3>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-white">Do Not Disturb Mode</p>
              <p className="text-xs text-gray-400">Silence all non-critical notifications</p>
            </div>
            <ToggleSwitch
              enabled={preferences.doNotDisturb}
              onChange={(enabled) => updatePreferences({ doNotDisturb: enabled })}
            />
          </div>

          <div className="border-t border-white/10 pt-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <ClockIcon className="w-5 h-5 text-blue-400" />
                <div>
                  <p className="text-sm font-medium text-white">Quiet Hours</p>
                  <p className="text-xs text-gray-400">Automatically enable DND during these hours</p>
                </div>
              </div>
              <ToggleSwitch
                enabled={preferences.quietHours.enabled}
                onChange={(enabled) => updatePreferences({ 
                  quietHours: { ...preferences.quietHours, enabled }
                })}
              />
            </div>

            {preferences.quietHours.enabled && (
              <div className="space-y-3 pl-8">
                <TimeInput
                  label="From"
                  value={preferences.quietHours.start}
                  onChange={(start) => updatePreferences({
                    quietHours: { ...preferences.quietHours, start }
                  })}
                />
                <TimeInput
                  label="To"
                  value={preferences.quietHours.end}
                  onChange={(end) => updatePreferences({
                    quietHours: { ...preferences.quietHours, end }
                  })}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Security Notice */}
      <div className="glass-card rounded-xl p-6 border border-green-500/30 bg-green-500/5">
        <div className="flex items-start space-x-3">
          <ShieldCheckIcon className="w-6 h-6 text-green-400 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-lg font-semibold text-white mb-2">Security & Privacy</h3>
            <p className="text-sm text-gray-300 mb-3">
              Your notification preferences are stored locally and encrypted. We never store sensitive 
              data on our servers without your explicit consent.
            </p>
            <div className="space-y-2 text-xs text-gray-400">
              <p>• Browser notifications are handled by your browser's secure notification API</p>
              <p>• Sound preferences are stored in your browser's local storage</p>
              <p>• External integrations require separate authentication</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationSettings;