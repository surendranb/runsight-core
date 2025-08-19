// src/components/insights/ConsistencyInsight.tsx
import React, { useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Calendar, TrendingUp, TrendingDown, Activity, CheckCircle } from 'lucide-react';
import { EnrichedRun } from '../../types';
import { groupRunsByWeek, groupRunsByMonth, TimeGroupData, analyzeConsistency } from '../../lib/insights/consistencyUtils';
import { convertSecondsToHoursMinutes } from '../../lib/insightsUtils';
import { chartTheme, chartDefaults, createStandardTooltip, ChartTitle, axisFormatters } from '../../lib/chartTheme';
import { ProgressiveHelp, HelpIcon, runningTerminology } from '../common/ContextualHelp';
import { Heading, Section, EmphasisBox, InfoScent, visualHierarchy } from '../common/VisualHierarchy';

interface ConsistencyInsightProps {
  runs: EnrichedRun[];
}

export const ConsistencyInsight: React.FC<ConsistencyInsightProps> = ({ runs }) => {
  const weeklyData = useMemo(() => groupRunsByWeek(runs), [runs]);
  const monthlyData = useMemo(() => groupRunsByMonth(runs), [runs]);
  const consistencyAnalysis = useMemo(() => analyzeConsistency(runs), [runs]);

  // Helper function to format time for YAxis and Tooltip
  const formatTime = (timeInSeconds: number) => {
    const { hours, minutes } = convertSecondsToHoursMinutes(timeInSeconds);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  // Helper function to render standardized charts
  const renderChart = (
    title: string,
    chartData: TimeGroupData[],
    chartType: "line" | "bar",
    dataKey: keyof TimeGroupData,
    yAxisFormatter?: (value: any) => string,
    yAxisLabel?: string,
  ) => {
    if (chartData.length < 2) {
      return (
        <div className="p-4 border rounded-lg shadow bg-gray-50">
          <ChartTitle title={title} />
          <div className="flex items-center justify-center h-48 text-gray-500">
            <div className="text-center">
              <Activity className="w-8 h-8 mx-auto mb-2 text-gray-400" />
              <p className="text-sm">Not enough data to display chart</p>
              <p className="text-xs text-gray-400">Need at least 2 data points</p>
            </div>
          </div>
        </div>
      );
    }

    const ChartComponent = chartType === "line" ? LineChart : BarChart;
    const ChartSeries = chartType === "line" ? Line : Bar;
    
    // Create appropriate tooltip formatters
    const tooltipFormatters: Record<string, (value: any) => string> = {};
    if (dataKey === 'totalDistance') {
      tooltipFormatters[dataKey as string] = (value: number) => axisFormatters.distance(value);
    } else if (dataKey === 'totalMovingTime') {
      tooltipFormatters[dataKey as string] = (value: number) => axisFormatters.duration(value);
    } else if (dataKey === 'runCount') {
      tooltipFormatters[dataKey as string] = (value: number) => `${value} runs`;
    }

    return (
      <div className="p-4 border rounded-lg shadow bg-white">
        <ChartTitle title={title} dataCount={chartData.length} />
        <ResponsiveContainer width="100%" height={chartDefaults.height}>
          <ChartComponent data={chartData} margin={chartDefaults.margin}>
            <CartesianGrid {...chartDefaults.grid} />
            <XAxis 
              dataKey="label" 
              {...chartDefaults.axis}
              label={{ value: 'Time Period', position: 'insideBottom', offset: -10 }}
            />
            <YAxis 
              tickFormatter={yAxisFormatter}
              {...chartDefaults.axis}
              label={{ value: yAxisLabel || '', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip content={createStandardTooltip(tooltipFormatters)} />
            <ChartSeries
              type={chartType === 'line' ? 'monotone' : undefined}
              dataKey={dataKey}
              stroke={chartTheme.colors.primary}
              fill={chartType === 'bar' ? chartTheme.colors.primary : undefined}
              strokeWidth={chartType === 'line' ? 2 : undefined}
              activeDot={chartType === 'line' ? { r: 4, fill: chartTheme.colors.primary } : undefined}
            />
          </ChartComponent>
        </ResponsiveContainer>
      </div>
    );
  };

  if (runs.length === 0) {
    return (
      <Section
        title="Consistency & Progress"
        subtitle="No run data available to show consistency insights."
        level={3}
        icon={Activity}
        actions={
          <HelpIcon 
            content={runningTerminology.consistency.basic}
            size="md"
            position="top"
          />
        }
      />
    );
  }

  const lastWeek = weeklyData.length > 0 ? weeklyData[weeklyData.length -1] : null;
  const lastMonth = monthlyData.length > 0 ? monthlyData[monthlyData.length -1] : null;

  return (
    <Section
      title="Running Consistency Analysis"
      subtitle="Track your running frequency, volume trends, and consistency patterns over time"
      level={3}
      icon={Activity}
      badge={{
        text: `${runs.length} runs analyzed`,
        color: 'blue'
      }}
      actions={
        <HelpIcon 
          content={runningTerminology.consistency.basic}
          size="md"
          position="top"
        />
      }
      spacing="normal"
    >

      {/* Progressive help for understanding consistency */}
      <ProgressiveHelp
        title="Understanding Running Consistency"
        basicExplanation="Consistency is more important than intensity for long-term running success. Regular training builds fitness gradually and reduces injury risk."
        detailedExplanation={runningTerminology.consistency.detailed}
        examples={runningTerminology.consistency.examples}
        className="mb-6"
      />

      {/* Consistency Analysis */}
      <EmphasisBox
        variant="insight"
        title="Consistency Analysis"
        priority="high"
      >
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <InfoScent
            label="Consistency Score"
            description="Overall consistency rating based on frequency and gaps"
            value={consistencyAnalysis.consistencyScore.toFixed(0)}
            confidence={0.9}
          />
          <InfoScent
            label="Runs per Week"
            description="Average weekly running frequency"
            value={consistencyAnalysis.frequency.runsPerWeek.toFixed(1)}
            unit="runs/week"
          />
          <InfoScent
            label="Longest Streak"
            description="Maximum consecutive days with runs"
            value={consistencyAnalysis.streaks.longest}
            unit="days"
          />
          <InfoScent
            label="Average Gap"
            description="Average days between runs"
            value={consistencyAnalysis.frequency.averageGapDays.toFixed(1)}
            unit="days"
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium text-gray-700">Trend:</span>
            <span className={`ml-2 px-2 py-1 rounded text-xs ${
              consistencyAnalysis.trend === 'improving' ? 'bg-green-100 text-green-800' :
              consistencyAnalysis.trend === 'declining' ? 'bg-red-100 text-red-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {consistencyAnalysis.trend.charAt(0).toUpperCase() + consistencyAnalysis.trend.slice(1)}
            </span>
          </div>
          <div>
            <span className="font-medium text-gray-700">Most Active Day:</span>
            <span className="ml-2 text-gray-600">{consistencyAnalysis.frequency.mostConsistentDay}</span>
          </div>
        </div>
        
        {consistencyAnalysis.recommendations.length > 0 && (
          <div className="mt-4">
            <Heading level={5} emphasis="secondary" className="mb-2">
              Recommendations:
            </Heading>
            <ul className={`text-sm ${visualHierarchy.spacing.xs}`}>
              {consistencyAnalysis.recommendations.slice(0, 3).map((rec, index) => (
                <li key={index} className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </EmphasisBox>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
         {lastWeek && (
             <div className="bg-blue-50 p-4 rounded-lg">
                 <h4 className="font-semibold text-blue-700">This Week ({lastWeek.label.replace('Week of ','')})</h4>
                 <p className="text-blue-600 text-sm">Runs: {lastWeek.runCount}</p>
                 <p className="text-blue-600 text-sm">Distance: {(lastWeek.totalDistance / 1000).toFixed(1)}km</p>
                 <p className="text-blue-600 text-sm">Time: {formatTime(lastWeek.totalMovingTime)}</p>
             </div>
         )}
         {lastMonth && (
              <div className="bg-green-50 p-4 rounded-lg">
                 <h4 className="font-semibold text-green-700">This Month ({lastMonth.label.split(' ')[0]})</h4>
                 <p className="text-green-600 text-sm">Runs: {lastMonth.runCount}</p>
                 <p className="text-green-600 text-sm">Distance: {(lastMonth.totalDistance / 1000).toFixed(1)}km</p>
                 <p className="text-green-600 text-sm">Time: {formatTime(lastMonth.totalMovingTime)}</p>
             </div>
         )}
      </div>

      {/* Weekly Trends - Line charts for time series data */}
      <div className="mb-6">
        <Heading level={4} icon={Calendar} className="mb-3">
          Weekly Trends
        </Heading>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {renderChart(
            "Weekly Distance",
            weeklyData,
            "line",
            "totalDistance",
            (value) => axisFormatters.distance(value),
            "Distance (km)"
          )}
          {renderChart(
            "Weekly Training Time",
            weeklyData,
            "line",
            "totalMovingTime",
            formatTime,
            "Time"
          )}
          {renderChart(
            "Weekly Run Frequency",
            weeklyData,
            "bar",
            "runCount",
            (value) => `${value}`,
            "Number of Runs"
          )}
        </div>
      </div>

      {/* Monthly Trends - Line charts for time series data */}
      <div>
        <Heading level={4} icon={Calendar} className="mb-3">
          Monthly Trends
        </Heading>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {renderChart(
            "Monthly Distance",
            monthlyData,
            "line",
            "totalDistance",
            (value) => axisFormatters.distance(value),
            "Distance (km)"
          )}
          {renderChart(
            "Monthly Training Time",
            monthlyData,
            "line",
            "totalMovingTime",
            formatTime,
            "Time"
          )}
          {renderChart(
            "Monthly Run Frequency",
            monthlyData,
            "bar",
            "runCount",
            (value) => `${value}`,
            "Number of Runs"
          )}
        </div>
      </div>
    </Section>
  );
};
