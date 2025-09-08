// frontend/src/components/APIKeyManagement.tsx - NEW COMPONENT
import React, { useState, useEffect } from 'react';
import { 
  KeyIcon, 
  PlusIcon, 
  TrashIcon, 
  CheckCircleIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  EyeSlashIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';

interface APIKey {
  id: string;
  provider: string;
  key_name: string;
  is_valid: boolean;
  last_validated: string | null;
  validation_error: string | null;
  total_requests: number;
  total_tokens: number;
  last_used: string | null;
  created_at: string;
}

interface APIKeyManagementProps {
  onNavigateBack?: () => void;
}

const APIKeyManagement: React.FC<APIKeyManagementProps> = ({ onNavigateBack }) => {
  const { user } = useAuth();
  const { showToast } = useNotifications();
  const [apiKeys, setApiKeys] = useState<APIKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  // Load API keys on component mount
  useEffect(() => {
    loadAPIKeys();
  }, []);

  const loadAPIKeys = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch('/api/v1/api-keys/', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setApiKeys(data);
      }
    } catch (error) {
      console.error('Failed to load API keys:', error);
      showToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to load API keys',
        autoClose: true,
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteAPIKey = async (keyId: string) => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`/api/v1/api-keys/${keyId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        setApiKeys(prev => prev.filter(key => key.id !== keyId));
        showToast({
          type: 'success',
          title: 'API Key Deleted',
          message: 'API key has been removed successfully',
          autoClose: true,
        });
      }
    } catch (error) {
      console.error('Failed to delete API key:', error);
      showToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to delete API key',
        autoClose: true,
      });
    }
  };

  const validateAPIKey = async (keyId: string) => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`/api/v1/api-keys/${keyId}/validate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        // Refresh the API keys list to show updated validation status
        await loadAPIKeys();
        
        showToast({
          type: data.is_valid ? 'success' : 'warning',
          title: data.is_valid ? 'API Key Valid' : 'API Key Invalid',
          message: data.is_valid ? 'API key is working correctly' : data.error_message,
          autoClose: true,
        });
      }
    } catch (error) {
      console.error('Failed to validate API key:', error);
      showToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to validate API key',
        autoClose: true,
      });
    }
  };

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case 'openai':
        return '🤖';
      case 'gemini':
        return '💎';
      case 'claude':
        return '🧠';
      default:
        return '🔑';
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          {onNavigateBack && (
            <button
              onClick={onNavigateBack}
              className="mb-4 text-gray-400 hover:text-white transition-colors inline-flex items-center"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Settings
            </button>
          )}
          
          <h1 className="text-4xl font-bold text-white mb-4">
            API Key Management
          </h1>
          <p className="text-gray-400 text-lg">
            Securely manage your AI provider API keys. OffCall AI uses your keys to power incident analysis and recommendations.
          </p>
        </div>

        {/* Add API Key Button */}
        <div className="mb-8">
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-medium rounded-xl transition-all"
          >
            <PlusIcon className="w-5 h-5 mr-2" />
            Add API Key
          </button>
        </div>

        {/* API Keys Grid */}
        {apiKeys.length === 0 ? (
          <div className="text-center py-16">
            <KeyIcon className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No API Keys</h3>
            <p className="text-gray-400 mb-6">
              Add your AI provider API keys to enable intelligent incident analysis.
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
            >
              <PlusIcon className="w-5 h-5 mr-2" />
              Add Your First API Key
            </button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {apiKeys.map((apiKey) => (
              <div
                key={apiKey.id}
                className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 border border-gray-700/50 rounded-2xl p-6 backdrop-blur-sm"
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">{getProviderIcon(apiKey.provider)}</span>
                    <div>
                      <h3 className="font-semibold text-white">{apiKey.key_name}</h3>
                      <p className="text-sm text-gray-400 capitalize">{apiKey.provider}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {apiKey.is_valid ? (
                      <CheckCircleIcon className="w-5 h-5 text-green-500" />
                    ) : (
                      <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />
                    )}
                  </div>
                </div>

                {/* Status */}
                <div className="mb-4">
                  <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                    apiKey.is_valid 
                      ? 'bg-green-500/20 text-green-300 border border-green-500/30'
                      : 'bg-red-500/20 text-red-300 border border-red-500/30'
                  }`}>
                    {apiKey.is_valid ? 'Valid' : 'Invalid'}
                  </div>
                  
                  {apiKey.validation_error && (
                    <p className="text-sm text-red-400 mt-2">{apiKey.validation_error}</p>
                  )}
                </div>

                {/* Usage Stats */}
                <div className="space-y-2 mb-4 text-sm">
                  <div className="flex justify-between text-gray-400">
                    <span>Total Requests:</span>
                    <span className="text-white">{apiKey.total_requests.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>Total Tokens:</span>
                    <span className="text-white">{apiKey.total_tokens.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>Last Used:</span>
                    <span className="text-white">{formatDate(apiKey.last_used)}</span>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>Added:</span>
                    <span className="text-white">{formatDate(apiKey.created_at)}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex space-x-2">
                  <button
                    onClick={() => validateAPIKey(apiKey.id)}
                    className="flex-1 px-3 py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-600/30 rounded-lg transition-colors text-sm"
                  >
                    Validate
                  </button>
                  <button
                    onClick={() => deleteAPIKey(apiKey.id)}
                    className="px-3 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-600/30 rounded-lg transition-colors"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add API Key Modal */}
        {showAddModal && (
          <AddAPIKeyModal
            onClose={() => setShowAddModal(false)}
            onSuccess={() => {
              setShowAddModal(false);
              loadAPIKeys();
            }}
          />
        )}
      </div>
    </div>
  );
};

// Add API Key Modal Component
interface AddAPIKeyModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const AddAPIKeyModal: React.FC<AddAPIKeyModalProps> = ({ onClose, onSuccess }) => {
  const { showToast } = useNotifications();
  const [formData, setFormData] = useState({
    provider: 'openai',
    key_name: '',
    api_key: ''
  });
  const [showApiKey, setShowApiKey] = useState(false);
  const [loading, setLoading] = useState(false);

  const providers = [
    { value: 'openai', label: 'OpenAI (GPT-4, GPT-3.5)', icon: '🤖' },
    { value: 'claude', label: 'Anthropic Claude', icon: '🧠' },
    { value: 'gemini', label: 'Google Gemini', icon: '💎' }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.key_name.trim() || !formData.api_key.trim()) {
      showToast({
        type: 'error',
        title: 'Missing Information',
        message: 'Please fill in all required fields',
        autoClose: true,
      });
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch('/api/v1/api-keys/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const data = await response.json();
        showToast({
          type: data.is_valid ? 'success' : 'warning',
          title: 'API Key Added',
          message: data.is_valid 
            ? 'API key added and validated successfully' 
            : 'API key added but validation failed. Please check the key.',
          autoClose: true,
        });
        onSuccess();
      } else {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to add API key');
      }
    } catch (error) {
      console.error('Failed to add API key:', error);
      showToast({
        type: 'error',
        title: 'Error',
        message: error instanceof Error ? error.message : 'Failed to add API key',
        autoClose: true,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-md border border-gray-700">
        <h2 className="text-2xl font-bold text-white mb-6">Add API Key</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Provider Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              AI Provider *
            </label>
            <select
              value={formData.provider}
              onChange={(e) => setFormData(prev => ({ ...prev, provider: e.target.value }))}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {providers.map(provider => (
                <option key={provider.value} value={provider.value}>
                  {provider.icon} {provider.label}
                </option>
              ))}
            </select>
          </div>

          {/* Key Name */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Key Name *
            </label>
            <input
              type="text"
              value={formData.key_name}
              onChange={(e) => setFormData(prev => ({ ...prev, key_name: e.target.value }))}
              placeholder="e.g., Production OpenAI Key"
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* API Key */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              API Key *
            </label>
            <div className="relative">
              <input
                type={showApiKey ? "text" : "password"}
                value={formData.api_key}
                onChange={(e) => setFormData(prev => ({ ...prev, api_key: e.target.value }))}
                placeholder="Enter your API key"
                className="w-full px-3 py-2 pr-10 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-3 top-2.5 text-gray-400 hover:text-white"
              >
                {showApiKey ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Your API key is encrypted and stored securely. We only use it to make requests on your behalf.
            </p>
          </div>

          {/* Actions */}
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-lg transition-all disabled:opacity-50"
            >
              {loading ? 'Adding...' : 'Add Key'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default APIKeyManagement;