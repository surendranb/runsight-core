import React, { useState } from 'react';
import { 
  ChevronDown, 
  ChevronUp, 
  Lightbulb, 
  TrendingUp, 
  AlertTriangle, 
  Info,
  Target,
  Clock,
  BarChart3,
  CheckCircle
} from 'lucide-react';
import { ActionableInsight } from './ActionableInsightCard';
import { HelpIcon } from '../common/ContextualHelp';

interface InsightSummaryCardProps {
  insight: ActionableInsight;
  onAction?: (insightId: string, action: string) => void;
  onExpand?: (insightId: string) => void;
  className?: string;
}

export const InsightSummaryCard: React.FC<InsightSummaryCardProps> = ({
  insight,
  onAction,
  onExpand,
  className = ''
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'border-l-red-500 bg-red-50';
      case 'medium': return 'border-l-yellow-500 bg-yellow-50';
      case 'low': return 'border-l-blue-500 bg-blue-50';
      default: return 'border-l-gray-500 bg-gray-50';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high': return <AlertTriangle className="w-4 h-4 text-red-600" />;
      case 'medium': return <TrendingUp className="w-4 h-4 text-yellow-600" />;
      case 'low': return <Info className="w-4 h-4 text-blue-600" />;
      default: return <Lightbulb className="w-4 h-4 text-gray-600" />;
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

  const handleToggleExpand = () => {
    setIsExpanded(!isExpanded);
    if (!isExpanded && onExpand) {
      onExpand(insight.id);
    }
  };

  const handleAction = (action: string) => {
    onAction?.(insight.id, action);
  };

  return (
    <div className={`border-l-4 rounded-lg p-4 transition-all duration-200 hover:shadow-md ${getPriorityColor(insight.priority)} ${className}`}>
      {/* Summary Header - Always Visible */}
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3 flex-1">
          <div className="flex-shrink-0 mt-1">
            {getPriorityIcon(insight.priority)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-1">
              <h4 className="text-base font-semibold text-gray-900 truncate">
                {insight.title}
              </h4>
              <HelpIcon 
                content={`${insight.confidence * 100}% confidence based on ${insight.sampleSize} data points`}
                size="sm"
              />
            </div>
            
            {/* Category and Priority Badges */}
            <div className="flex items-center space-x-2 mb-2">
              <span className="inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium bg-white bg-opacity-70 text-gray-700">
                {getCategoryIcon(insight.category)}
                <span className="capitalize">{insight.category}</span>
              </span>
              <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${
                insight.priority === 'high' ? 'bg-red-100 text-red-700' :
                insight.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                'bg-blue-100 text-blue-700'
              }`}>
                {insight.priority}
              </span>
            </div>

            {/* Key Finding - Summary */}
            <p className="text-sm text-gray-800 mb-2">
              {insight.finding}
            </p>

            {/* Quick Action Preview */}
            {insight.actionable && !isExpanded && (
              <div className="text-xs text-gray-600 bg-white bg-opacity-50 rounded px-2 py-1 inline-block">
                💡 {insight.difficulty} action • {insight.timeframe} results
              </div>
            )}
          </div>
        </div>

        {/* Expand/Collapse Button */}
        <button
          onClick={handleToggleExpand}
          className="flex-shrink-0 p-1 text-gray-500 hover:text-gray-700 transition-colors"
          aria-label={isExpanded ? 'Collapse details' : 'Expand details'}
        >
          {isExpanded ? (
            <ChevronUp className="w-5 h-5" />
          ) : (
            <ChevronDown className="w-5 h-5" />
          )}
        </button>
      </div>

      {/* Expanded Details - Progressive Disclosure */}
      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-gray-200 space-y-4">
          {/* Interpretation */}
          <div>
            <h5 className="text-sm font-semibold text-gray-700 mb-1">What this means:</h5>
            <p className="text-sm text-gray-800">{insight.interpretation}</p>
          </div>

          {/* Recommendation */}
          {insight.actionable && (
            <div className="bg-white bg-opacity-70 rounded-lg p-3 border border-gray-200">
              <h5 className="text-sm font-semibold text-gray-700 mb-2 flex items-center">
                <Target className="w-4 h-4 mr-1" />
                Recommended Action:
              </h5>
              <p className="text-sm text-gray-900 mb-3">{insight.recommendation}</p>
              
              {/* Action Metadata */}
              <div className="flex items-center space-x-3 text-xs mb-3">
                <span className={`px-2 py-1 rounded-full font-medium ${
                  insight.difficulty === 'easy' ? 'text-green-700 bg-green-100' :
                  insight.difficulty === 'moderate' ? 'text-yellow-700 bg-yellow-100' :
                  'text-red-700 bg-red-100'
                }`}>
                  {insight.difficulty} difficulty
                </span>
                <span className={`px-2 py-1 rounded-full font-medium ${
                  insight.timeframe === 'immediate' ? 'text-green-700 bg-green-100' :
                  insight.timeframe === 'short-term' ? 'text-blue-700 bg-blue-100' :
                  'text-purple-700 bg-purple-100'
                }`}>
                  {insight.timeframe} results
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleAction('accept')}
                  className="px-3 py-1 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700 transition-colors"
                >
                  I'll try this
                </button>
                <button
                  onClick={() => handleAction('dismiss')}
                  className="px-3 py-1 bg-gray-200 text-gray-700 rounded text-xs font-medium hover:bg-gray-300 transition-colors"
                >
                  Not relevant
                </button>
              </div>
            </div>
          )}

          {/* Supporting Data */}
          {insight.data && (
            <div>
              <h5 className="text-sm font-semibold text-gray-700 mb-2">Supporting Data:</h5>
              <div className="grid grid-cols-2 gap-2 text-xs">
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
              </div>
            </div>
          )}

          {/* Confidence Indicator */}
          <div className="flex items-center justify-between text-xs text-gray-600">
            <div className="flex items-center space-x-2">
              <span>Confidence:</span>
              <div className="flex items-center space-x-1">
                <div className="w-12 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-300 ${
                      insight.confidence >= 0.8 ? 'bg-green-500' :
                      insight.confidence >= 0.6 ? 'bg-yellow-500' :
                      'bg-red-500'
                    }`}
                    style={{ width: `${insight.confidence * 100}%` }}
                  />
                </div>
                <span className="font-medium">
                  {(insight.confidence * 100).toFixed(0)}%
                </span>
              </div>
            </div>
            <div>
              Based on {insight.sampleSize} runs
            </div>
          </div>
        </div>
      )}
    </div>
  );
};