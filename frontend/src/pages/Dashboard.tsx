// src/pages/Dashboard.tsx - Modern SaaS Dashboard
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import { 
  PlusIcon, 
  ExclamationTriangleIcon, 
  CheckCircleIcon,
  ClockIcon,
  FireIcon,
  ChartBarIcon,
  UsersIcon,
  BellIcon
} from '@heroicons/react/24/outline'

interface Incident {
  id: string
  title: string
  description: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  status: 'open' | 'acknowledged' | 'resolved' | 'closed'
  created_at: string
  assigned_to_name?: string
  tags: string[]
}

const severityConfig = {
  low: { 
    color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    icon: CheckCircleIcon,
    gradient: 'from-emerald-500 to-green-600'
  },
  medium: { 
    color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    icon: ExclamationTriangleIcon,
    gradient: 'from-yellow-500 to-orange-500'
  },
  high: { 
    color: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    icon: ExclamationTriangleIcon,
    gradient: 'from-orange-500 to-red-500'
  },
  critical: { 
    color: 'bg-red-500/20 text-red-400 border-red-500/30',
    icon: FireIcon,
    gradient: 'from-red-500 to-red-600'
  }
}

const statusConfig = {
  open: { color: 'bg-red-500/20 text-red-400 border-red-500/30', label: 'Open' },
  acknowledged: { color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', label: 'Acknowledged' },
  resolved: { color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', label: 'Resolved' },
  closed: { color: 'bg-gray-500/20 text-gray-400 border-gray-500/30', label: 'Closed' }
}

export default function Dashboard() {
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newIncident, setNewIncident] = useState({
    title: '',
    description: '',
    severity: 'medium' as const
  })
  const queryClient = useQueryClient()

  const { data: incidents, isLoading } = useQuery({
    queryKey: ['incidents'],
    queryFn: () => api.get('/api/v1/incidents').then(res => res.data.incidents),
    refetchInterval: 5000
  })

  const createMutation = useMutation({
    mutationFn: (data: typeof newIncident) => api.post('/api/v1/incidents', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents'] })
      setShowCreateForm(false)
      setNewIncident({ title: '', description: '', severity: 'medium' })
    }
  })

  const acknowledgeMutation = useMutation({
    mutationFn: (id: string) => api.post(`/api/v1/incidents/${id}/acknowledge`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['incidents'] })
  })

  const resolveMutation = useMutation({
    mutationFn: (id: string) => api.post(`/api/v1/incidents/${id}/resolve`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['incidents'] })
  })

  // Calculate stats
  const stats = incidents ? {
    total: incidents.length,
    open: incidents.filter((i: Incident) => i.status === 'open').length,
    critical: incidents.filter((i: Incident) => i.severity === 'critical').length,
    resolved: incidents.filter((i: Incident) => i.status === 'resolved').length
  } : { total: 0, open: 0, critical: 0, resolved: 0 }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-blue-500 border-t-transparent"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Incident Dashboard</h1>
          <p className="text-gray-400 mt-1">Monitor and manage your incidents in real-time</p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-4 py-2 rounded-lg font-medium transition-all duration-200 transform hover:scale-105 shadow-lg flex items-center space-x-2"
        >
          <PlusIcon className="w-5 h-5" />
          <span>Create Incident</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Total Incidents</p>
              <p className="text-3xl font-bold text-white">{stats.total}</p>
            </div>
            <div className="bg-blue-500/20 p-3 rounded-lg">
              <ChartBarIcon className="w-6 h-6 text-blue-400" />
            </div>
          </div>
        </div>

        <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Open Incidents</p>
              <p className="text-3xl font-bold text-red-400">{stats.open}</p>
            </div>
            <div className="bg-red-500/20 p-3 rounded-lg">
              <ExclamationTriangleIcon className="w-6 h-6 text-red-400" />
            </div>
          </div>
        </div>

        <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Critical</p>
              <p className="text-3xl font-bold text-orange-400">{stats.critical}</p>
            </div>
            <div className="bg-orange-500/20 p-3 rounded-lg">
              <FireIcon className="w-6 h-6 text-orange-400" />
            </div>
          </div>
        </div>

        <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Resolved</p>
              <p className="text-3xl font-bold text-emerald-400">{stats.resolved}</p>
            </div>
            <div className="bg-emerald-500/20 p-3 rounded-lg">
              <CheckCircleIcon className="w-6 h-6 text-emerald-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Create Incident Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-xl font-semibold text-white mb-4">Create New Incident</h3>
            <form onSubmit={(e) => {
              e.preventDefault()
              createMutation.mutate(newIncident)
            }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Title</label>
                <input
                  type="text"
                  required
                  value={newIncident.title}
                  onChange={(e) => setNewIncident({...newIncident, title: e.target.value})}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Brief description of the incident"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
                <textarea
                  required
                  value={newIncident.description}
                  onChange={(e) => setNewIncident({...newIncident, description: e.target.value})}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 h-20"
                  placeholder="Detailed description..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Severity</label>
                <select
                  value={newIncident.severity}
                  onChange={(e) => setNewIncident({...newIncident, severity: e.target.value as any})}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
              <div className="flex space-x-3">
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white py-2 px-4 rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition-all duration-200 disabled:opacity-50"
                >
                  {createMutation.isPending ? 'Creating...' : 'Create'}
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

      {/* Incidents List */}
      <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-white/10">
          <h2 className="text-lg font-semibold text-white">Recent Incidents</h2>
        </div>
        
        {incidents && incidents.length > 0 ? (
          <div className="divide-y divide-white/10">
            {incidents.map((incident: Incident) => {
              const severityInfo = severityConfig[incident.severity]
              const statusInfo = statusConfig[incident.status]
              const SeverityIcon = severityInfo.icon
              
              return (
                <div key={incident.id} className="p-6 hover:bg-white/5 transition-all duration-200">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <div className={`p-1 rounded border ${severityInfo.color}`}>
                          <SeverityIcon className="w-4 h-4" />
                        </div>
                        <Link
                          to={`/incidents/${incident.id}`}
                          className="text-white font-semibold hover:text-blue-400 transition-colors"
                        >
                          {incident.title}
                        </Link>
                        <span className={`px-2 py-1 rounded-full text-xs border ${statusInfo.color}`}>
                          {statusInfo.label}
                        </span>
                      </div>
                      
                      <p className="text-gray-400 text-sm mb-3">{incident.description}</p>
                      
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <div className="flex items-center space-x-1">
                          <ClockIcon className="w-4 h-4" />
                          <span>{new Date(incident.created_at).toLocaleDateString()}</span>
                        </div>
                        {incident.assigned_to_name && (
                          <div className="flex items-center space-x-1">
                            <UsersIcon className="w-4 h-4" />
                            <span>{incident.assigned_to_name}</span>
                          </div>
                        )}
                        {incident.tags.length > 0 && (
                          <div className="flex space-x-1">
                            {incident.tags.map((tag, index) => (
                              <span key={index} className="bg-white/10 px-2 py-1 rounded text-xs">
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex space-x-2 ml-4">
                      {incident.status === 'open' && (
                        <button
                          onClick={() => acknowledgeMutation.mutate(incident.id)}
                          disabled={acknowledgeMutation.isPending}
                          className="px-3 py-1 bg-blue-600/20 text-blue-400 border border-blue-600/30 rounded text-sm hover:bg-blue-600/30 transition-all duration-200 disabled:opacity-50"
                        >
                          Acknowledge
                        </button>
                      )}
                      {(incident.status === 'open' || incident.status === 'acknowledged') && (
                        <button
                          onClick={() => resolveMutation.mutate(incident.id)}
                          disabled={resolveMutation.isPending}
                          className="px-3 py-1 bg-emerald-600/20 text-emerald-400 border border-emerald-600/30 rounded text-sm hover:bg-emerald-600/30 transition-all duration-200 disabled:opacity-50"
                        >
                          Resolve
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="p-12 text-center">
            <BellIcon className="w-12 h-12 text-gray-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-400 mb-2">No incidents yet</h3>
            <p className="text-gray-500">Create your first incident to get started</p>
          </div>
        )}
      </div>
    </div>
  )
}