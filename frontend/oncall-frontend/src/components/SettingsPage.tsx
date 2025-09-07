// frontend/src/components/SettingsPage.tsx - FIXED WITH REAL API INTEGRATION
import React, { useState, useEffect } from 'react';
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
import { useNotifications } from '../contexts/NotificationContext';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1';

interface Integration {
  id: string;
  name: string;
  type: string;
  is_active: boolean;
  config: any;
  created_at: string;
  last_sync_at?: string;
}

interface Organization {
  id: string;
  name: string;
  slug?: string;
  plan_type: string;
  subscription_status: string;
  max_users: number;
}

interface TeamMember {
  id: string;
  full_name: string;
  email: string;
  role: string;
  is_active: boolean;
}

interface Subscription {
  active: boolean;
  plan_type: string;
  status: string;
}

const SettingsPage: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useNotifications();
  const [activeTab, setActiveTab] = useState('profile');
  const [isLoading, setIsLoading] = useState(true);
  
  // Real data states
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
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

  // Fetch real data from APIs
  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('access_token');
        const headers = {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        };

        // Fetch organization details
        const orgResponse = await fetch(`${API_BASE_URL}/organizations/me`, { headers });
        if (orgResponse.ok) {
          const orgData = await orgResponse.json();
          setOrganization(orgData);
        }

        // Fetch subscription details
        const subResponse = await fetch(`${API_BASE_URL}/billing/subscription`, { headers });
        if (subResponse.ok) {
          const subData = await subResponse.json();
          setSubscription(subData);
        }

        // Fetch integrations
        const integrationsResponse = await fetch(`${API_BASE_URL}/integrations/`, { headers });
        if (integrationsResponse.ok) {
          const integrationsData = await integrationsResponse.json();
          setIntegrations(integrationsData.integrations || []);
        }

        // Fetch team members
        const teamResponse = await fetch(`${API_BASE_URL}/organizations/me/members`, { headers });
        if (teamResponse.ok) {
          const teamData = await teamResponse.json();
          setTeamMembers(teamData);
        }

      } catch (error) {
        console.error('Error fetching settings data:', error);
        showToast({
          type: 'error',
          title: 'Failed to load settings',
          message: 'Could not fetch your settings data. Please refresh the page.',
          autoClose: true,
          duration: 5000
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [showToast]);

  const handleOrganizationUpdate = async (updatedData: Partial<Organization>) => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${API_BASE_URL}/organizations/me`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedData),
      });

      if (response.ok) {
        const updated = await response.json();
        setOrganization(updated);
        showToast({
          type: 'success',
          title: 'Organization updated',
          message: 'Your organization settings have been saved.',
          autoClose: true,
          duration: 3000
        });
      } else {
        throw new Error('Failed to update organization');
      }
    } catch (error) {
      showToast({
        type: 'error',
        title: 'Update failed',
        message: 'Could not update organization settings.',
        autoClose: true,
        duration: 5000
      });
    }
  };

  const handleIntegrationToggle = async (integrationId: string) => {
    try {
      const integration = integrations.find(i => i.id === integrationId);
      if (!integration) return;

      const token = localStorage.getItem('access_token');
      const response = await fetch(`${API_BASE_URL}/integrations/${integrationId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          is_active: !integration.is_active
        }),
      });

      if (response.ok) {
        setIntegrations(prev => prev.map(i => 
          i.id === integrationId 
            ? { ...i, is_active: !i.is_active }
            : i
        ));
        
        showToast({
          type: 'success',
          title: `Integration ${integration.is_active ? 'disabled' : 'enabled'}`,
          message: `${integration.name} has been ${integration.is_active ? 'disconnected' : 'connected'}.`,
          autoClose: true,
          duration: 3000
        });
      }
    } catch (error) {
      showToast({
        type: 'error',
        title: 'Integration error',
        message: 'Could not update integration status.',
        autoClose: true,
        duration: 5000
      });
    }
  };

  const getPlanDisplayName = (planType: string) => {
    switch (planType) {
      case 'free': return 'Free Plan';
      case 'pro': return 'Professional Plan';
      case 'plus': return 'Plus Plan';
      case 'enterprise': return 'Enterprise Plan';
      default: return 'Free Plan';
    }
  };

  const getPlanPrice = (planType: string) => {
    switch (planType) {
      case 'free': return '$0';
      case 'pro': return '$29/user/month';
      case 'plus': return '$49/user/month';
      case 'enterprise': return 'Contact sales';
      default: return '$0';
    }
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
              defaultValue={user?.full_name || ''}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Email Address</label>
            <input
              type="email"
              defaultValue={user?.email || ''}
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

  const OrganizationTab = () => (
    <div className="space-y-6">
      <div className="glass-card rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Organization Settings</h3>
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Organization Name</label>
            <input
              type="text"
              defaultValue={organization?.name || ''}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Organization Slug</label>
            <div className="flex items-center space-x-3">
              <span className="text-gray-400">offcall-ai.com/</span>
              <input
                type="text"
                defaultValue={organization?.slug || ''}
                className="flex-1 px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Current Plan</label>
            <div className="flex items-center justify-between p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
              <div>
                <h4 className="text-white font-medium">
                  {subscription ? getPlanDisplayName(subscription.plan_type) : 'Loading...'}
                </h4>
                <p className="text-blue-300 text-sm">
                  {subscription ? getPlanPrice(subscription.plan_type) : 'Loading plan details...'}
                  {subscription?.plan_type !== 'free' && ' • Unlimited incidents • Advanced integrations'}
                </p>
              </div>
              <button 
                onClick={() => window.location.href = '/pricing'}
                className="bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 px-4 py-2 rounded-lg transition-colors font-medium"
              >
                {subscription?.plan_type === 'free' ? 'Upgrade' : 'Change Plan'}
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
        {isLoading ? (
          <div className="animate-pulse space-y-3">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-700/50 rounded-lg"></div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {teamMembers.map((member) => (
              <div key={member.id} className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                    <span className="text-white font-medium">
                      {member.full_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <h4 className="text-white font-medium">{member.full_name}</h4>
                    <p className="text-gray-400 text-sm">{member.email} • {member.role}</p>
                  </div>
                </div>
                <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-300">
                  {member.role}
                </span>
              </div>
            ))}
          </div>
        )}
        
        <button className="w-full mt-4 bg-white/10 hover:bg-white/20 text-white px-4 py-3 rounded-xl transition-colors font-medium flex items-center justify-center space-x-2">
          <PlusIcon className="w-5 h-5" />
          <span>Invite Team Member</span>
        </button>
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

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="animate-pulse bg-white/5 rounded-lg p-4 h-20"></div>
            ))}
          </div>
        ) : integrations.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-400 mb-4">No integrations configured yet</p>
            <button className="bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 px-4 py-2 rounded-lg transition-colors font-medium">
              Set up your first integration
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {integrations.map((integration) => (
              <div key={integration.id} className="bg-white/5 rounded-lg p-4 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="text-2xl">
                    {integration.type === 'slack' && '💬'}
                    {integration.type === 'datadog' && '📊'}
                    {integration.type === 'email' && '📧'}
                    {!['slack', 'datadog', 'email'].includes(integration.type) && '🔗'}
                  </div>
                  <div>
                    <h4 className="text-white font-medium">{integration.name}</h4>
                    <p className="text-gray-400 text-sm">{integration.type}</p>
                    {integration.is_active && integration.last_sync_at && (
                      <p className="text-green-400 text-xs mt-1">
                        Last sync: {new Date(integration.last_sync_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center space-x-1 ${
                    integration.is_active 
                      ? 'bg-green-500/20 text-green-300' 
                      : 'bg-gray-500/20 text-gray-300'
                  }`}>
                    {integration.is_active ? (
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
                      integration.is_active
                        ? 'bg-red-500/20 text-red-300 hover:bg-red-500/30'
                        : 'bg-blue-500/20 text-blue-300 hover:bg-blue-500/30'
                    }`}
                  >
                    {integration.is_active ? 'Disconnect' : 'Connect'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  // Other tabs remain the same but with proper loading states...
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
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
      {/* Header */}
      <div className="border-b border-gray-800/50 p-6">
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
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-4">
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