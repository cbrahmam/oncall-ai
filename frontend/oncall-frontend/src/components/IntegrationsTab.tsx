import React, { useState, useEffect } from 'react';
import { 
  PlusIcon,
  LinkIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClipboardDocumentIcon,
  CheckIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
  BoltIcon,
  ShieldCheckIcon,
  Cog6ToothIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

interface Integration {
  id: string;
  name: string;
  type: string;
  is_active: boolean;
  config: any;
  created_at: string;
  last_sync_at: string | null;
  icon: string;
}

interface Tool {
  name: string;
  icon: string;
  description: string;
  webhookPath: string;
  setupSteps: string[];
}

interface ToolsMap {
  [key: string]: Tool;
}

const IntegrationsTab: React.FC = () => {
  const [showWizard, setShowWizard] = useState<boolean>(false);
  const [integrations, setIntegrations] = useState<Integration[]>([
    {
      id: '1',
      name: 'Datadog',
      type: 'datadog',
      is_active: true,
      config: { webhook_url: 'https://api.offcallai.com/api/v1/webhooks/datadog?org_id=org_12345' },
      created_at: '2024-01-15T10:30:00Z',
      last_sync_at: '2024-01-20T15:45:00Z',
      icon: '🐕'
    },
    {
      id: '2', 
      name: 'Grafana',
      type: 'grafana',
      is_active: false,
      config: { webhook_url: 'https://api.offcallai.com/api/v1/webhooks/grafana?org_id=org_12345' },
      created_at: '2024-01-10T14:20:00Z',
      last_sync_at: null,
      icon: '📊'
    }
  ]);

  const availableTools: ToolsMap = {
    datadog: { 
      name: 'Datadog', 
      icon: '🐕', 
      description: 'APM, Infrastructure, and Log Monitoring',
      webhookPath: '/webhooks/datadog',
      setupSteps: [
        'Navigate to Integrations → Webhooks in Datadog',
        'Click "New Webhook"',
        'Paste the webhook URL below',
        'Set payload format to JSON',
        'Test the webhook connection'
      ]
    },
    grafana: { 
      name: 'Grafana', 
      icon: '📊', 
      description: 'Observability and Analytics Platform',
      webhookPath: '/webhooks/grafana',
      setupSteps: [
        'Go to Alerting → Notification channels',
        'Create new webhook channel',
        'Enter the webhook URL below',
        'Set HTTP method to POST',
        'Configure alert rules to use this webhook'
      ]
    },
    cloudwatch: { 
      name: 'AWS CloudWatch', 
      icon: '☁️', 
      description: 'AWS Native Monitoring',
      webhookPath: '/webhooks/cloudwatch',
      setupSteps: [
        'Create SNS topic in AWS Console',
        'Add HTTP/S subscription with webhook URL',
        'Configure CloudWatch alarms to publish to SNS',
        'Set up IAM permissions for SNS',
        'Test alarm notification flow'
      ]
    },
    newrelic: { 
      name: 'New Relic', 
      icon: '🔍', 
      description: 'Full-Stack Observability',
      webhookPath: '/webhooks/newrelic',
      setupSteps: [
        'Navigate to Alerts & AI → Destinations',
        'Create new webhook destination',
        'Enter the webhook URL and select POST method',
        'Configure notification policies',
        'Test webhook delivery'
      ]
    },
    prometheus: { 
      name: 'Prometheus', 
      icon: '🔥', 
      description: 'Time Series Monitoring',
      webhookPath: '/webhooks/prometheus',
      setupSteps: [
        'Configure Alertmanager webhook_configs',
        'Add webhook URL to configuration',
        'Set up routing rules for alerts',
        'Reload Alertmanager configuration',
        'Test alert firing and webhook delivery'
      ]
    }
  };

  const getUninstalledTools = (): [string, Tool][] => {
    const installedTypes = new Set(integrations.map(i => i.type));
    return Object.entries(availableTools).filter(([key]) => !installedTypes.has(key));
  };

  const formatDate = (dateStr: string): string => {
    return new Date(dateStr).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (showWizard) {
    return <IntegrationWizard onClose={() => setShowWizard(false)} availableTools={availableTools} />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-white">Integrations</h2>
          <p className="text-gray-400 mt-1">Connect your monitoring tools to OffCall AI</p>
        </div>
        <button
          onClick={() => setShowWizard(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          <PlusIcon className="w-4 h-4" />
          Add Integration
        </button>
      </div>

      {/* Active Integrations */}
      <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <LinkIcon className="w-5 h-5 text-blue-400" />
          Active Integrations
        </h3>
        
        {integrations.length === 0 ? (
          <div className="text-center py-8">
            <LinkIcon className="w-12 h-12 text-gray-500 mx-auto mb-4" />
            <p className="text-gray-400 mb-4">No integrations configured yet</p>
            <button
              onClick={() => setShowWizard(true)}
              className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Add Your First Integration
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {integrations.map((integration) => (
              <div key={integration.id} className="bg-gray-700/30 border border-gray-600/50 rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gray-600/50 flex items-center justify-center text-lg">
                      {integration.icon}
                    </div>
                    <div>
                      <h4 className="font-semibold text-white">{integration.name}</h4>
                      <p className="text-sm text-gray-400">{integration.type}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {integration.is_active ? (
                      <span className="flex items-center gap-1 text-green-400 text-sm">
                        <CheckCircleIcon className="w-4 h-4" />
                        Active
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-yellow-400 text-sm">
                        <ExclamationTriangleIcon className="w-4 h-4" />
                        Inactive
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Created:</span>
                    <span className="text-gray-300">{formatDate(integration.created_at)}</span>
                  </div>
                  {integration.last_sync_at && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Last sync:</span>
                      <span className="text-gray-300">{formatDate(integration.last_sync_at)}</span>
                    </div>
                  )}
                </div>
                
                <div className="flex gap-2 mt-4">
                  <button className="flex-1 px-3 py-2 bg-gray-600/50 text-white rounded-lg hover:bg-gray-600/70 transition-colors text-sm">
                    <Cog6ToothIcon className="w-4 h-4 inline mr-1" />
                    Configure
                  </button>
                  <button className="px-3 py-2 border border-gray-600/50 text-gray-300 rounded-lg hover:bg-gray-800/50 transition-colors text-sm">
                    Test
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Available Integrations */}
      {getUninstalledTools().length > 0 && (
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Available Integrations</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {getUninstalledTools().map(([key, tool]) => (
              <button
                key={key}
                onClick={() => setShowWizard(true)}
                className="flex items-center gap-3 p-4 bg-gray-700/30 border border-gray-600/50 rounded-lg hover:border-gray-500/50 hover:bg-gray-700/50 transition-all text-left"
              >
                <div className="w-10 h-10 rounded-lg bg-gray-600/50 flex items-center justify-center text-lg">
                  {tool.icon}
                </div>
                <div>
                  <h4 className="font-medium text-white">{tool.name}</h4>
                  <p className="text-xs text-gray-400">{tool.description}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Integration Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-500/10 backdrop-blur-sm border border-blue-500/20 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <LinkIcon className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{integrations.filter(i => i.is_active).length}</p>
              <p className="text-sm text-gray-400">Active Integrations</p>
            </div>
          </div>
        </div>
        
        <div className="bg-green-500/10 backdrop-blur-sm border border-green-500/20 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
              <CheckCircleIcon className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">847</p>
              <p className="text-sm text-gray-400">Alerts Processed</p>
            </div>
          </div>
        </div>
        
        <div className="bg-yellow-500/10 backdrop-blur-sm border border-yellow-500/20 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center">
              <BoltIcon className="w-5 h-5 text-yellow-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">23</p>
              <p className="text-sm text-gray-400">Incidents Created</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Integration Wizard Component with proper typing
interface IntegrationWizardProps {
  onClose: () => void;
  availableTools: ToolsMap;
}

const IntegrationWizard: React.FC<IntegrationWizardProps> = ({ onClose, availableTools }) => {
  const [selectedTool, setSelectedTool] = useState<string>('datadog');
  const [organizationId, setOrganizationId] = useState<string>('org_12345');
  const [copied, setCopied] = useState<boolean>(false);
  const [step, setStep] = useState<number>(1);

  const currentTool = availableTools[selectedTool];
  const webhookUrl = `https://api.offcallai.com/api/v1${currentTool.webhookPath}?org_id=${organizationId}`;

  const copyWebhookUrl = async (): Promise<void> => {
    await navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const nextStep = (): void => {
    if (step < 3) setStep(step + 1);
  };

  const prevStep = (): void => {
    if (step > 1) setStep(step - 1);
  };

  const completeIntegration = (): void => {
    // Here you would call your API to save the integration
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900/95 backdrop-blur-xl border border-gray-700/50 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="border-b border-gray-800/50 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <BoltIcon className="w-8 h-8 text-blue-400" />
              <div>
                <h1 className="text-2xl font-bold text-white">Integration Wizard</h1>
                <p className="text-gray-400">Connect your monitoring tools in under 5 minutes</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>
          
          {/* Progress Bar */}
          <div className="mt-6 bg-gray-800/50 rounded-full h-2 w-full max-w-md">
            <div 
              className="bg-gradient-to-r from-blue-500 to-blue-400 h-2 rounded-full transition-all duration-500"
              style={{ width: `${(step / 3) * 100}%` }}
            />
          </div>
          <div className="mt-2 text-sm text-gray-400">Step {step} of 3</div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Step 1: Select Tool */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <h2 className="text-xl font-semibold text-white mb-2">Choose Your Monitoring Tool</h2>
                <p className="text-gray-400">Select the monitoring platform you want to integrate</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(availableTools).map(([key, tool]) => (
                  <button
                    key={key}
                    onClick={() => setSelectedTool(key)}
                    className={`group relative p-6 rounded-xl border backdrop-blur-sm transition-all duration-200 text-left ${
                      selectedTool === key 
                        ? 'border-blue-500/50 bg-blue-500/10 shadow-lg shadow-blue-500/20' 
                        : 'border-gray-700/50 bg-gray-800/30 hover:border-gray-600/50 hover:bg-gray-800/50'
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 rounded-full bg-gray-700/50 flex items-center justify-center text-2xl backdrop-blur-sm">
                        {tool.icon}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg text-white">{tool.name}</h3>
                        {selectedTool === key && (
                          <CheckIcon className="h-5 w-5 text-blue-400 mt-1" />
                        )}
                      </div>
                    </div>
                    <p className="text-gray-400 text-sm">{tool.description}</p>
                    
                    {/* Selection indicator */}
                    {selectedTool === key && (
                      <div className="absolute inset-0 rounded-xl border-2 border-blue-400/50 pointer-events-none" />
                    )}
                  </button>
                ))}
              </div>

              <div className="flex justify-center pt-4">
                <button
                  onClick={nextStep}
                  disabled={!selectedTool}
                  className="flex items-center space-x-2 px-6 py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <span>Continue with {currentTool.name}</span>
                  <ArrowRightIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Get Webhook URL */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <div className="w-16 h-16 rounded-full bg-gray-700/50 backdrop-blur-sm flex items-center justify-center text-3xl mx-auto mb-4">
                  {currentTool.icon}
                </div>
                <h2 className="text-xl font-semibold text-white mb-2">Configure {currentTool.name} Webhook</h2>
                <p className="text-gray-400">Copy this webhook URL and follow the setup steps</p>
              </div>

              {/* Webhook URL */}
              <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
                <label className="block text-sm font-medium text-gray-300 mb-3">
                  Your Webhook URL
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    value={webhookUrl}
                    readOnly
                    className="flex-1 px-4 py-3 bg-gray-900/50 border border-gray-600/50 rounded-lg text-white font-mono text-sm focus:outline-none focus:border-blue-500/50"
                  />
                  <button
                    onClick={copyWebhookUrl}
                    className="flex items-center gap-2 px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    {copied ? <CheckIcon className="h-4 w-4" /> : <ClipboardDocumentIcon className="h-4 w-4" />}
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>

              {/* Setup Steps */}
              <div className="bg-blue-500/10 backdrop-blur-sm border border-blue-500/20 rounded-xl p-6">
                <h3 className="font-semibold text-lg text-white mb-4 flex items-center gap-2">
                  <ShieldCheckIcon className="h-5 w-5 text-blue-400" />
                  Setup Instructions for {currentTool.name}
                </h3>
                <ol className="space-y-3">
                  {currentTool.setupSteps.map((step: string, index: number) => (
                    <li key={index} className="flex items-start gap-3">
                      <span className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-semibold flex-shrink-0 mt-0.5">
                        {index + 1}
                      </span>
                      <span className="text-gray-300">{step}</span>
                    </li>
                  ))}
                </ol>
              </div>

              <div className="flex justify-between pt-4">
                <button
                  onClick={prevStep}
                  className="flex items-center space-x-2 px-4 py-3 border border-gray-600/50 text-gray-300 rounded-lg hover:bg-gray-800/50 transition-colors"
                >
                  <ArrowLeftIcon className="w-4 h-4" />
                  <span>Back</span>
                </button>
                <button
                  onClick={nextStep}
                  className="flex items-center space-x-2 px-6 py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors"
                >
                  <span>Test Integration</span>
                  <ArrowRightIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Test & Complete */}
          {step === 3 && (
            <div className="space-y-6 text-center">
              <div className="w-16 h-16 rounded-full bg-green-500/20 backdrop-blur-sm flex items-center justify-center text-white mx-auto">
                <CheckIcon className="h-8 w-8 text-green-400" />
              </div>
              
              <div>
                <h2 className="text-xl font-semibold text-white mb-2">Integration Ready!</h2>
                <p className="text-gray-400">Your {currentTool.name} integration is configured and ready to receive alerts.</p>
              </div>

              {/* Test Alert */}
              <div className="bg-yellow-500/10 backdrop-blur-sm border border-yellow-500/20 rounded-xl p-6 max-w-md mx-auto">
                <ExclamationTriangleIcon className="h-6 w-6 text-yellow-400 mx-auto mb-3" />
                <h3 className="font-semibold text-white mb-2">Send Test Alert</h3>
                <p className="text-sm text-gray-400 mb-4">
                  Generate a test alert from {currentTool.name} to verify everything is working correctly.
                </p>
                <button className="w-full px-4 py-2 bg-yellow-500 text-black rounded-lg hover:bg-yellow-400 transition-colors font-medium">
                  Trigger Test Alert
                </button>
              </div>

              {/* Next Steps */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
                <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-4">
                  <h4 className="font-semibold text-white mb-2 flex items-center gap-2">
                    <span>🎯</span> Dashboard
                  </h4>
                  <p className="text-sm text-gray-400 mb-3">Monitor incidents and alerts in real-time</p>
                  <button 
                    onClick={completeIntegration}
                    className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
                  >
                    Go to Dashboard
                  </button>
                </div>
                
                <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-4">
                  <h4 className="font-semibold text-white mb-2 flex items-center gap-2">
                    <span>⚙️</span> Settings
                  </h4>
                  <p className="text-sm text-gray-400 mb-3">Configure escalation policies and team settings</p>
                  <button 
                    onClick={completeIntegration}
                    className="w-full px-4 py-2 border border-gray-600/50 text-gray-300 rounded-lg hover:bg-gray-800/50 transition-colors font-medium"
                  >
                    Team Settings
                  </button>
                </div>
              </div>

              <div className="flex justify-center pt-4">
                <button
                  onClick={() => setStep(1)}
                  className="flex items-center space-x-2 px-4 py-3 border border-gray-600/50 text-gray-300 rounded-lg hover:bg-gray-800/50 transition-colors"
                >
                  <LinkIcon className="h-4 w-4" />
                  <span>Add Another Integration</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default IntegrationsTab;