import React, { useMemo } from 'react';
import { EnrichedRun } from '../../types';
import { ACWRResult } from '../../types/advancedMetrics';
import { 
  calculateTRIMP
} from '../../lib/training/trainingLoadUtils';
import { calculateACWRFromRuns } from '../../lib/training/acwrUtils';
import { useFitnessMetrics } from '../../hooks/useFitnessMetrics';
import { 
  estimateRunningPower
} from '../../lib/training/powerEstimationUtils';
import { 
  generateTrainingRecommendations,
  type RecommendationContext 
} from '../../lib/training/trainingRecommendationsEngine';
import { 
  calculatePSI,
  calculateAdjustedPace 
} from '../../lib/training/environmentalUtils';
import { ProfileSetupPrompt } from '../common/ProfileSetupPrompt';
import { useUserPhysiology } from '../common/UserProfileSetup';

interface TrainingLoadDashboardProps {
  runs: EnrichedRun[];
  userPhysiology?: {
    maxHeartRate?: number;
    restingHeartRate?: number;
    bodyWeight?: number;
    age?: number;
    fitnessLevel?: 'beginner' | 'intermediate' | 'advanced' | 'elite';
  };
  className?: string;
}

interface WeeklyTRIMPData {
  week: string;
  weekStart: Date;
  totalTRIMP: number;
  totalDistance: number;
  runCount: number;
  avgTRIMP: number;
}

interface ProcessedRun extends EnrichedRun {
  trimpScore: number;
  adjustedPace?: number;
  psiScore?: number;
  powerEstimate?: number;
  dataQuality: 'high' | 'medium' | 'low';
}

export const TrainingLoadDashboard: React.FC<TrainingLoadDashboardProps> = ({
  runs = [],
  userPhysiology = {},
  className = ''
}) => {
  // Use local user physiology data if not provided via props
  const { data: localUserData, hasRequiredData, updateData } = useUserPhysiology();
  const effectiveUserPhysiology = Object.keys(userPhysiology).length > 0 ? userPhysiology : localUserData;
  // Process runs with advanced metrics
  const processedRuns = useMemo((): ProcessedRun[] => {
    return runs.map(run => {
      const trimp = calculateTRIMP(run, effectiveUserPhysiology);
      const adjustedPace = run.weather_data ? 
        calculateAdjustedPace(run, run.weather_data).adjustedPace : undefined;
      const psiScore = run.weather_data && run.average_heartrate ? 
        calculatePSI(run, run.weather_data, effectiveUserPhysiology).psiScore : undefined;
      const powerEstimate = estimateRunningPower(run, effectiveUserPhysiology.bodyWeight || 70).estimatedPower;
      
      // Determine data quality
      let dataQuality: 'high' | 'medium' | 'low' = 'medium';
      if (run.average_heartrate && run.weather_data && run.total_elevation_gain) {
        dataQuality = 'high';
      } else if (!run.average_heartrate && !run.weather_data) {
        dataQuality = 'low';
      }
      
      return {
        ...run,
        trimpScore: trimp?.value || 0,
        adjustedPace,
        psiScore,
        powerEstimate,
        dataQuality
      };
    });
  }, [runs, userPhysiology]);

  // Calculate ACWR
  const acwrResult = useMemo((): ACWRResult => {
    return calculateACWRFromRuns(processedRuns, 'trimp').value;
  }, [processedRuns]);

  // Calculate CTL/ATL/TSB using shared hook
  const { fitnessMetrics } = useFitnessMetrics(processedRuns, 1);
  
  // Fallback metrics if calculation fails
  const safeMetrics = fitnessMetrics || { ctl: 0, atl: 0, tsb: 0, rampRate: 0, confidence: 0 };

  // Calculate weekly TRIMP data for chart
  const weeklyTRIMPData = useMemo((): WeeklyTRIMPData[] => {
    const weeks = new Map<string, WeeklyTRIMPData>();
    const now = new Date();
    
    // Debug: Log TRIMP scores to help identify issues
    console.log('🏃 TrainingLoadDashboard - Processing runs for weekly TRIMP:', {
      totalRuns: processedRuns.length,
      sampleTRIMPScores: processedRuns.slice(0, 5).map(r => ({ 
        date: r.start_date_local, 
        trimp: r.trimpScore,
        hasTrimp: !!r.trimpScore && !isNaN(r.trimpScore),
        trimpType: typeof r.trimpScore
      })),
      totalValidTRIMP: processedRuns.filter(r => r.trimpScore && !isNaN(r.trimpScore)).length
    });
    
    // Initialize last 8 weeks using consistent week calculation
    for (let i = 7; i >= 0; i--) {
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - (i * 7));
      // Use same week calculation as aggregation: start of week (Sunday)
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      weekStart.setHours(0, 0, 0, 0);
      
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      
      const weekKey = weekStart.toISOString().split('T')[0];
      weeks.set(weekKey, {
        week: `${weekStart.getMonth() + 1}/${weekStart.getDate()}`,
        weekStart,
        totalTRIMP: 0,
        totalDistance: 0,
        runCount: 0,
        avgTRIMP: 0
      });
    }
    
    // Aggregate runs by week
    let aggregatedRuns = 0;
    const debugInfo = {
      availableWeeks: Array.from(weeks.keys()),
      sampleRunWeekKeys: [],
      matchedRuns: 0,
      unmatchedRuns: 0,
      weekCalculationMethod: 'Sunday-based week start'
    };
    
    processedRuns.forEach((run, index) => {
      // Use start_date_local for consistency with other components
      const runDate = new Date(run.start_date_local);
      const weekStart = new Date(runDate);
      weekStart.setDate(runDate.getDate() - runDate.getDay());
      weekStart.setHours(0, 0, 0, 0);
      
      const weekKey = weekStart.toISOString().split('T')[0];
      const weekData = weeks.get(weekKey);
      
      // Debug first 5 runs
      if (index < 5) {
        debugInfo.sampleRunWeekKeys.push({
          runDate: run.start_date_local,
          calculatedWeekKey: weekKey,
          weekDataExists: !!weekData,
          trimpScore: run.trimpScore,
          hasValidTrimp: !!(run.trimpScore && !isNaN(run.trimpScore))
        });
      }
      
      if (weekData && run.trimpScore && !isNaN(run.trimpScore)) {
        weekData.totalTRIMP += run.trimpScore;
        weekData.totalDistance += run.distance / 1000;
        weekData.runCount += 1;
        weekData.avgTRIMP = weekData.totalTRIMP / weekData.runCount;
        aggregatedRuns++;
        debugInfo.matchedRuns++;
      } else {
        debugInfo.unmatchedRuns++;
      }
    });
    
    console.log('🏃 TrainingLoadDashboard - Weekly aggregation complete:', {
      aggregatedRuns,
      debugInfo,
      weeklyData: Array.from(weeks.values()).map(w => ({
        week: w.week,
        totalTRIMP: w.totalTRIMP,
        runCount: w.runCount
      }))
    });
    
    return Array.from(weeks.values()).sort((a, b) => 
      a.weekStart.getTime() - b.weekStart.getTime()
    );
  }, [processedRuns]);

  // Generate recommendations
  const recommendations = useMemo(() => {
    const context: RecommendationContext = {
      acwr: acwrResult,
      recentTrainingLoad: {
        weeklyDistance: weeklyTRIMPData && weeklyTRIMPData.length > 0 ? weeklyTRIMPData[weeklyTRIMPData.length - 1]?.totalDistance || 0 : 0,
        weeklyTRIMP: weeklyTRIMPData && weeklyTRIMPData.length > 0 ? weeklyTRIMPData[weeklyTRIMPData.length - 1]?.totalTRIMP || 0 : 0,
        intensityDistribution: { zone1: 70, zone2: 20, zone3: 7, zone4: 2, zone5: 1 }, // Simplified
        restDays: 1
      },
      recentPerformance: {
        trend: 'stable',
        fatigueLevel: safeMetrics.tsb < -10 ? 'high' : safeMetrics.tsb > 10 ? 'low' : 'moderate',
        injuryRisk: acwrResult.status === 'high-risk' ? 'high' : 'low'
      },
      experienceLevel: effectiveUserPhysiology.fitnessLevel || 'intermediate',
      availableTime: 8
    };
    
    return generateTrainingRecommendations(runs, context).slice(0, 3); // Top 3 recommendations
  }, [runs, acwrResult, safeMetrics, weeklyTRIMPData, effectiveUserPhysiology]);

  // Recent runs (last 10)
  const recentRuns = useMemo(() => {
    return processedRuns
      .sort((a, b) => new Date(b.start_date_local).getTime() - new Date(a.start_date_local).getTime())
      .slice(0, 10);
  }, [processedRuns]);

  // Helper functions
  const formatPace = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${minutes}:${secs.toString().padStart(2, '0')}/km`;
  };

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return hours > 0 ? `${hours}:${minutes.toString().padStart(2, '0')}` : `${minutes}min`;
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const getACWRStatusColor = (status: string): string => {
    switch (status) {
      case 'optimal': return 'bg-green-100 text-green-800 border-green-200';
      case 'caution': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'high-risk': return 'bg-red-100 text-red-800 border-red-200';
      case 'detraining': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getDataQualityColor = (quality: string): string => {
    switch (quality) {
      case 'high': return 'text-green-600';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getTSBStatusColor = (tsb: number): string => {
    if (tsb > 10) return 'text-blue-600'; // Fresh
    if (tsb < -10) return 'text-red-600'; // Fatigued
    return 'text-green-600'; // Balanced
  };

  const getTSBStatus = (tsb: number): string => {
    if (tsb > 10) return 'Fresh';
    if (tsb < -10) return 'Fatigued';
    return 'Balanced';
  };

  if (runs.length === 0) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border p-6 ${className}`}>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Training Load Dashboard
        </h2>
        <div className="text-center py-8">
          <div className="text-gray-500 mb-2">
            No training data available
          </div>
          <div className="text-sm text-gray-400">
            Complete some runs to see your training load analysis
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm border ${className}`}>
      <div className="p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">
          Training Load Dashboard
        </h2>

        {/* Profile Setup Prompt */}
        {!hasRequiredData && (
          <ProfileSetupPrompt
            variant="banner"
            title="Enhance Your Training Analysis"
            message="Add your heart rate data to unlock TRIMP calculations and more accurate training load metrics."
            missingFields={[
              ...(!effectiveUserPhysiology.maxHeartRate ? ['maxHeartRate'] : []),
              ...(!effectiveUserPhysiology.restingHeartRate ? ['restingHeartRate'] : []),
              ...(!effectiveUserPhysiology.bodyWeight ? ['bodyWeight'] : [])
            ]}
            onComplete={updateData}
            className="mb-6"
          />
        )}

        {/* ACWR Status and Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* ACWR Status */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-700" title="Acute-to-Chronic Workload Ratio - measures injury risk">
                ACWR Status
              </h3>
              <div className={`px-2 py-1 rounded text-xs font-medium border ${getACWRStatusColor(acwrResult.status)}`}>
                {acwrResult.status.replace('-', ' ')}
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900 mb-1">
              {acwrResult.acwr.toFixed(2)}
            </div>
            <div className="text-xs text-gray-600">
              Optimal: 0.8 - 1.3
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {acwrResult.status === 'optimal' ? 'Low injury risk' :
               acwrResult.status === 'high-risk' ? 'High injury risk - reduce load' :
               acwrResult.status === 'caution' ? 'Moderate risk - monitor closely' :
               'Can increase training safely'}
            </div>
          </div>

          {/* Current Fitness (CTL) */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-2" title="Chronic Training Load - your long-term fitness level">
              Fitness (CTL)
            </h3>
            <div className="text-2xl font-bold text-gray-900 mb-1">
              {Math.round(safeMetrics.ctl)}
            </div>
            <div className="text-xs text-gray-600">
              42-day average
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Higher = more fit
            </div>
          </div>

          {/* Current Fatigue (ATL) */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Fatigue (ATL)</h3>
            <div className="text-2xl font-bold text-gray-900 mb-1">
              {Math.round(safeMetrics.atl)}
            </div>
            <div className="text-xs text-gray-600">
              Acute Training Load
            </div>
          </div>

          {/* Form (TSB) */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Form (TSB)</h3>
            <div className={`text-2xl font-bold mb-1 ${getTSBStatusColor(safeMetrics.tsb)}`}>
              {safeMetrics.tsb > 0 ? '+' : ''}{Math.round(safeMetrics.tsb)}
            </div>
            <div className="text-xs text-gray-600">
              {getTSBStatus(safeMetrics.tsb)}
            </div>
          </div>
        </div>

        {/* Weekly TRIMP Chart */}
        <div className="mb-8">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Weekly Training Load (Last 8 Weeks)
          </h3>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-end justify-between h-32 space-x-2">
              {weeklyTRIMPData.map((week, index) => {
                const maxTRIMP = Math.max(...weeklyTRIMPData.map(w => w.totalTRIMP));
                const height = maxTRIMP > 0 ? (week.totalTRIMP / maxTRIMP) * 100 : 0;
                
                return (
                  <div key={index} className="flex-1 flex flex-col items-center">
                    <div 
                      className="w-full bg-blue-500 rounded-t transition-all duration-300 hover:bg-blue-600"
                      style={{ height: `${height}%`, minHeight: height > 0 ? '4px' : '0px' }}
                      title={`Week ${week.week}: ${Math.round(week.totalTRIMP)} TRIMP, ${week.runCount} runs`}
                    />
                    <div className="text-xs text-gray-600 mt-2 text-center">
                      {week.week}
                    </div>
                    <div className="text-xs text-gray-500">
                      {Math.round(week.totalTRIMP)}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 flex justify-between text-sm text-gray-600">
              <span>TRIMP Score</span>
              <span>Trend: {weeklyTRIMPData && weeklyTRIMPData.length >= 2 && 
                weeklyTRIMPData[weeklyTRIMPData.length - 1]?.totalTRIMP > 
                weeklyTRIMPData[weeklyTRIMPData.length - 2]?.totalTRIMP ? '↗' : '↘'}</span>
            </div>
          </div>
        </div>

        {/* Recent Runs Table */}
        <div className="mb-8">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Recent Runs
          </h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Distance
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Duration
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Pace
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    TRIMP
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    PSI
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Power
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quality
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {recentRuns.map((run, index) => {
                  const pace = run.moving_time / (run.distance / 1000);
                  const displayPace = run.adjustedPace || pace;
                  
                  return (
                    <tr key={run.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(run.start_date_local)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {(run.distance / 1000).toFixed(1)}km
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {formatDuration(run.moving_time)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {formatPace(displayPace)}
                        {run.adjustedPace && (
                          <span className="text-xs text-blue-600 ml-1" title="Weather adjusted">
                            *
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {Math.round(run.trimpScore)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {run.psiScore ? run.psiScore.toFixed(1) : '-'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {run.powerEstimate ? `${run.powerEstimate}W` : '-'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`text-xs font-medium ${getDataQualityColor(run.dataQuality)}`}>
                          {run.dataQuality}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Actionable Recommendations */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Training Recommendations
          </h3>
          <div className="space-y-4">
            {recommendations.map((rec, index) => (
              <div 
                key={rec.id} 
                className={`border rounded-lg p-4 ${
                  rec.priority === 'critical' ? 'border-red-200 bg-red-50' :
                  rec.priority === 'high' ? 'border-orange-200 bg-orange-50' :
                  rec.priority === 'medium' ? 'border-yellow-200 bg-yellow-50' :
                  'border-blue-200 bg-blue-50'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-medium text-gray-900">{rec.title}</h4>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    rec.priority === 'critical' ? 'bg-red-100 text-red-800' :
                    rec.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                    rec.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {rec.priority}
                  </span>
                </div>
                <p className="text-sm text-gray-700 mb-3">{rec.description}</p>
                <div className="space-y-1">
                  {rec.actionItems.slice(0, 3).map((item, itemIndex) => (
                    <div key={itemIndex} className="flex items-start text-sm text-gray-600">
                      <span className="text-blue-500 mr-2 mt-0.5">•</span>
                      {item}
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                  <span>Timeframe: {rec.timeframe}</span>
                  <span>Confidence: {rec.confidence}</span>
                </div>
              </div>
            ))}
            
            {recommendations.length === 0 && (
              <div className="text-center py-6 text-gray-500">
                <div className="mb-2">No specific recommendations at this time</div>
                <div className="text-sm">Your training load appears well balanced</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrainingLoadDashboard;