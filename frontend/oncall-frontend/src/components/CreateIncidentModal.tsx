// frontend/src/components/CreateIncidentModal.tsx - Connected to backend
import React, { useState } from 'react';
import { 
  XMarkIcon, 
  ExclamationTriangleIcon, 
  FireIcon, 
  InformationCircleIcon,
  TagIcon,
  PlusIcon
} from '@heroicons/react/24/outline';
import { useNotifications } from '../contexts/NotificationContext';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1';

interface CreateIncidentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onIncidentCreated: () => void;
}

interface IncidentFormData {
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  tags: string[];
}

const CreateIncidentModal: React.FC<CreateIncidentModalProps> = ({ 
  isOpen, 
  onClose, 
  onIncidentCreated 
}) => {
  const { showToast } = useNotifications();
  const [formData, setFormData] = useState<IncidentFormData>({
    title: '',
    description: '',
    severity: 'medium',
    tags: []
  });
  const [tagInput, setTagInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (!isOpen) return null;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear field error when user types
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      const newTag = tagInput.trim().toLowerCase();
      if (!formData.tags.includes(newTag)) {
        setFormData(prev => ({
          ...prev,
          tags: [...prev.tags, newTag]
        }));
      }
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }
    
    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsLoading(true);

    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${API_BASE_URL}/incidents/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: formData.title.trim(),
          description: formData.description.trim(),
          severity: formData.severity,
          tags: formData.tags
        }),
      });

      if (response.ok) {
        const newIncident = await response.json();
        
        // Show success notification
        showToast({
          type: 'success',
          title: 'Incident Created',
          message: `Incident "${formData.title}" has been created successfully`,
          autoClose: true,
          duration: 5000
        });
        
        // Reset form
        setFormData({
          title: '',
          description: '',
          severity: 'medium',
          tags: []
        });
        setTagInput('');
        setErrors({});
        
        // Notify parent and close modal
        onIncidentCreated();
        onClose();
      } else {
        const errorData = await response.json();
        showToast({
          type: 'error',
          title: 'Creation Failed',
          message: errorData.detail || 'Failed to create incident'
        });
      }
    } catch (error) {
      console.error('Error creating incident:', error);
      showToast({
        type: 'error',
        title: 'Connection Error',
        message: 'Unable to connect to server. Please try again.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      title: '',
      description: '',
      severity: 'medium',
      tags: []
    });
    setTagInput('');
    setErrors({});
    onClose();
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <FireIcon className="w-5 h-5 text-red-400" />;
      case 'high': return <ExclamationTriangleIcon className="w-5 h-5 text-orange-400" />;
      case 'medium': return <ExclamationTriangleIcon className="w-5 h-5 text-yellow-400" />;
      default: return <InformationCircleIcon className="w-5 h-5 text-blue-400" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'border-red-500 bg-red-500/10';
      case 'high': return 'border-orange-500 bg-orange-500/10';
      case 'medium': return 'border-yellow-500 bg-yellow-500/10';
      default: return 'border-blue-500 bg-blue-500/10';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-gray-900/95 backdrop-blur-sm border border-white/10 rounded-xl w-full max-w-md max-h-[90vh] overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <PlusIcon className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Create Incident</h2>
              <p className="text-sm text-gray-400">Report a new incident</p>
            </div>
          </div>
          <button
            onClick={handleCancel}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <XMarkIcon className="w-5 h-5 text-gray-400 hover:text-white" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
          
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Title <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
              placeholder="Brief description of the incident"
            />
            {errors.title && <p className="text-red-400 text-sm mt-1">{errors.title}</p>}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Description <span className="text-red-400">*</span>
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows={4}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent resize-none"
              placeholder="Detailed description of what happened..."
            />
            {errors.description && <p className="text-red-400 text-sm mt-1">{errors.description}</p>}
          </div>

          {/* Severity */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Severity</label>
            <div className="grid grid-cols-2 gap-2">
              {(['low', 'medium', 'high', 'critical'] as const).map((severity) => (
                <button
                  key={severity}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, severity }))}
                  className={`flex items-center space-x-2 p-3 rounded-lg border-2 transition-all ${
                    formData.severity === severity 
                      ? getSeverityColor(severity)
                      : 'border-white/20 bg-white/5 hover:bg-white/10'
                  }`}
                >
                  {getSeverityIcon(severity)}
                  <span className="text-white font-medium capitalize">{severity}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              <TagIcon className="w-4 h-4 inline mr-1" />
              Tags (optional)
            </label>
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleAddTag}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
              placeholder="Type a tag and press Enter"
            />
            
            {/* Tag List */}
            {formData.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center px-2 py-1 bg-blue-500/20 text-blue-300 rounded-md text-sm"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="ml-1 text-blue-300 hover:text-white"
                    >
                      <XMarkIcon className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </form>

        {/* Footer */}
        <div className="flex space-x-3 p-6 border-t border-white/10">
          <button
            type="button"
            onClick={handleCancel}
            disabled={isLoading}
            className="flex-1 px-4 py-3 bg-white/10 text-gray-300 rounded-lg hover:bg-white/20 transition-colors font-medium disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isLoading}
            className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-lg transition-all duration-200 font-medium disabled:opacity-50 flex items-center justify-center space-x-2"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span>Creating...</span>
              </>
            ) : (
              <>
                <PlusIcon className="w-4 h-4" />
                <span>Create Incident</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateIncidentModal;