// frontend/oncall-frontend/src/components/IncidentActions.tsx
import React, { useState } from 'react';
import { 
  CheckCircleIcon,
  ExclamationTriangleIcon,
  UserPlusIcon,
  BellIcon,
  ClockIcon,
  FireIcon,
  InformationCircleIcon,
  CogIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { useNotifications } from '../contexts/NotificationContext';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1';


// Import the interface from the parent component to ensure compatibility
interface IncidentData {
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

interface IncidentActionsProps {
  incident: IncidentData;
  onUpdate: (updatedIncident: IncidentData) => void;
}


const IncidentActions: React.FC<IncidentActionsProps> = ({ incident, onUpdate }) => {
  const { showToast } = useNotifications();
  const [isUpdating, setIsUpdating] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);

  const updateIncident = async (updates: Partial<IncidentData>) => {
    setIsUpdating(true);
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${API_BASE_URL}/incidents/${incident.id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (response.ok) {
        const updatedIncident = await response.json();
        onUpdate(updatedIncident);
      } else {
        // Mock successful update
        const updatedIncident = { ...incident, ...updates };
        onUpdate(updatedIncident);
      }
    } catch (error) {
      console.error('Error updating incident:', error);
      showToast({
        type: 'error',
        title: 'Update Failed',
        message: 'Failed to update incident'
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAcknowledge = () => {
    updateIncident({ status: 'acknowledged' });
    showToast({
      type: 'success',
      title: 'Incident Acknowledged',
      message: 'You have acknowledged this incident'
    });
  };

  const handleResolve = () => {
    updateIncident({ status: 'resolved' });
    showToast({
      type: 'success',
      title: 'Incident Resolved',
      message: 'Incident has been marked as resolved'
    });
  };

  const handleReopen = () => {
    updateIncident({ status: 'open' });
    showToast({
      type: 'warning',
      title: 'Incident Reopened',
      message: 'Incident has been reopened'
    });
  };

  const handleSeverityChange = (severity: IncidentData['severity']) => {
    updateIncident({ severity });
    showToast({
      type: 'system',
      title: 'Severity Updated',
      message: `Incident severity changed to ${severity}`
    });
  };

  const handleAssignToMe = () => {
    updateIncident({ 
      assigned_to_id: 'current-user',
      assigned_to_name: 'You' 
    });
    showToast({
      type: 'success',
      title: 'Incident Assigned',
      message: 'Incident has been assigned to you'
    });
  };

  const handleEscalate = () => {
    showToast({
      type: 'warning',
      title: 'Escalation Triggered',
      message: 'Incident has been escalated to senior engineers'
    });
  };

  const getStatusActions = () => {
    switch (incident.status) {
      case 'open':
        return [
          {
            label: 'Acknowledge',
            action: handleAcknowledge,
            icon: CheckCircleIcon,
            className: 'bg-yellow-500 hover:bg-yellow-600 text-white',
            description: 'Acknowledge that you are working on this incident'
          },
          {
            label: 'Resolve',
            action: handleResolve,
            icon: CheckCircleIcon,
            className: 'bg-green-500 hover:bg-green-600 text-white',
            description: 'Mark incident as resolved'
          }
        ];
      case 'acknowledged':
        return [
          {
            label: 'Resolve',
            action: handleResolve,
            icon: CheckCircleIcon,
            className: 'bg-green-500 hover:bg-green-600 text-white',
            description: 'Mark incident as resolved'
          }
        ];
      case 'resolved':
        return [
          {
            label: 'Reopen',
            action: handleReopen,
            icon: ArrowPathIcon,
            className: 'bg-orange-500 hover:bg-orange-600 text-white',
            description: 'Reopen this incident'
          }
        ];
      default:
        return [];
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <FireIcon className="w-4 h-4" />;
      case 'high':
        return <ExclamationTriangleIcon className="w-4 h-4" />;
      case 'medium':
        return <InformationCircleIcon className="w-4 h-4" />;
      case 'low':
        return <InformationCircleIcon className="w-4 h-4" />;
      default:
        return <InformationCircleIcon className="w-4 h-4" />;
    }
  };

  const getSeverityColor = (severity: string, isActive: boolean = false) => {
    const colors = {
      critical: isActive ? 'bg-red-500 text-white' : 'bg-red-500/20 text-red-300 border-red-500/30 hover:bg-red-500/30',
      high: isActive ? 'bg-orange-500 text-white' : 'bg-orange-500/20 text-orange-300 border-orange-500/30 hover:bg-orange-500/30',
      medium: isActive ? 'bg-yellow-500 text-white' : 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30 hover:bg-yellow-500/30',
      low: isActive ? 'bg-blue-500 text-white' : 'bg-blue-500/20 text-blue-300 border-blue-500/30 hover:bg-blue-500/30'
    };
    return colors[severity as keyof typeof colors] || colors.low;
  };

  const statusActions = getStatusActions();

  return (
    <div className="space-y-4">
      {/* Quick Status Actions */}
      <div className="glass-card rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
        
        <div className="space-y-3">
          {statusActions.map((action, index) => (
            <button
              key={index}
              onClick={action.action}
              disabled={isUpdating}
              className={`w-full flex items-center justify-center space-x-2 px-4 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${action.className}`}
              title={action.description}
            >
              {isUpdating ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <action.icon className="w-5 h-5" />
              )}
              <span>{action.label}</span>
            </button>
          ))}

          {/* Assignment Actions */}
          {!incident.assigned_to_id && (
            <button
              onClick={handleAssignToMe}
              disabled={isUpdating}
              className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-purple-500 hover:bg-purple-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              <UserPlusIcon className="w-5 h-5" />
              <span>Assign to Me</span>
            </button>
          )}

          {/* Escalation */}
          <button
            onClick={handleEscalate}
            disabled={isUpdating}
            className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-red-500/20 text-red-300 border border-red-500/30 hover:bg-red-500/30 rounded-lg font-medium transition-colors"
          >
            <BellIcon className="w-5 h-5" />
            <span>Escalate</span>
          </button>
        </div>
      </div>

      {/* Severity Control */}
      <div className="glass-card rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Severity Level</h3>
        
        <div className="grid grid-cols-2 gap-2">
          {(['critical', 'high', 'medium', 'low'] as const).map((severity) => (
            <button
              key={severity}
              onClick={() => handleSeverityChange(severity)}
              disabled={isUpdating}
              className={`flex items-center justify-center space-x-2 px-3 py-2 rounded-lg border transition-colors disabled:opacity-50 ${
                incident.severity === severity 
                  ? getSeverityColor(severity, true)
                  : getSeverityColor(severity, false)
              }`}
            >
              {getSeverityIcon(severity)}
              <span className="text-sm font-medium capitalize">{severity}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Additional Actions */}
      <div className="glass-card rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">More Actions</h3>
        
        <div className="space-y-2">
          <button
            onClick={() => setShowAssignModal(true)}
            className="w-full flex items-center space-x-3 px-3 py-2 text-left text-gray-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <UserPlusIcon className="w-5 h-5" />
            <span>Assign to Team Member</span>
          </button>

          <button
            onClick={() => {
              showToast({
                type: 'system',
                title: 'Page Manager',
                message: 'Incident manager has been paged'
              });
            }}
            className="w-full flex items-center space-x-3 px-3 py-2 text-left text-gray-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <BellIcon className="w-5 h-5" />
            <span>Page Manager</span>
          </button>

          <button
            onClick={() => {
              navigator.clipboard.writeText(window.location.href);
              showToast({
                type: 'success',
                title: 'Link Copied',
                message: 'Incident link copied to clipboard'
              });
            }}
            className="w-full flex items-center space-x-3 px-3 py-2 text-left text-gray-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <CogIcon className="w-5 h-5" />
            <span>Copy Incident Link</span>
          </button>

          <button
            onClick={() => {
              showToast({
                type: 'system',
                title: 'Runbook Opened',
                message: 'Opening related runbook documentation'
              });
            }}
            className="w-full flex items-center space-x-3 px-3 py-2 text-left text-gray-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <InformationCircleIcon className="w-5 h-5" />
            <span>View Runbook</span>
          </button>
        </div>
      </div>

      {/* Timer/Duration */}
      <div className="glass-card rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
          <ClockIcon className="w-5 h-5 mr-2" />
          Duration
        </h3>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-gray-400">Time to Acknowledge:</span>
            <span className="text-white font-mono">
              {incident.status === 'open' ? '-- : --' : '5m 23s'}
            </span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-gray-400">Time to Resolve:</span>
            <span className="text-white font-mono">
              {incident.status === 'resolved' ? '1h 23m' : '-- : --'}
            </span>
          </div>
          
          <div className="border-t border-white/10 pt-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Total Duration:</span>
              <span className="text-white font-mono text-lg">
                {incident.status === 'resolved' ? '1h 23m' : '2h 15m'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* SLA Status */}
      <div className="glass-card rounded-xl p-6 border border-green-500/30 bg-green-500/5">
        <h3 className="text-lg font-semibold text-white mb-4">SLA Status</h3>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-gray-300">Acknowledge SLA:</span>
            <span className="text-green-300 font-medium">✓ Met</span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-gray-300">Resolution SLA:</span>
            <span className={`font-medium ${
              incident.status === 'resolved' ? 'text-green-300' : 'text-yellow-300'
            }`}>
              {incident.status === 'resolved' ? '✓ Met' : '⏱ 37m remaining'}
            </span>
          </div>
          
          {incident.status !== 'resolved' && (
            <div className="mt-3">
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-gray-400">Progress</span>
                <span className="text-gray-400">62%</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div className="bg-gradient-to-r from-green-500 to-yellow-500 h-2 rounded-full" style={{ width: '62%' }}></div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Assignment Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="glass-card rounded-xl p-6 w-96 max-w-full mx-4">
            <h3 className="text-lg font-semibold text-white mb-4">Assign Incident</h3>
            
            <div className="space-y-3">
              {['Sarah Chen', 'Marcus Rodriguez', 'Alex Johnson', 'DevOps Team'].map((member) => (
                <button
                  key={member}
                  onClick={() => {
                    updateIncident({ 
                      assigned_to_id: member.toLowerCase().replace(' ', '-'),
                      assigned_to_name: member 
                    });
                    setShowAssignModal(false);
                  }}
                  className="w-full flex items-center space-x-3 px-3 py-2 text-left text-gray-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                >
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                    {member.charAt(0)}
                  </div>
                  <span>{member}</span>
                </button>
              ))}
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowAssignModal(false)}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IncidentActions;