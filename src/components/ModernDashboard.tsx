import React, { useState, useMemo } from 'react';
import { User, EnrichedRun } from '../types';
import { PrimaryKPISystem } from './dashboard/PrimaryKPISystem';
import { ProgressiveDisclosurePanel } from './dashboard/ProgressiveDisclosurePanel';
import { PaceTrendChart } from './dashboard/PaceTrendChart';
import { ActivityTimeline } from './dashboard/ActivityTimeline';
import { InsightCard } from './dashboard/InsightCard';
import { TimePeriodSelector, TimePeriod, Breadcrumb, SectionIndicator } from './common/TimePeriodSelector';

import { Heading, Section, EmphasisBox, visualHierarchy } from './common/VisualHierarchy';
import { ErrorDisplay, useErrorTranslation } from './common/ErrorDisplay';
import { standardTimePeriods } from '../lib/chartTheme';
import { Activity, MapPin, Clock, Settings, TrendingUp, TrendingDown, ChevronDown, ChevronUp, Lightbulb, TrendingUp as TrendingUpIcon } from 'lucide-react';
import { filterOutliers, getOutlierStats } from '../lib/outlierDetection';
import { getHighlightedPatterns, HighlightedPattern } from '../lib/smartHighlighting';
import { useUserPreferences } from '../lib/userPreferences';


interface ModernDashboardProps {
  user: User;
  runs: EnrichedRun[];
  isLoading: boolean;
  error: string | null;
  onSync?: () => void;
  onLogout: () => void;
}

// Use standardized TimePeriod from common component

export const ModernDashboard: React.FC<ModernDashboardProps> = ({
  user,
  runs,
  isLoading,
  error,
  onSync,
  onLogout
}) => {
  // Use persistent user preferences
  const { preferences, updateSection, recordInteraction, getSmartDefaults } = useUserPreferences();
  const smartDefaultsData = getSmartDefaults();
  
  // Initialize with user preferences and smart defaults
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>(() => 
    (smartDefaultsData.timePeriod as TimePeriod) || 'last30'
  );
  
  // Progressive disclosure state with user preferences
  const [selectedMetricForDetails, setSelectedMetricForDetails] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>(() => 
    smartDefaultsData.expandedSections || {}
  );

  // Chart settings from user preferences
  const [chartSettings, setChartSettings] = useState(() => 
    smartDefaultsData.chartSettings || {
      showWeatherIndicators: true,
      showMovingAverage: true,
      highlightPersonalRecords: true
    }
  );

  // User preferences are now handled by the persistent preferences system

  // Toggle section expansion with preference recording
  const toggleSection = (section: string) => {
    const newExpanded = !expandedSections[section];
    setExpandedSections(prev => ({
      ...prev,
      [section]: newExpanded
    }));
    
    // Record user preference persistently
    recordInteraction('sectionToggle', {
      section,
      expanded: newExpanded
    });
  };

  // Handle period change with preference recording
  const handlePeriodChange = (period: TimePeriod) => {
    setSelectedPeriod(period);
    recordInteraction('timePeriodChange', { period });
  };

  // Filter runs based on selected period and remove outliers
  const filteredRuns = useMemo(() => {
    const now = new Date();
    let startDate: Date;
    let dateFilteredRuns: EnrichedRun[];

    switch (selectedPeriod) {
      case 'last7':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        dateFilteredRuns = runs.filter(run => {
          const runDate = new Date(run.start_date_local);
          return runDate >= startDate;
        });
        break;
      case 'last30':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        dateFilteredRuns = runs.filter(run => {
          const runDate = new Date(run.start_date_local);
          return runDate >= startDate;
        });
        break;
      case 'last90':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        dateFilteredRuns = runs.filter(run => {
          const runDate = new Date(run.start_date_local);
          return runDate >= startDate;
        });
        break;
      case 'thisMonth':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        dateFilteredRuns = runs.filter(run => {
          const runDate = new Date(run.start_date_local);
          return runDate >= startDate;
        });
        break;
      case 'lastMonth':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const endDate = new Date(now.getFullYear(), now.getMonth(), 0);
        dateFilteredRuns = runs.filter(run => {
          const runDate = new Date(run.start_date_local);
          return runDate >= startDate && runDate <= endDate;
        });
        break;
      case 'thisYear':
        startDate = new Date(now.getFullYear(), 0, 1);
        dateFilteredRuns = runs.filter(run => {
          const runDate = new Date(run.start_date_local);
          return runDate >= startDate;
        });
        break;
      case 'lastYear':
        startDate = new Date(now.getFullYear() - 1, 0, 1);
        const lastYearEnd = new Date(now.getFullYear() - 1, 11, 31);
        dateFilteredRuns = runs.filter(run => {
          const runDate = new Date(run.start_date_local);
          return runDate >= startDate && runDate <= lastYearEnd;
        });
        break;
      case 'allTime':
      default:
        dateFilteredRuns = runs;
    }

    // Apply outlier filtering to remove GPS errors and unrealistic paces
    const cleanRuns = filterOutliers(dateFilteredRuns);
    
    // Log outlier statistics for debugging
    const outlierStats = getOutlierStats(dateFilteredRuns);
    if (outlierStats.outliers > 0) {
      console.log(`Filtered out ${outlierStats.outliers} outlier runs out of ${outlierStats.total} total runs:`, {
        unrealisticPace: outlierStats.outlierReasons.unrealisticPace,
        unrealisticDistance: outlierStats.outlierReasons.unrealisticDistance,
        unrealisticElevation: outlierStats.outlierReasons.unrealisticElevation
      });
    }

    return cleanRuns;
  }, [runs, selectedPeriod]);

  // Calculate key metrics
  const metrics = useMemo(() => {
    if (filteredRuns.length === 0) {
      return {
        totalRuns: 0,
        totalDistance: 0,
        totalTime: 0,
        avgPace: 0,
        avgPacePrevious: 0,
        paceImprovement: 0
      };
    }

    const totalDistance = filteredRuns.reduce((sum, run) => sum + run.distance, 0);
    const totalTime = filteredRuns.reduce((sum, run) => sum + run.moving_time, 0);
    const avgPace = totalTime / (totalDistance / 1000);

    // Calculate previous period for comparison
    const periodDays = selectedPeriod === 'last7' ? 7 : 
                      selectedPeriod === 'last30' ? 30 : 
                      selectedPeriod === 'last90' ? 90 :
                      selectedPeriod === 'thisYear' ? 365 : 90;
    const previousStartDate = new Date(Date.now() - 2 * periodDays * 24 * 60 * 60 * 1000);
    const previousEndDate = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000);
    
    const previousRuns = runs.filter(run => {
      const runDate = new Date(run.start_date_local);
      return runDate >= previousStartDate && runDate <= previousEndDate;
    });

    let avgPacePrevious = 0;
    if (previousRuns.length > 0) {
      const prevTotalDistance = previousRuns.reduce((sum, run) => sum + run.distance, 0);
      const prevTotalTime = previousRuns.reduce((sum, run) => sum + run.moving_time, 0);
      avgPacePrevious = prevTotalTime / (prevTotalDistance / 1000);
    }

    const paceImprovement = avgPacePrevious > 0 ? (avgPace - avgPacePrevious) / avgPacePrevious : 0;

    return {
      totalRuns: filteredRuns.length,
      totalDistance,
      totalTime,
      avgPace,
      avgPacePrevious,
      paceImprovement
    };
  }, [filteredRuns, runs, selectedPeriod]);

  // Get significant changes automatically highlighted using smart highlighting
  const significantChanges = useMemo(() => 
    getHighlightedPatterns(filteredRuns), 
    [filteredRuns]
  );

  // Generate insights with smart defaults
  const insights = useMemo(() => {
    if (filteredRuns.length < 5) return [];

    const insights = [];

    // Weather performance insight
    const runsWithWeather = filteredRuns.filter(run => run.weather_data);
    if (runsWithWeather.length >= 10) {
      const coolRuns = runsWithWeather.filter(run => {
        const temp = (run.weather_data as any)?.temperature;
        return temp && temp < 18;
      });
      const warmRuns = runsWithWeather.filter(run => {
        const temp = (run.weather_data as any)?.temperature;
        return temp && temp >= 18;
      });

      if (coolRuns.length >= 3 && warmRuns.length >= 3) {
        const coolAvgPace = coolRuns.reduce((sum, run) => sum + (run.moving_time / (run.distance / 1000)), 0) / coolRuns.length;
        const warmAvgPace = warmRuns.reduce((sum, run) => sum + (run.moving_time / (run.distance / 1000)), 0) / warmRuns.length;
        const improvement = ((warmAvgPace - coolAvgPace) / warmAvgPace) * 100;

        if (Math.abs(improvement) > 5) {
          insights.push({
            icon: 'weather' as const,
            title: 'Weather Impact',
            insight: `You run ${improvement > 0 ? 'faster' : 'slower'} in cooler weather (below 18°C) by ${Math.abs(improvement).toFixed(1)}%`,
            actionable: improvement > 0 ? 'Consider scheduling your key workouts for cooler parts of the day' : 'You perform consistently across different temperatures',
            confidence: Math.min(0.7 + (Math.abs(improvement) / 100), 0.95)
          });
        }
      }
    }

    // Consistency insight
    const recentRuns = filteredRuns.slice(-10);
    if (recentRuns.length >= 5) {
      const paces = recentRuns.map(run => run.moving_time / (run.distance / 1000));
      const avgPace = paces.reduce((sum, pace) => sum + pace, 0) / paces.length;
      const variance = paces.reduce((sum, pace) => sum + Math.pow(pace - avgPace, 2), 0) / paces.length;
      const consistency = 1 - (Math.sqrt(variance) / avgPace);

      if (consistency > 0.85) {
        insights.push({
          icon: 'trend' as const,
          title: 'Consistency',
          insight: `Your pacing has been very consistent lately (${(consistency * 100).toFixed(1)}% consistency score)`,
          actionable: 'Great job maintaining steady effort! Consider gradually increasing your training load.',
          confidence: 0.8
        });
      } else if (consistency < 0.7) {
        insights.push({
          icon: 'trend' as const,
          title: 'Pacing Variability',
          insight: `Your recent runs show high pace variability (${(consistency * 100).toFixed(1)}% consistency)`,
          actionable: 'Focus on maintaining steady effort during runs. Consider using a heart rate monitor or perceived exertion scale.',
          confidence: 0.75
        });
      }
    }

    // Weekly pattern insight
    const runsByDay = filteredRuns.reduce((acc, run) => {
      const day = new Date(run.start_date_local).getDay();
      acc[day] = acc[day] || [];
      acc[day].push(run);
      return acc;
    }, {} as Record<number, EnrichedRun[]>);

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const bestDay = Object.entries(runsByDay)
      .filter(([_, runs]) => runs.length >= 3)
      .map(([day, runs]) => ({
        day: parseInt(day),
        avgPace: runs.reduce((sum, run) => sum + (run.moving_time / (run.distance / 1000)), 0) / runs.length,
        count: runs.length
      }))
      .sort((a, b) => a.avgPace - b.avgPace)[0];

    if (bestDay && Object.keys(runsByDay).length >= 3) {
      insights.push({
        icon: 'calendar' as const,
        title: 'Weekly Pattern',
        insight: `You tend to run fastest on ${dayNames[bestDay.day]}s`,
        actionable: `Consider scheduling your key workouts on ${dayNames[bestDay.day]}s when you typically perform best.`,
        confidence: 0.7
      });
    }

    return insights;
  }, [filteredRuns]);

  const formatPace = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDistance = (meters: number) => (meters / 1000).toFixed(0);

  const getPeriodLabel = () => {
    return standardTimePeriods[selectedPeriod] || 'Last 30 Days';
  };

  // Cognitive load helper: Get the most important insight based on confidence and impact
  const getPrimaryInsight = () => {
    if (insights.length === 0) return null;
    
    // Sort by confidence score (highest first) to show most reliable insight
    const sortedInsights = [...insights].sort((a, b) => (b.confidence || 0) - (a.confidence || 0));
    return sortedInsights[0];
  };

  // Information scent helper: Create descriptive labels
  const getDataFreshnessIndicator = () => {
    if (filteredRuns.length === 0) return 'No data';
    
    const latestRun = filteredRuns.reduce((latest, run) => 
      new Date(run.start_date_local) > new Date(latest.start_date_local) ? run : latest
    );
    
    const now = new Date();
    const runDate = new Date(latestRun.start_date_local);
    
    // Calculate difference using date strings to avoid timezone issues
    const runDateStr = latestRun.start_date_local.substring(0, 10); // "2025-08-09"
    const nowDateStr = now.toISOString().substring(0, 10); // "2025-08-11"
    
    const runDateOnly = new Date(runDateStr + 'T00:00:00Z');
    const nowOnly = new Date(nowDateStr + 'T00:00:00Z');
    const daysSinceLastRun = Math.floor((nowOnly.getTime() - runDateOnly.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysSinceLastRun === 0) return 'Updated today';
    if (daysSinceLastRun === 1) return 'Updated yesterday';
    if (daysSinceLastRun <= 7) return `Updated ${daysSinceLastRun} days ago`;
    return 'Data may be outdated';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  // Use error translation hook
  const { translateError } = useErrorTranslation();

  if (error) {
    const translatedError = translateError(error, 'Dashboard loading failed');
    
    // Add dashboard-specific recovery options
    const errorWithRecovery = {
      ...translatedError,
      recoveryOptions: [
        {
          label: 'Retry Loading',
          description: 'Try loading the dashboard again',
          action: () => window.location.reload(),
          primary: true
        },
        {
          label: 'Sync Data',
          description: 'Sync your running data from Strava',
          action: onSync || (() => window.location.reload())
        },
        ...(translatedError.recoveryOptions || [])
      ]
    };

    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md w-full">
          <div className="text-center mb-6">
            <div className="bg-red-100 p-3 rounded-full inline-block mb-4">
              <Activity className="w-8 h-8 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              RunSight Dashboard
            </h1>
          </div>
          
          <ErrorDisplay 
            error={errorWithRecovery}
            className="shadow-lg"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Standardized Header with Clear Information Hierarchy */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          {/* Breadcrumb Navigation */}
          <Breadcrumb 
            items={[
              { label: 'RunSight', onClick: () => {} },
              { label: 'Dashboard', isActive: true }
            ]}
            className="mb-3"
          />
          
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <Heading 
                level={1} 
                emphasis="primary"
                className="mb-2"
              >
                Welcome back, {user.name}
              </Heading>
              <p className="text-gray-600">
                {metrics.totalRuns} runs • {getDataFreshnessIndicator()} • {getPeriodLabel()}
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <TimePeriodSelector
                selectedPeriod={selectedPeriod}
                onPeriodChange={handlePeriodChange}
                availablePeriods={['last7', 'last30', 'last90', 'thisYear', 'allTime']}
                showIcon={true}
                size="md"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {runs.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <Activity className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">No runs synced yet</h2>
            <p className="text-gray-600">
              Once you've recorded some runs and they're synced, your dashboard will come to life here.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Smart Highlighted Patterns */}
            {significantChanges.length > 0 && (
              <EmphasisBox
                variant="insight"
                title="Key Insights Detected"
                icon={Lightbulb}
                priority="high"
              >
                <div className={visualHierarchy.spacing.sm}>
                  {significantChanges.slice(0, 3).map((pattern, index) => (
                    <div key={pattern.id} className="flex items-start space-x-3">
                      <div className={`w-3 h-3 rounded-full mt-1 flex-shrink-0 ${
                        pattern.type === 'improvement' ? 'bg-green-500' :
                        pattern.type === 'achievement' ? 'bg-yellow-500' :
                        pattern.type === 'concern' ? 'bg-red-500' :
                        'bg-blue-500'
                      }`} />
                      <div className="flex-1">
                        <Heading level={4} emphasis="accent" className="mb-1">
                          {pattern.title}
                        </Heading>
                        <p className="text-sm mb-2 leading-relaxed">{pattern.description}</p>
                        {pattern.recommendation && (
                          <div className="bg-blue-100 border border-blue-200 rounded-lg p-3 mb-3">
                            <p className="text-sm font-medium text-blue-800">
                              💡 {pattern.recommendation}
                            </p>
                          </div>
                        )}
                        <div className="flex items-center space-x-3">
                          <span className="text-xs font-medium bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                            {(pattern.confidence * 100).toFixed(0)}% confidence
                          </span>
                          <span className="text-xs font-medium bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                            {pattern.actionable ? 'Actionable' : 'Informational'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                  {significantChanges.length > 3 && (
                    <button 
                      onClick={() => {/* TODO: Show all patterns */}}
                      className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] px-4 py-3 mt-3 text-sm text-blue-600 hover:text-blue-800 active:text-blue-900 font-medium rounded-lg hover:bg-blue-50 active:bg-blue-100 transition-all duration-200 select-none md:min-h-[32px] md:min-w-[32px] md:px-3 md:py-2"
                      style={{ 
                        WebkitTapHighlightColor: 'transparent',
                        touchAction: 'manipulation'
                      }}
                    >
                      <span className="whitespace-nowrap">View {significantChanges.length - 3} more insights →</span>
                    </button>
                  )}
                </div>
              </EmphasisBox>
            )}
            
            {/* KPI System */}
            <PrimaryKPISystem
              runs={filteredRuns}
              period={getPeriodLabel()}
              onViewDetails={(metric) => {
                setSelectedMetricForDetails(metric);
              }}
            />

            {/* Pace Trend Analysis */}
            <Section
              title="Pace Trend Analysis"
              subtitle="Interactive chart showing pace improvements, moving averages, and performance patterns"
              level={2}
              icon={TrendingUpIcon}
              badge={{
                text: `${filteredRuns.length} runs analyzed`,
                color: 'blue'
              }}
              actions={
                <span className="text-xs text-gray-500">{getDataFreshnessIndicator()}</span>
              }
            >
              <PaceTrendChart
                data={filteredRuns}
                period={getPeriodLabel()}
                showMovingAverage={chartSettings.showMovingAverage}
                highlightPersonalRecords={chartSettings.highlightPersonalRecords}
                showWeatherIndicators={chartSettings.showWeatherIndicators}
              />
            </Section>

            {/* Activity Timeline */}
            <Section
              title="Recent Activity Timeline"
              subtitle="Your most recent runs with weather data, pace, and performance indicators"
              level={2}
              icon={Clock}
              badge={{
                text: `${filteredRuns.length} runs from ${getPeriodLabel().toLowerCase()}`,
                color: 'green'
              }}
              actions={
                <span className="text-xs text-gray-500">Most recent first</span>
              }
            >
              <ActivityTimeline
                activities={filteredRuns
                  .sort((a, b) => {
                    // Use direct date parsing for sorting
                    const dateA = new Date(a.start_date_local);
                    const dateB = new Date(b.start_date_local);
                    return dateB.getTime() - dateA.getTime();
                  })
                }
                limit={10}
                showWeather={chartSettings.showWeatherIndicators}
                colorCodeByPerformance={true}
                showPagination={true}
              />
            </Section>
          </div>
        )}
      </div>

      {/* Progressive Disclosure Panel */}
      <ProgressiveDisclosurePanel
        isOpen={selectedMetricForDetails !== null}
        onClose={() => setSelectedMetricForDetails(null)}
        metric={selectedMetricForDetails || ''}
        runs={filteredRuns}
        period={getPeriodLabel()}
      />
    </div>
  );
};