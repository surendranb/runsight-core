import React, { useState } from 'react';
import { 
  Cloud, 
  TrendingUp, 
  Calendar, 
  Target, 
  ChevronDown, 
  ChevronUp,
  Lightbulb,
  CheckCircle,
  X
} from 'lucide-react';

interface InsightCardProps {
  icon: 'weather' | 'trend' | 'calendar' | 'target' | 'lightbulb';
  title: string;
  insight: string;
  actionable?: string;
  confidence?: number; // 0-1 scale
  onApply?: () => void;
  onDismiss?: () => void;
}

const iconMap = {
  weather: Cloud,
  trend: TrendingUp,
  calendar: Calendar,
  target: Target,
  lightbulb: Lightbulb
};

export const InsightCard: React.FC<InsightCardProps> = ({
  icon,
  title,
  insight,
  actionable,
  confidence,
  onApply,
  onDismiss
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isApplied, setIsApplied] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  
  const IconComponent = iconMap[icon];
  
  const handleApply = () => {
    setIsApplied(true);
    onApply?.();
  };
  
  const handleDismiss = () => {
    setIsDismissed(true);
    onDismiss?.();
  };
  
  if (isDismissed) return null;
  
  const getConfidenceColor = (conf: number) => {
    if (conf >= 0.8) return 'text-green-600 bg-green-100';
    if (conf >= 0.6) return 'text-yellow-600 bg-yellow-100';
    return 'text-gray-600 bg-gray-100';
  };
  
  const getConfidenceText = (conf: number) => {
    if (conf >= 0.8) return 'High confidence';
    if (conf >= 0.6) return 'Medium confidence';
    return 'Low confidence';
  };

  return (
    <div className={`bg-white rounded-xl shadow-lg p-4 transition-all hover:shadow-xl ${isApplied ? 'ring-2 ring-green-200 bg-green-50' : ''}`}>
      <div className="flex items-start space-x-3">
        <div className={`p-2 rounded-full ${isApplied ? 'bg-green-100' : 'bg-blue-100'}`}>
          {isApplied ? (
            <CheckCircle className="w-5 h-5 text-green-600" />
          ) : (
            <IconComponent className="w-5 h-5 text-blue-600" />
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium text-gray-900">{title}</h4>
            <div className="flex items-center space-x-1">
              {confidence !== undefined && (
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getConfidenceColor(confidence)}`}>
                  {Math.round(confidence * 100)}%
                </span>
              )}
              <button
                onClick={handleDismiss}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                title="Dismiss insight"
              >
                <X className="w-3 h-3 text-gray-400" />
              </button>
            </div>
          </div>
          
          <p className="text-sm text-gray-700 mb-2">{insight}</p>
          
          {actionable && (
            <div className="space-y-2">
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex items-center text-xs text-blue-600 hover:text-blue-700 transition-colors"
              >
                <span>View recommendation</span>
                {isExpanded ? (
                  <ChevronUp className="w-3 h-3 ml-1" />
                ) : (
                  <ChevronDown className="w-3 h-3 ml-1" />
                )}
              </button>
              
              {isExpanded && (
                <div className="bg-blue-50 p-3 rounded-lg">
                  <p className="text-sm text-blue-800 mb-3">{actionable}</p>
                  {onApply && !isApplied && (
                    <button
                      onClick={handleApply}
                      className="px-3 py-1 bg-blue-600 text-white text-xs font-medium rounded-md hover:bg-blue-700 transition-colors"
                    >
                      Apply Recommendation
                    </button>
                  )}
                  {isApplied && (
                    <div className="flex items-center text-xs text-green-600">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      <span>Recommendation applied</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          
          {confidence !== undefined && isExpanded && (
            <div className="mt-2 text-xs text-gray-500">
              <span>{getConfidenceText(confidence)} based on {confidence >= 0.8 ? 'strong' : confidence >= 0.6 ? 'moderate' : 'limited'} statistical evidence</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};