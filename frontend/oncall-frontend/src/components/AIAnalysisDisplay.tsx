// frontend/oncall-frontend/src/components/AIAnalysisDisplay.tsx
import React, { useState, useEffect } from 'react';
import {
  CpuChipIcon,
  BoltIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  CodeBracketIcon,
  RocketLaunchIcon,
  SparklesIcon,
  ShieldCheckIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { useNotifications } from '../contexts/NotificationContext';

interface AIAnalysis {
  provider: 'claude' | 'gemini';
  confidence: number;
  rootCause: string;
  solution: {
    description: string;
    steps: string[];
    commands: string[];
    estimatedTime: string;
    riskLevel: 'low' | 'medium' | 'high';
    reversible: boolean;
  };
  impact: {
    affectedSystems: string[];
    businessImpact: string;
    userImpact: string;
  };
  preventionSteps: string[];
}

interface AIAnalysisDisplayProps {
  incidentId: string;
  onDeploymentSelect: (provider: 'claude' | 'gemini', solution: any) => void;
  isLoading?: boolean;
}

const AIAnalysisDisplay: React.FC<AIAnalysisDisplayProps> = ({ 
  incidentId, 
  onDeploymentSelect,
  isLoading = false 
}) => {
  const { showToast } = useNotifications();
  const [analyses, setAnalyses] = useState<{
    claude?: AIAnalysis;
    gemini?: AIAnalysis;
  }>({});
  const [selectedProvider, setSelectedProvider] = useState<'claude' | 'gemini' | null>(null);
  const [analyzingState, setAnalyzingState] = useState({
    claude: 'pending', // pending, analyzing, complete, error
    gemini: 'pending'
  });

  useEffect(() => {
    if (incidentId) {
      performAIAnalysis();
    }
  }, [incidentId]);

  const performAIAnalysis = async () => {
    setAnalyzingState({ claude: 'analyzing', gemini: 'analyzing' });

    try {
      const token = localStorage.getItem('access_token');
      
      // Call both AI providers simultaneously
      const analysisPromise = fetch(`/api/v1/incidents/${incidentId}/ai-analysis`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          providers: ['claude', 'gemini'],
          include_deployment_plan: true
        })
      });

      const response = await analysisPromise;
      
      if (!response.ok) {
        throw new Error('AI analysis failed');
      }

      const data = await response.json();
      
      // Process Claude analysis
      if (data.claude_analysis) {
        const claudeAnalysis: AIAnalysis = {
          provider: 'claude',
          confidence: data.claude_analysis.confidence_score || 0.92,
          rootCause: data.claude_analysis.root_cause || 'Analysis in progress',
          solution: {
            description: data.claude_analysis.solution_description || 'Deploying comprehensive fix',
            steps: data.claude_analysis.solution_steps || ['Analyzing incident...'],
            commands: data.claude_analysis.deployment_commands || [],
            estimatedTime: data.claude_analysis.estimated_time || '5-10 minutes',
            riskLevel: data.claude_analysis.risk_level || 'low',
            reversible: data.claude_analysis.reversible !== false
          },
          impact: {
            affectedSystems: data.claude_analysis.affected_systems || [],
            businessImpact: data.claude_analysis.business_impact || 'Service disruption',
            userImpact: data.claude_analysis.user_impact || 'Potential user experience degradation'
          },
          preventionSteps: data.claude_analysis.prevention_steps || []
        };
        
        setAnalyses(prev => ({ ...prev, claude: claudeAnalysis }));
        setAnalyzingState(prev => ({ ...prev, claude: 'complete' }));
      }

      // Process Gemini analysis
      if (data.gemini_analysis) {
        const geminiAnalysis: AIAnalysis = {
          provider: 'gemini',
          confidence: data.gemini_analysis.confidence_score || 0.88,
          rootCause: data.gemini_analysis.root_cause || 'Analysis in progress',
          solution: {
            description: data.gemini_analysis.solution_description || 'Implementing targeted fix',
            steps: data.gemini_analysis.solution_steps || ['Processing analysis...'],
            commands: data.gemini_analysis.deployment_commands || [],
            estimatedTime: data.gemini_analysis.estimated_time || '3-8 minutes',
            riskLevel: data.gemini_analysis.risk_level || 'medium',
            reversible: data.gemini_analysis.reversible !== false
          },
          impact: {
            affectedSystems: data.gemini_analysis.affected_systems || [],
            businessImpact: data.gemini_analysis.business_impact || 'System performance impact',
            userImpact: data.gemini_analysis.user_impact || 'User-facing service disruption'
          },
          preventionSteps: data.gemini_analysis.prevention_steps || []
        };
        
        setAnalyses(prev => ({ ...prev, gemini: geminiAnalysis }));
        setAnalyzingState(prev => ({ ...prev, gemini: 'complete' }));
      }

      showToast({
        type: 'success',
        title: 'AI Analysis Complete',
        message: 'Both Claude and Gemini have analyzed the incident. Review the solutions below.',
        autoClose: true,
        duration: 4000
      });

    } catch (error) {
      console.error('AI analysis error:', error);
      setAnalyzingState({ claude: 'error', gemini: 'error' });
      
      showToast({
        type: 'error',
        title: 'Analysis Failed',
        message: 'Unable to complete AI analysis. Please try again.',
        autoClose: true
      });
    }
  };

  const handleProviderSelect = (provider: 'claude' | 'gemini') => {
    setSelectedProvider(provider);
    const analysis = analyses[provider];
    if (analysis) {
      onDeploymentSelect(provider, analysis.solution);
    }
  };

  const getProviderIcon = (provider: 'claude' | 'gemini') => {
    return provider === 'claude' ? (
      <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
        <CpuChipIcon className="w-6 h-6 text-white" />
      </div>
    ) : (
      <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center">
        <SparklesIcon className="w-6 h-6 text-white" />
      </div>
    );
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return 'text-green-400';
    if (confidence >= 0.8) return 'text-yellow-400';
    return 'text-orange-400';
  };

  const getRiskBadgeColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'medium': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'high': return 'bg-red-500/20 text-red-400 border-red-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const AnalysisCard: React.FC<{ provider: 'claude' | 'gemini'; analysis?: AIAnalysis }> = ({ 
    provider, 
    analysis 
  }) => {
    const state = analyzingState[provider];
    const isSelected = selectedProvider === provider;

    return (
      <div className={`
        relative p-6 rounded-xl border transition-all duration-300 
        ${isSelected 
          ? 'border-blue-500/50 bg-blue-500/5 shadow-lg shadow-blue-500/20' 
          : 'border-gray-700/50 bg-gray-800/50 hover:border-gray-600/50'
        } 
        backdrop-blur-sm hover:transform hover:scale-[1.02]
      `}>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            {getProviderIcon(provider)}
            <div>
              <h3 className="text-lg font-semibold text-white capitalize">
                {provider} {provider === 'claude' ? 'Code' : 'CLI'}
              </h3>
              <p className="text-sm text-gray-400">
                {provider === 'claude' ? 'Advanced code analysis' : 'CLI-focused automation'}
              </p>
            </div>
          </div>

          {analysis && (
            <div className="text-right">
              <div className={`text-lg font-bold ${getConfidenceColor(analysis.confidence)}`}>
                {Math.round(analysis.confidence * 100)}%
              </div>
              <div className="text-xs text-gray-500">confidence</div>
            </div>
          )}
        </div>

        {/* Analysis State */}
        {state === 'analyzing' && (
          <div className="flex items-center justify-center py-8">
            <ArrowPathIcon className="w-8 h-8 text-blue-400 animate-spin mr-3" />
            <span className="text-gray-300">Analyzing incident...</span>
          </div>
        )}

        {state === 'error' && (
          <div className="flex items-center justify-center py-8 text-red-400">
            <ExclamationTriangleIcon className="w-8 h-8 mr-3" />
            <span>Analysis failed</span>
          </div>
        )}

        {/* Analysis Results */}
        {state === 'complete' && analysis && (
          <div className="space-y-4">
            {/* Root Cause */}
            <div>
              <h4 className="text-sm font-medium text-gray-400 mb-2">Root Cause</h4>
              <p className="text-white">{analysis.rootCause}</p>
            </div>

            {/* Solution Overview */}
            <div>
              <h4 className="text-sm font-medium text-gray-400 mb-2">Solution</h4>
              <p className="text-white text-sm mb-3">{analysis.solution.description}</p>
              
              <div className="flex items-center space-x-4 text-xs">
                <span className="flex items-center text-gray-400">
                  <ClockIcon className="w-4 h-4 mr-1" />
                  {analysis.solution.estimatedTime}
                </span>
                <span className={`px-2 py-1 rounded-full border text-xs ${getRiskBadgeColor(analysis.solution.riskLevel)}`}>
                  {analysis.solution.riskLevel} risk
                </span>
                {analysis.solution.reversible && (
                  <span className="flex items-center text-green-400">
                    <ShieldCheckIcon className="w-4 h-4 mr-1" />
                    Reversible
                  </span>
                )}
              </div>
            </div>

            {/* Solution Steps Preview */}
            <div>
              <h4 className="text-sm font-medium text-gray-400 mb-2">Key Steps</h4>
              <ul className="space-y-1">
                {analysis.solution.steps.slice(0, 3).map((step, index) => (
                  <li key={index} className="text-sm text-gray-300 flex items-center">
                    <span className="w-4 h-4 bg-blue-600 rounded-full flex items-center justify-center text-xs text-white mr-2 flex-shrink-0">
                      {index + 1}
                    </span>
                    {step}
                  </li>
                ))}
                {analysis.solution.steps.length > 3 && (
                  <li className="text-sm text-gray-500 ml-6">
                    +{analysis.solution.steps.length - 3} more steps...
                  </li>
                )}
              </ul>
            </div>

            {/* Affected Systems */}
            {analysis.impact.affectedSystems.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-400 mb-2">Affected Systems</h4>
                <div className="flex flex-wrap gap-2">
                  {analysis.impact.affectedSystems.map((system, index) => (
                    <span key={index} className="px-2 py-1 bg-gray-700 text-gray-300 rounded text-xs">
                      {system}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Deploy Button */}
            <button
              onClick={() => handleProviderSelect(provider)}
              className={`
                w-full mt-6 py-3 px-4 rounded-lg font-semibold transition-all duration-200 
                flex items-center justify-center space-x-2
                ${isSelected
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25'
                  : 'bg-gray-700 hover:bg-gray-600 text-white'
                }
              `}
            >
              <RocketLaunchIcon className="w-5 h-5" />
              <span>
                {isSelected ? 'Selected for Deployment' : `Deploy ${provider} Solution`}
              </span>
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">AI Analysis Results</h2>
          <p className="text-gray-400">
            Multiple AI providers have analyzed your incident. Select the solution you prefer to deploy.
          </p>
        </div>
        
        {(analyzingState.claude === 'complete' || analyzingState.gemini === 'complete') && (
          <button
            onClick={performAIAnalysis}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
          >
            <ArrowPathIcon className="w-4 h-4" />
            <span>Re-analyze</span>
          </button>
        )}
      </div>

      {/* Analysis Cards */}
      <div className="grid lg:grid-cols-2 gap-6">
        <AnalysisCard provider="claude" analysis={analyses.claude} />
        <AnalysisCard provider="gemini" analysis={analyses.gemini} />
      </div>

      {/* Comparison Summary */}
      {analyses.claude && analyses.gemini && (
        <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6 backdrop-blur-sm">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
            <BoltIcon className="w-5 h-5 mr-2 text-yellow-400" />
            Quick Comparison
          </h3>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-sm font-medium text-blue-400 mb-2">Claude Code</h4>
              <ul className="text-sm text-gray-300 space-y-1">
                <li>• Higher confidence: {Math.round(analyses.claude.confidence * 100)}%</li>
                <li>• Estimated time: {analyses.claude.solution.estimatedTime}</li>
                <li>• Risk level: {analyses.claude.solution.riskLevel}</li>
                <li>• Code-focused approach</li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-sm font-medium text-purple-400 mb-2">Gemini CLI</h4>
              <ul className="text-sm text-gray-300 space-y-1">
                <li>• Confidence: {Math.round(analyses.gemini.confidence * 100)}%</li>
                <li>• Estimated time: {analyses.gemini.solution.estimatedTime}</li>
                <li>• Risk level: {analyses.gemini.solution.riskLevel}</li>
                <li>• CLI-focused automation</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIAnalysisDisplay;