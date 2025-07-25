// src/pages/IncidentDetail.tsx - Modern Incident Detail Page
import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import {
  ArrowLeftIcon,
  ClockIcon,
  UserIcon,
  TagIcon,
  ChatBubbleLeftRightIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  FireIcon,
  PaperAirplaneIcon
} from '@heroicons/react/24/outline'

interface IncidentDetail {
  id: string
  title: string
  description: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  status: 'open' | 'acknowledged' | 'resolved' | 'closed'
  created_at: string
  updated_at: string
  assigned_to_name?: string
  tags: string[]
  timeline: TimelineEvent[]
}

interface TimelineEvent {
  id: string
  type: 'created' | 'acknowledged' | 'resolved' | 'comment' | 'assigned'
  message: string
  user: string
  timestamp: string
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

export default function IncidentDetail() {
  const { id } = useParams<{ id: string }>()
  const [newComment, setNewComment] = useState('')
  const queryClient = useQueryClient()

  // Mock data for demonstration
  const mockIncident: IncidentDetail = {
    id: id || '1',
    title: 'Database Connection Timeout',
    description: 'Users are experiencing slow response times due to database connection timeouts. The issue started at approximately 2:30 PM EST and is affecting approximately 15% of users.',
    severity: 'high',
    status: 'acknowledged',
    created_at: '2024-01-20T14:30:00Z',
    updated_at: '2024-01-20T14:45:00Z',
    assigned_to_name: 'John Doe',
    tags: ['database', 'performance', 'backend'],
    timeline: [
      {
        id: '1',
        type: 'created',
        message: 'Incident created',
        user: 'System',
        timestamp: '2024-01-20T14:30:00Z'
      },
      {
        id: '2',
        type: 'assigned',
        message: 'Assigned to John Doe',
        user: 'Jane Smith',
        timestamp: '2024-01-20T14:32:00Z'
      },
      {
        id: '3',
        type: 'acknowledged',
        message: 'Incident acknowledged - investigating database connections',
        user: 'John Doe',
        timestamp: '2024-01-20T14:35:00Z'
      },
      {
        id: '4',
        type: 'comment',
        message: 'Found high connection pool usage. Scaling up database connections.',
        user: 'John Doe',
        timestamp: '2024-01-20T14:42:00Z'
      }
    ]
  }

  const { data: incident = mockIncident, isLoading } = useQuery({
    queryKey: ['incident', id],
    queryFn: () => api.get(`/api/v1/incidents/${id}`).then(res => res.data),
    enabled: !!id
  })

  const acknowledgeMutation = useMutation({
    mutationFn: (id: string) => api.post(`/api/v1/incidents/${id}/acknowledge`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['incident', id] })
  })

  const resolveMutation = useMutation({
    mutationFn: (id: string) => api.post(`/api/v1/incidents/${id}/resolve`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['incident', id] })
  })

  const addCommentMutation = useMutation({
    mutationFn: (comment: string) => 
      api.post(`/api/v1/incidents/${id}/comments`, { message: comment }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incident', id] })
      setNewComment('')
    }
  })

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-blue-500 border-t-transparent"></div>
      </div>
    )
  }

  const severityInfo = severityConfig[incident.severity]
  const statusInfo = statusConfig[incident.status]
  const SeverityIcon = severityInfo.icon

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Link
          to="/"
          className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-200"
        >
          <ArrowLeftIcon className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center space-x-3 mb-2">
            <div className={`p-1 rounded border ${severityInfo.color}`}>
              <SeverityIcon className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-bold text-white">{incident.title}</h1>
            <span className={`px-3 py-1 rounded-full text-sm border ${statusInfo.color}`}>
              {statusInfo.label}
            </span>
          </div>
          <div className="flex items-center space-x-4 text-sm text-gray-400">
            <div className="flex items-center space-x-1">
              <ClockIcon className="w-4 h-4" />
              <span>Created {new Date(incident.created_at).toLocaleString()}</span>
            </div>
            {incident.assigned_to_name && (
              <div className="flex items-center space-x-1">
                <UserIcon className="w-4 h-4" />
                <span>Assigned to {incident.assigned_to_name}</span>
              </div>
            )}
          </div>
        </div>
        
        {/* Action buttons */}
        <div className="flex space-x-2">
          {incident.status === 'open' && (
            <button
              onClick={() => acknowledgeMutation.mutate(incident.id)}
              disabled={acknowledgeMutation.isPending}
              className="px-4 py-2 bg-blue-600/20 text-blue-400 border border-blue-600/30 rounded-lg hover:bg-blue-600/30 transition-all duration-200 disabled:opacity-50"
            >
              Acknowledge
            </button>
          )}
          {(incident.status === 'open' || incident.status === 'acknowledged') && (
            <button
              onClick={() => resolveMutation.mutate(incident.id)}
              disabled={resolveMutation.isPending}
              className="px-4 py-2 bg-emerald-600/20 text-emerald-400 border border-emerald-600/30 rounded-lg hover:bg-emerald-600/30 transition-all duration-200 disabled:opacity-50"
            >
              Resolve
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
              <DocumentTextIcon className="w-5 h-5" />
              <span>Description</span>
            </h2>
            <p className="text-gray-300 leading-relaxed">{incident.description}</p>
          </div>

          {/* Timeline */}
          <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-6 flex items-center space-x-2">
              <ClockIcon className="w-5 h-5" />
              <span>Timeline</span>
            </h2>
            
            <div className="space-y-4">
              {incident.timeline.map((event, index) => (
                <div key={event.id} className="flex space-x-4">
                  <div className="flex flex-col items-center">
                    <div className={`w-3 h-3 rounded-full ${
                      event.type === 'created' ? 'bg-blue-500' :
                      event.type === 'acknowledged' ? 'bg-yellow-500' :
                      event.type === 'resolved' ? 'bg-emerald-500' :
                      event.type === 'assigned' ? 'bg-purple-500' :
                      'bg-gray-500'
                    }`}></div>
                    {index < incident.timeline.length - 1 && (
                      <div className="w-px h-8 bg-white/20 mt-2"></div>
                    )}
                  </div>
                  <div className="flex-1 pb-4">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-white text-sm">{event.message}</p>
                      <span className="text-xs text-gray-400">
                        {new Date(event.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">by {event.user}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Comments Section */}
          <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
              <ChatBubbleLeftRightIcon className="w-5 h-5" />
              <span>Comments</span>
            </h2>
            
            {/* Add comment form */}
            <form 
              onSubmit={(e) => {
                e.preventDefault()
                if (newComment.trim()) {
                  addCommentMutation.mutate(newComment)
                }
              }}
              className="mb-6"
            >
              <div className="flex space-x-3">
                <div className="flex-1">
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Add a comment..."
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    rows={3}
                  />
                </div>
                <button
                  type="submit"
                  disabled={!newComment.trim() || addCommentMutation.isPending}
                  className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  <PaperAirplaneIcon className="w-4 h-4" />
                  <span>Send</span>
                </button>
              </div>
            </form>

            {/* Comments list */}
            <div className="space-y-4">
              {incident.timeline
                .filter(event => event.type === 'comment')
                .map((comment) => (
                  <div key={comment.id} className="bg-white/5 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                          <span className="text-white text-sm font-semibold">
                            {comment.user.charAt(0)}
                          </span>
                        </div>
                        <span className="text-white font-medium">{comment.user}</span>
                      </div>
                      <span className="text-xs text-gray-400">
                        {new Date(comment.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-gray-300">{comment.message}</p>
                  </div>
                ))}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Incident Info */}
          <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Incident Info</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-400">Severity</label>
                <div className={`mt-1 px-3 py-2 rounded-lg border ${severityInfo.color} flex items-center space-x-2`}>
                  <SeverityIcon className="w-4 h-4" />
                  <span className="capitalize">{incident.severity}</span>
                </div>
              </div>
              
              <div>
                <label className="text-sm text-gray-400">Status</label>
                <div className={`mt-1 px-3 py-2 rounded-lg border ${statusInfo.color}`}>
                  {statusInfo.label}
                </div>
              </div>
              
              <div>
                <label className="text-sm text-gray-400">Created</label>
                <div className="mt-1 text-white">
                  {new Date(incident.created_at).toLocaleString()}
                </div>
              </div>
              
              <div>
                <label className="text-sm text-gray-400">Last Updated</label>
                <div className="mt-1 text-white">
                  {new Date(incident.updated_at).toLocaleString()}
                </div>
              </div>
              
              {incident.assigned_to_name && (
                <div>
                  <label className="text-sm text-gray-400">Assigned To</label>
                  <div className="mt-1 flex items-center space-x-2">
                    <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs font-semibold">
                        {incident.assigned_to_name.charAt(0)}
                      </span>
                    </div>
                    <span className="text-white">{incident.assigned_to_name}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Tags */}
          <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
              <TagIcon className="w-5 h-5" />
              <span>Tags</span>
            </h3>
            <div className="flex flex-wrap gap-2">
              {incident.tags.map((tag, index) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-full text-sm"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
            <div className="space-y-2">
              <button className="w-full text-left px-3 py-2 text-gray-300 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-200">
                Edit Incident
              </button>
              <button className="w-full text-left px-3 py-2 text-gray-300 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-200">
                Assign to Team
              </button>
              <button className="w-full text-left px-3 py-2 text-gray-300 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-200">
                Create Runbook
              </button>
              <button className="w-full text-left px-3 py-2 text-gray-300 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-200">
                Export Report
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}