import React, { useState, useMemo } from 'react';
import { User, EnrichedRun } from '../types';
import { PrimaryKPISystem } from './dashboard/PrimaryKPISystem';
import { PaceTrendChart } from './dashboard/PaceTrendChart';
import { ActivityTimeline } from './dashboard/ActivityTimeline';
import { TimePeriodSelector, TimePeriod, Breadcrumb } from './common/TimePeriodSelector';
import { Heading, Section, EmphasisBox, visualHierarchy } from './common/VisualHierarchy';
import { ErrorDisplay, useErrorTranslation } from './common/ErrorDisplay';
import { standardTimePeriods } from '../lib/chartTheme';
import { Activity, Clock, Lightbulb, TrendingUp as TrendingUpIcon } from 'lucide-react';
import { filterOutliers } from '../lib/outlierDetection';
import { getHighlightedPatterns } from '../lib/smartHighlighting';
import { useUserPreferences } from '../lib/userPreferences';
import { getEvidenceCopy } from '../lib/productCopy';


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
  onSync
}) => {
  const { translateError } = useErrorTranslation();
  // Use persistent user preferences
  const { recordInteraction, getSmartDefaults } = useUserPreferences();
  const smartDefaultsData = getSmartDefaults();
  
  // Initialize with user preferences and smart defaults
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>(() => 
    (smartDefaultsData.timePeriod as TimePeriod) || 'last30'
  );
  
  // Chart settings from user preferences
  const [chartSettings] = useState(() => 
    smartDefaultsData.chartSettings || {
      showWeatherIndicators: true,
      showMovingAverage: true,
      highlightPersonalRecords: true
    }
  );

  // Handle period change with preference recording
  const handlePeriodChange = (period: TimePeriod) => {
    setSelectedPeriod(period);
    recordInteraction('timePeriodChange', { period });
  };

  const getPeriodRange = React.useCallback((period: TimePeriod, offset = 0) => {
    const now = new Date();
    let startDate: Date;
    let endDate: Date | null = null;

    switch (period) {
      case 'last7': {
        const end = new Date(now.getTime() - offset * 7 * 24 * 60 * 60 * 1000);
        startDate = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
        endDate = end;
        break;
      }
      case 'last30': {
        const end = new Date(now.getTime() - offset * 30 * 24 * 60 * 60 * 1000);
        startDate = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
        endDate = end;
        break;
      }
      case 'last90': {
        const end = new Date(now.getTime() - offset * 90 * 24 * 60 * 60 * 1000);
        startDate = new Date(end.getTime() - 90 * 24 * 60 * 60 * 1000);
        endDate = end;
        break;
      }
      case 'thisYear': {
        const year = now.getFullYear() - offset;
        startDate = new Date(year, 0, 1);
        endDate = new Date(year + 1, 0, 1);
        break;
      }
      case 'allTime':
      default:
        startDate = new Date(0);
        endDate = null;
        break;
    }

    return { startDate, endDate };
  }, []);

  const filterRunsForRange = React.useCallback((sourceRuns: EnrichedRun[], period: TimePeriod, offset = 0) => {
    if (period === 'allTime') {
      return filterOutliers(sourceRuns);
    }

    const { startDate, endDate } = getPeriodRange(period, offset);
    return filterOutliers(
      sourceRuns.filter((run) => {
        const runDate = new Date(run.start_date);
        return runDate >= startDate && (!endDate || runDate < endDate);
      })
    );
  }, [getPeriodRange]);

  // Filter runs based on selected period and remove outliers
  const filteredRuns = useMemo(
    () => filterRunsForRange(runs, selectedPeriod),
    [filterRunsForRange, runs, selectedPeriod]
  );

  const comparisonRuns = useMemo(
    () => (selectedPeriod === 'allTime' ? [] : filterRunsForRange(runs, selectedPeriod, 1)),
    [filterRunsForRange, runs, selectedPeriod]
  );

  // Get significant changes automatically highlighted using smart highlighting
  const significantChanges = useMemo(() => 
    getHighlightedPatterns(filteredRuns), 
    [filteredRuns]
  );

  const getPeriodLabel = () => {
    return standardTimePeriods[selectedPeriod] || 'Last 30 Days';
  };

  // Information scent helper: Create descriptive labels
  const getDataFreshnessIndicator = () => {
    if (filteredRuns.length === 0) return 'No data';
    
    const latestRun = filteredRuns.reduce((latest, run) => 
      new Date(run.start_date) > new Date(latest.start_date) ? run : latest
    );
    
    const now = new Date();
    const runDate = new Date(latestRun.start_date);
    
    // Calculate difference using date strings to avoid timezone issues
    const runDateStr = latestRun.start_date.substring(0, 10); // "2025-08-09"
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
              { label: 'Overview', isActive: true }
            ]}
            className="mb-3"
          />
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex-1">
              <Heading 
                level={1} 
                emphasis="primary"
                className="mb-2"
              >
                Welcome back, {user.name}
              </Heading>
              <p className="text-gray-600">
                {filteredRuns.length} runs • {getDataFreshnessIndicator()} • {getPeriodLabel()}
              </p>
            </div>
            <div className="flex items-center">
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
            {/* KPI System */}
            <PrimaryKPISystem
              currentRuns={filteredRuns}
              comparisonRuns={comparisonRuns}
              period={getPeriodLabel()}
            />

            {/* Smart Highlighted Patterns */}
            {significantChanges.length > 0 && (
              <EmphasisBox
                variant="insight"
                title="What matters now"
                icon={Lightbulb}
                priority="high"
              >
                <div className={visualHierarchy.spacing.sm}>
                  {significantChanges.slice(0, 2).map((pattern) => {
                    const evidenceCopy = getEvidenceCopy(pattern.confidence);
                    return (
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
                          <div className="rounded-lg border border-blue-200 bg-blue-100 px-3 py-2">
                            <p className="text-xs font-semibold uppercase tracking-wide text-blue-800">
                              Good next step
                            </p>
                            <p className="mt-1 text-sm font-medium text-blue-900">
                              {pattern.recommendation}
                            </p>
                          </div>
                        )}
                        <div className="mt-3 flex items-center space-x-3">
                          <span className="text-xs font-medium bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                            {evidenceCopy.label}
                          </span>
                          <span className="text-xs font-medium bg-gray-100 text-gray-700 px-2 py-1 rounded-full">
                            {pattern.actionable ? 'Worth acting on' : 'Worth noting'}
                          </span>
                        </div>
                      </div>
                    </div>
                    );
                  })}
                  {significantChanges.length > 2 && (
                    <p className="text-sm text-gray-600">
                      More patterns are available in Insights once you want to dig deeper.
                    </p>
                  )}
                </div>
              </EmphasisBox>
            )}

            {/* Pace Trend Analysis */}
            <Section
              title="Pace Trend Analysis"
              subtitle="How your pace has been moving lately, with enough context to tell whether the trend is real."
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
              subtitle="Your latest runs in order, so you can connect the numbers to what actually happened on the day."
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
    </div>
  );
};
