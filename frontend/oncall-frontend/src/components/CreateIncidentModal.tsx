import React, { useState } from 'react';
import { 
  XMarkIcon, 
  ExclamationTriangleIcon, 
  FireIcon, 
  InformationCircleIcon,
  TagIcon
} from '@heroicons/react/24/outline';

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
  const [formData, setFormData] = useState<IncidentFormData>({
    title: '',
    description: '',
    severity: 'medium',
    tags: []
  });
  const [tagInput, setTagInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (error) setError(null);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      setError('Title is required');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch('http://localhost:8000/api/v1/incidents/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        // Reset form
        setFormData({
          title: '',
          description: '',
          severity: 'medium',
          tags: []
        });
        setTagInput('');
        
        // Notify parent and close modal
        onIncidentCreated();
        onClose();
      } else {
        const errorData = await response.json();
        setError(errorData.detail || 'Failed to create incident');
      }
    } catch (error) {
      console.error('Error creating incident:', error);
      setError('Unable to connect to server. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <FireIcon className="w-5 h-5" />;
      case 'high': return <ExclamationTriangleIcon className="w-5 h-5" />;
      case 'medium': return <InformationCircleIcon className="w-5 h-5" />;
      default: return <InformationCircleIcon className="w-5 h-5" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'border-red-500 bg-red-500/10 text-red-300';
      case 'high': return 'border-orange-500 bg-orange-500/10 text-orange-300';
      case 'medium': return 'border-yellow-500 bg-yellow-500/10 text-yellow-300';
      default: return 'border-green-500 bg-green-500/10 text-green-300';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose}></div>
      
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-lg">
          <div className="glass-card rounded-2xl p-6 shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-red-500 to-orange-500 rounded-xl flex items-center justify-center">
                  <ExclamationTriangleIcon className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-xl font-bold text-white">Create New Incident</h2>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-white transition-colors p-1"
                disabled={isLoading}
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-xl">
                <p className="text-red-200 text-sm">{error}</p>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Title */}
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-300 mb-2">
                  Incident Title *
                </label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200"
                  placeholder="Brief description of the issue..."
                  disabled={isLoading}
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={4}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200 resize-none"
                  placeholder="Provide additional details about the incident..."
                  disabled={isLoading}
                />
              </div>

              {/* Severity */}
              <div>
                <label htmlFor="severity" className="block text-sm font-medium text-gray-300 mb-2">
                  Severity Level
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {['low', 'medium', 'high', 'critical'].map((severity) => (
                    <button
                      key={severity}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, severity: severity as any }))}
                      className={`p-3 rounded-xl border-2 transition-all duration-200 flex items-center space-x-2 ${
                        formData.severity === severity
                          ? getSeverityColor(severity)
                          : 'border-white/20 bg-white/5 text-gray-400 hover:border-white/30'
                      }`}
                      disabled={isLoading}
                    >
                      {getSeverityIcon(severity)}
                      <span className="text-sm font-medium capitalize">{severity}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Tags */}
              <div>
                <label htmlFor="tags" className="block text-sm font-medium text-gray-300 mb-2">
                  Tags
                </label>
                <div className="space-y-3">
                  <div className="relative">
                    <TagIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyPress={handleAddTag}
                      className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200"
                      placeholder="Add tags (press Enter)..."
                      disabled={isLoading}
                    />
                  </div>
                  
                  {formData.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {formData.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-500/20 text-blue-300 border border-blue-500/30"
                        >
                          {tag}
                          <button
                            type="button"
                            onClick={() => handleRemoveTag(tag)}
                            className="ml-2 text-blue-300 hover:text-white transition-colors"
                            disabled={isLoading}
                          >
                            <XMarkIcon className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-3 bg-white/10 text-gray-300 rounded-xl hover:bg-white/20 transition-colors font-medium"
                  disabled={isLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white rounded-xl transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Creating...
                    </div>
                  ) : (
                    'Create Incident'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateIncidentModal;