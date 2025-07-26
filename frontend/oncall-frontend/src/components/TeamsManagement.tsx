import React, { useState, useEffect } from 'react';
import {
  UserGroupIcon,
  PlusIcon,
  XMarkIcon,
  UserPlusIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  EllipsisVerticalIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';

interface Team {
  id: string;
  name: string;
  description: string;
  is_active: boolean;
  member_count: number;
  members: TeamMember[];
  created_at: string;
}

interface TeamMember {
  id: string;
  full_name: string;
  email: string;
  role: string;
  joined_at: string;
  is_currently_on_call: boolean;
}

interface CreateTeamData {
  name: string;
  description: string;
  member_ids: string[];
}

const TeamsManagement: React.FC = () => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createTeamData, setCreateTeamData] = useState<CreateTeamData>({
    name: '',
    description: '',
    member_ids: []
  });
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTeams();
  }, []);

  const fetchTeams = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch('http://localhost:8000/api/v1/teams/', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const teamsData = await response.json();
        setTeams(teamsData);
      }
    } catch (error) {
      console.error('Error fetching teams:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!createTeamData.name.trim()) {
      setError('Team name is required');
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch('http://localhost:8000/api/v1/teams/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(createTeamData),
      });

      if (response.ok) {
        // Reset form and close modal
        setCreateTeamData({ name: '', description: '', member_ids: [] });
        setShowCreateModal(false);
        
        // Refresh teams list
        fetchTeams();
      } else {
        const errorData = await response.json();
        setError(errorData.detail || 'Failed to create team');
      }
    } catch (error) {
      console.error('Error creating team:', error);
      setError('Unable to connect to server. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const TeamCard = ({ team }: { team: Team }) => (
    <div className="glass-card rounded-xl p-6 hover:scale-105 transition-transform duration-200">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
            <UserGroupIcon className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">{team.name}</h3>
            <p className="text-gray-400 text-sm">{team.description}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
            team.is_active ? 'bg-green-500/20 text-green-300' : 'bg-gray-500/20 text-gray-300'
          }`}>
            {team.is_active ? 'Active' : 'Inactive'}
          </span>
          <button className="text-gray-400 hover:text-white transition-colors p-1">
            <EllipsisVerticalIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-400">Members</span>
          <span className="text-white font-medium">{team.member_count}</span>
        </div>
        
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-400">On Call</span>
          <span className="text-yellow-400 font-medium">
            {team.members?.filter(m => m.is_currently_on_call).length || 0}
          </span>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-400">Created</span>
          <span className="text-white">{new Date(team.created_at).toLocaleDateString()}</span>
        </div>
      </div>

      <div className="mt-6 flex space-x-3">
        <button className="flex-1 bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 px-4 py-2 rounded-lg transition-colors text-sm font-medium">
          View Members
        </button>
        <button className="bg-green-500/20 text-green-300 hover:bg-green-500/30 px-4 py-2 rounded-lg transition-colors text-sm font-medium">
          <UserPlusIcon className="w-4 h-4" />
        </button>
      </div>
    </div>
  );

  const CreateTeamModal = () => (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowCreateModal(false)}></div>
      
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-md">
          <div className="glass-card rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                  <UserGroupIcon className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-xl font-bold text-white">Create New Team</h2>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-white transition-colors p-1"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-xl">
                <p className="text-red-200 text-sm">{error}</p>
              </div>
            )}

            <form onSubmit={handleCreateTeam} className="space-y-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">
                  Team Name *
                </label>
                <input
                  type="text"
                  id="name"
                  value={createTeamData.name}
                  onChange={(e) => setCreateTeamData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200"
                  placeholder="Engineering Team"
                  required
                  disabled={isCreating}
                />
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  id="description"
                  value={createTeamData.description}
                  onChange={(e) => setCreateTeamData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200 resize-none"
                  placeholder="Backend services and infrastructure team..."
                  disabled={isCreating}
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-3 bg-white/10 text-gray-300 rounded-xl hover:bg-white/20 transition-colors font-medium"
                  disabled={isCreating}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-xl transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isCreating ? (
                    <div className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Creating...
                    </div>
                  ) : (
                    'Create Team'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <div className="glass-dark border-b border-white/10 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white mb-2">Teams Management</h1>
              <p className="text-gray-400">Organize your team members and manage on-call schedules</p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-6 py-3 rounded-xl transition-all duration-200 font-medium flex items-center space-x-2"
            >
              <PlusIcon className="w-5 h-5" />
              <span>Create Team</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="glass-card rounded-xl p-6">
            <div className="flex items-center space-x-3">
              <UserGroupIcon className="w-8 h-8 text-blue-400" />
              <div>
                <p className="text-gray-300 text-sm">Total Teams</p>
                <p className="text-2xl font-bold text-white">{teams.length}</p>
              </div>
            </div>
          </div>
          
          <div className="glass-card rounded-xl p-6">
            <div className="flex items-center space-x-3">
              <ClockIcon className="w-8 h-8 text-yellow-400" />
              <div>
                <p className="text-gray-300 text-sm">On Call</p>
                <p className="text-2xl font-bold text-white">
                  {teams.reduce((acc, team) => acc + (team.members?.filter(m => m.is_currently_on_call).length || 0), 0)}
                </p>
              </div>
            </div>
          </div>
          
          <div className="glass-card rounded-xl p-6">
            <div className="flex items-center space-x-3">
              <CheckCircleIcon className="w-8 h-8 text-green-400" />
              <div>
                <p className="text-gray-300 text-sm">Active Teams</p>
                <p className="text-2xl font-bold text-white">{teams.filter(t => t.is_active).length}</p>
              </div>
            </div>
          </div>
          
          <div className="glass-card rounded-xl p-6">
            <div className="flex items-center space-x-3">
              <ExclamationTriangleIcon className="w-8 h-8 text-orange-400" />
              <div>
                <p className="text-gray-300 text-sm">Total Members</p>
                <p className="text-2xl font-bold text-white">{teams.reduce((acc, team) => acc + team.member_count, 0)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Teams Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="glass-card rounded-xl p-6 animate-pulse">
                <div className="bg-white/10 h-20 rounded-lg mb-4"></div>
                <div className="space-y-2">
                  <div className="bg-white/10 h-4 rounded w-3/4"></div>
                  <div className="bg-white/10 h-4 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        ) : teams.length === 0 ? (
          <div className="text-center py-16">
            <UserGroupIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No teams yet</h3>
            <p className="text-gray-400 mb-6">Create your first team to get started with organizing your incident response.</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-6 py-3 rounded-xl transition-all duration-200 font-medium"
            >
              Create Your First Team
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {teams.map((team) => (
              <TeamCard key={team.id} team={team} />
            ))}
          </div>
        )}
      </div>

      {/* Create Team Modal */}
      {showCreateModal && <CreateTeamModal />}
    </div>
  );
};

export default TeamsManagement;