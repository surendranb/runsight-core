// Centralized chart theme and color scheme for consistent visualization
// Following conventional chart design patterns and accessibility guidelines

import React from 'react';

export interface ChartTheme {
  colors: {
    primary: string;
    secondary: string;
    success: string;
    warning: string;
    danger: string;
    info: string;
    neutral: string;
    background: string;
    grid: string;
    text: string;
    textSecondary: string;
  };
  gradients: {
    primary: string[];
    performance: string[];
    temperature: string[];
  };
  typography: {
    title: {
      fontSize: number;
      fontWeight: string;
      color: string;
    };
    axis: {
      fontSize: number;
      color: string;
    };
    tooltip: {
      fontSize: number;
      backgroundColor: string;
      borderColor: string;
      textColor: string;
    };
  };
}

// Standard chart color scheme following web conventions
export const chartTheme: ChartTheme = {
  colors: {
    // Primary blue - familiar web standard
    primary: '#3b82f6',
    // Secondary colors following conventional chart palettes
    secondary: '#6b7280',
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444',
    info: '#06b6d4',
    neutral: '#9ca3af',
    // Background and grid colors for readability
    background: '#ffffff',
    grid: '#f3f4f6',
    text: '#1f2937',
    textSecondary: '#6b7280'
  },
  gradients: {
    // Performance gradients (green = better, red = worse)
    primary: ['#3b82f6', '#1d4ed8'],
    performance: ['#ef4444', '#f59e0b', '#10b981'], // Red -> Yellow -> Green
    temperature: ['#06b6d4', '#3b82f6', '#ef4444'] // Cool -> Neutral -> Hot
  },
  typography: {
    title: {
      fontSize: 16,
      fontWeight: '600',
      color: '#1f2937'
    },
    axis: {
      fontSize: 12,
      color: '#6b7280'
    },
    tooltip: {
      fontSize: 14,
      backgroundColor: '#ffffff',
      borderColor: '#e5e7eb',
      textColor: '#1f2937'
    }
  }
};

// Standard chart configurations for consistency
export const chartDefaults = {
  margin: { top: 20, right: 30, left: 20, bottom: 20 },
  height: 300,
  grid: {
    strokeDasharray: '3 3',
    stroke: chartTheme.colors.grid
  },
  axis: {
    tick: { 
      fontSize: chartTheme.typography.axis.fontSize,
      fill: chartTheme.typography.axis.color
    },
    axisLine: { stroke: chartTheme.colors.textSecondary },
    tickLine: { stroke: chartTheme.colors.textSecondary }
  }
};

// Conventional chart type mappings for recognition over recall
export const chartTypeConventions = {
  // Time series data -> Line charts
  timeSeries: 'line',
  // Comparisons between categories -> Bar charts
  categoryComparison: 'bar',
  // Parts of a whole -> Pie/Donut charts
  composition: 'pie',
  // Correlation between two variables -> Scatter plots
  correlation: 'scatter',
  // Distribution of values -> Histograms
  distribution: 'histogram'
};

// Performance color coding for intuitive understanding
export const getPerformanceColor = (value: number, baseline: number, higherIsBetter: boolean = true): string => {
  const ratio = value / baseline;
  
  if (higherIsBetter) {
    if (ratio >= 1.1) return chartTheme.colors.success; // 10% better
    if (ratio >= 1.05) return chartTheme.colors.info;    // 5% better
    if (ratio <= 0.9) return chartTheme.colors.danger;   // 10% worse
    if (ratio <= 0.95) return chartTheme.colors.warning; // 5% worse
  } else {
    // For metrics where lower is better (like pace)
    if (ratio <= 0.9) return chartTheme.colors.success;  // 10% better (lower)
    if (ratio <= 0.95) return chartTheme.colors.info;    // 5% better (lower)
    if (ratio >= 1.1) return chartTheme.colors.danger;   // 10% worse (higher)
    if (ratio >= 1.05) return chartTheme.colors.warning; // 5% worse (higher)
  }
  
  return chartTheme.colors.neutral; // Within 5% of baseline
};

// Standard tooltip component for consistency
export const createStandardTooltip = (formatters?: Record<string, (value: any) => string>) => {
  return ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;

    return (
      <div 
        className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg"
        style={{
          backgroundColor: chartTheme.typography.tooltip.backgroundColor,
          borderColor: chartTheme.typography.tooltip.borderColor,
          fontSize: chartTheme.typography.tooltip.fontSize
        }}
      >
        <p className="font-medium text-gray-900 mb-1">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            <span className="font-medium">{entry.name}:</span>{' '}
            {formatters && formatters[entry.dataKey] 
              ? formatters[entry.dataKey](entry.value)
              : entry.value
            }
          </p>
        ))}
      </div>
    );
  };
};

// Standard chart title component
interface ChartTitleProps {
  title: string; 
  subtitle?: string;
  dataCount?: number;
  className?: string;
}

export const ChartTitle: React.FC<ChartTitleProps> = ({ title, subtitle, dataCount, className = '' }) => {
  return (
    <div className={`mb-4 ${className}`}>
      <div className="flex items-center justify-between">
        <div>
          <h3 
            className="font-semibold text-gray-900 flex items-center space-x-2"
            style={{ 
              fontSize: chartTheme.typography.title.fontSize,
              fontWeight: chartTheme.typography.title.fontWeight,
              color: chartTheme.typography.title.color
            }}
          >
            <span>{title}</span>
            {dataCount && (
              <span className="text-sm bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium">
                {dataCount} data points
              </span>
            )}
          </h3>
          {subtitle && (
            <p className="text-sm text-gray-600 mt-1">{subtitle}</p>
          )}
        </div>
      </div>
    </div>
  );
};

// Standard legend component
interface ChartLegendProps {
  items: Array<{ label: string; color: string; description?: string }>;
}

export const ChartLegend: React.FC<ChartLegendProps> = ({ items }) => {
  return (
    <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 mt-4">
      {items.map((item, index) => (
        <div key={index} className="flex items-center" title={item.description}>
          <div 
            className="w-3 h-0.5 mr-2"
            style={{ backgroundColor: item.color }}
          />
          <span>{item.label}</span>
        </div>
      ))}
    </div>
  );
};

// Conventional time period labels for recognition
export const standardTimePeriods = {
  'last7': 'Last 7 Days',
  'last30': 'Last 30 Days',
  'last90': 'Last 90 Days',
  'thisMonth': 'This Month',
  'lastMonth': 'Last Month',
  'thisYear': 'This Year',
  'lastYear': 'Last Year',
  'allTime': 'All Time'
};

// Standard axis formatters for common running metrics
export const axisFormatters = {
  pace: (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  },
  distance: (meters: number) => `${(meters / 1000).toFixed(1)}km`,
  duration: (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  },
  heartRate: (bpm: number) => `${Math.round(bpm)} bpm`,
  elevation: (meters: number) => `${Math.round(meters)}m`,
  temperature: (celsius: number) => `${Math.round(celsius)}°C`,
  percentage: (value: number) => `${(value * 100).toFixed(1)}%`
};