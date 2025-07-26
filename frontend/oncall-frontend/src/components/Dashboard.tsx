import React, { useState, useEffect } from 'react';
import { 
  FireIcon, 
  ExclamationTriangleIcon, 
  CheckCircleIcon, 
  ClockIcon,
  UserGroupIcon,
  BellIcon,
  ChartBarIcon,
  CogIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import CreateIncidentModal from './CreateIncidentModal';

interface DashboardStats {
  total_incidents: number;
  open_incidents: number;
  critical_incidents: number;
  resolved_today: number;
  avg_response_time: string;
  team_members: number;
}

const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    total_incidents: 0,
    open_incidents: 0,
    critical_incidents: 0,
    resolved_today: 0,
    avg_response_time: '0m',
    team_members: 1
  });
  const [recentIncidents, setRecentIncidents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('access_token');
      
      // Fetch incidents
      const incidentsResponse = await fetch('http://localhost:8000/api/v1/incidents/', {
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
          avg_response_time: '8m', // Mock data for now
          team_members: 1 // Mock data for now
        });

        // Set recent incidents (last 5)
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
    // Set up polling for real-time updates
    const interval = setInterval(fetchDashboardData, 30000); // 30 seconds
    return () => clearInterval(interval);
  }, []);

  const handleIncidentCreated = () => {
    // Refresh dashboard data after incident creation
    fetchDashboardData();
  };

  const StatCard = ({ title, value, icon: Icon, color, trend }: any) => (
    <div className="glass-card rounded-xl p-6 hover:scale-105 transition-transform duration-200">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-300 text-sm font-medium">{title}</p>
          <p className="text-2xl font-bold text-white mt-1">{value}</p>
          {trend && (
            <p className={`text-sm mt-1 ${trend > 0 ? 'text-green-400' : 'text-red-400'}`}>
              {trend > 0 ? '↗' : '↘'} {Math.abs(trend)}% from yesterday
            </p>
          )}
        </div>
        <div className={`p-3 rounded-lg ${color}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6 mb-8">
          <StatCard
            title="Total Incidents"
            value={stats.total_incidents}
            icon={ChartBarIcon}
            color="bg-blue-500/20"
            trend={5}
          />
          <StatCard
            title="Open Incidents"
            value={stats.open_incidents}
            icon={ExclamationTriangleIcon}
            color="bg-yellow-500/20"
          />
          <StatCard
            title="Critical"
            value={stats.critical_incidents}
            icon={FireIcon}
            color="bg-red-500/20"
          />
          <StatCard
            title="Resolved Today"
            value={stats.resolved_today}
            icon={CheckCircleIcon}
            color="bg-green-500/20"
            trend={-2}
          />
          <StatCard
            title="Avg Response"
            value={stats.avg_response_time}
            icon={ClockIcon}
            color="bg-purple-500/20"
          />
          <StatCard
            title="Team Members"
            value={stats.team_members}
            icon={UserGroupIcon}
            color="bg-indigo-500/20"
          />
        </div>

        {/* Recent Incidents */}
        <div className="glass-card rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white">Recent Incidents</h2>
            <button className="bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 px-4 py-2 rounded-lg transition-colors">
              View All
            </button>
          </div>
          
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="bg-white/10 h-16 rounded-lg"></div>
                </div>
              ))}
            </div>
          ) : recentIncidents.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircleIcon className="w-12 h-12 text-green-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">All Clear!</h3>
              <p className="text-gray-400">No incidents to show. Your systems are running smoothly.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {recentIncidents.map((incident: any) => (
                <div key={incident.id} className="bg-white/5 rounded-lg p-4 hover:bg-white/10 transition-colors cursor-pointer">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`w-3 h-3 rounded-full ${
                        incident.severity === 'critical' ? 'bg-red-500' :
                        incident.severity === 'high' ? 'bg-orange-500' :
                        incident.severity === 'medium' ? 'bg-yellow-500' :
                        'bg-green-500'
                      }`}></div>
                      <div>
                        <h3 className="text-white font-medium">{incident.title}</h3>
                        <p className="text-gray-400 text-sm">
                          {incident.created_by_name} • {new Date(incident.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
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
                        'bg-green-500/20 text-green-300'
                      }`}>
                        {incident.severity}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <button 
            onClick={() => setShowCreateModal(true)}
            className="glass-card rounded-xl p-6 hover:scale-105 transition-transform duration-200 text-left"
          >
            <BellIcon className="w-8 h-8 text-blue-400 mb-3" />
            <h3 className="text-lg font-semibold text-white mb-2">Create Incident</h3>
            <p className="text-gray-400 text-sm">Manually create a new incident</p>
          </button>
          
          <button 
            onClick={() => window.location.href = '/teams'}
            className="glass-card rounded-xl p-6 hover:scale-105 transition-transform duration-200 text-left"
          >
            <UserGroupIcon className="w-8 h-8 text-green-400 mb-3" />
            <h3 className="text-lg font-semibold text-white mb-2">Manage Teams</h3>
            <p className="text-gray-400 text-sm">Configure teams and on-call schedules</p>
          </button>
          
          <button 
            onClick={() => window.location.href = '/settings'}
            className="glass-card rounded-xl p-6 hover:scale-105 transition-transform duration-200 text-left"
          >
            <CogIcon className="w-8 h-8 text-purple-400 mb-3" />
            <h3 className="text-lg font-semibold text-white mb-2">Settings</h3>
            <p className="text-gray-400 text-sm">Configure integrations and preferences</p>
          </button>
        </div>
      </main>

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