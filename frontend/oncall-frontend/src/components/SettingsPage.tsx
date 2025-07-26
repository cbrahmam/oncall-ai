import React, { useState } from 'react';
import {
  CogIcon,
  UserIcon,
  BellIcon,
  LinkIcon,
  ShieldCheckIcon,
  BuildingOfficeIcon,
  CheckIcon,
  XMarkIcon,
  PlusIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';

interface Integration {
  id: string;
  name: string;
  type: string;
  icon: string;
  description: string;
  isConnected: boolean;
  lastSync?: string;
}

const SettingsPage: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [integrations, setIntegrations] = useState<Integration[]>([
    {
      id: '1',
      name: 'Slack',
      type: 'slack',
      icon: '💬',
      description: 'Send incident notifications to Slack channels',
      isConnected: false
    },
    {
      id: '2',
      name: 'Datadog',
      type: 'datadog',
      icon: '📊',
      description: 'Monitor infrastructure and receive alerts from Datadog',
      isConnected: false
    },
    {
      id: '3',
      name: 'Grafana',
      type: 'grafana',
      icon: '📈',
      description: 'Connect Grafana dashboards and alerts',
      isConnected: false
    },
    {
      id: '4',
      name: 'AWS CloudWatch',
      type: 'aws_cloudwatch',
      icon: '☁️',
      description: 'Receive alerts from AWS CloudWatch',
      isConnected: false
    },
    {
      id: '5',
      name: 'PagerDuty',
      type: 'pagerduty',
      icon: '📟',
      description: 'Import existing PagerDuty schedules and escalations',
      isConnected: false
    },
    {
      id: '6',
      name: 'Email (SMTP)',
      type: 'email',
      icon: '📧',
      description: 'Send email notifications for incidents',
      isConnected: true,
      lastSync: '2 hours ago'
    }
  ]);

  const [notificationSettings, setNotificationSettings] = useState({
    email: true,
    sms: true,
    slack: true,
    push: true,
    criticalOnly: false,
    quietHours: false,
    quietStart: '22:00',
    quietEnd: '08:00'
  });

  const tabs = [
    { id: 'profile', name: 'Profile', icon: UserIcon },
    { id: 'notifications', name: 'Notifications', icon: BellIcon },
    { id: 'integrations', name: 'Integrations', icon: LinkIcon },
    { id: 'organization', name: 'Organization', icon: BuildingOfficeIcon },
    { id: 'security', name: 'Security', icon: ShieldCheckIcon },
  ];

  const handleIntegrationToggle = (integrationId: string) => {
    setIntegrations(prev => prev.map(integration => 
      integration.id === integrationId 
        ? { ...integration, isConnected: !integration.isConnected }
        : integration
    ));
  };

  const ProfileTab = () => (
    <div className="space-y-6">
      <div className="glass-card rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Personal Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Full Name</label>
            <input
              type="text"
              defaultValue={user?.full_name}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Email Address</label>
            <input
              type="email"
              defaultValue={user?.email}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Phone Number</label>
            <input
              type="tel"
              placeholder="+1 (555) 123-4567"
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Timezone</label>
            <select className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent">
              <option>UTC (Coordinated Universal Time)</option>
              <option>EST (Eastern Standard Time)</option>
              <option>PST (Pacific Standard Time)</option>
              <option>CST (Central Standard Time)</option>
            </select>
          </div>
        </div>
        <div className="mt-6">
          <button className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-6 py-3 rounded-xl transition-all duration-200 font-medium">
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );

  const NotificationsTab = () => (
    <div className="space-y-6">
      <div className="glass-card rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Notification Preferences</h3>
        <div className="space-y-4">
          {[
            { key: 'email', label: 'Email Notifications', description: 'Receive incident alerts via email' },
            { key: 'sms', label: 'SMS Notifications', description: 'Receive critical alerts via SMS' },
            { key: 'slack', label: 'Slack Notifications', description: 'Get notified in Slack channels' },
            { key: 'push', label: 'Push Notifications', description: 'Browser and mobile push notifications' },
          ].map(({ key, label, description }) => (
            <div key={key} className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
              <div>
                <h4 className="text-white font-medium">{label}</h4>
                <p className="text-gray-400 text-sm">{description}</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={notificationSettings[key as keyof typeof notificationSettings] as boolean}
                  onChange={(e) => setNotificationSettings(prev => ({ ...prev, [key]: e.target.checked }))}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          ))}
        </div>
      </div>

      <div className="glass-card rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Advanced Settings</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
            <div>
              <h4 className="text-white font-medium">Critical Incidents Only</h4>
              <p className="text-gray-400 text-sm">Only notify for critical severity incidents</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={notificationSettings.criticalOnly}
                onChange={(e) => setNotificationSettings(prev => ({ ...prev, criticalOnly: e.target.checked }))}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
            <div>
              <h4 className="text-white font-medium">Quiet Hours</h4>
              <p className="text-gray-400 text-sm">Suppress non-critical notifications during specified hours</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={notificationSettings.quietHours}
                onChange={(e) => setNotificationSettings(prev => ({ ...prev, quietHours: e.target.checked }))}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {notificationSettings.quietHours && (
            <div className="grid grid-cols-2 gap-4 ml-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Start Time</label>
                <input
                  type="time"
                  value={notificationSettings.quietStart}
                  onChange={(e) => setNotificationSettings(prev => ({ ...prev, quietStart: e.target.value }))}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">End Time</label>
                <input
                  type="time"
                  value={notificationSettings.quietEnd}
                  onChange={(e) => setNotificationSettings(prev => ({ ...prev, quietEnd: e.target.value }))}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const IntegrationsTab = () => (
    <div className="space-y-6">
      <div className="glass-card rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-white mb-2">Connected Services</h3>
            <p className="text-gray-400 text-sm">Connect your monitoring tools and communication platforms</p>
          </div>
          <button className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-4 py-2 rounded-xl transition-all duration-200 font-medium flex items-center space-x-2">
            <PlusIcon className="w-4 h-4" />
            <span>Add Integration</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {integrations.map((integration) => (
            <div key={integration.id} className="bg-white/5 rounded-lg p-4 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="text-2xl">{integration.icon}</div>
                <div>
                  <h4 className="text-white font-medium">{integration.name}</h4>
                  <p className="text-gray-400 text-sm">{integration.description}</p>
                  {integration.isConnected && integration.lastSync && (
                    <p className="text-green-400 text-xs mt-1">Last sync: {integration.lastSync}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center space-x-1 ${
                  integration.isConnected 
                    ? 'bg-green-500/20 text-green-300' 
                    : 'bg-gray-500/20 text-gray-300'
                }`}>
                  {integration.isConnected ? (
                    <>
                      <CheckIcon className="w-3 h-3" />
                      <span>Connected</span>
                    </>
                  ) : (
                    <>
                      <XMarkIcon className="w-3 h-3" />
                      <span>Disconnected</span>
                    </>
                  )}
                </span>
                <button
                  onClick={() => handleIntegrationToggle(integration.id)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    integration.isConnected
                      ? 'bg-red-500/20 text-red-300 hover:bg-red-500/30'
                      : 'bg-blue-500/20 text-blue-300 hover:bg-blue-500/30'
                  }`}
                >
                  {integration.isConnected ? 'Disconnect' : 'Connect'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="glass-card rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Webhook Configuration</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Webhook URL</label>
            <div className="flex space-x-3">
              <input
                type="text"
                value="https://api.oncall-ai.com/webhooks/generic"
                readOnly
                className="flex-1 px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
              />
              <button className="bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 px-4 py-3 rounded-xl transition-colors font-medium">
                Copy
              </button>
            </div>
            <p className="text-gray-400 text-sm mt-2">Use this URL to send alerts from any monitoring tool</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Webhook Secret</label>
            <div className="flex space-x-3">
              <input
                type="password"
                value="sk_live_abc123xyz789"
                readOnly
                className="flex-1 px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
              />
              <button className="bg-green-500/20 text-green-300 hover:bg-green-500/30 px-4 py-3 rounded-xl transition-colors font-medium">
                Regenerate
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const OrganizationTab = () => (
    <div className="space-y-6">
      <div className="glass-card rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Organization Settings</h3>
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Organization Name</label>
            <input
              type="text"
              defaultValue="Acme Corporation"
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Organization Slug</label>
            <div className="flex items-center space-x-3">
              <span className="text-gray-400">oncall-ai.com/</span>
              <input
                type="text"
                defaultValue="acme-corp"
                className="flex-1 px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Current Plan</label>
            <div className="flex items-center justify-between p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
              <div>
                <h4 className="text-white font-medium">Professional Plan</h4>
                <p className="text-blue-300 text-sm">$99/month • Unlimited incidents • Advanced integrations</p>
              </div>
              <button className="bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 px-4 py-2 rounded-lg transition-colors font-medium">
                Upgrade
              </button>
            </div>
          </div>
        </div>
        
        <div className="mt-6">
          <button className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-6 py-3 rounded-xl transition-all duration-200 font-medium">
            Save Changes
          </button>
        </div>
      </div>

      <div className="glass-card rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Team Members</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <span className="text-white font-medium">BM</span>
              </div>
              <div>
                <h4 className="text-white font-medium">{user?.full_name}</h4>
                <p className="text-gray-400 text-sm">{user?.email} • Admin</p>
              </div>
            </div>
            <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-300">
              Owner
            </span>
          </div>
        </div>
        
        <button className="w-full mt-4 bg-white/10 hover:bg-white/20 text-white px-4 py-3 rounded-xl transition-colors font-medium flex items-center justify-center space-x-2">
          <PlusIcon className="w-5 h-5" />
          <span>Invite Team Member</span>
        </button>
      </div>
    </div>
  );

  const SecurityTab = () => (
    <div className="space-y-6">
      <div className="glass-card rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Password & Authentication</h3>
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Current Password</label>
            <input
              type="password"
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
              placeholder="Enter current password"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">New Password</label>
            <input
              type="password"
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
              placeholder="Enter new password"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Confirm New Password</label>
            <input
              type="password"
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
              placeholder="Confirm new password"
            />
          </div>
        </div>
        
        <div className="mt-6">
          <button className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-6 py-3 rounded-xl transition-all duration-200 font-medium">
            Update Password
          </button>
        </div>
      </div>

      <div className="glass-card rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Two-Factor Authentication</h3>
        <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
          <div>
            <h4 className="text-white font-medium">2FA via Authentication App</h4>
            <p className="text-gray-400 text-sm">Add an extra layer of security to your account</p>
          </div>
          <button className="bg-green-500/20 text-green-300 hover:bg-green-500/30 px-4 py-2 rounded-lg transition-colors font-medium">
            Enable 2FA
          </button>
        </div>
      </div>

      <div className="glass-card rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">API Keys</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
            <div>
              <h4 className="text-white font-medium">Production API Key</h4>
              <p className="text-gray-400 text-sm">sk_live_abc...xyz • Created 2 days ago</p>
            </div>
            <div className="flex space-x-2">
              <button className="bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 px-3 py-2 rounded-lg transition-colors text-sm">
                Copy
              </button>
              <button className="bg-red-500/20 text-red-300 hover:bg-red-500/30 px-3 py-2 rounded-lg transition-colors text-sm">
                Revoke
              </button>
            </div>
          </div>
        </div>
        
        <button className="w-full mt-4 bg-white/10 hover:bg-white/20 text-white px-4 py-3 rounded-xl transition-colors font-medium flex items-center justify-center space-x-2">
          <PlusIcon className="w-5 h-5" />
          <span>Generate New API Key</span>
        </button>
      </div>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'profile': return <ProfileTab />;
      case 'notifications': return <NotificationsTab />;
      case 'integrations': return <IntegrationsTab />;
      case 'organization': return <OrganizationTab />;
      case 'security': return <SecurityTab />;
      default: return <ProfileTab />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <div className="glass-dark border-b border-white/10 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center space-x-3">
            <CogIcon className="w-8 h-8 text-blue-400" />
            <div>
              <h1 className="text-2xl font-bold text-white">Settings</h1>
              <p className="text-gray-400">Manage your account, team, and integrations</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar Navigation */}
          <div className="lg:w-64">
            <div className="glass-card rounded-xl p-4">
              <nav className="space-y-2">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors text-left ${
                      activeTab === tab.id
                        ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                        : 'text-gray-400 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <tab.icon className="w-5 h-5" />
                    <span className="font-medium">{tab.name}</span>
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1">
            {renderTabContent()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;