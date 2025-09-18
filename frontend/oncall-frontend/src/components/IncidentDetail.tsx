// frontend/src/components/IncidentDetail.tsx
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
  ShareIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';
import { useNotifications } from '../contexts/NotificationContext';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1';

interface IncidentDetailProps {
  incidentId: string;
  onBack: () => void;
  onShowAIAnalysis?: (incidentId: string, analysisData: any) => void;
  onNavigateToIncident?: (id: string) => void;
}

interface Incident {
  id: string;
  title: string;
  description?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'acknowledged' | 'resolved' | 'closed';
  assigned_to_id?: string;
  assigned_to_name?: string;
  created_by_name?: string;
  tags?: string[];
  created_at?: string;
  updated_at?: string;
  resolved_at?: string;
  acknowledged_at?: string;
}

interface Comment {
  id: string;
  user_name: string;
  user_id?: string;
  content: string;
  created_at: string;
  updated_at: string;
}

const IncidentDetail: React.FC<IncidentDetailProps> = ({ 
  incidentId, 
  onBack, 
  onShowAIAnalysis,
  onNavigateToIncident 
}) => {
  const { showToast } = useNotifications();
  const [incident, setIncident] = useState<Incident | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'timeline' | 'comments' | 'attachments'>('timeline');
  const [isEditing, setIsEditing] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

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
        message: 'Unable to connect to the server'
      });
    } finally {
      setIsLoading(false);
    }
  }, [incidentId, showToast]);

  // ADD THE COMPLETE AI ANALYSIS METHOD HERE
  const handleRequestAIAnalysis = async () => {
    if (onShowAIAnalysis && incident) {
      showToast({
        type: 'info',
        title: 'AI Analysis Requested',
        message: 'Getting AI recommendations from Claude and Gemini...',
        autoClose: false,
      });

      try {
        const token = localStorage.getItem('access_token');
        const response = await fetch(`${API_BASE_URL}/incidents/${incidentId}/ai-analysis`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const analysisData = await response.json();
          onShowAIAnalysis(incidentId, analysisData);
          
          showToast({
            type: 'success',
            title: 'AI Analysis Ready',
            message: 'AI has analyzed the incident and provided recommendations',
            autoClose: true,
          });
        } else {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || `Analysis failed: ${response.status}`);
        }
      } catch (error) {
        console.error('Error requesting AI analysis:', error);
        showToast({
          type: 'error',
          title: 'AI Analysis Failed',
          message: error instanceof Error ? error.message : 'Unable to get AI analysis',
          autoClose: true,
        });
      }
    }
  };

  const fetchComments = useCallback(async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${API_BASE_URL}/incidents/${incidentId}/comments`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setComments(data.comments || []);
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
    }
  }, [incidentId]);

  const updateIncidentStatus = async (newStatus: string) => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${API_BASE_URL}/incidents/${incidentId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        const updatedIncident = await response.json();
        setIncident(updatedIncident);
        showToast({
          type: 'success',
          title: 'Status Updated',
          message: `Incident status changed to ${newStatus}`,
          autoClose: true,
        });
      }
    } catch (error) {
      console.error('Error updating status:', error);
      showToast({
        type: 'error',
        title: 'Update Failed',
        message: 'Failed to update incident status',
        autoClose: true,
      });
    }
  };

  const addComment = async () => {
    if (!newComment.trim()) return;

    setIsSubmittingComment(true);
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${API_BASE_URL}/incidents/${incidentId}/comments`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ comment: newComment.trim() }),
      });

      if (response.ok) {
        setNewComment('');
        await fetchComments(); // Refresh comments
        showToast({
          type: 'success',
          title: 'Comment Added',
          message: 'Your comment has been added to the incident',
          autoClose: true,
        });
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      showToast({
        type: 'error',
        title: 'Comment Failed',
        message: 'Failed to add comment',
        autoClose: true,
      });
    } finally {
      setIsSubmittingComment(false);
    }
  };

  useEffect(() => {
    fetchIncident();
    fetchComments();
  }, [fetchIncident, fetchComments]);

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    let relative;
    if (diffMins < 1) relative = 'just now';
    else if (diffMins < 60) relative = `${diffMins}m ago`;
    else if (diffHours < 24) relative = `${diffHours}h ago`;
    else relative = `${diffDays}d ago`;

    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString(),
      relative
    };
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-red-500';
      case 'acknowledged': return 'bg-yellow-500';
      case 'resolved': return 'bg-green-500';
      case 'closed': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
        <div className="text-white">Loading incident details...</div>
      </div>
    );
  }

  if (!incident) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Incident Not Found</h2>
          <button
            onClick={onBack}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={onBack}
            className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeftIcon className="w-5 h-5" />
            <span>Back to Dashboard</span>
          </button>

          <div className="flex items-center space-x-3">
            <button
              onClick={handleRequestAIAnalysis}
              className="flex items-center space-x-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
            >
              <SparklesIcon className="w-5 h-5" />
              <span>Get AI Analysis</span>
            </button>

            <button
              onClick={() => setIsEditing(!isEditing)}
              className="flex items-center space-x-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
            >
              <CogIcon className="w-5 h-5" />
              <span>Edit</span>
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Main Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Incident Header */}
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium text-white ${getSeverityColor(incident.severity)}`}>
                    {incident.severity.toUpperCase()}
                  </span>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium text-white ${getStatusColor(incident.status)}`}>
                    {incident.status.toUpperCase()}
                  </span>
                </div>
                <div className="text-right text-sm text-gray-400">
                  <p>Created {incident.created_at ? formatDateTime(incident.created_at).relative : 'Unknown'}</p>
                </div>
              </div>

              <h1 className="text-2xl font-bold text-white mb-4">{incident.title}</h1>
              
              {incident.description && (
                <p className="text-gray-300 leading-relaxed">{incident.description}</p>
              )}

              {incident.tags && incident.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {incident.tags.map((tag, index) => (
                    <span key={index} className="px-2 py-1 bg-gray-700 text-gray-300 text-xs rounded">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-4">
              {incident.status === 'open' && (
                <button
                  onClick={() => updateIncidentStatus('acknowledged')}
                  className="flex items-center space-x-2 px-6 py-3 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors"
                >
                  <CheckCircleIcon className="w-5 h-5" />
                  <span>Acknowledge</span>
                </button>
              )}
              
              {incident.status === 'acknowledged' && (
                <button
                  onClick={() => updateIncidentStatus('resolved')}
                  className="flex items-center space-x-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                >
                  <CheckCircleIcon className="w-5 h-5" />
                  <span>Resolve</span>
                </button>
              )}
            </div>

            {/* Tabs */}
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl">
              <div className="flex border-b border-gray-700/50">
                {[
                  { key: 'timeline', label: 'Timeline', icon: ClockIcon },
                  { key: 'comments', label: 'Comments', icon: ChatBubbleLeftIcon },
                  { key: 'attachments', label: 'Attachments', icon: PaperClipIcon }
                ].map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    onClick={() => setActiveTab(key as any)}
                    className={`flex items-center space-x-2 px-6 py-4 text-sm font-medium transition-colors ${
                      activeTab === key
                        ? 'text-blue-400 border-b-2 border-blue-400'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{label}</span>
                  </button>
                ))}
              </div>

              <div className="p-6">
                {/* Timeline Tab */}
                {activeTab === 'timeline' && (
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                      <div>
                        <p className="text-white">Incident created</p>
                        <p className="text-sm text-gray-400">
                          {incident.created_at ? formatDateTime(incident.created_at).relative : 'Unknown time'}
                        </p>
                      </div>
                    </div>

                    {incident.acknowledged_at && (
                      <div className="flex items-center space-x-3">
                        <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                        <div>
                          <p className="text-white">Incident acknowledged by {incident.assigned_to_name}</p>
                          <p className="text-sm text-gray-400">
                            {formatDateTime(incident.acknowledged_at).relative}
                          </p>
                        </div>
                      </div>
                    )}

                    {incident.resolved_at && (
                      <div className="flex items-center space-x-3">
                        <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                        <div>
                          <p className="text-white">Incident resolved</p>
                          <p className="text-sm text-gray-400">
                            {formatDateTime(incident.resolved_at).relative}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Comments Tab */}
                {activeTab === 'comments' && (
                  <div className="space-y-4">
                    {/* Add Comment */}
                    <div className="space-y-3">
                      <textarea
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Add a comment..."
                        className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 resize-none"
                        rows={3}
                      />
                      <button
                        onClick={addComment}
                        disabled={!newComment.trim() || isSubmittingComment}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                      >
                        {isSubmittingComment ? 'Adding...' : 'Add Comment'}
                      </button>
                    </div>

                    {/* Comments List */}
                    <div className="space-y-4">
                      {comments.length > 0 ? (
                        comments.map((comment) => (
                          <div key={comment.id} className="p-4 bg-gray-700/30 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-medium text-white">{comment.user_name}</span>
                              <span className="text-sm text-gray-400">
                                {formatDateTime(comment.created_at).relative}
                              </span>
                            </div>
                            <p className="text-gray-300">{comment.content}</p>
                          </div>
                        ))
                      ) : (
                        <p className="text-gray-400 text-center py-8">No comments yet</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Attachments Tab */}
                {activeTab === 'attachments' && (
                  <div className="text-center py-8">
                    <PaperClipIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-400">No attachments yet</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Metadata */}
          <div className="space-y-6">
            {/* Metadata Card */}
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Details</h3>
              
              <div className="space-y-4">
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

                {incident.assigned_to_name && (
                  <div>
                    <p className="text-sm text-gray-400">Assigned to</p>
                    <p className="text-white">{incident.assigned_to_name}</p>
                  </div>
                )}

                {incident.created_by_name && (
                  <div>
                    <p className="text-sm text-gray-400">Created by</p>
                    <p className="text-white">{incident.created_by_name}</p>
                  </div>
                )}
              </div>
            </div>

            {/* AI Insights */}
            <div className="bg-gray-800/50 backdrop-blur-sm border border-purple-500/30 rounded-xl p-6">
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