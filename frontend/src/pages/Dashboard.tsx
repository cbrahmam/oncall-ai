// src/pages/Dashboard.tsx - Simple working version
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'

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

const severityColors: Record<string, string> = {
  low: 'bg-green-100 text-green-800',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-orange-100 text-orange-800',
  critical: 'bg-red-100 text-red-800'
}

const statusColors: Record<string, string> = {
  open: 'bg-red-100 text-red-800',
  acknowledged: 'bg-blue-100 text-blue-800',
  resolved: 'bg-green-100 text-green-800',
  closed: 'bg-gray-100 text-gray-800'
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

  if (isLoading) {
    return <div className="flex justify-center py-8">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-xl font-semibold text-gray-900">Incidents</h1>
          <p className="mt-2 text-sm text-gray-700">
            Active incidents requiring attention
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <button
            onClick={() => setShowCreateForm(true)}
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
          >
            Create Incident
          </button>
        </div>
      </div>

      {showCreateForm && (
        <div className="mt-6 bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium mb-4">Create New Incident</h3>
          <div className="space-y-4">
            <input
              type="text"
              placeholder="Incident title"
              value={newIncident.title}
              onChange={(e) => setNewIncident({...newIncident, title: e.target.value})}
              className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            />
            <textarea
              placeholder="Description"
              value={newIncident.description}
              onChange={(e) => setNewIncident({...newIncident, description: e.target.value})}
              className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              rows={3}
            />
            <select
              value={newIncident.severity}
              onChange={(e) => setNewIncident({...newIncident, severity: e.target.value as 'low' | 'medium' | 'high' | 'critical'})}
              className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
            <div className="flex space-x-3">
              <button
                onClick={() => createMutation.mutate(newIncident)}
                disabled={!newIncident.title}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                Create
              </button>
              <button
                onClick={() => setShowCreateForm(false)}
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
        {incidents?.map((incident: Incident) => (
          <div key={incident.id} className="bg-white shadow rounded-lg p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <Link 
                  to={`/incidents/${incident.id}`}
                  className="text-lg font-medium text-gray-900 hover:text-blue-600"
                >
                  {incident.title}
                </Link>
                <p className="mt-1 text-sm text-gray-600">{incident.description}</p>
              </div>
              <div className="ml-4 flex-shrink-0">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${severityColors[incident.severity]}`}>
                  {incident.severity}
                </span>
              </div>
            </div>
            
            <div className="mt-4 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[incident.status]}`}>
                  {incident.status}
                </span>
                {incident.assigned_to_name && (
                  <span className="text-xs text-gray-500">
                    Assigned to {incident.assigned_to_name}
                  </span>
                )}
              </div>
              <span className="text-xs text-gray-500">
                {new Date(incident.created_at).toLocaleDateString()}
              </span>
            </div>

            {incident.status === 'open' && (
              <div className="mt-4 flex space-x-2">
                <button
                  onClick={() => acknowledgeMutation.mutate(incident.id)}
                  className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                >
                  Acknowledge
                </button>
                <button
                  onClick={() => resolveMutation.mutate(incident.id)}
                  className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
                >
                  Resolve
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {incidents?.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">No incidents found. Create one to get started.</p>
        </div>
      )}
    </div>
  )
}