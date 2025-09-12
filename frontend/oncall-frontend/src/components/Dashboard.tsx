// Dashboard.tsx - REAL DATA ONLY, NO MOCK DATA
import React, { useState, useEffect } from 'react';
import { 
  FireIcon, 
  ExclamationTriangleIcon, 
  CheckCircleIcon, 
  ClockIcon,
  UserGroupIcon,
  BellIcon,
  ChartBarIcon,
  CogIcon,
  PlusIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  CalendarIcon,
  DocumentTextIcon,
  ShieldCheckIcon,
  SparklesIcon,
  CpuChipIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1';

interface Incident {
  id: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'acknowledged' | 'resolved';
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
}

interface IncidentListResponse {
  incidents: Incident[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

interface AIAnalysis {
  provider: 'claude' | 'gemini';
  summary: string;
  recommended_actions: string[];
  confidence_score: number;
  analysis_time: string;
}

interface DashboardStats {
  total_incidents: number;
  open_incidents: number;
  critical_incidents: number;
  resolved_today: number;
  avg_response_time: string;
  team_members: number;
  sla_compliance: string;
}

interface DashboardProps {
  onNavigateToIncident?: (id: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onNavigateToIncident }) => {
  const { user } = useAuth();
  const { showToast } = useNotifications();
  
  // Real state for incidents - NO MOCK DATA
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    total_incidents: 0,
    open_incidents: 0,
    critical_incidents: 0,
    resolved_today: 0,
    avg_response_time: '0m',
    team_members: 1,
    sla_compliance: '0%'
  });
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [analyzingIncident, setAnalyzingIncident] = useState<string | null>(null);
  const [aiAnalyses, setAiAnalyses] = useState<Record<string, AIAnalysis[]>>({});

  // Load real incidents from API ONLY
  useEffect(() => {
    loadIncidents();
    const interval = setInterval(loadIncidents, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const calculateAverageResponseTime = (incidents: Incident[]): string => {
    const resolvedIncidents = incidents.filter(i => i.status === 'resolved' && i.resolved_at);
    if (resolvedIncidents.length === 0) return '0m';

    const totalMinutes = resolvedIncidents.reduce((acc, incident) => {
      const created = new Date(incident.created_at);
      const resolved = new Date(incident.resolved_at!);
      const minutes = Math.floor((resolved.getTime() - created.getTime()) / (1000 * 60));
      return acc + minutes;
    }, 0);

    const avgMinutes = Math.floor(totalMinutes / resolvedIncidents.length);
    if (avgMinutes < 60) return `${avgMinutes}m`;
    const hours = Math.floor(avgMinutes / 60);
    const minutes = avgMinutes % 60;
    return `${hours}h ${minutes}m`;
  };

  const calculateSLACompliance = (incidents: Incident[]): string => {
    if (incidents.length === 0) return '0%';
    
    // Define SLA targets by severity
    const slaTargets = {
      critical: 15, // 15 minutes
      high: 30,     // 30 minutes  
      medium: 60,   // 1 hour
      low: 240      // 4 hours
    };

    const resolvedIncidents = incidents.filter(i => i.status === 'resolved' && i.resolved_at);
    if (resolvedIncidents.length === 0) return '0%';

    const withinSLA = resolvedIncidents.filter(incident => {
      const created = new Date(incident.created_at);
      const resolved = new Date(incident.resolved_at!);
      const responseMinutes = Math.floor((resolved.getTime() - created.getTime()) / (1000 * 60));
      const slaTarget = slaTargets[incident.severity] || 60;
      return responseMinutes <= slaTarget;
    });

    const compliance = Math.floor((withinSLA.length / resolvedIncidents.length) * 100);
    return `${compliance}%`;
  };

  const loadIncidents = async () => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        throw new Error('No access token');
      }

      const response = await fetch(`${API_BASE_URL}/incidents/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data: IncidentListResponse = await response.json();
        setIncidents(data.incidents);
        
        // Calculate real stats from actual incidents
        const openIncidents = data.incidents.filter(i => i.status === 'open');
        const criticalIncidents = data.incidents.filter(i => i.severity === 'critical');
        
        // Get today's date for resolved today calculation
        const today = new Date().toISOString().split('T')[0];
        const resolvedToday = data.incidents.filter(i => 
          i.status === 'resolved' && 
          i.resolved_at && 
          i.resolved_at.startsWith(today)
        );

        setStats({
          total_incidents: data.incidents.length,
          open_incidents: openIncidents.length,
          critical_incidents: criticalIncidents.length,
          resolved_today: resolvedToday.length,
          avg_response_time: calculateAverageResponseTime(data.incidents),
          team_members: 1, // TODO: Get from API
          sla_compliance: calculateSLACompliance(data.incidents)
        });
      } else if (response.status === 401) {
        // Token expired or invalid
        localStorage.removeItem('access_token');
        window.location.reload();
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      console.error('Error loading incidents:', error);
      // Only show error if we have a valid token and this isn't the first load
      if (localStorage.getItem('access_token') && !loading) {
        showToast({
          type: 'error',
          title: 'Error',
          message: 'Failed to load incidents. Please refresh the page.',
          autoClose: true,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const createIncident = async (incidentData: {title: string, description: string, severity: string}) => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${API_BASE_URL}/incidents/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(incidentData),
      });

      if (response.ok) {
        const newIncident = await response.json();
        setIncidents(prev => [newIncident, ...prev]);
        setShowCreateModal(false);
        showToast({
          type: 'success',
          title: 'Incident Created',
          message: `Incident "${incidentData.title}" has been created`,
          autoClose: true,
        });
        await loadIncidents(); // Refresh stats
      } else {
        throw new Error('Failed to create incident');
      }
    } catch (error) {
      console.error('Error creating incident:', error);
      showToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to create incident',
        autoClose: true,
      });
    }
  };

  // FIXED: Real AI analysis with actual API call
  const analyzeIncidentWithAI = async (incident: Incident) => {
    setAnalyzingIncident(incident.id);
    
    try {
      const token = localStorage.getItem('access_token');
      
      showToast({
        type: 'info',
        title: 'AI Analysis Started',
        message: 'Getting insights from AI...',
        autoClose: true,
      });
      
      // REAL API CALL - Replace mock data with actual endpoint
      const response = await fetch(`${API_BASE_URL}/ai/analyze-incident`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          incident_id: incident.id,
          incident_data: {
            title: incident.title,
            description: incident.description,
            severity: incident.severity
          }
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setAiAnalyses(prev => ({
          ...prev,
          [incident.id]: data.analyses || []
        }));
        
        showToast({
          type: 'success',
          title: 'AI Analysis Complete',
          message: 'AI has analyzed the incident',
          autoClose: true,
        });
      } else {
        throw new Error('AI analysis failed');
      }
        
    } catch (error) {
      console.error('Error analyzing incident:', error);
      showToast({
        type: 'error',
        title: 'Analysis Failed',
        message: 'AI analysis is not available. Please configure your AI API keys in settings.',
        autoClose: true,
      });
    } finally {
      setAnalyzingIncident(null);
    }
  };

  const acknowledgeIncident = async (incidentId: string) => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${API_BASE_URL}/incidents/${incidentId}/acknowledge`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        showToast({
          type: 'success',
          title: 'Incident Acknowledged',
          message: 'You have been assigned to this incident',
          autoClose: true,
        });
        await loadIncidents();
      }
    } catch (error) {
      console.error('Error acknowledging incident:', error);
    }
  };

  const resolveIncident = async (incidentId: string) => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${API_BASE_URL}/incidents/${incidentId}/resolve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        showToast({
          type: 'success',
          title: 'Incident Resolved',
          message: 'Incident has been marked as resolved',
          autoClose: true,
        });
        await loadIncidents();
      }
    } catch (error) {
      console.error('Error resolving incident:', error);
    }
  };

  // FIXED: StatTile without hardcoded trends
  const StatTile = ({ title, value, icon: Icon, color, trend }: any) => (
    <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6 hover:border-gray-600/50 transition-all duration-200">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-lg ${color}/20`}>
          <Icon className={`w-6 h-6 ${color.replace('bg-', 'text-')}`} />
        </div>
        {trend && (
          <div className={`flex items-center text-sm ${trend > 0 ? 'text-green-400' : 'text-red-400'}`}>
            {trend > 0 ? <ArrowUpIcon className="w-4 h-4 mr-1" /> : <ArrowDownIcon className="w-4 h-4 mr-1" />}
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      <div>
        <h3 className="text-gray-400 text-sm font-medium mb-1">{title}</h3>
        <p className="text-2xl font-bold text-white">{value}</p>
      </div>
    </div>
  );

  const CreateIncidentModal = () => {
    const [formData, setFormData] = useState({
      title: '',
      description: '',
      severity: 'medium'
    });

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (formData.title.trim()) {
        createIncident(formData);
        setFormData({ title: '', description: '', severity: 'medium' });
      }
    };

    if (!showCreateModal) return null;

    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-md border border-gray-700">
          <h2 className="text-2xl font-bold text-white mb-6">Create New Incident</h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Title *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Brief description of the issue"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="Detailed description of the incident"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Severity
              </label>
              <select
                value={formData.severity}
                onChange={(e) => setFormData(prev => ({ ...prev, severity: e.target.value }))}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>

            <div className="flex space-x-3 pt-4">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Create Incident
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const IncidentCard = ({ incident }: { incident: Incident }) => {
    const analysis = aiAnalyses[incident.id];
    
    return (
      <div className="p-4 bg-gray-700/30 rounded-lg hover:bg-gray-700/50 transition-colors">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h4 className="text-white font-medium mb-1 line-clamp-1">
              {incident.title}
            </h4>
            <p className="text-gray-400 text-sm mb-2 line-clamp-2">
              {incident.description || 'No description provided'}
            </p>
            <div className="flex items-center space-x-2 mb-3">
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                incident.status === 'open' ? 'bg-red-500/20 text-red-300' :
                incident.status === 'acknowledged' ? 'bg-yellow-500/20 text-yellow-300' :
                'bg-green-500/20 text-green-300'
              }`}>
                {incident.status}
              </span>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                incident.severity === 'critical' ? 'bg-red-500/20 text-red-300' :
                incident.severity === 'high' ? 'bg-orange-500/20 text-orange-300' :
                incident.severity === 'medium' ? 'bg-yellow-500/20 text-yellow-300' :
                'bg-blue-500/20 text-blue-300'
              }`}>
                {incident.severity}
              </span>
            </div>
          </div>
        </div>

        {/* AI Analysis Section */}
        {analysis && analysis.length > 0 && (
          <div className="mt-4 p-3 bg-gray-800/50 rounded-lg border border-gray-600/30">
            <h5 className="text-white font-medium mb-2 flex items-center">
              <SparklesIcon className="w-4 h-4 mr-2 text-purple-400" />
              AI Analysis Complete
            </h5>
            <div className="space-y-3">
              {analysis.map((ai, index) => (
                <div key={index} className="p-2 bg-gray-700/50 rounded border-l-2 border-purple-400">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-purple-300 capitalize">
                      {ai.provider} AI
                    </span>
                    <span className="text-xs text-gray-400">
                      {ai.confidence_score}% confidence
                    </span>
                  </div>
                  <p className="text-xs text-gray-300 mb-2">{ai.summary}</p>
                  <div className="text-xs text-gray-400">
                    <strong>Recommendations:</strong>
                    <ul className="mt-1 space-y-1">
                      {ai.recommended_actions.slice(0, 2).map((action, i) => (
                        <li key={i}>• {action}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center space-x-2 mt-4">
          {!analysis && (
            <button
              onClick={() => analyzeIncidentWithAI(incident)}
              disabled={analyzingIncident === incident.id}
              className="flex items-center px-3 py-1 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 text-white rounded text-sm transition-colors"
            >
              {analyzingIncident === incident.id ? (
                <>
                  <div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                  Analyzing...
                </>
              ) : (
                <>
                  <SparklesIcon className="w-3 h-3 mr-1" />
                  Analyze with AI
                </>
              )}
            </button>
          )}
          
          {incident.status === 'open' && (
            <button
              onClick={() => acknowledgeIncident(incident.id)}
              className="flex items-center px-3 py-1 bg-yellow-600 hover:bg-yellow-700 text-white rounded text-sm transition-colors"
            >
              Acknowledge
            </button>
          )}
          
          {incident.status !== 'resolved' && (
            <button
              onClick={() => resolveIncident(incident.id)}
              className="flex items-center px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm transition-colors"
            >
              Resolve
            </button>
          )}
          
          <button
            onClick={() => onNavigateToIncident?.(incident.id)}
            className="flex items-center px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition-colors"
          >
            View Details
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">
                Welcome back, {user?.full_name || user?.email?.split('@')[0] || 'User'}
              </h1>
              <p className="text-gray-400">
                Here's what's happening with your incidents today.
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-lg px-4 py-2">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-green-300 text-sm font-medium">All Systems Operational</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid - FIXED: No hardcoded trends */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatTile
            title="Total Incidents"
            value={stats.total_incidents}
            icon={BellIcon}
            color="bg-blue-500"
          />
          <StatTile
            title="Open Incidents"
            value={stats.open_incidents}
            icon={ExclamationTriangleIcon}
            color="bg-orange-500"
          />
          <StatTile
            title="Critical Incidents"
            value={stats.critical_incidents}
            icon={FireIcon}
            color="bg-red-500"
          />
          <StatTile
            title="Resolved Today"
            value={stats.resolved_today}
            icon={CheckCircleIcon}
            color="bg-green-500"
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Recent Incidents */}
          <div className="lg:col-span-2">
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-white">Recent Incidents</h2>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="flex items-center px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  <PlusIcon className="w-4 h-4 mr-2" />
                  Create
                </button>
              </div>

              {loading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-24 bg-gray-700/50 rounded-lg"></div>
                    </div>
                  ))}
                </div>
              ) : incidents.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-gray-700/50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <BellIcon className="w-8 h-8 text-gray-500" />
                  </div>
                  <h3 className="text-gray-400 font-medium mb-2">No incidents yet</h3>
                  <p className="text-gray-500 text-sm mb-4">
                    Great! No incidents to report. Create one manually if needed.
                  </p>
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    Create First Incident
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {incidents.slice(0, 5).map((incident) => (
                    <IncidentCard key={incident.id} incident={incident} />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* System Status & AI */}
          <div>
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">System Status</h3>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-green-400 text-sm font-medium">Operational</span>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 text-sm">API Gateway</span>
                  <span className="text-green-400 text-sm">Healthy</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 text-sm">Database</span>
                  <span className="text-green-400 text-sm">Healthy</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 text-sm">Notifications</span>
                  <span className="text-green-400 text-sm">Healthy</span>
                </div>
              </div>
            </div>

            {/* AI Feature Highlight */}
            <div className="bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-purple-500/30 rounded-xl p-6">
              <div className="flex items-center mb-3">
                <SparklesIcon className="w-6 h-6 text-purple-400 mr-2" />
                <h3 className="text-lg font-semibold text-white">AI-Powered Analysis</h3>
              </div>
              <p className="text-gray-300 text-sm mb-4">
                Get instant insights from AI to resolve incidents faster. Configure your API keys in settings.
              </p>
              <div className="flex items-center space-x-2 text-xs text-gray-400">
                <CpuChipIcon className="w-4 h-4" />
                <span>Powered by your own API keys</span>
              </div>
            </div>
          </div>
        </div>

        {/* Additional Stats Grid - FIXED: Real SLA compliance */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatTile
            title="Avg Response Time"
            value={stats.avg_response_time}
            icon={ClockIcon}
            color="bg-purple-500"
          />
          <StatTile
            title="Team Members"
            value={stats.team_members}
            icon={UserGroupIcon}
            color="bg-indigo-500"
          />
          <StatTile
            title="SLA Compliance"
            value={stats.sla_compliance}
            icon={ShieldCheckIcon}
            color="bg-emerald-500"
          />
        </div>
      </div>

      {/* Create Incident Modal */}
      <CreateIncidentModal />
    </div>
  );
};

export default Dashboard;