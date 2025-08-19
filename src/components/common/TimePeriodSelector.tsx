import React from 'react';
import { Calendar, ChevronDown } from 'lucide-react';
import { standardTimePeriods } from '../../lib/chartTheme';

export type TimePeriod = keyof typeof standardTimePeriods;

interface TimePeriodSelectorProps {
  selectedPeriod: TimePeriod;
  onPeriodChange: (period: TimePeriod) => void;
  availablePeriods?: TimePeriod[];
  className?: string;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

// Default periods following conventional web patterns
const defaultPeriods: TimePeriod[] = ['last7', 'last30', 'last90', 'thisYear', 'allTime'];

export const TimePeriodSelector: React.FC<TimePeriodSelectorProps> = ({
  selectedPeriod,
  onPeriodChange,
  availablePeriods = defaultPeriods,
  className = '',
  showIcon = true,
  size = 'md'
}) => {
  // Fitts's Law compliant sizing
  const sizeClasses = {
    sm: 'min-h-[44px] px-4 py-3 text-sm md:min-h-[32px] md:px-3 md:py-2 md:text-xs',
    md: 'min-h-[44px] px-4 py-3 text-sm md:min-h-[36px] md:px-3 md:py-2',
    lg: 'min-h-[48px] px-5 py-3 text-base md:min-h-[40px] md:px-4 md:py-2.5'
  };

  const iconSize = size === 'lg' ? 'w-5 h-5' : 'w-4 h-4';

  return (
    <div className={`relative inline-block ${className}`}>
      <select
        value={selectedPeriod}
        onChange={(e) => onPeriodChange(e.target.value as TimePeriod)}
        className={`
          ${sizeClasses[size]}
          ${showIcon ? 'pl-12 md:pl-8' : ''}
          pr-12 md:pr-8
          border border-gray-300 rounded-lg bg-white
          focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:outline-none
          hover:border-gray-400 transition-all duration-200
          appearance-none cursor-pointer
          font-medium text-gray-700
          select-none touch-manipulation
        `}
        aria-label="Select time period"
        style={{ 
          WebkitTapHighlightColor: 'transparent',
          touchAction: 'manipulation'
        }}
      >
        {availablePeriods.map((period) => (
          <option key={period} value={period}>
            {standardTimePeriods[period]}
          </option>
        ))}
      </select>
      
      {/* Icon and chevron with improved touch targets */}
      <div className="absolute inset-y-0 left-0 right-0 flex items-center pointer-events-none">
        {showIcon && (
          <Calendar className={`${iconSize} text-gray-400 ml-4 md:ml-2`} />
        )}
        <ChevronDown className={`${iconSize} text-gray-400 ml-auto mr-4 md:mr-2`} />
      </div>
    </div>
  );
};

// Breadcrumb component for clear navigation context
interface BreadcrumbProps {
  items: Array<{
    label: string;
    href?: string;
    onClick?: () => void;
    isActive?: boolean;
  }>;
  className?: string;
}

export const Breadcrumb: React.FC<BreadcrumbProps> = ({ items, className = '' }) => {
  return (
    <nav className={`flex items-center space-x-1 text-sm ${className}`} aria-label="Breadcrumb">
      {items.map((item, index) => (
        <React.Fragment key={index}>
          {index > 0 && (
            <span className="text-gray-400 mx-2">/</span>
          )}
          {item.href || item.onClick ? (
            <button
              onClick={item.onClick}
              className={`
                hover:text-blue-600 transition-colors
                ${item.isActive 
                  ? 'text-blue-600 font-medium' 
                  : 'text-gray-600 hover:text-gray-900'
                }
              `}
            >
              {item.label}
            </button>
          ) : (
            <span 
              className={item.isActive ? 'text-gray-900 font-medium' : 'text-gray-600'}
            >
              {item.label}
            </span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
};

// Section indicator component for clear information hierarchy
interface SectionIndicatorProps {
  title: string;
  subtitle?: string;
  badge?: {
    text: string;
    color?: 'blue' | 'green' | 'yellow' | 'red' | 'gray';
  };
  actions?: React.ReactNode;
  className?: string;
}

export const SectionIndicator: React.FC<SectionIndicatorProps> = ({
  title,
  subtitle,
  badge,
  actions,
  className = ''
}) => {
  const badgeColors = {
    blue: 'bg-blue-100 text-blue-700',
    green: 'bg-green-100 text-green-700',
    yellow: 'bg-yellow-100 text-yellow-700',
    red: 'bg-red-100 text-red-700',
    gray: 'bg-gray-100 text-gray-700'
  };

  return (
    <div className={`flex items-center justify-between ${className}`}>
      <div className="flex items-center space-x-3">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
            {badge && (
              <span className={`
                px-2 py-1 rounded-full text-xs font-medium
                ${badgeColors[badge.color || 'gray']}
              `}>
                {badge.text}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-sm text-gray-600 mt-1">{subtitle}</p>
          )}
        </div>
      </div>
      {actions && (
        <div className="flex items-center space-x-2">
          {actions}
        </div>
      )}
    </div>
  );
};