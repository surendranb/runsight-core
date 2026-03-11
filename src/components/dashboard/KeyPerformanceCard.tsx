import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { HelpIcon } from '../common/ContextualHelp';
import { Heading } from '../common/VisualHierarchy';
import { getEvidenceCopy } from '../../lib/productCopy';

interface KeyPerformanceCardProps {
  metric: string;
  value: string;
  unit: string;
  trend: number; // Percentage change (positive = improvement, negative = decline)
  comparisonPeriod: string;
  previousValue: string;
  contextTooltip: string; // Explanation of what this metric means for the user
  trendDirection: 'up' | 'down' | 'stable'; // Clear visual hierarchy for trend
  priority: 'primary' | 'secondary'; // Visual emphasis level
  // Enhanced contextual help properties
  interpretation?: string; // What this means for the user's training
  actionableAdvice?: string; // What the user should do about it
  confidence?: number; // Confidence in the data (0-1)
  sampleSize?: number; // Number of runs this is based on
}

export const KeyPerformanceCard: React.FC<KeyPerformanceCardProps> = ({
  metric,
  value,
  unit,
  trend,
  comparisonPeriod,
  previousValue,
  contextTooltip,
  trendDirection,
  priority = 'secondary',
  interpretation,
  actionableAdvice,
  confidence,
  sampleSize
}) => {
  const trendPercentage = Math.abs(trend * 100);
  const evidenceCopy = typeof confidence === 'number' ? getEvidenceCopy(confidence) : null;
  
  // Determine trend colors and icons based on direction
  const getTrendDisplay = () => {
    switch (trendDirection) {
      case 'up':
        return {
          icon: <TrendingUp className="w-5 h-5 text-green-500" />,
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          text: 'improved'
        };
      case 'down':
        return {
          icon: <TrendingDown className="w-5 h-5 text-red-500" />,
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          text: 'declined'
        };
      case 'stable':
        return {
          icon: <Minus className="w-5 h-5 text-gray-500" />,
          color: 'text-gray-600',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
          text: previousValue === '—' ? 'baseline' : 'steady'
        };
    }
  };

  const trendDisplay = getTrendDisplay();
  
  // Primary cards get enhanced visual hierarchy
  const cardClasses = priority === 'primary' 
    ? "bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl shadow-lg border-2 border-blue-200 p-6 hover:shadow-xl transition-all duration-200 transform hover:-translate-y-1"
    : "bg-white rounded-xl shadow-md border border-gray-200 p-6 hover:shadow-lg transition-all duration-200";

  const valueClasses = priority === 'primary'
    ? "text-5xl font-bold text-gray-900"
    : "text-4xl font-bold text-gray-900";

  return (
    <div className={cardClasses}>
      <div className="text-center">
        {/* Metric title with contextual help */}
        <div className="flex items-center justify-center space-x-2 mb-3">
          <Heading 
            level={priority === 'primary' ? 4 : 5}
            emphasis={priority === 'primary' ? 'primary' : 'secondary'}
            className="text-center"
          >
            {metric}
          </Heading>
          <HelpIcon 
            content={contextTooltip}
            size={priority === 'primary' ? 'md' : 'sm'}
            position="top"
          />
        </div>
        
        {/* Main value display */}
        <div className="flex items-baseline justify-center space-x-2 mb-4">
          <span className={valueClasses}>{value}</span>
          <span className={`${priority === 'primary' ? 'text-xl' : 'text-lg'} text-gray-600`}>{unit}</span>
        </div>
        
        {/* Trend indicator with clear visual hierarchy */}
        {trendDirection !== 'stable' && trendPercentage > 0 && (
          <div className={`inline-flex items-center space-x-2 px-3 py-2 rounded-lg ${trendDisplay.bgColor} ${trendDisplay.borderColor} border mb-3`}>
            {trendDisplay.icon}
            <span className={`text-sm font-medium ${trendDisplay.color}`}>
              {trendPercentage.toFixed(1)}% {trendDisplay.text}
            </span>
          </div>
        )}
        
        {trendDirection === 'stable' && (
          <div className={`inline-flex items-center space-x-2 px-3 py-2 rounded-lg ${trendDisplay.bgColor} ${trendDisplay.borderColor} border mb-3`}>
            {trendDisplay.icon}
            <span className={`text-sm font-medium ${trendDisplay.color}`}>
              {previousValue === '—' ? 'No earlier period to compare' : 'Consistent performance'}
            </span>
          </div>
        )}
        
        {/* Comparison context */}
        <div className="text-xs text-gray-500 mb-4">
          <span>{previousValue === '—' ? 'Comparison unavailable' : `vs ${previousValue} ${unit}`}</span>
          <br />
          <span>{comparisonPeriod}</span>
        </div>

        {(interpretation || actionableAdvice || sampleSize) && (
          <div className="mt-4 pt-4 border-t border-gray-200 space-y-2 text-left">
            {interpretation && (
              <p className="text-sm text-gray-700 leading-relaxed">{interpretation}</p>
            )}
            {actionableAdvice && (
              <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                  Good next step
                </p>
                <p className="mt-1 text-sm text-blue-800">
                  {actionableAdvice}
                </p>
              </div>
            )}
            {sampleSize && (
              <p className="text-xs text-gray-500">
                Based on {sampleSize} run{sampleSize === 1 ? '' : 's'}
                {evidenceCopy ? ` • ${evidenceCopy.label}` : ''}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
