import React, { useState, useRef, useEffect } from 'react';
import { HelpCircle, Info, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';

interface TooltipProps {
  content: string;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  maxWidth?: string;
  trigger?: 'hover' | 'click';
}

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  position = 'top',
  maxWidth = 'w-64',
  trigger = 'hover'
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [actualPosition, setActualPosition] = useState(position);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isVisible && tooltipRef.current && triggerRef.current) {
      const tooltip = tooltipRef.current;
      const trigger = triggerRef.current;
      const rect = trigger.getBoundingClientRect();
      const tooltipRect = tooltip.getBoundingClientRect();
      
      // Check if tooltip would go off screen and adjust position
      let newPosition = position;
      
      if (position === 'top' && rect.top - tooltipRect.height < 10) {
        newPosition = 'bottom';
      } else if (position === 'bottom' && rect.bottom + tooltipRect.height > window.innerHeight - 10) {
        newPosition = 'top';
      } else if (position === 'left' && rect.left - tooltipRect.width < 10) {
        newPosition = 'right';
      } else if (position === 'right' && rect.right + tooltipRect.width > window.innerWidth - 10) {
        newPosition = 'left';
      }
      
      setActualPosition(newPosition);
    }
  }, [isVisible, position]);

  const handleShow = () => setIsVisible(true);
  const handleHide = () => setIsVisible(false);
  const handleToggle = () => setIsVisible(!isVisible);

  const getPositionClasses = () => {
    const baseClasses = 'absolute z-50 px-3 py-2 text-sm text-white bg-gray-900 rounded-lg shadow-lg';
    
    switch (actualPosition) {
      case 'top':
        return `${baseClasses} bottom-full left-1/2 transform -translate-x-1/2 mb-2`;
      case 'bottom':
        return `${baseClasses} top-full left-1/2 transform -translate-x-1/2 mt-2`;
      case 'left':
        return `${baseClasses} right-full top-1/2 transform -translate-y-1/2 mr-2`;
      case 'right':
        return `${baseClasses} left-full top-1/2 transform -translate-y-1/2 ml-2`;
      default:
        return `${baseClasses} bottom-full left-1/2 transform -translate-x-1/2 mb-2`;
    }
  };

  const getArrowClasses = () => {
    const baseArrowClasses = 'absolute w-0 h-0';
    
    switch (actualPosition) {
      case 'top':
        return `${baseArrowClasses} top-full left-1/2 transform -translate-x-1/2 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900`;
      case 'bottom':
        return `${baseArrowClasses} bottom-full left-1/2 transform -translate-x-1/2 border-l-4 border-r-4 border-b-4 border-transparent border-b-gray-900`;
      case 'left':
        return `${baseArrowClasses} left-full top-1/2 transform -translate-y-1/2 border-t-4 border-b-4 border-l-4 border-transparent border-l-gray-900`;
      case 'right':
        return `${baseArrowClasses} right-full top-1/2 transform -translate-y-1/2 border-t-4 border-b-4 border-r-4 border-transparent border-r-gray-900`;
      default:
        return `${baseArrowClasses} top-full left-1/2 transform -translate-x-1/2 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900`;
    }
  };

  const triggerProps = trigger === 'hover' 
    ? { onMouseEnter: handleShow, onMouseLeave: handleHide }
    : { onClick: handleToggle };

  return (
    <div className="relative inline-block" ref={triggerRef} {...triggerProps}>
      {children}
      {isVisible && (
        <div ref={tooltipRef} className={`${getPositionClasses()} ${maxWidth}`}>
          <div className="relative">
            {content}
            <div className={getArrowClasses()}></div>
          </div>
        </div>
      )}
    </div>
  );
};

interface HelpIconProps {
  content: string;
  size?: 'sm' | 'md' | 'lg';
  position?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
}

export const HelpIcon: React.FC<HelpIconProps> = ({
  content,
  size = 'sm',
  position = 'top',
  className = ''
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };

  // Ensure minimum click target size for desktop
  const containerClasses = {
    sm: 'min-h-[32px] min-w-[32px] p-1',
    md: 'min-h-[36px] min-w-[36px] p-1.5',
    lg: 'min-h-[40px] min-w-[40px] p-2'
  };

  return (
    <Tooltip content={content} position={position}>
      <div className={`inline-flex items-center justify-center rounded-full hover:bg-gray-100 active:bg-gray-200 transition-all duration-200 cursor-help ${containerClasses[size]}`}>
        <HelpCircle 
          className={`${sizeClasses[size]} text-gray-400 hover:text-gray-600 transition-colors ${className}`}
        />
      </div>
    </Tooltip>
  );
};

interface ProgressiveHelpProps {
  title: string;
  basicExplanation: string;
  detailedExplanation?: string;
  learnMoreUrl?: string;
  examples?: string[];
  className?: string;
}

export const ProgressiveHelp: React.FC<ProgressiveHelpProps> = ({
  title,
  basicExplanation,
  detailedExplanation,
  learnMoreUrl,
  examples,
  className = ''
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className={`bg-blue-50 border border-blue-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-start space-x-3">
        <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <h4 className="font-medium text-blue-900 mb-2">{title}</h4>
          <p className="text-blue-800 text-sm mb-3">{basicExplanation}</p>
          
          {(detailedExplanation || examples || learnMoreUrl) && (
            <>
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="inline-flex items-center justify-center min-h-[32px] min-w-[32px] px-3 py-2 text-sm text-blue-600 hover:text-blue-700 active:text-blue-800 font-medium transition-all duration-200 rounded-lg hover:bg-blue-50 active:bg-blue-100 select-none"
                style={{ 
                  WebkitTapHighlightColor: 'transparent',
                  touchAction: 'manipulation'
                }}
              >
                <span className="whitespace-nowrap">{isExpanded ? 'Show Less' : 'Learn More'}</span>
                {isExpanded ? (
                  <ChevronUp className="w-4 h-4 ml-1 flex-shrink-0" />
                ) : (
                  <ChevronDown className="w-4 h-4 ml-1 flex-shrink-0" />
                )}
              </button>
              
              {isExpanded && (
                <div className="mt-3 pt-3 border-t border-blue-200">
                  {detailedExplanation && (
                    <p className="text-blue-700 text-sm mb-3">{detailedExplanation}</p>
                  )}
                  
                  {examples && examples.length > 0 && (
                    <div className="mb-3">
                      <h5 className="font-medium text-blue-900 text-sm mb-2">Examples:</h5>
                      <ul className="text-blue-700 text-sm space-y-1">
                        {examples.map((example, index) => (
                          <li key={index} className="flex items-start">
                            <span className="text-blue-500 mr-2 mt-1">•</span>
                            <span>{example}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {learnMoreUrl && (
                    <a
                      href={learnMoreUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center min-h-[32px] min-w-[32px] px-3 py-2 text-sm text-blue-600 hover:text-blue-700 active:text-blue-800 font-medium transition-all duration-200 rounded-lg hover:bg-blue-50 active:bg-blue-100 select-none"
                      style={{ 
                        WebkitTapHighlightColor: 'transparent',
                        touchAction: 'manipulation'
                      }}
                    >
                      <span className="whitespace-nowrap">Read More</span>
                      <ExternalLink className="w-4 h-4 ml-1 flex-shrink-0" />
                    </a>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

interface ContextualExplanationProps {
  metric: string;
  value: string | number;
  unit?: string;
  explanation: string;
  interpretation?: string;
  actionableAdvice?: string;
  confidence?: number;
  sampleSize?: number;
  className?: string;
}

export const ContextualExplanation: React.FC<ContextualExplanationProps> = ({
  metric,
  value,
  unit,
  explanation,
  interpretation,
  actionableAdvice,
  confidence,
  sampleSize,
  className = ''
}) => {
  return (
    <div className={`bg-gray-50 border border-gray-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <h4 className="font-semibold text-gray-900">{metric}</h4>
          <div className="flex items-baseline space-x-1">
            <span className="text-2xl font-bold text-gray-900">{value}</span>
            {unit && <span className="text-gray-600">{unit}</span>}
          </div>
        </div>
        {confidence && (
          <div className="text-right">
            <div className="text-xs text-gray-500">Confidence</div>
            <div className="text-sm font-medium text-gray-700">
              {(confidence * 100).toFixed(0)}%
            </div>
          </div>
        )}
      </div>
      
      <div className="space-y-3">
        <div>
          <h5 className="text-sm font-medium text-gray-700 mb-1">What this means:</h5>
          <p className="text-sm text-gray-600">{explanation}</p>
        </div>
        
        {interpretation && (
          <div>
            <h5 className="text-sm font-medium text-gray-700 mb-1">For your training:</h5>
            <p className="text-sm text-gray-600">{interpretation}</p>
          </div>
        )}
        
        {actionableAdvice && (
          <div>
            <h5 className="text-sm font-medium text-gray-700 mb-1">Recommendation:</h5>
            <p className="text-sm text-blue-700 bg-blue-50 p-2 rounded border border-blue-200">
              {actionableAdvice}
            </p>
          </div>
        )}
        
        {sampleSize && (
          <div className="text-xs text-gray-500 pt-2 border-t border-gray-200">
            Based on {sampleSize} runs
          </div>
        )}
      </div>
    </div>
  );
};

// Running-specific terminology explanations
export const runningTerminology = {
  pace: {
    title: "Pace",
    basic: "Your pace is how long it takes you to run one kilometer, shown in minutes and seconds (e.g., 5:30 min/km).",
    detailed: "Pace is the inverse of speed - instead of how fast you're going, it shows how much time you take to cover a distance. It's the most common way runners measure and compare their performance because it's easier to understand during a run.",
    examples: [
      "5:00 min/km = Fast recreational pace",
      "6:00 min/km = Moderate training pace", 
      "7:00 min/km = Easy conversational pace"
    ]
  },
  heartRate: {
    title: "Heart Rate",
    basic: "Your heart rate shows how hard your cardiovascular system is working, measured in beats per minute (bpm).",
    detailed: "Heart rate is one of the best indicators of exercise intensity. Training in different heart rate zones helps you target specific fitness adaptations and avoid overtraining.",
    examples: [
      "Zone 1 (50-60% max HR): Recovery runs",
      "Zone 2 (60-70% max HR): Base building",
      "Zone 3 (70-80% max HR): Aerobic threshold"
    ]
  },
  consistency: {
    title: "Running Consistency",
    basic: "Consistency measures how regularly you run and how similar your training patterns are over time.",
    detailed: "Consistent training is more important than occasional hard efforts. Regular running builds aerobic fitness, strengthens muscles and joints gradually, and reduces injury risk.",
    examples: [
      "Running 3 times per week is better than running 6 times one week and 0 the next",
      "Consistent easy pace builds your aerobic base",
      "Regular training creates positive adaptations"
    ]
  },
  elevation: {
    title: "Elevation Gain",
    basic: "Elevation gain is the total amount of uphill climbing during your run, measured in meters or feet.",
    detailed: "Hills make running significantly harder by requiring more energy to overcome gravity. Elevation training improves leg strength, running economy, and mental toughness.",
    examples: [
      "100m elevation gain = Moderate hills",
      "300m+ elevation gain = Challenging hilly run",
      "Hill training improves flat running performance"
    ]
  },
  cadence: {
    title: "Cadence",
    basic: "Cadence is how many steps you take per minute while running, typically measured for one foot.",
    detailed: "Optimal cadence reduces injury risk and improves efficiency. Most efficient runners have a cadence between 170-180 steps per minute, regardless of pace.",
    examples: [
      "170-180 spm = Optimal range for most runners",
      "Higher cadence = Shorter, quicker steps",
      "Lower cadence often means overstriding"
    ]
  }
};