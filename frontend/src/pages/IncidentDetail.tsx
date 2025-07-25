import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'

export default function IncidentDetail() {
  const { id } = useParams<{ id: string }>()
  
  const { data: incident, isLoading } = useQuery({
    queryKey: ['incident', id],
    queryFn: () => api.get(`/api/v1/incidents/${id}`).then(res => res.data)
  })

  if (isLoading) return <div>Loading...</div>
  if (!incident) return <div>Incident not found</div>

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold text-gray-900">{incident.title}</h1>
      <p className="mt-2 text-gray-600">{incident.description}</p>
      <div className="mt-4">
        <span className="text-sm text-gray-500">Status: {incident.status}</span>
        <span className="ml-4 text-sm text-gray-500">Severity: {incident.severity}</span>
      </div>
    </div>
  )
}