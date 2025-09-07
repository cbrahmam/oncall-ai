// frontend/src/components/UserProfile.tsx - Truly minimalistic (removes fluff)
import React, { useState, useEffect } from 'react';
import { 
  UserIcon, 
  EnvelopeIcon, 
  PencilIcon,
  CheckIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';

interface ProfileData {
  full_name: string;
  email: string;
  role: string;
  organization_name: string;
}

const UserProfile: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useNotifications();
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [profileData, setProfileData] = useState<ProfileData>({
    full_name: '',
    email: '',
    role: '',
    organization_name: ''
  });

  // Load user data on component mount
  useEffect(() => {
    if (user) {
      setProfileData({
        full_name: user.full_name || '',
        email: user.email || '',
        role: user.role || '',
        organization_name: user.organization_name || ''
      });
    }
  }, [user]);

  const handleSave = async () => {
    if (!profileData.full_name.trim()) {
      showToast({
        type: 'error',
        title: 'Error',
        message: 'Name is required'
      });
      return;
    }

    setIsLoading(true);
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`/api/v1/users/profile`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          full_name: profileData.full_name,
          role: profileData.role
        })
      });

      if (response.ok) {
        showToast({
          type: 'success',
          title: 'Profile Updated',
          message: 'Your profile has been updated successfully'
        });
        setIsEditing(false);
      } else {
        throw new Error('Failed to update profile');
      }
    } catch (error) {
      showToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to update profile. Please try again.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    if (user) {
      setProfileData({
        full_name: user.full_name || '',
        email: user.email || '',
        role: user.role || '',
        organization_name: user.organization_name || ''
      });
    }
    setIsEditing(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">Profile</h1>
          <p className="text-gray-400 mt-1">Manage your account information</p>
        </div>

        {/* Profile Card */}
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-8">
          
          {/* Profile Picture & Basic Info */}
          <div className="flex items-center space-x-6 mb-8">
            <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              <span className="text-white text-2xl font-bold">
                {profileData.full_name.charAt(0)?.toUpperCase() || 'U'}
              </span>
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-white">{profileData.full_name || 'User'}</h2>
              <p className="text-gray-400">{profileData.organization_name}</p>
            </div>
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="p-2 text-gray-400 hover:text-white transition-colors"
            >
              {isEditing ? (
                <XMarkIcon className="w-5 h-5" />
              ) : (
                <PencilIcon className="w-5 h-5" />
              )}
            </button>
          </div>

          {/* Profile Information - ESSENTIAL ONLY */}
          <div className="space-y-6">
            
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Full Name</label>
              {isEditing ? (
                <input
                  type="text"
                  value={profileData.full_name}
                  onChange={(e) => setProfileData(prev => ({ ...prev, full_name: e.target.value }))}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                  placeholder="Enter your full name"
                />
              ) : (
                <div className="flex items-center space-x-3 px-4 py-3 bg-white/5 rounded-lg">
                  <UserIcon className="w-5 h-5 text-gray-400" />
                  <span className="text-white">{profileData.full_name || 'Not set'}</span>
                </div>
              )}
            </div>

            {/* Email - Read only */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
              <div className="flex items-center space-x-3 px-4 py-3 bg-white/5 rounded-lg">
                <EnvelopeIcon className="w-5 h-5 text-gray-400" />
                <span className="text-gray-300">{profileData.email}</span>
                <span className="text-xs text-gray-500">(cannot be changed)</span>
              </div>
            </div>

            {/* Role */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Role</label>
              {isEditing ? (
                <select
                  value={profileData.role}
                  onChange={(e) => setProfileData(prev => ({ ...prev, role: e.target.value }))}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                >
                  <option value="engineer">Engineer</option>
                  <option value="senior_engineer">Senior Engineer</option>
                  <option value="lead">Tech Lead</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                </select>
              ) : (
                <div className="px-4 py-3 bg-white/5 rounded-lg">
                  <span className="text-white capitalize">{profileData.role || 'Not set'}</span>
                </div>
              )}
            </div>

            {/* Organization - Read only */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Organization</label>
              <div className="px-4 py-3 bg-white/5 rounded-lg">
                <span className="text-gray-300">{profileData.organization_name}</span>
                <span className="text-xs text-gray-500 ml-2">(managed by admin)</span>
              </div>
            </div>

            {/* Action Buttons */}
            {isEditing && (
              <div className="flex space-x-3 pt-4">
                <button
                  onClick={handleCancel}
                  disabled={isLoading}
                  className="flex-1 px-4 py-3 bg-white/10 text-gray-300 rounded-lg hover:bg-white/20 transition-colors font-medium disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={isLoading}
                  className="flex-1 px-4 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors font-medium disabled:opacity-50 flex items-center justify-center space-x-2"
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <CheckIcon className="w-4 h-4" />
                      <span>Save Changes</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;