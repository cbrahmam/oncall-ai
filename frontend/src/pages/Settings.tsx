// src/pages/Settings.tsx - Modern Settings Page
import { useState } from 'react'
import { 
  CogIcon, 
  BellIcon, 
  KeyIcon, 
  ShieldCheckIcon,
  GlobeAltIcon,
  UserIcon,
  BuildingOfficeIcon,
  CheckIcon
} from '@heroicons/react/24/outline'

export default function Settings() {
  const [activeTab, setActiveTab] = useState('profile')
  const [notifications, setNotifications] = useState({
    email: true,
    slack: true,
    sms: false,
    push: true
  })
  const [profile, setProfile] = useState({
    fullName: 'John Doe',
    email: 'john@example.com',
    phone: '+1 (555) 123-4567',
    timezone: 'America/New_York'
  })

  const tabs = [
    { id: 'profile', name: 'Profile', icon: UserIcon },
    { id: 'notifications', name: 'Notifications', icon: BellIcon },
    { id: 'integrations', name: 'Integrations', icon: GlobeAltIcon },
    { id: 'organization', name: 'Organization', icon: BuildingOfficeIcon },
    { id: 'security', name: 'Security', icon: ShieldCheckIcon },
  ]

  const integrations = [
    {
      name: 'Slack',
      description: 'Send incident notifications to Slack channels',
      connected: true,
      logo: '💬'
    },
    {
      name: 'Datadog',
      description: 'Ingest alerts from Datadog monitoring',
      connected: false,
      logo: '🐕'
    },
    {
      name: 'PagerDuty',
      description: 'Import existing PagerDuty incidents',
      connected: false,
      logo: '📟'
    },
    {
      name: 'Grafana',
      description: 'Receive alerts from Grafana dashboards',
      connected: true,
      logo: '📊'
    },
    {
      name: 'AWS CloudWatch',
      description: 'Monitor AWS infrastructure alerts',
      connected: false,
      logo: '☁️'
    }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Settings</h1>
        <p className="text-gray-400 mt-1">Manage your account and preferences</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar */}
        <div className="lg:w-64 bg-white/5 backdrop-blur-lg border border-white/10 rounded-xl p-4">
          <nav className="space-y-1">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`${
                    activeTab === tab.id
                      ? 'bg-blue-600/20 text-blue-400 border-blue-600/30'
                      : 'text-gray-400 hover:text-white hover:bg-white/5 border-transparent'
                  } w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg border transition-all duration-200`}
                >
                  <Icon className="w-5 h-5 mr-3" />
                  {tab.name}
                </button>
              )
            })}
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1">
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-xl p-6">
              <h2 className="text-xl font-semibold text-white mb-6">Profile Information</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Full Name</label>
                  <input
                    type="text"
                    value={profile.fullName}
                    onChange={(e) => setProfile({...profile, fullName: e.target.value})}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
                  <input
                    type="email"
                    value={profile.email}
                    onChange={(e) => setProfile({...profile, email: e.target.value})}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Phone</label>
                  <input
                    type="tel"
                    value={profile.phone}
                    onChange={(e) => setProfile({...profile, phone: e.target.value})}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Timezone</label>
                  <select
                    value={profile.timezone}
                    onChange={(e) => setProfile({...profile, timezone: e.target.value})}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="America/New_York">Eastern Time</option>
                    <option value="America/Chicago">Central Time</option>
                    <option value="America/Denver">Mountain Time</option>
                    <option value="America/Los_Angeles">Pacific Time</option>
                    <option value="UTC">UTC</option>
                  </select>
                </div>
              </div>
              
              <div className="mt-6">
                <button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-4 py-2 rounded-lg font-medium transition-all duration-200">
                  Save Changes
                </button>
              </div>
            </div>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-xl p-6">
              <h2 className="text-xl font-semibold text-white mb-6">Notification Preferences</h2>
              
              <div className="space-y-4">
                {Object.entries(notifications).map(([key, enabled]) => (
                  <div key={key} className="flex items-center justify-between py-3">
                    <div>
                      <h3 className="text-white font-medium capitalize">{key} Notifications</h3>
                      <p className="text-gray-400 text-sm">
                        Receive incident alerts via {key}
                      </p>
                    </div>
                    <button
                      onClick={() => setNotifications({...notifications, [key]: !enabled})}
                      className={`${
                        enabled ? 'bg-blue-600' : 'bg-gray-600'
                      } relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200`}
                    >
                      <span
                        className={`${
                          enabled ? 'translate-x-6' : 'translate-x-1'
                        } inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200`}
                      />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Integrations Tab */}
          {activeTab === 'integrations' && (
            <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-xl p-6">
              <h2 className="text-xl font-semibold text-white mb-6">Integrations</h2>
              
              <div className="grid gap-4">
                {integrations.map((integration) => (
                  <div key={integration.name} className="bg-white/5 border border-white/10 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="text-2xl">{integration.logo}</div>
                        <div>
                          <h3 className="text-white font-medium">{integration.name}</h3>
                          <p className="text-gray-400 text-sm">{integration.description}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        {integration.connected && (
                          <div className="flex items-center space-x-1 text-emerald-400">
                            <CheckIcon className="w-4 h-4" />
                            <span className="text-sm">Connected</span>
                          </div>
                        )}
                        <button
                          className={`${
                            integration.connected
                              ? 'bg-red-600/20 text-red-400 border-red-600/30 hover:bg-red-600/30'
                              : 'bg-blue-600/20 text-blue-400 border-blue-600/30 hover:bg-blue-600/30'
                          } px-3 py-1 border rounded text-sm transition-all duration-200`}
                        >
                          {integration.connected ? 'Disconnect' : 'Connect'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Organization Tab */}
          {activeTab === 'organization' && (
            <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-xl p-6">
              <h2 className="text-xl font-semibold text-white mb-6">Organization Settings</h2>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Organization Name</label>
                  <input
                    type="text"
                    defaultValue="Acme Corporation"
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Plan</label>
                  <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-600/30 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-white font-semibold">Pro Plan</h3>
                        <p className="text-gray-400 text-sm">Up to 50 users • Advanced features</p>
                      </div>
                      <button className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium">
                        Upgrade
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-xl p-6">
              <h2 className="text-xl font-semibold text-white mb-6">Security Settings</h2>
              
              <div className="space-y-6">
                <div>
                  <h3 className="text-white font-medium mb-3">Change Password</h3>
                  <div className="space-y-3">
                    <input
                      type="password"
                      placeholder="Current password"
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="password"
                      placeholder="New password"
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="password"
                      placeholder="Confirm new password"
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 rounded-lg font-medium">
                      Update Password
                    </button>
                  </div>
                </div>
                
                <div className="border-t border-white/10 pt-6">
                  <h3 className="text-white font-medium mb-3">Two-Factor Authentication</h3>
                  <p className="text-gray-400 text-sm mb-4">Add an extra layer of security to your account</p>
                  <button className="bg-emerald-600/20 text-emerald-400 border border-emerald-600/30 px-4 py-2 rounded-lg font-medium hover:bg-emerald-600/30 transition-all duration-200">
                    Enable 2FA
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}