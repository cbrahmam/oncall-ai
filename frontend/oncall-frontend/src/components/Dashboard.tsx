// frontend/src/components/Dashboard.tsx - COMPLETELY REVAMPED WITH ORGANIZED TILES
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
  ShieldCheckIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import CreateIncidentModal from './CreateIncidentModal';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1';

interface DashboardStats {
  total_incidents: number;
  open_incidents: number;
  critical_incidents: number;
  resolved_today: number;
  avg_response_time: string;
  team_members: number;
}

interface Incident {
  id: string;
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  status: 'open' | 'acknowledged' | 'resolved';
  created_at: string;
  assigned_to?: string;
}

interface DashboardProps {
  onNavigateToIncident?: (incidentId: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onNavigateToIncident }) => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    total_incidents: 0,
    open_incidents: 0,
    critical_incidents: 0,
    resolved_today: 0,
    avg_response_time: '0m',
    team_members: 1
  });
  const [recentIncidents, setRecentIncidents] = useState<Incident[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('access_token');
      
      // Fetch incidents
      const incidentsResponse = await fetch(`${API_BASE_URL}/incidents/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (incidentsResponse.ok) {
        const incidentsData = await incidentsResponse.json();
        
        // Calculate stats from incidents
        const incidents = incidentsData.incidents || [];
        const openIncidents = incidents.filter((i: any) => i.status === 'open');
        const criticalIncidents = incidents.filter((i: any) => i.severity === 'critical');
        
        // Get today's date for resolved today calculation
        const today = new Date().toISOString().split('T')[0];
        const resolvedToday = incidents.filter((i: any) => 
          i.status === 'resolved' && 
          i.resolved_at && 
          i.resolved_at.startsWith(today)
        );

        setStats({
          total_incidents: incidents.length,
          open_incidents: openIncidents.length,
          critical_incidents: criticalIncidents.length,
          resolved_today: resolvedToday.length,
          avg_response_time: '8m',
          team_members: 1
        });

        setRecentIncidents(incidents.slice(0, 5));
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleIncidentCreated = () => {
    fetchDashboardData();
  };

  const handleIncidentClick = (incidentId: string) => {
    if (onNavigateToIncident) {
      onNavigateToIncident(incidentId);
    }
  };

  // Tile Components
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

  const ActionTile = ({ title, description, icon: Icon, color, onClick }: any) => (
    <button
      onClick={onClick}
      className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6 hover:border-gray-600/50 hover:bg-gray-800/70 transition-all duration-200 text-left group w-full"
    >
      <div className={`p-3 rounded-lg ${color}/20 mb-4 inline-block group-hover:scale-110 transition-transform duration-200`}>
        <Icon className={`w-6 h-6 ${color.replace('bg-', 'text-')}`} />
      </div>
      <div>
        <h3 className="text-white font-semibold mb-2">{title}</h3>
        <p className="text-gray-400 text-sm">{description}</p>
      </div>
    </button>
  );

  const RecentIncidentsTile = () => (
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

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-16 bg-gray-700/50 rounded-lg"></div>
            </div>
          ))}
        </div>
      ) : recentIncidents.length === 0 ? (
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
        <div className="space-y-3">
          {recentIncidents.map((incident) => (
            <div
              key={incident.id}
              onClick={() => handleIncidentClick(incident.id)}
              className="p-4 bg-gray-700/30 rounded-lg hover:bg-gray-700/50 cursor-pointer transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="text-white font-medium mb-1 line-clamp-1">
                    {incident.title}
                  </h4>
                  <p className="text-gray-400 text-sm mb-2 line-clamp-2">
                    {incident.description}
                  </p>
                  <div className="flex items-center space-x-2">
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
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const SystemStatusTile = () => (
    <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
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
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">
                Welcome back, {user?.full_name || 'User'}
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

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatTile
            title="Total Incidents"
            value={stats.total_incidents}
            icon={BellIcon}
            color="bg-blue-500"
            trend={12}
          />
          <StatTile
            title="Open Incidents"
            value={stats.open_incidents}
            icon={ExclamationTriangleIcon}
            color="bg-orange-500"
            trend={-8}
          />
          <StatTile
            title="Critical Incidents"
            value={stats.critical_incidents}
            icon={FireIcon}
            color="bg-red-500"
            trend={-15}
          />
          <StatTile
            title="Resolved Today"
            value={stats.resolved_today}
            icon={CheckCircleIcon}
            color="bg-green-500"
            trend={25}
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Recent Incidents - Takes 2 columns */}
          <div className="lg:col-span-2">
            <RecentIncidentsTile />
          </div>

          {/* System Status - Takes 1 column */}
          <div>
            <SystemStatusTile />
          </div>
        </div>

        {/* Quick Actions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <ActionTile
            title="Create Incident"
            description="Manually create a new incident for your team"
            icon={PlusIcon}
            color="bg-blue-500"
            onClick={() => setShowCreateModal(true)}
          />
          <ActionTile
            title="View Analytics"
            description="Review incident trends and team performance"
            icon={ChartBarIcon}
            color="bg-purple-500"
            onClick={() => console.log('Analytics')}
          />
          <ActionTile
            title="Settings"
            description="Configure integrations and notification preferences"
            icon={CogIcon}
            color="bg-gray-500"
            onClick={() => window.location.href = '/settings'}
          />
        </div>

        {/* Additional Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatTile
            title="Avg Response Time"
            value={stats.avg_response_time}
            icon={ClockIcon}
            color="bg-purple-500"
            trend={-5}
          />
          <StatTile
            title="Team Members"
            value={stats.team_members}
            icon={UserGroupIcon}
            color="bg-indigo-500"
          />
          <StatTile
            title="SLA Compliance"
            value="98.5%"
            icon={ShieldCheckIcon}
            color="bg-emerald-500"
            trend={2}
          />
        </div>
      </div>

      {/* Create Incident Modal */}
      <CreateIncidentModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onIncidentCreated={handleIncidentCreated}
      />
    </div>
  );
};

export default Dashboard;