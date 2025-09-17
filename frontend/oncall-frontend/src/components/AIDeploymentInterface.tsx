// frontend/oncall-frontend/src/components/AIDeploymentInterface.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  PlayIcon,
  PauseIcon,
  StopIcon,
  ArrowUturnLeftIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  ClockIcon,
  CommandLineIcon,
  CpuChipIcon,
  ShieldCheckIcon,
  BoltIcon,
  DocumentTextIcon,
  EyeIcon
} from '@heroicons/react/24/outline';
import { useNotifications } from '../contexts/NotificationContext';

interface DeploymentStep {
  id: string;
  command: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  output?: string;
  error?: string;
  startTime?: string;
  endTime?: string;
  duration?: number;
}

interface DeploymentSolution {
  provider: 'claude' | 'gemini';
  description: string;
  steps: string[];
  commands: string[];
  estimatedTime: string;
  riskLevel: 'low' | 'medium' | 'high';
  reversible: boolean;
}

interface AIDeploymentInterfaceProps {
  incidentId: string;
  provider: 'claude' | 'gemini';
  solution: DeploymentSolution;
  onDeploymentComplete: (success: boolean, deploymentId?: string) => void;
  onCancel: () => void;
}

type DeploymentStatus = 'ready' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled' | 'rolling_back';

const AIDeploymentInterface: React.FC<AIDeploymentInterfaceProps> = ({
  incidentId,
  provider,
  solution,
  onDeploymentComplete,
  onCancel
}) => {
  const { showToast } = useNotifications();
  const [deploymentStatus, setDeploymentStatus] = useState<DeploymentStatus>('ready');
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [deploymentSteps, setDeploymentSteps] = useState<DeploymentStep[]>([]);
  const [deploymentId, setDeploymentId] = useState<string | null>(null);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [endTime, setEndTime] = useState<Date | null>(null);
  const [showLogs, setShowLogs] = useState(false);
  const [realTimeOutput, setRealTimeOutput] = useState<string>('');
  
  const wsRef = useRef<WebSocket | null>(null);
  const logContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Initialize deployment steps from solution
    const steps: DeploymentStep[] = solution.commands.map((command, index) => ({
      id: `step-${index}`,
      command,
      description: solution.steps[index] || `Execute step ${index + 1}`,
      status: 'pending'
    }));
    
    setDeploymentSteps(steps);
  }, [solution]);

  useEffect(() => {
    // Auto-scroll logs to bottom
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [realTimeOutput]);

  const startDeployment = async () => {
    if (deploymentStatus === 'running') return;

    try {
      setDeploymentStatus('running');
      setStartTime(new Date());
      
      const token = localStorage.getItem('access_token');
      const response = await fetch(`/api/v1/incidents/${incidentId}/deploy-solution`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          provider,
          solution: {
            commands: solution.commands,
            steps: solution.steps,
            risk_level: solution.riskLevel
          },
          execution_mode: 'supervised' // supervised | automatic
        })
      });

      if (!response.ok) {
        throw new Error(`Deployment failed: ${response.status}`);
      }

      const data = await response.json();
      setDeploymentId(data.deployment_id);

      // Set up WebSocket for real-time updates
      setupWebSocketConnection(data.deployment_id);

      showToast({
        type: 'info',
        title: 'Deployment Started',
        message: `${provider} solution deployment initiated. Monitoring progress...`,
        autoClose: true,
        duration: 3000
      });

    } catch (error) {
      console.error('Deployment start failed:', error);
      setDeploymentStatus('failed');
      
      showToast({
        type: 'error',
        title: 'Deployment Failed',
        message: `Failed to start deployment: ${error instanceof Error ? error.message : 'Unknown error'}`,
        autoClose: true
      });
    }
  };

  const setupWebSocketConnection = (deploymentId: string) => {
    const wsUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/api/v1/deployments/${deploymentId}/stream`;
    
    wsRef.current = new WebSocket(wsUrl);
    
    wsRef.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        handleDeploymentUpdate(data);
      } catch (error) {
        console.error('WebSocket message parse error:', error);
      }
    };

    wsRef.current.onclose = () => {
      console.log('WebSocket connection closed');
    };

    wsRef.current.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  };

  const handleDeploymentUpdate = (update: any) => {
    switch (update.type) {
      case 'step_started':
        updateStepStatus(update.step_id, 'running', update.start_time);
        setCurrentStepIndex(update.step_index);
        break;
        
      case 'step_completed':
        updateStepStatus(update.step_id, 'completed', update.start_time, update.end_time, update.output);
        break;
        
      case 'step_failed':
        updateStepStatus(update.step_id, 'failed', update.start_time, update.end_time, update.output, update.error);
        break;
        
      case 'deployment_completed':
        setDeploymentStatus('completed');
        setEndTime(new Date());
        onDeploymentComplete(true, deploymentId || undefined);
        
        showToast({
          type: 'success',
          title: 'Deployment Successful',
          message: `${provider} solution deployed successfully in ${update.total_duration}`,
          autoClose: true,
          duration: 5000
        });
        break;
        
      case 'deployment_failed':
        setDeploymentStatus('failed');
        setEndTime(new Date());
        onDeploymentComplete(false);
        
        showToast({
          type: 'error',
          title: 'Deployment Failed',
          message: `Deployment failed: ${update.error}`,
          autoClose: true
        });
        break;
        
      case 'output':
        setRealTimeOutput(prev => prev + update.data + '\n');
        break;
    }
  };

  const updateStepStatus = (
    stepId: string, 
    status: DeploymentStep['status'], 
    startTime?: string, 
    endTime?: string, 
    output?: string, 
    error?: string
  ) => {
    setDeploymentSteps(prev => prev.map(step => 
      step.id === stepId 
        ? { 
            ...step, 
            status, 
            startTime, 
            endTime, 
            output, 
            error,
            duration: startTime && endTime ? 
              new Date(endTime).getTime() - new Date(startTime).getTime() : undefined
          }
        : step
    ));
  };

  const pauseDeployment = async () => {
    if (!deploymentId) return;

    try {
      const token = localStorage.getItem('access_token');
      await fetch(`/api/v1/deployments/${deploymentId}/pause`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      setDeploymentStatus('paused');
      showToast({
        type: 'info',
        title: 'Deployment Paused',
        message: 'Deployment has been paused. You can resume or cancel.',
        autoClose: true
      });
    } catch (error) {
      console.error('Pause deployment failed:', error);
    }
  };

  const resumeDeployment = async () => {
    if (!deploymentId) return;

    try {
      const token = localStorage.getItem('access_token');
      await fetch(`/api/v1/deployments/${deploymentId}/resume`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      setDeploymentStatus('running');
      showToast({
        type: 'info',
        title: 'Deployment Resumed',
        message: 'Deployment has been resumed.',
        autoClose: true
      });
    } catch (error) {
      console.error('Resume deployment failed:', error);
    }
  };

  const cancelDeployment = async () => {
    if (!deploymentId) {
      onCancel();
      return;
    }

    try {
      const token = localStorage.getItem('access_token');
      await fetch(`/api/v1/deployments/${deploymentId}/cancel`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      setDeploymentStatus('cancelled');
      wsRef.current?.close();
      onCancel();

      showToast({
        type: 'warning',
        title: 'Deployment Cancelled',
        message: 'Deployment has been cancelled.',
        autoClose: true
      });
    } catch (error) {
      console.error('Cancel deployment failed:', error);
    }
  };

  const rollbackDeployment = async () => {
    if (!deploymentId || !solution.reversible) return;

    try {
      setDeploymentStatus('rolling_back');
      
      const token = localStorage.getItem('access_token');
      await fetch(`/api/v1/deployments/${deploymentId}/rollback`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      showToast({
        type: 'info',
        title: 'Rolling Back',
        message: 'Initiating rollback process...',
        autoClose: true
      });
    } catch (error) {
      console.error('Rollback failed:', error);
      showToast({
        type: 'error',
        title: 'Rollback Failed',
        message: 'Failed to initiate rollback. Please manually revert changes.',
        autoClose: true
      });
    }
  };

  const formatDuration = (ms?: number) => {
    if (!ms) return '';
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    return `${minutes}:${(seconds % 60).toString().padStart(2, '0')}`;
  };

  const getStatusIcon = (status: DeploymentStep['status']) => {
    switch (status) {
      case 'running':
        return <CpuChipIcon className="w-4 h-4 text-blue-400 animate-spin" />;
      case 'completed':
        return <CheckCircleIcon className="w-4 h-4 text-green-400" />;
      case 'failed':
        return <XCircleIcon className="w-4 h-4 text-red-400" />;
      case 'skipped':
        return <ExclamationTriangleIcon className="w-4 h-4 text-yellow-400" />;
      default:
        return <ClockIcon className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: DeploymentStatus) => {
    switch (status) {
      case 'running': return 'text-blue-400';
      case 'completed': return 'text-green-400';
      case 'failed': return 'text-red-400';
      case 'paused': return 'text-yellow-400';
      case 'cancelled': return 'text-gray-400';
      case 'rolling_back': return 'text-orange-400';
      default: return 'text-gray-400';
    }
  };

  const getTotalDuration = () => {
    if (!startTime) return null;
    const end = endTime || new Date();
    return end.getTime() - startTime.getTime();
  };

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
            provider === 'claude' ? 'bg-blue-600' : 'bg-purple-600'
          }`}>
            {provider === 'claude' ? (
              <CpuChipIcon className="w-6 h-6 text-white" />
            ) : (
              <CommandLineIcon className="w-6 h-6 text-white" />
            )}
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">
              {provider === 'claude' ? 'Claude Code' : 'Gemini CLI'} Deployment
            </h3>
            <p className="text-gray-400">{solution.description}</p>
          </div>
        </div>

        <div className="text-right">
          <div className={`text-lg font-semibold ${getStatusColor(deploymentStatus)} capitalize`}>
            {deploymentStatus.replace('_', ' ')}
          </div>
          {getTotalDuration() && (
            <div className="text-sm text-gray-500">
              {formatDuration(getTotalDuration()!)}
            </div>
          )}
        </div>
      </div>

      {/* Risk Assessment */}
      <div className="flex items-center space-x-4 p-4 bg-gray-800/50 rounded-lg">
        <BoltIcon className="w-5 h-5 text-yellow-400" />
        <div className="flex-1">
          <div className="flex items-center space-x-2">
            <span className="text-white font-medium">Risk Level: </span>
            <span className={`px-2 py-1 rounded text-xs font-medium ${
              solution.riskLevel === 'low' ? 'bg-green-500/20 text-green-400' :
              solution.riskLevel === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
              'bg-red-500/20 text-red-400'
            }`}>
              {solution.riskLevel.toUpperCase()}
            </span>
            {solution.reversible && (
              <span className="flex items-center text-green-400 text-xs">
                <ShieldCheckIcon className="w-4 h-4 mr-1" />
                Reversible
              </span>
            )}
          </div>
          <p className="text-gray-400 text-sm mt-1">
            Estimated completion: {solution.estimatedTime}
          </p>
        </div>
      </div>

      {/* Control Buttons */}
      <div className="flex items-center space-x-3">
        {deploymentStatus === 'ready' && (
          <button
            onClick={startDeployment}
            className="flex items-center space-x-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
          >
            <PlayIcon className="w-5 h-5" />
            <span>Start Deployment</span>
          </button>
        )}

        {deploymentStatus === 'running' && (
          <button
            onClick={pauseDeployment}
            className="flex items-center space-x-2 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors"
          >
            <PauseIcon className="w-4 h-4" />
            <span>Pause</span>
          </button>
        )}

        {deploymentStatus === 'paused' && (
          <button
            onClick={resumeDeployment}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <PlayIcon className="w-4 h-4" />
            <span>Resume</span>
          </button>
        )}

        {['running', 'paused'].includes(deploymentStatus) && (
          <button
            onClick={cancelDeployment}
            className="flex items-center space-x-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
          >
            <StopIcon className="w-4 h-4" />
            <span>Cancel</span>
          </button>
        )}

        {['completed', 'failed'].includes(deploymentStatus) && solution.reversible && (
          <button
            onClick={rollbackDeployment}
            className="flex items-center space-x-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors"
          >
            <ArrowUturnLeftIcon className="w-4 h-4" />
            <span>Rollback</span>
          </button>
        )}

        <button
          onClick={() => setShowLogs(!showLogs)}
          className="flex items-center space-x-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
        >
          <EyeIcon className="w-4 h-4" />
          <span>{showLogs ? 'Hide' : 'Show'} Logs</span>
        </button>

        <button
          onClick={onCancel}
          className="text-gray-400 hover:text-white transition-colors"
        >
          Close
        </button>
      </div>

      {/* Deployment Steps */}
      <div className="space-y-3">
        <h4 className="text-lg font-semibold text-white">Deployment Steps</h4>
        {deploymentSteps.map((step, index) => (
          <div
            key={step.id}
            className={`p-4 rounded-lg border ${
              currentStepIndex === index && deploymentStatus === 'running'
                ? 'border-blue-500/50 bg-blue-500/5'
                : 'border-gray-700 bg-gray-800/30'
            }`}
          >
            <div className="flex items-center space-x-3">
              {getStatusIcon(step.status)}
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-white font-medium">{step.description}</span>
                  {step.duration && (
                    <span className="text-xs text-gray-400">{formatDuration(step.duration)}</span>
                  )}
                </div>
                <code className="text-xs text-gray-400 font-mono">{step.command}</code>
              </div>
            </div>
            
            {step.output && (
              <div className="mt-2 p-2 bg-gray-900 rounded text-xs text-green-400 font-mono">
                {step.output}
              </div>
            )}
            
            {step.error && (
              <div className="mt-2 p-2 bg-red-900/20 border border-red-500/20 rounded text-xs text-red-400 font-mono">
                {step.error}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Real-time Logs */}
      {showLogs && (
        <div className="space-y-2">
          <h4 className="text-lg font-semibold text-white flex items-center">
            <DocumentTextIcon className="w-5 h-5 mr-2" />
            Real-time Output
          </h4>
          <div
            ref={logContainerRef}
            className="bg-black rounded-lg p-4 h-64 overflow-y-auto font-mono text-xs text-green-400"
          >
            <pre className="whitespace-pre-wrap">{realTimeOutput || 'Waiting for output...'}</pre>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIDeploymentInterface;