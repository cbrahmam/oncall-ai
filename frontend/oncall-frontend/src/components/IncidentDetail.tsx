// frontend/oncall-frontend/src/components/IncidentDetail.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { 
  ArrowLeftIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  UserIcon,
  TagIcon,
  CheckCircleIcon,
  XMarkIcon,
  PaperClipIcon,
  ChatBubbleLeftIcon,
  FireIcon,
  InformationCircleIcon,
  CogIcon,
  ShareIcon
} from '@heroicons/react/24/outline';
import { useNotifications } from '../contexts/NotificationContext';
import IncidentTimeline from './IncidentTimeline';
import IncidentComments from './IncidentComments';
import IncidentActions from './IncidentActions';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1';


interface IncidentDetailProps {
  incidentId: string;
  onBack: () => void;
}

interface Incident {
  id: string;
  title: string;
  description?: string; // Made optional to match IncidentData
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'acknowledged' | 'resolved' | 'closed';
  assigned_to_id?: string;
  assigned_to_name?: string;
  created_by_name?: string; // Made optional to match IncidentData
  tags?: string[]; // Made optional to match IncidentData
  created_at?: string; // Made optional to match IncidentData
  updated_at?: string; // Made optional to match IncidentData
  resolved_at?: string;
  acknowledged_at?: string;
}

const IncidentDetail: React.FC<IncidentDetailProps> = ({ incidentId, onBack }) => {
  const { showToast } = useNotifications();
  const [incident, setIncident] = useState<Incident | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'timeline' | 'comments' | 'attachments'>('timeline');
  const [isEditing, setIsEditing] = useState(false);

  const fetchIncident = useCallback(async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${API_BASE_URL}/incidents/${incidentId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setIncident(data);
      } else {
        showToast({
          type: 'error',
          title: 'Error Loading Incident',
          message: 'Failed to load incident details'
        });
      }
    } catch (error) {
      console.error('Error fetching incident:', error);
      showToast({
        type: 'error',
        title: 'Network Error',
        message: 'Unable to connect to server'
      });
    } finally {
      setIsLoading(false);
    }
  }, [incidentId, showToast]);

  useEffect(() => {
    fetchIncident();
  }, [fetchIncident]);

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <FireIcon className="w-5 h-5 text-red-400" />;
      case 'high':
        return <ExclamationTriangleIcon className="w-5 h-5 text-orange-400" />;
      case 'medium':
        return <InformationCircleIcon className="w-5 h-5 text-yellow-400" />;
      case 'low':
        return <InformationCircleIcon className="w-5 h-5 text-blue-400" />;
      default:
        return <InformationCircleIcon className="w-5 h-5 text-gray-400" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-500/20 text-red-300 border-red-500/30';
      case 'high':
        return 'bg-orange-500/20 text-orange-300 border-orange-500/30';
      case 'medium':
        return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
      case 'low':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      default:
        return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'bg-red-500/20 text-red-300 border-red-500/30';
      case 'acknowledged':
        return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
      case 'resolved':
        return 'bg-green-500/20 text-green-300 border-green-500/30';
      case 'closed':
        return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
      default:
        return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString(),
      relative: getRelativeTime(date)
    };
  };

  const getRelativeTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    return 'Just now';
  };

  const calculateDuration = () => {
    if (!incident || !incident.created_at) return null;
    
    const start = new Date(incident.created_at);
    const end = incident.resolved_at ? new Date(incident.resolved_at) : new Date();
    const diff = end.getTime() - start.getTime();
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const handleIncidentUpdate = (updatedIncident: Incident) => {
    setIncident(updatedIncident);
    showToast({
      type: 'success',
      title: 'Incident Updated',
      message: 'Incident has been successfully updated'
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="glass-card rounded-xl p-8 text-center">
          <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-300">Loading incident details...</p>
        </div>
      </div>
    );
  }

  if (!incident) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="glass-card rounded-xl p-8 text-center">
          <XMarkIcon className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">Incident Not Found</h2>
          <p className="text-gray-400 mb-4">The incident you're looking for doesn't exist or you don't have access to it.</p>
          <button
            onClick={onBack}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const createdDate = incident.created_at ? formatDateTime(incident.created_at) : null;

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <div className="glass-card border-b border-white/10 sticky top-0 z-30 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={onBack}
                className="p-2 text-gray-300 hover:text-white transition-colors rounded-lg hover:bg-white/10"
              >
                <ArrowLeftIcon className="w-5 h-5" />
              </button>
              <div className="flex items-center space-x-3">
                {getSeverityIcon(incident.severity)}
                <h1 className="text-xl font-semibold text-white">
                  {incident.title}
                </h1>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <button className="p-2 text-gray-300 hover:text-white transition-colors rounded-lg hover:bg-white/10">
                <ShareIcon className="w-5 h-5" />
              </button>
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="p-2 text-gray-300 hover:text-white transition-colors rounded-lg hover:bg-white/10"
              >
                <CogIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Incident Overview */}
            <div className="glass-card rounded-xl p-6">
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center space-x-4">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getSeverityColor(incident.severity)}`}>
                    {getSeverityIcon(incident.severity)}
                    <span className="ml-2">{incident.severity.toUpperCase()}</span>
                  </span>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(incident.status)}`}>
                    {incident.status === 'resolved' ? (
                      <CheckCircleIcon className="w-4 h-4 mr-2" />
                    ) : (
                      <ClockIcon className="w-4 h-4 mr-2" />
                    )}
                    {incident.status.toUpperCase()}
                  </span>
                </div>
                <div className="text-right text-sm text-gray-400">
                  <p>Duration: {calculateDuration()}</p>
                  <p>#{incident.id.slice(-8)}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-semibold text-white mb-2">Description</h2>
                  <p className="text-gray-300 leading-relaxed">
                    {incident.description || 'No description provided.'}
                  </p>
                </div>

                {incident.tags && incident.tags.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-400 mb-2 flex items-center">
                      <TagIcon className="w-4 h-4 mr-1" />
                      Tags
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {incident.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-blue-500/20 text-blue-300 rounded-lg text-sm border border-blue-500/30"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Tabs */}
            <div className="glass-card rounded-xl p-6">
              <div className="border-b border-white/10 mb-6">
                <nav className="flex space-x-8">
                  {[
                    { id: 'timeline', label: 'Timeline', icon: ClockIcon },
                    { id: 'comments', label: 'Comments', icon: ChatBubbleLeftIcon },
                    { id: 'attachments', label: 'Attachments', icon: PaperClipIcon },
                  ].map(({ id, label, icon: Icon }) => (
                    <button
                      key={id}
                      onClick={() => setActiveTab(id as any)}
                      className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                        activeTab === id
                          ? 'border-blue-500 text-blue-400'
                          : 'border-transparent text-gray-400 hover:text-gray-300'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{label}</span>
                    </button>
                  ))}
                </nav>
              </div>

              {/* Tab Content */}
              <div className="min-h-[400px]">
                {activeTab === 'timeline' && (
                  <IncidentTimeline incidentId={incident.id} />
                )}
                {activeTab === 'comments' && (
                  <IncidentComments incidentId={incident.id} />
                )}
                {activeTab === 'attachments' && (
                  <div className="text-center py-12">
                    <PaperClipIcon className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-400 mb-2">No Attachments</h3>
                    <p className="text-gray-500 text-sm">
                      Drag and drop files here or click to upload
                    </p>
                    <button className="mt-4 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors">
                      Upload Files
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <IncidentActions 
              incident={incident} 
              onUpdate={handleIncidentUpdate}
            />

            {/* Incident Details */}
            <div className="glass-card rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Incident Details</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-400">Created by</p>
                  <div className="flex items-center space-x-2 mt-1">
                    <UserIcon className="w-4 h-4 text-gray-400" />
                    <span className="text-white">{incident.created_by_name || 'Unknown'}</span>
                  </div>
                </div>

                {incident.assigned_to_name && (
                  <div>
                    <p className="text-sm text-gray-400">Assigned to</p>
                    <div className="flex items-center space-x-2 mt-1">
                      <UserIcon className="w-4 h-4 text-gray-400" />
                      <span className="text-white">{incident.assigned_to_name}</span>
                    </div>
                  </div>
                )}

                <div>
                  <p className="text-sm text-gray-400">Created</p>
                  <p className="text-white">{incident.created_at ? formatDateTime(incident.created_at).date : 'Unknown'} at {incident.created_at ? formatDateTime(incident.created_at).time : 'Unknown'}</p>
                  <p className="text-sm text-gray-500">{incident.created_at ? formatDateTime(incident.created_at).relative : 'Unknown'}</p>
                </div>

                {incident.resolved_at && (
                  <div>
                    <p className="text-sm text-gray-400">Resolved</p>
                    <p className="text-white">{formatDateTime(incident.resolved_at).date}</p>
                    <p className="text-sm text-gray-500">{formatDateTime(incident.resolved_at).relative}</p>
                  </div>
                )}
              </div>
            </div>

            {/* AI Insights */}
            <div className="glass-card rounded-xl p-6 border border-purple-500/30 bg-purple-500/5">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                <div className="w-6 h-6 bg-purple-500 rounded text-white text-xs flex items-center justify-center mr-2">
                  AI
                </div>
                Insights
              </h3>
              <div className="space-y-3">
                <div className="p-3 bg-purple-500/10 rounded-lg border border-purple-500/20">
                  <p className="text-sm text-purple-300">
                    🎯 <strong>Suggested Action:</strong> Check database connection pool and restart web servers if necessary.
                  </p>
                </div>
                <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
                  <p className="text-sm text-blue-300">
                    📊 <strong>Similar Incidents:</strong> 3 similar incidents resolved in avg 23 minutes.
                  </p>
                </div>
                <div className="p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
                  <p className="text-sm text-yellow-300">
                    ⚠️ <strong>Risk Assessment:</strong> High impact on user authentication systems.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IncidentDetail;