import React, { useState, useEffect } from 'react';
import { 
  PlayIcon,
  CheckIcon,
  XMarkIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  UserIcon,
  ChatBubbleLeftRightIcon,
  CommandLineIcon,
  DocumentTextIcon,
  BoltIcon,
  CpuChipIcon,
  ArrowPathIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline';

interface ResolutionStep {
  id: string;
  order: number;
  title: string;
  description: string;
  command?: string;
  expected_result: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  execution_time?: number;
  output?: string;
  ai_generated: boolean;
}

interface Incident {
  id: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'acknowledged' | 'investigating' | 'resolved';
  assigned_to: string;
  created_at: string;
}

interface AIInsights {
  root_cause: string;
  business_impact: string;
  estimated_resolution_time: string;
  confidence_score: number;
  similar_incidents: number;
}

interface IncidentResolutionWorkflowProps {
  incident: Incident;
  onStatusChange: (status: string) => void;
  onResolve: () => void;
}

const IncidentResolutionWorkflow: React.FC<IncidentResolutionWorkflowProps> = ({
  incident,
  onStatusChange,
  onResolve
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'steps' | 'timeline' | 'ai'>('overview');
  const [resolutionSteps, setResolutionSteps] = useState<ResolutionStep[]>([]);
  const [aiInsights, setAiInsights] = useState<AIInsights | null>(null);
  const [isGeneratingSteps, setIsGeneratingSteps] = useState(false);
  const [executingStep, setExecutingStep] = useState<string | null>(null);
  const [comments, setComments] = useState<string>('');

  // Mock AI-generated resolution steps based on incident
  useEffect(() => {
    generateAIResolutionSteps();
    generateAIInsights();
  }, [incident]);

  const generateAIResolutionSteps = () => {
    setIsGeneratingSteps(true);
    
    // Simulate AI generating steps based on incident type
    setTimeout(() => {
      const steps: ResolutionStep[] = [
        {
          id: '1',
          order: 1,
          title: 'Immediate Assessment',
          description: 'Check system health and identify affected components',
          command: 'kubectl get pods -n production | grep -v Running',
          expected_result: 'Should show any pods not in Running state',
          status: 'pending',
          ai_generated: true
        },
        {
          id: '2',
          order: 2,
          title: 'Database Connection Check',
          description: 'Verify database connectivity and connection pool status',
          command: 'pg_isready -h db-prod.example.com -p 5432',
          expected_result: 'Should return accepting connections',
          status: 'pending',
          ai_generated: true
        },
        {
          id: '3',
          order: 3,
          title: 'Review Recent Deployments',
          description: 'Check if this incident correlates with recent code deployments',
          expected_result: 'Identify any deployments in the last 2 hours',
          status: 'pending',
          ai_generated: true
        },
        {
          id: '4',
          order: 4,
          title: 'Scale Horizontally',
          description: 'Increase replica count to handle increased load',
          command: 'kubectl scale deployment api-server --replicas=10 -n production',
          expected_result: 'Deployment scaled to 10 replicas',
          status: 'pending',
          ai_generated: true
        },
        {
          id: '5',
          order: 5,
          title: 'Monitor Recovery',
          description: 'Monitor system metrics for 5 minutes to confirm recovery',
          expected_result: 'Error rate below 1%, response time below 200ms',
          status: 'pending',
          ai_generated: false
        }
      ];
      
      setResolutionSteps(steps);
      setIsGeneratingSteps(false);
    }, 2000);
  };

  const generateAIInsights = () => {
    // Mock AI insights
    setAiInsights({
      root_cause: 'Database connection pool exhaustion due to increased traffic',
      business_impact: 'Medium - API response times increased, some user requests failing',
      estimated_resolution_time: '15-20 minutes',
      confidence_score: 87,
      similar_incidents: 3
    });
  };

  const executeStep = async (stepId: string) => {
    setExecutingStep(stepId);
    
    const step = resolutionSteps.find(s => s.id === stepId);
    if (!step) return;

    // Update step to running
    setResolutionSteps(prev => prev.map(s => 
      s.id === stepId ? { ...s, status: 'running' } : s
    ));

    // Simulate command execution
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Mock execution results
    const mockOutput = step.command ? 
      `$ ${step.command}\n${step.expected_result}\nExecution completed successfully.` :
      'Manual step completed by engineer.';

    // Update step to completed
    setResolutionSteps(prev => prev.map(s => 
      s.id === stepId ? { 
        ...s, 
        status: 'completed',
        execution_time: 3,
        output: mockOutput
      } : s
    ));

    setExecutingStep(null);
  };

  const skipStep = (stepId: string) => {
    setResolutionSteps(prev => prev.map(s => 
      s.id === stepId ? { ...s, status: 'skipped' } : s
    ));
  };

  const acknowledgeIncident = () => {
    onStatusChange('acknowledged');
  };

  const startInvestigation = () => {
    onStatusChange('investigating');
  };

  const resolveIncident = () => {
    onStatusChange('resolved');
    onResolve();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'text-red-400 bg-red-500/20';
      case 'acknowledged': return 'text-yellow-400 bg-yellow-500/20';
      case 'investigating': return 'text-blue-400 bg-blue-500/20';
      case 'resolved': return 'text-green-400 bg-green-500/20';
      default: return 'text-gray-400 bg-gray-500/20';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-400 bg-red-500/20';
      case 'high': return 'text-orange-400 bg-orange-500/20';
      case 'medium': return 'text-yellow-400 bg-yellow-500/20';
      case 'low': return 'text-green-400 bg-green-500/20';
      default: return 'text-gray-400 bg-gray-500/20';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-white mb-2">{incident.title}</h1>
              <p className="text-gray-400">{incident.description}</p>
            </div>
            <div className="flex gap-3">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getSeverityColor(incident.severity)}`}>
                {incident.severity.toUpperCase()}
              </span>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(incident.status)}`}>
                {incident.status.toUpperCase()}
              </span>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex gap-3">
            {incident.status === 'open' && (
              <button
                onClick={acknowledgeIncident}
                className="px-4 py-2 bg-yellow-500 text-black rounded-lg hover:bg-yellow-400 transition-colors font-medium"
              >
                Acknowledge
              </button>
            )}
            {incident.status === 'acknowledged' && (
              <button
                onClick={startInvestigation}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
              >
                Start Investigation
              </button>
            )}
            {(incident.status === 'investigating' || incident.status === 'acknowledged') && (
              <button
                onClick={resolveIncident}
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium"
              >
                Mark Resolved
              </button>
            )}
            <button className="px-4 py-2 border border-gray-600/50 text-gray-300 rounded-lg hover:bg-gray-800/50 transition-colors">
              Escalate
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 mb-6">
          {[
            { id: 'overview', name: 'Overview', icon: DocumentTextIcon },
            { id: 'steps', name: 'Resolution Steps', icon: CommandLineIcon },
            { id: 'ai', name: 'AI Insights', icon: CpuChipIcon },
            { id: 'timeline', name: 'Timeline', icon: ClockIcon }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                activeTab === tab.id
                  ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.name}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Incident Details</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Assigned To</label>
                      <p className="text-white">{incident.assigned_to}</p>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Created</label>
                      <p className="text-white">{new Date(incident.created_at).toLocaleString()}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Add Comment</h3>
                  <textarea
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                    placeholder="Add details about investigation or resolution..."
                    className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600/50 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500/50 resize-none"
                    rows={4}
                  />
                  <button className="mt-3 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
                    Add Comment
                  </button>
                </div>
              </div>
            )}

            {/* Resolution Steps Tab */}
            {activeTab === 'steps' && (
              <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-white">AI-Generated Resolution Steps</h3>
                  <button
                    onClick={generateAIResolutionSteps}
                    disabled={isGeneratingSteps}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50 transition-colors"
                  >
                    <ArrowPathIcon className={`w-4 h-4 ${isGeneratingSteps ? 'animate-spin' : ''}`} />
                    Regenerate Steps
                  </button>
                </div>

                {isGeneratingSteps ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mx-auto mb-4"></div>
                    <p className="text-gray-400">AI is analyzing the incident and generating resolution steps...</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {resolutionSteps.map((step, index) => (
                      <div
                        key={step.id}
                        className={`border rounded-lg p-4 transition-all ${
                          step.status === 'completed' ? 'border-green-500/50 bg-green-500/10' :
                          step.status === 'running' ? 'border-blue-500/50 bg-blue-500/10' :
                          step.status === 'failed' ? 'border-red-500/50 bg-red-500/10' :
                          step.status === 'skipped' ? 'border-gray-500/50 bg-gray-500/10' :
                          'border-gray-700/50 bg-gray-800/30'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-start gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                              step.status === 'completed' ? 'bg-green-500 text-white' :
                              step.status === 'running' ? 'bg-blue-500 text-white' :
                              step.status === 'failed' ? 'bg-red-500 text-white' :
                              step.status === 'skipped' ? 'bg-gray-500 text-white' :
                              'bg-gray-700 text-gray-300'
                            }`}>
                              {step.status === 'completed' ? <CheckIcon className="w-4 h-4" /> :
                               step.status === 'running' ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> :
                               step.status === 'failed' ? <XMarkIcon className="w-4 h-4" /> :
                               step.order}
                            </div>
                            <div>
                              <h4 className="font-semibold text-white flex items-center gap-2">
                                {step.title}
                                {step.ai_generated && <BoltIcon className="w-4 h-4 text-purple-400" />}
                              </h4>
                              <p className="text-gray-400 text-sm">{step.description}</p>
                              {step.command && (
                                <code className="mt-2 block p-2 bg-gray-900/50 rounded text-sm text-green-400 font-mono">
                                  {step.command}
                                </code>
                              )}
                              {step.output && (
                                <pre className="mt-2 p-3 bg-gray-900/50 rounded text-sm text-gray-300 font-mono whitespace-pre-wrap">
                                  {step.output}
                                </pre>
                              )}
                            </div>
                          </div>
                          
                          {step.status === 'pending' && (
                            <div className="flex gap-2">
                              <button
                                onClick={() => executeStep(step.id)}
                                disabled={executingStep !== null}
                                className="flex items-center gap-1 px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50 transition-colors text-sm"
                              >
                                <PlayIcon className="w-3 h-3" />
                                Execute
                              </button>
                              <button
                                onClick={() => skipStep(step.id)}
                                className="flex items-center gap-1 px-3 py-1 border border-gray-600 text-gray-300 rounded hover:bg-gray-800/50 transition-colors text-sm"
                              >
                                Skip
                              </button>
                            </div>
                          )}
                        </div>
                        
                        {step.execution_time && (
                          <p className="text-xs text-gray-500">
                            Completed in {step.execution_time}s
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* AI Insights Tab */}
            {activeTab === 'ai' && aiInsights && (
              <div className="space-y-6">
                <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <CpuChipIcon className="w-5 h-5 text-purple-400" />
                    AI Analysis Results
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Confidence Score</label>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 bg-gray-700 rounded-full h-2">
                          <div 
                            className="bg-green-500 h-2 rounded-full transition-all"
                            style={{ width: `${aiInsights.confidence_score}%` }}
                          />
                        </div>
                        <span className="text-white font-medium">{aiInsights.confidence_score}%</span>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Similar Incidents</label>
                      <p className="text-white">{aiInsights.similar_incidents} found in history</p>
                    </div>
                  </div>

                  <div className="mt-6 space-y-4">
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Root Cause Analysis</label>
                      <p className="text-white">{aiInsights.root_cause}</p>
                    </div>
                    
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Business Impact</label>
                      <p className="text-white">{aiInsights.business_impact}</p>
                    </div>
                    
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Estimated Resolution Time</label>
                      <p className="text-white">{aiInsights.estimated_resolution_time}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Timeline Tab */}
            {activeTab === 'timeline' && (
              <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Incident Timeline</h3>
                <div className="space-y-4">
                  <div className="flex gap-3">
                    <div className="w-2 h-2 bg-blue-400 rounded-full mt-2"></div>
                    <div>
                      <p className="text-white">Incident created by monitoring alert</p>
                      <p className="text-gray-400 text-sm">{new Date(incident.created_at).toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="w-2 h-2 bg-yellow-400 rounded-full mt-2"></div>
                    <div>
                      <p className="text-white">Incident acknowledged by {incident.assigned_to}</p>
                      <p className="text-gray-400 text-sm">2 minutes ago</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="w-2 h-2 bg-purple-400 rounded-full mt-2"></div>
                    <div>
                      <p className="text-white">AI generated resolution steps</p>
                      <p className="text-gray-400 text-sm">1 minute ago</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Stats */}
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Quick Stats</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-400">Duration</span>
                  <span className="text-white">1h 23m</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Steps Completed</span>
                  <span className="text-white">{resolutionSteps.filter(s => s.status === 'completed').length}/{resolutionSteps.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Last Update</span>
                  <span className="text-white">2 min ago</span>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Recent Activity</h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2">
                  <BoltIcon className="w-4 h-4 text-purple-400" />
                  <span className="text-gray-300">AI analysis completed</span>
                </div>
                <div className="flex items-center gap-2">
                  <UserIcon className="w-4 h-4 text-blue-400" />
                  <span className="text-gray-300">Assigned to {incident.assigned_to}</span>
                </div>
                <div className="flex items-center gap-2">
                  <ChatBubbleLeftRightIcon className="w-4 h-4 text-green-400" />
                  <span className="text-gray-300">Slack notification sent</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IncidentResolutionWorkflow;