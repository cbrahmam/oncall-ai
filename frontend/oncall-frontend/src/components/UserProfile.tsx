import React, { useState } from 'react';
import {
  UserIcon,
  PencilIcon,
  ClockIcon,
  BellIcon,
  ShieldCheckIcon,
  CalendarIcon,
  PhoneIcon,
  EnvelopeIcon,
  MapPinIcon,
  CheckIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';

interface UserProfileData {
  full_name: string;
  email: string;
  phone_number: string;
  timezone: string;
  role: string;
  skills: string[];
  bio: string;
}

const UserProfile: React.FC = () => {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [profileData, setProfileData] = useState<UserProfileData>({
    full_name: user?.full_name || '',
    email: user?.email || '',
    phone_number: '',
    timezone: 'UTC',
    role: user?.role || 'engineer',
    skills: ['React', 'Node.js', 'AWS', 'Docker'],
    bio: 'Full-stack engineer with 5+ years of experience building scalable web applications.'
  });
  const [newSkill, setNewSkill] = useState('');

  const handleSave = async () => {
    // TODO: Save to backend
    setIsEditing(false);
  };

  const handleCancel = () => {
    // Reset to original data
    setIsEditing(false);
  };

  const addSkill = () => {
    if (newSkill.trim() && !profileData.skills.includes(newSkill.trim())) {
      setProfileData(prev => ({
        ...prev,
        skills: [...prev.skills, newSkill.trim()]
      }));
      setNewSkill('');
    }
  };

  const removeSkill = (skill: string) => {
    setProfileData(prev => ({
      ...prev,
      skills: prev.skills.filter(s => s !== skill)
    }));
  };

  const onCallHistory = [
    { date: '2025-01-20', duration: '8 hours', incidents: 3, status: 'completed' },
    { date: '2025-01-13', duration: '12 hours', incidents: 1, status: 'completed' },
    { date: '2025-01-06', duration: '8 hours', incidents: 0, status: 'completed' },
    { date: '2024-12-30', duration: '6 hours', incidents: 2, status: 'completed' },
  ];

  const recentActivity = [
    { action: 'Resolved incident', incident: 'Database connection timeout', time: '2 hours ago' },
    { action: 'Acknowledged incident', incident: 'High CPU usage on web-01', time: '1 day ago' },
    { action: 'Created runbook', incident: 'Redis failover procedure', time: '3 days ago' },
    { action: 'Joined team', incident: 'Backend Engineering', time: '1 week ago' },
  ];

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <div className="glass-dark border-b border-white/10 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center">
                <span className="text-2xl font-bold text-white">
                  {user?.full_name?.charAt(0) || 'U'}
                </span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">{user?.full_name}</h1>
                <p className="text-gray-400">{user?.email}</p>
                <div className="flex items-center space-x-4 mt-2">
                  <span className="px-2 py-1 bg-blue-500/20 text-blue-300 rounded-full text-xs font-medium">
                    {profileData.role}
                  </span>
                  <span className="px-2 py-1 bg-green-500/20 text-green-300 rounded-full text-xs font-medium flex items-center space-x-1">
                    <CheckIcon className="w-3 h-3" />
                    <span>Available</span>
                  </span>
                </div>
              </div>
            </div>
            
            <button
              onClick={() => setIsEditing(true)}
              className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-6 py-3 rounded-xl transition-all duration-200 font-medium flex items-center space-x-2"
            >
              <PencilIcon className="w-5 h-5" />
              <span>Edit Profile</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Information */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information */}
            <div className="glass-card rounded-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-white">Profile Information</h2>
                {isEditing && (
                  <div className="flex space-x-3">
                    <button
                      onClick={handleCancel}
                      className="bg-white/10 text-gray-300 hover:bg-white/20 px-4 py-2 rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSave}
                      className="bg-green-500/20 text-green-300 hover:bg-green-500/30 px-4 py-2 rounded-lg transition-colors"
                    >
                      Save Changes
                    </button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Full Name</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={profileData.full_name}
                      onChange={(e) => setProfileData(prev => ({ ...prev, full_name: e.target.value }))}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                    />
                  ) : (
                    <div className="flex items-center space-x-2 text-white">
                      <UserIcon className="w-5 h-5 text-gray-400" />
                      <span>{profileData.full_name}</span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
                  <div className="flex items-center space-x-2 text-white">
                    <EnvelopeIcon className="w-5 h-5 text-gray-400" />
                    <span>{profileData.email}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Phone Number</label>
                  {isEditing ? (
                    <input
                      type="tel"
                      value={profileData.phone_number}
                      onChange={(e) => setProfileData(prev => ({ ...prev, phone_number: e.target.value }))}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                      placeholder="+1 (555) 123-4567"
                    />
                  ) : (
                    <div className="flex items-center space-x-2 text-white">
                      <PhoneIcon className="w-5 h-5 text-gray-400" />
                      <span>{profileData.phone_number || 'Not provided'}</span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Timezone</label>
                  {isEditing ? (
                    <select
                      value={profileData.timezone}
                      onChange={(e) => setProfileData(prev => ({ ...prev, timezone: e.target.value }))}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                    >
                      <option value="UTC">UTC (Coordinated Universal Time)</option>
                      <option value="EST">EST (Eastern Standard Time)</option>
                      <option value="PST">PST (Pacific Standard Time)</option>
                      <option value="CST">CST (Central Standard Time)</option>
                    </select>
                  ) : (
                    <div className="flex items-center space-x-2 text-white">
                      <MapPinIcon className="w-5 h-5 text-gray-400" />
                      <span>{profileData.timezone}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-300 mb-2">Bio</label>
                {isEditing ? (
                  <textarea
                    value={profileData.bio}
                    onChange={(e) => setProfileData(prev => ({ ...prev, bio: e.target.value }))}
                    rows={3}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent resize-none"
                    placeholder="Tell us about yourself..."
                  />
                ) : (
                  <p className="text-gray-300">{profileData.bio}</p>
                )}
              </div>
            </div>

            {/* Skills */}
            <div className="glass-card rounded-xl p-6">
              <h2 className="text-xl font-semibold text-white mb-4">Skills & Expertise</h2>
              
              <div className="flex flex-wrap gap-2 mb-4">
                {profileData.skills.map((skill, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-500/20 text-blue-300 border border-blue-500/30"
                  >
                    {skill}
                    {isEditing && (
                      <button
                        onClick={() => removeSkill(skill)}
                        className="ml-2 text-blue-300 hover:text-white transition-colors"
                      >
                        <XMarkIcon className="w-3 h-3" />
                      </button>
                    )}
                  </span>
                ))}
              </div>

              {isEditing && (
                <div className="flex space-x-3">
                  <input
                    type="text"
                    value={newSkill}
                    onChange={(e) => setNewSkill(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addSkill()}
                    className="flex-1 px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                    placeholder="Add a new skill..."
                  />
                  <button
                    onClick={addSkill}
                    className="bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 px-4 py-3 rounded-xl transition-colors"
                  >
                    Add
                  </button>
                </div>
              )}
            </div>

            {/* Recent Activity */}
            <div className="glass-card rounded-xl p-6">
              <h2 className="text-xl font-semibold text-white mb-4">Recent Activity</h2>
              <div className="space-y-4">
                {recentActivity.map((activity, index) => (
                  <div key={index} className="flex items-center space-x-4 p-4 bg-white/5 rounded-lg">
                    <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center">
                      <CheckIcon className="w-4 h-4 text-blue-300" />
                    </div>
                    <div className="flex-1">
                      <p className="text-white">
                        <span className="font-medium">{activity.action}</span>
                        <span className="text-gray-400"> • {activity.incident}</span>
                      </p>
                      <p className="text-gray-400 text-sm">{activity.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* On-Call Status */}
            <div className="glass-card rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">On-Call Status</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Current Status</span>
                  <span className="px-2 py-1 bg-green-500/20 text-green-300 rounded-full text-xs font-medium">
                    Available
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Next Shift</span>
                  <span className="text-white">Jan 28, 6:00 PM</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Team</span>
                  <span className="text-white">Backend Engineering</span>
                </div>
              </div>
              
              <button className="w-full mt-4 bg-yellow-500/20 text-yellow-300 hover:bg-yellow-500/30 px-4 py-3 rounded-xl transition-colors font-medium">
                Take Break
              </button>
            </div>

            {/* On-Call History */}
            <div className="glass-card rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">On-Call History</h3>
              <div className="space-y-3">
                {onCallHistory.map((shift, index) => (
                  <div key={index} className="p-3 bg-white/5 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-white font-medium">{shift.date}</span>
                      <span className="px-2 py-1 bg-green-500/20 text-green-300 rounded-full text-xs">
                        {shift.status}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">Duration</span>
                      <span className="text-white">{shift.duration}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">Incidents</span>
                      <span className="text-white">{shift.incidents}</span>
                    </div>
                  </div>
                ))}
              </div>
              
              <button className="w-full mt-4 bg-white/10 hover:bg-white/20 text-white px-4 py-3 rounded-xl transition-colors font-medium">
                View Full History
              </button>
            </div>

            {/* Quick Stats */}
            <div className="glass-card rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Quick Stats</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <BellIcon className="w-5 h-5 text-blue-400" />
                    <span className="text-gray-400">Total Incidents</span>
                  </div>
                  <span className="text-white font-semibold">147</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <ClockIcon className="w-5 h-5 text-green-400" />
                    <span className="text-gray-400">Avg Response</span>
                  </div>
                  <span className="text-white font-semibold">4m 32s</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <ShieldCheckIcon className="w-5 h-5 text-purple-400" />
                    <span className="text-gray-400">Resolution Rate</span>
                  </div>
                  <span className="text-white font-semibold">98.5%</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <CalendarIcon className="w-5 h-5 text-orange-400" />
                    <span className="text-gray-400">On-Call Hours</span>
                  </div>
                  <span className="text-white font-semibold">156h</span>
                </div>
              </div>
            </div>

            {/* Notification Preferences */}
            <div className="glass-card rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Quick Settings</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Email Notifications</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" defaultChecked className="sr-only peer" />
                    <div className="w-9 h-5 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">SMS Alerts</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" defaultChecked className="sr-only peer" />
                    <div className="w-9 h-5 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Slack Notifications</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" />
                    <div className="w-9 h-5 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>
              
              <button className="w-full mt-4 bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 px-4 py-3 rounded-xl transition-colors font-medium">
                Advanced Settings
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Profile Modal */}
      {isEditing && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm"></div>
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative w-full max-w-2xl">
              <div className="glass-card rounded-2xl p-6 shadow-2xl">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-white">Edit Profile</h2>
                  <button
                    onClick={handleCancel}
                    className="text-gray-400 hover:text-white transition-colors p-1"
                  >
                    <XMarkIcon className="w-6 h-6" />
                  </button>
                </div>

                <div className="space-y-6">
                  {/* Profile Picture */}
                  <div className="flex items-center space-x-4">
                    <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center">
                      <span className="text-2xl font-bold text-white">
                        {profileData.full_name.charAt(0) || 'U'}
                      </span>
                    </div>
                    <div>
                      <button className="bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 px-4 py-2 rounded-lg transition-colors font-medium">
                        Change Avatar
                      </button>
                      <p className="text-gray-400 text-sm mt-1">JPG, PNG up to 2MB</p>
                    </div>
                  </div>

                  {/* Form Fields */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Full Name</label>
                      <input
                        type="text"
                        value={profileData.full_name}
                        onChange={(e) => setProfileData(prev => ({ ...prev, full_name: e.target.value }))}
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Phone Number</label>
                      <input
                        type="tel"
                        value={profileData.phone_number}
                        onChange={(e) => setProfileData(prev => ({ ...prev, phone_number: e.target.value }))}
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                        placeholder="+1 (555) 123-4567"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Timezone</label>
                      <select
                        value={profileData.timezone}
                        onChange={(e) => setProfileData(prev => ({ ...prev, timezone: e.target.value }))}
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                      >
                        <option value="UTC">UTC (Coordinated Universal Time)</option>
                        <option value="EST">EST (Eastern Standard Time)</option>
                        <option value="PST">PST (Pacific Standard Time)</option>
                        <option value="CST">CST (Central Standard Time)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Role</label>
                      <select
                        value={profileData.role}
                        onChange={(e) => setProfileData(prev => ({ ...prev, role: e.target.value }))}
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                      >
                        <option value="engineer">Engineer</option>
                        <option value="senior_engineer">Senior Engineer</option>
                        <option value="lead">Tech Lead</option>
                        <option value="manager">Manager</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Bio</label>
                    <textarea
                      value={profileData.bio}
                      onChange={(e) => setProfileData(prev => ({ ...prev, bio: e.target.value }))}
                      rows={4}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent resize-none"
                      placeholder="Tell us about yourself..."
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="flex space-x-3 pt-4">
                    <button
                      onClick={handleCancel}
                      className="flex-1 px-4 py-3 bg-white/10 text-gray-300 rounded-xl hover:bg-white/20 transition-colors font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSave}
                      className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-xl transition-all duration-200 font-medium"
                    >
                      Save Changes
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserProfile;