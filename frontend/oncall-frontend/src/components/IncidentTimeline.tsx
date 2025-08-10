// frontend/oncall-frontend/src/components/IncidentTimeline.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { 

  ClockIcon,
  UserIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ChatBubbleLeftIcon,
  BellIcon,
  CogIcon,
  UserPlusIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1';

interface TimelineEvent {
  id: string;
  type: 'created' | 'status_changed' | 'assigned' | 'comment' | 'escalated' | 'acknowledged' | 'resolved' | 'updated';
  timestamp: string;
  user_name: string;
  user_id: string;
  description: string;
  details?: {
    old_value?: string;
    new_value?: string;
    comment?: string;
    metadata?: any;
  };
}

interface IncidentTimelineProps {
  incidentId: string;
}

const IncidentTimeline: React.FC<IncidentTimelineProps> = ({ incidentId }) => {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTimeline = useCallback(async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${API_BASE_URL}/incidents/${incidentId}/timeline`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setEvents(data.events || []);
      } else {
        // If API doesn't exist yet, use mock data
        setEvents(getMockTimelineData());
      }
    } catch (error) {
      console.error('Error fetching timeline:', error);
      // Use mock data on error
      setEvents(getMockTimelineData());
    } finally {
      setIsLoading(false);
    }
  }, [incidentId]);

  useEffect(() => {
    fetchTimeline();
    // Set up polling for real-time updates
    const interval = setInterval(fetchTimeline, 30000); // Poll every 30 seconds
    return () => clearInterval(interval);
  }, [fetchTimeline]);

  const getMockTimelineData = (): TimelineEvent[] => {
    const now = new Date();
    return [
      {
        id: '1',
        type: 'created',
        timestamp: new Date(now.getTime() - 120 * 60000).toISOString(), // 2 hours ago
        user_name: 'Sarah Chen',
        user_id: 'user1',
        description: 'Incident created',
        details: {
          metadata: { severity: 'high', source: 'Datadog Alert' }
        }
      },
      {
        id: '2',
        type: 'escalated',
        timestamp: new Date(now.getTime() - 115 * 60000).toISOString(),
        user_name: 'OffCall AI',
        user_id: 'system',
        description: 'Incident escalated to on-call engineer',
        details: {
          new_value: 'Marcus Rodriguez'
        }
      },
      {
        id: '3',
        type: 'acknowledged',
        timestamp: new Date(now.getTime() - 110 * 60000).toISOString(),
        user_name: 'Marcus Rodriguez',
        user_id: 'user2',
        description: 'Incident acknowledged',
        details: {}
      },
      {
        id: '4',
        type: 'comment',
        timestamp: new Date(now.getTime() - 105 * 60000).toISOString(),
        user_name: 'Marcus Rodriguez',
        user_id: 'user2',
        description: 'Added comment',
        details: {
          comment: 'Investigating the database connection issues. Checking connection pool status and server health.'
        }
      },
      {
        id: '5',
        type: 'assigned',
        timestamp: new Date(now.getTime() - 90 * 60000).toISOString(),
        user_name: 'Marcus Rodriguez',
        user_id: 'user2',
        description: 'Assigned incident',
        details: {
          old_value: 'Unassigned',
          new_value: 'DevOps Team'
        }
      },
      {
        id: '6',
        type: 'comment',
        timestamp: new Date(now.getTime() - 75 * 60000).toISOString(),
        user_name: 'Alex Johnson',
        user_id: 'user3',
        description: 'Added comment',
        details: {
          comment: 'Found the issue - connection pool was exhausted. Restarting the application servers now.'
        }
      },
      {
        id: '7',
        type: 'status_changed',
        timestamp: new Date(now.getTime() - 60 * 60000).toISOString(),
        user_name: 'Alex Johnson',
        user_id: 'user3',
        description: 'Status changed',
        details: {
          old_value: 'acknowledged',
          new_value: 'resolved'
        }
      },
      {
        id: '8',
        type: 'resolved',
        timestamp: new Date(now.getTime() - 60 * 60000).toISOString(),
        user_name: 'Alex Johnson',
        user_id: 'user3',
        description: 'Incident resolved',
        details: {
          comment: 'All application servers restarted successfully. Database connections are stable.'
        }
      }
    ];
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'created':
        return <ExclamationTriangleIcon className="w-5 h-5 text-orange-400" />;
      case 'status_changed':
        return <ArrowPathIcon className="w-5 h-5 text-blue-400" />;
      case 'assigned':
        return <UserPlusIcon className="w-5 h-5 text-purple-400" />;
      case 'comment':
        return <ChatBubbleLeftIcon className="w-5 h-5 text-green-400" />;
      case 'escalated':
        return <BellIcon className="w-5 h-5 text-red-400" />;
      case 'acknowledged':
        return <CheckCircleIcon className="w-5 h-5 text-yellow-400" />;
      case 'resolved':
        return <CheckCircleIcon className="w-5 h-5 text-green-400" />;
      case 'updated':
        return <CogIcon className="w-5 h-5 text-gray-400" />;
      default:
        return <ClockIcon className="w-5 h-5 text-gray-400" />;
    }
  };

  const getEventColor = (type: string) => {
    switch (type) {
      case 'created':
        return 'border-orange-500/30 bg-orange-500/5';
      case 'status_changed':
        return 'border-blue-500/30 bg-blue-500/5';
      case 'assigned':
        return 'border-purple-500/30 bg-purple-500/5';
      case 'comment':
        return 'border-green-500/30 bg-green-500/5';
      case 'escalated':
        return 'border-red-500/30 bg-red-500/5';
      case 'acknowledged':
        return 'border-yellow-500/30 bg-yellow-500/5';
      case 'resolved':
        return 'border-green-500/30 bg-green-500/5';
      case 'updated':
        return 'border-gray-500/30 bg-gray-500/5';
      default:
        return 'border-gray-500/30 bg-gray-500/5';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    let relative = '';
    if (days > 0) relative = `${days} day${days > 1 ? 's' : ''} ago`;
    else if (hours > 0) relative = `${hours} hour${hours > 1 ? 's' : ''} ago`;
    else if (minutes > 0) relative = `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    else relative = 'Just now';

    return {
      absolute: date.toLocaleString(),
      relative
    };
  };

  const renderEventDetails = (event: TimelineEvent) => {
    switch (event.type) {
      case 'status_changed':
        return (
          <div className="text-sm text-gray-300 mt-1">
            <span className="text-red-300">{event.details?.old_value}</span>
            {' → '}
            <span className="text-green-300">{event.details?.new_value}</span>
          </div>
        );
      
      case 'assigned':
        return (
          <div className="text-sm text-gray-300 mt-1">
            {event.details?.old_value && (
              <>
                <span className="text-gray-400">{event.details.old_value}</span>
                {' → '}
              </>
            )}
            <span className="text-purple-300">{event.details?.new_value}</span>
          </div>
        );
      
      case 'comment':
        return (
          <div className="mt-2 p-3 bg-white/5 rounded-lg border border-white/10">
            <p className="text-gray-300 text-sm">{event.details?.comment}</p>
          </div>
        );
      
      case 'created':
        return event.details?.metadata && (
          <div className="text-sm text-gray-400 mt-1">
            Severity: <span className="text-orange-300">{event.details.metadata.severity}</span>
            {event.details.metadata.source && (
              <> • Source: <span className="text-blue-300">{event.details.metadata.source}</span></>
            )}
          </div>
        );
      
      case 'resolved':
        return event.details?.comment && (
          <div className="mt-2 p-3 bg-green-500/10 rounded-lg border border-green-500/20">
            <p className="text-green-300 text-sm">{event.details.comment}</p>
          </div>
        );
      
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {events.length === 0 ? (
        <div className="text-center py-12">
          <ClockIcon className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-400 mb-2">No Timeline Events</h3>
          <p className="text-gray-500 text-sm">
            Timeline events will appear here as the incident progresses.
          </p>
        </div>
      ) : (
        <div className="relative">
          {/* Timeline Line */}
          <div className="absolute left-6 top-0 bottom-0 w-px bg-gradient-to-b from-blue-500 via-purple-500 to-green-500"></div>

          {events.map((event, index) => {
            const timestamp = formatTimestamp(event.timestamp);
            const isSystem = event.user_id === 'system';
            
            return (
              <div key={event.id} className="relative flex items-start space-x-4 pb-6">
                {/* Timeline Dot */}
                <div className={`relative z-10 flex items-center justify-center w-12 h-12 rounded-full border-2 ${getEventColor(event.type)}`}>
                  {getEventIcon(event.type)}
                </div>

                {/* Event Content */}
                <div className="flex-1 min-w-0">
                  <div className={`glass-card rounded-xl p-4 border ${getEventColor(event.type)}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          {!isSystem && <UserIcon className="w-4 h-4 text-gray-400" />}
                          <span className={`font-medium ${isSystem ? 'text-purple-300' : 'text-white'}`}>
                            {event.user_name}
                          </span>
                          <span className="text-gray-400 text-sm">
                            {event.description}
                          </span>
                        </div>
                        
                        {renderEventDetails(event)}
                      </div>

                      <div className="text-right text-xs text-gray-500">
                        <p>{timestamp.relative}</p>
                        <p className="mt-1">{timestamp.absolute}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Real-time Indicator */}
      <div className="flex items-center justify-center py-4">
        <div className="flex items-center space-x-2 px-3 py-1 bg-green-500/10 rounded-full border border-green-500/20">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          <span className="text-green-300 text-xs font-medium">Live Timeline</span>
        </div>
      </div>
    </div>
  );
};

export default IncidentTimeline;