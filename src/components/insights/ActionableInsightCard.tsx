import React, { useState } from 'react';
import { 
  Lightbulb, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle, 
  ChevronDown, 
  ChevronUp,
  Target,
  Clock,
  BarChart3,
  Info
} from 'lucide-react';
import { HelpIcon, ContextualExplanation } from '../common/ContextualHelp';

export interface ActionableInsight {
  id: string;
  title: string;
  category: 'performance' | 'consistency' | 'health' | 'training' | 'achievement';
  priority: 'high' | 'medium' | 'low';
  
  // Core insight structure
  finding: string; // What was discovered
  interpretation: string; // What this means for the user
  recommendation: string; // What the user should do about it
  
  // Confidence and reliability
  confidence: number; // 0-1 scale
  sampleSize: number; // Number of data points
  dataQuality: 'high' | 'medium' | 'low';
  
  // Actionability
  actionable: boolean;
  difficulty: 'easy' | 'moderate' | 'challenging';
  timeframe: 'immediate' | 'short-term' | 'long-term'; // When to expect results
  
  // Supporting data
  data?: {
    current?: number;
    previous?: number;
    target?: number;
    trend?: 'improving' | 'declining' | 'stable';
    unit?: string;
  };
  
  // Visual elements
  icon?: React.ReactNode;
  color?: string;
  
  // Additional context
  learnMoreUrl?: string;
  relatedInsights?: string[];
}

interface ActionableInsightCardProps {
  insight: ActionableInsight;
  onAction?: (insightId: string, action: string) => void;
  showDetailsByDefault?: boolean;
  className?: string;
}

export const ActionableInsightCard: React.FC<ActionableInsightCardProps> = ({
  insight,
  onAction,
  showDetailsByDefault = false,
  className = ''
}) => {
  const [showDetails, setShowDetails] = useState(showDetailsByDefault);
  const [isActedUpon, setIsActedUpon] = useState(false);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'border-red-200 bg-red-50';
      case 'medium': return 'border-yellow-200 bg-yellow-50';
      case 'low': return 'border-blue-200 bg-blue-50';
      default: return 'border-gray-200 bg-gray-50';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high': return <AlertTriangle className="w-5 h-5 text-red-600" />;
      case 'medium': return <TrendingUp className="w-5 h-5 text-yellow-600" />;
      case 'low': return <Info className="w-5 h-5 text-blue-600" />;
      default: return <Lightbulb className="w-5 h-5 text-gray-600" />;
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'performance': return <BarChart3 className="w-4 h-4" />;
      case 'consistency': return <Clock className="w-4 h-4" />;
      case 'health': return <CheckCircle className="w-4 h-4" />;
      case 'training': return <Target className="w-4 h-4" />;
      case 'achievement': return <TrendingUp className="w-4 h-4" />;
      default: return <Lightbulb className="w-4 h-4" />;
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'text-green-700 bg-green-100';
      case 'moderate': return 'text-yellow-700 bg-yellow-100';
      case 'challenging': return 'text-red-700 bg-red-100';
      default: return 'text-gray-700 bg-gray-100';
    }
  };

  const getTimeframeColor = (timeframe: string) => {
    switch (timeframe) {
      case 'immediate': return 'text-green-700 bg-green-100';
      case 'short-term': return 'text-blue-700 bg-blue-100';
      case 'long-term': return 'text-purple-700 bg-purple-100';
      default: return 'text-gray-700 bg-gray-100';
    }
  };

  const handleAction = (action: string) => {
    setIsActedUpon(true);
    onAction?.(insight.id, action);
  };

  return (
    <div className={`border rounded-xl p-6 transition-all duration-200 hover:shadow-md ${getPriorityColor(insight.priority)} ${className}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start space-x-3 flex-1">
          <div className="flex-shrink-0 mt-1">
            {insight.icon || getPriorityIcon(insight.priority)}
          </div>
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              <h3 className="text-lg font-semibold text-gray-900">{insight.title}</h3>
              <HelpIcon 
                content={`This ${insight.category} insight has ${insight.confidence * 100}% confidence based on ${insight.sampleSize} data points.`}
                size="sm"
              />
            </div>
            
            {/* Category and priority badges */}
            <div className="flex items-center space-x-2 mb-3">
              <span className="inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                {getCategoryIcon(insight.category)}
                <span className="capitalize">{insight.category}</span>
              </span>
              <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${
                insight.priority === 'high' ? 'bg-red-100 text-red-700' :
                insight.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                'bg-blue-100 text-blue-700'
              }`}>
                {insight.priority} priority
              </span>
              {insight.actionable && (
                <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                  Actionable
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Core insight content */}
      <div className="space-y-4">
        {/* Finding */}
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-1">Finding:</h4>
          <p className="text-gray-900">{insight.finding}</p>
        </div>

        {/* Interpretation */}
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-1">What this means:</h4>
          <p className="text-gray-800">{insight.interpretation}</p>
        </div>

        {/* Recommendation */}
        {insight.actionable && (
          <div className="bg-white bg-opacity-70 rounded-lg p-4 border border-gray-200">
            <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center">
              <Target className="w-4 h-4 mr-1" />
              Recommended Action:
            </h4>
            <p className="text-gray-900 mb-3">{insight.recommendation}</p>
            
            {/* Action metadata */}
            <div className="flex items-center space-x-3 text-xs">
              <span className={`px-2 py-1 rounded-full font-medium ${getDifficultyColor(insight.difficulty)}`}>
                {insight.difficulty} difficulty
              </span>
              <span className={`px-2 py-1 rounded-full font-medium ${getTimeframeColor(insight.timeframe)}`}>
                {insight.timeframe} results
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Confidence and data quality indicators */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1">
              <span className="text-gray-600">Confidence:</span>
              <div className="flex items-center space-x-1">
                <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-300 ${
                      insight.confidence >= 0.8 ? 'bg-green-500' :
                      insight.confidence >= 0.6 ? 'bg-yellow-500' :
                      'bg-red-500'
                    }`}
                    style={{ width: `${insight.confidence * 100}%` }}
                  />
                </div>
                <span className="text-gray-700 font-medium">
                  {(insight.confidence * 100).toFixed(0)}%
                </span>
              </div>
            </div>
            
            <div className="text-gray-600">
              Based on {insight.sampleSize} runs
            </div>
          </div>

          {/* Toggle details button - Fitts's Law compliant */}
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="flex items-center justify-center min-h-[44px] min-w-[44px] px-4 py-3 space-x-1 text-gray-600 hover:text-gray-800 active:text-gray-900 transition-all duration-200 rounded-lg hover:bg-gray-100 active:bg-gray-200 select-none md:min-h-[32px] md:min-w-[32px] md:px-3 md:py-2"
            style={{ 
              WebkitTapHighlightColor: 'transparent',
              touchAction: 'manipulation'
            }}
          >
            <span className="text-sm whitespace-nowrap">{showDetails ? 'Hide' : 'Show'} Details</span>
            {showDetails ? (
              <ChevronUp className="w-4 h-4 flex-shrink-0" />
            ) : (
              <ChevronDown className="w-4 h-4 flex-shrink-0" />
            )}
          </button>
        </div>
      </div>

      {/* Detailed information (collapsible) */}
      {showDetails && (
        <div className="mt-4 pt-4 border-t border-gray-200 space-y-4">
          {/* Supporting data */}
          {insight.data && (
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Supporting Data:</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                {insight.data.current !== undefined && (
                  <div className="bg-white bg-opacity-50 p-2 rounded">
                    <div className="text-gray-600">Current</div>
                    <div className="font-semibold">
                      {insight.data.current} {insight.data.unit || ''}
                    </div>
                  </div>
                )}
                {insight.data.previous !== undefined && (
                  <div className="bg-white bg-opacity-50 p-2 rounded">
                    <div className="text-gray-600">Previous</div>
                    <div className="font-semibold">
                      {insight.data.previous} {insight.data.unit || ''}
                    </div>
                  </div>
                )}
                {insight.data.target !== undefined && (
                  <div className="bg-white bg-opacity-50 p-2 rounded">
                    <div className="text-gray-600">Target</div>
                    <div className="font-semibold">
                      {insight.data.target} {insight.data.unit || ''}
                    </div>
                  </div>
                )}
                {insight.data.trend && (
                  <div className="bg-white bg-opacity-50 p-2 rounded">
                    <div className="text-gray-600">Trend</div>
                    <div className={`font-semibold flex items-center space-x-1 ${
                      insight.data.trend === 'improving' ? 'text-green-600' :
                      insight.data.trend === 'declining' ? 'text-red-600' :
                      'text-gray-600'
                    }`}>
                      {insight.data.trend === 'improving' && <TrendingUp className="w-3 h-3" />}
                      {insight.data.trend === 'declining' && <TrendingDown className="w-3 h-3" />}
                      <span className="capitalize">{insight.data.trend}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Data quality indicator */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-2">Data Quality:</h4>
            <div className="flex items-center space-x-2">
              <span className={`px-2 py-1 rounded text-xs font-medium ${
                insight.dataQuality === 'high' ? 'bg-green-100 text-green-700' :
                insight.dataQuality === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                'bg-red-100 text-red-700'
              }`}>
                {insight.dataQuality} quality
              </span>
              <span className="text-xs text-gray-600">
                {insight.dataQuality === 'high' && 'Reliable data with sufficient sample size'}
                {insight.dataQuality === 'medium' && 'Good data but limited sample size'}
                {insight.dataQuality === 'low' && 'Limited data - interpret with caution'}
              </span>
            </div>
          </div>

          {/* Action buttons - Fitts's Law compliant */}
          {insight.actionable && !isActedUpon && (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-2 pt-2">
              <button
                onClick={() => handleAction('accept')}
                className="min-h-[44px] min-w-[44px] px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-all duration-200 text-sm font-medium select-none md:min-h-[36px] md:min-w-[36px] md:px-3 md:py-2"
                style={{ 
                  WebkitTapHighlightColor: 'transparent',
                  touchAction: 'manipulation'
                }}
              >
                <span className="whitespace-nowrap">I'll try this</span>
              </button>
              <button
                onClick={() => handleAction('dismiss')}
                className="min-h-[44px] min-w-[44px] px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 active:bg-gray-400 transition-all duration-200 text-sm font-medium select-none md:min-h-[36px] md:min-w-[36px] md:px-3 md:py-2"
                style={{ 
                  WebkitTapHighlightColor: 'transparent',
                  touchAction: 'manipulation'
                }}
              >
                <span className="whitespace-nowrap">Not relevant</span>
              </button>
              <button
                onClick={() => handleAction('remind')}
                className="min-h-[44px] min-w-[44px] px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 active:bg-gray-400 transition-all duration-200 text-sm font-medium select-none md:min-h-[36px] md:min-w-[36px] md:px-3 md:py-2"
                style={{ 
                  WebkitTapHighlightColor: 'transparent',
                  touchAction: 'manipulation'
                }}
              >
                <span className="whitespace-nowrap">Remind me later</span>
              </button>
            </div>
          )}

          {isActedUpon && (
            <div className="flex items-center space-x-2 text-green-700 bg-green-100 p-2 rounded">
              <CheckCircle className="w-4 h-4" />
              <span className="text-sm font-medium">Thanks for the feedback!</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};