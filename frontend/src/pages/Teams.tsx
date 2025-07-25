// src/pages/Teams.tsx - Modern Teams Management
import { useState } from 'react'
import { 
  PlusIcon, 
  UsersIcon, 
  UserCircleIcon,
  PhoneIcon,
  EnvelopeIcon,
  ClockIcon,
  CheckBadgeIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'

interface TeamMember {
  id: string
  name: string
  email: string
  phone: string
  role: 'admin' | 'member' | 'viewer'
  status: 'online' | 'away' | 'offline'
  onCall: boolean
}

interface Team {
  id: string
  name: string
  description: string
  members: TeamMember[]
  onCallSchedule: string
}

export default function Teams() {
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [showInviteForm, setShowInviteForm] = useState(false)
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null)
  const [newTeam, setNewTeam] = useState({
    name: '',
    description: ''
  })
  const [inviteEmail, setInviteEmail] = useState('')

  // Mock data
  const teams: Team[] = [
    {
      id: '1',
      name: 'Backend Engineering',
      description: 'Responsible for API and database incidents',
      onCallSchedule: 'Weekly rotation',
      members: [
        {
          id: '1',
          name: 'John Doe',
          email: 'john@example.com',
          phone: '+1 (555) 123-4567',
          role: 'admin',
          status: 'online',
          onCall: true
        },
        {
          id: '2',
          name: 'Jane Smith',
          email: 'jane@example.com',
          phone: '+1 (555) 234-5678',
          role: 'member',
          status: 'away',
          onCall: false
        },
        {
          id: '3',
          name: 'Mike Johnson',
          email: 'mike@example.com',
          phone: '+1 (555) 345-6789',
          role: 'member',
          status: 'offline',
          onCall: false
        }
      ]
    },
    {
      id: '2',
      name: 'Frontend Team',
      description: 'Handles UI/UX related incidents',
      onCallSchedule: 'Daily rotation',
      members: [
        {
          id: '4',
          name: 'Sarah Wilson',
          email: 'sarah@example.com',
          phone: '+1 (555) 456-7890',
          role: 'admin',
          status: 'online',
          onCall: true
        },
        {
          id: '5',
          name: 'Tom Brown',
          email: 'tom@example.com',
          phone: '+1 (555) 567-8901',
          role: 'member',
          status: 'online',
          onCall: false
        }
      ]
    }
  ]

  const statusColors = {
    online: 'bg-emerald-500',
    away: 'bg-yellow-500',
    offline: 'bg-gray-500'
  }

  const roleColors = {
    admin: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    member: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    viewer: 'bg-gray-500/20 text-gray-400 border-gray-500/30'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Teams</h1>
          <p className="text-gray-400 mt-1">Manage your incident response teams</p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-4 py-2 rounded-lg font-medium transition-all duration-200 transform hover:scale-105 shadow-lg flex items-center space-x-2"
        >
          <PlusIcon className="w-5 h-5" />
          <span>Create Team</span>
        </button>
      </div>

      {/* Teams Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {teams.map((team) => (
          <div
            key={team.id}
            className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-xl p-6 hover:bg-white/10 transition-all duration-200 cursor-pointer"
            onClick={() => setSelectedTeam(selectedTeam === team.id ? null : team.id)}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-2 rounded-lg">
                  <UsersIcon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-white font-semibold">{team.name}</h3>
                  <p className="text-gray-400 text-sm">{team.members.length} members</p>
                </div>
              </div>
              
              {/* On-call indicator */}
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                <span className="text-emerald-400 text-xs">On Call</span>
              </div>
            </div>

            <p className="text-gray-400 text-sm mb-4">{team.description}</p>

            {/* Team members preview */}
            <div className="flex items-center justify-between">
              <div className="flex -space-x-2">
                {team.members.slice(0, 4).map((member) => (
                  <div
                    key={member.id}
                    className="relative w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full border-2 border-white/20 flex items-center justify-center"
                  >
                    <span className="text-white text-xs font-semibold">
                      {member.name.charAt(0)}
                    </span>
                    <div className={`absolute -bottom-1 -right-1 w-3 h-3 ${statusColors[member.status]} rounded-full border border-white/20`}></div>
                  </div>
                ))}
                {team.members.length > 4 && (
                  <div className="w-8 h-8 bg-white/10 rounded-full border-2 border-white/20 flex items-center justify-center">
                    <span className="text-gray-400 text-xs">+{team.members.length - 4}</span>
                  </div>
                )}
              </div>
              
              <div className="flex items-center space-x-1 text-xs text-gray-400">
                <ClockIcon className="w-3 h-3" />
                <span>{team.onCallSchedule}</span>
              </div>
            </div>

            {/* Expanded team details */}
            {selectedTeam === team.id && (
              <div className="mt-6 pt-6 border-t border-white/10">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-white font-medium">Team Members</h4>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setShowInviteForm(true)
                    }}
                    className="text-blue-400 hover:text-blue-300 text-sm font-medium flex items-center space-x-1"
                  >
                    <PlusIcon className="w-4 h-4" />
                    <span>Invite</span>
                  </button>
                </div>
                
                <div className="space-y-3">
                  {team.members.map((member) => (
                    <div key={member.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="relative">
                          <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                            <span className="text-white font-semibold">
                              {member.name.charAt(0)}
                            </span>
                          </div>
                          <div className={`absolute -bottom-1 -right-1 w-3 h-3 ${statusColors[member.status]} rounded-full border border-white/20`}></div>
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="text-white font-medium">{member.name}</span>
                            {member.onCall && (
                              <div className="bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded text-xs border border-emerald-500/30">
                                On Call
                              </div>
                            )}
                          </div>
                          <div className="flex items-center space-x-4 text-xs text-gray-400">
                            <div className="flex items-center space-x-1">
                              <EnvelopeIcon className="w-3 h-3" />
                              <span>{member.email}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <PhoneIcon className="w-3 h-3" />
                              <span>{member.phone}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 rounded text-xs border ${roleColors[member.role]}`}>
                          {member.role}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Create Team Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-xl font-semibold text-white mb-4">Create New Team</h3>
            <form onSubmit={(e) => {
              e.preventDefault()
              // Handle team creation
              setShowCreateForm(false)
              setNewTeam({ name: '', description: '' })
            }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Team Name</label>
                <input
                  type="text"
                  required
                  value={newTeam.name}
                  onChange={(e) => setNewTeam({...newTeam, name: e.target.value})}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Backend Engineering"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
                <textarea
                  required
                  value={newTeam.description}
                  onChange={(e) => setNewTeam({...newTeam, description: e.target.value})}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 h-20"
                  placeholder="What does this team handle?"
                />
              </div>
              <div className="flex space-x-3">
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white py-2 px-4 rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition-all duration-200"
                >
                  Create Team
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="flex-1 bg-white/10 text-gray-300 py-2 px-4 rounded-lg font-medium hover:bg-white/20 transition-all duration-200"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invite Member Modal */}
      {showInviteForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-xl font-semibold text-white mb-4">Invite Team Member</h3>
            <form onSubmit={(e) => {
              e.preventDefault()
              // Handle member invitation
              setShowInviteForm(false)
              setInviteEmail('')
            }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Email Address</label>
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="colleague@company.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Role</label>
                <select className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                  <option value="viewer">Viewer</option>
                </select>
              </div>
              <div className="flex space-x-3">
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white py-2 px-4 rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition-all duration-200"
                >
                  Send Invite
                </button>
                <button
                  type="button"
                  onClick={() => setShowInviteForm(false)}
                  className="flex-1 bg-white/10 text-gray-300 py-2 px-4 rounded-lg font-medium hover:bg-white/20 transition-all duration-200"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}