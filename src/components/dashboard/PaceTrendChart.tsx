import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { TrendingUp, TrendingDown, Award, Calendar } from 'lucide-react';
import { EnrichedRun } from '../../types';
import { detectPersonalRecords, categorizeDistance } from '../../lib/insights/personalRecordsUtils';
import { chartTheme, chartDefaults, createStandardTooltip, ChartTitle, ChartLegend, axisFormatters } from '../../lib/chartTheme';
import { formatChartDate } from '../../lib/dateUtils';

interface PaceTrendChartProps {
  data: EnrichedRun[];
  period: string;
  showMovingAverage?: boolean;
  highlightPersonalRecords?: boolean;
  showWeatherIndicators?: boolean;
}

interface ChartDataPoint {
  date: number; // timestamp
  dateFormatted: string;
  pace: number;
  movingAverage?: number;
  isPR?: boolean;
  weather?: string;
  distance: number;
  name: string;
}

export const PaceTrendChart: React.FC<PaceTrendChartProps> = ({
  data,
  period,
  showMovingAverage = true,
  highlightPersonalRecords = true,
  showWeatherIndicators = true
}) => {
  const [selectedPeriod, setSelectedPeriod] = useState<'30d' | '90d' | '1y'>('30d');
  // Transform runs data into chart format
  const chartData: ChartDataPoint[] = React.useMemo(() => {
    const sortedRuns = [...data]
      .filter(run => run.distance > 0 && run.moving_time > 0)
      .sort((a, b) => new Date(a.start_date_local).getTime() - new Date(b.start_date_local).getTime());

    if (sortedRuns.length === 0) return [];

    // Debug: Log the actual dates from database
    console.log('🏃 PaceTrendChart - Raw database dates:', sortedRuns.map(run => ({
      name: run.name,
      start_date_local: run.start_date_local,
      formatted: formatChartDate(run.start_date_local)
    })));

    let bestPace = Infinity;
    
    return sortedRuns.map((run, index) => {
      const paceSeconds = run.moving_time / (run.distance / 1000);
      const isPR = highlightPersonalRecords && paceSeconds < bestPace;
      if (isPR) bestPace = paceSeconds;
      
      // Calculate moving average (last 5 runs)
      let movingAverage;
      if (showMovingAverage && index >= 4) {
        const recentRuns = sortedRuns.slice(index - 4, index + 1);
        const avgPace = recentRuns.reduce((sum, r) => sum + (r.moving_time / (r.distance / 1000)), 0) / recentRuns.length;
        movingAverage = avgPace;
      }
      
      // Get weather info
      let weather;
      if (showWeatherIndicators && run.weather_data) {
        const weatherData = run.weather_data as any;
        weather = weatherData.weather?.main || weatherData.main || 'Unknown';
      }
      
      return {
        date: new Date(run.start_date_local).getTime(), // Use timestamp for proper time scale
        dateFormatted: formatChartDate(run.start_date_local),
        pace: paceSeconds,
        movingAverage,
        isPR,
        weather,
        distance: run.distance / 1000,
        name: run.name
      };
    });

    // Debug: Log the final chart data
    console.log('📊 PaceTrendChart - Final chart data:', chartData.map(point => ({
      dateFormatted: point.dateFormatted,
      timestamp: point.date,
      name: point.name
    })));

    return chartData;
  }, [data, showMovingAverage, highlightPersonalRecords, showWeatherIndicators]);

  // Calculate optimal tick count based on data range
  const tickCount = React.useMemo(() => {
    if (chartData.length === 0) return 5;
    
    const dateRange = chartData[chartData.length - 1].date - chartData[0].date;
    const days = dateRange / (1000 * 60 * 60 * 24);
    
    if (days <= 7) return Math.min(chartData.length, 7);
    if (days <= 30) return 6;
    if (days <= 90) return 8;
    return 10;
  }, [chartData]);

  const formatPace = axisFormatters.pace;

  const CustomTooltip = createStandardTooltip({
    date: (timestamp: number) => {
      const dateString = new Date(timestamp).toISOString();
      return formatChartDate(dateString);
    },
    pace: (value: number) => `${axisFormatters.pace(value)}/km`,
    distance: (value: number) => axisFormatters.distance(value * 1000),
    movingAverage: (value: number) => `${axisFormatters.pace(value)}/km (5-run avg)`
  });

  if (chartData.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Pace Trend - {period}</h3>
        <div className="flex items-center justify-center h-64 text-gray-500">
          <p>No pace data available for the selected period</p>
        </div>
      </div>
    );
  }

  // Calculate trend statistics
  const trendStats = React.useMemo(() => {
    if (chartData.length < 2) return null;
    
    const firstPace = chartData[0].pace;
    const lastPace = chartData[chartData.length - 1].pace;
    const improvement = ((firstPace - lastPace) / firstPace) * 100;
    const isImproving = improvement > 0;
    
    const personalRecords = chartData.filter(d => d.isPR).length;
    
    return {
      improvement: Math.abs(improvement),
      isImproving,
      personalRecords,
      totalRuns: chartData.length
    };
  }, [chartData]);

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all duration-300 hover:scale-[1.01] cursor-default">
      <ChartTitle 
        title={`Pace Trend Analysis - ${period}`}
        subtitle="Track your pace improvements over time with moving averages and personal records"
        dataCount={chartData.length}
      />
      
      {/* Performance Summary */}
      {trendStats && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-4">
              {trendStats.isImproving ? (
                <div className="flex items-center text-green-600">
                  <TrendingDown className="w-4 h-4 mr-1" />
                  <span className="font-medium">{trendStats.improvement.toFixed(1)}% faster</span>
                </div>
              ) : (
                <div className="flex items-center text-red-600">
                  <TrendingUp className="w-4 h-4 mr-1" />
                  <span className="font-medium">{trendStats.improvement.toFixed(1)}% slower</span>
                </div>
              )}
              {trendStats.personalRecords > 0 && (
                <div className="flex items-center text-yellow-600">
                  <Award className="w-4 h-4 mr-1" />
                  <span className="font-medium">{trendStats.personalRecords} PR{trendStats.personalRecords > 1 ? 's' : ''}</span>
                </div>
              )}
            </div>
            <span className="text-gray-500">Based on {trendStats.totalRuns} runs</span>
          </div>
        </div>
      )}

      <div style={{ height: chartDefaults.height }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={chartDefaults.margin}>
            <CartesianGrid {...chartDefaults.grid} />
            <XAxis 
              dataKey="date"
              type="number"
              scale="time"
              domain={['dataMin', 'dataMax']}
              tickFormatter={(timestamp) => {
                const dateString = new Date(timestamp).toISOString();
                return formatChartDate(dateString);
              }}
              {...chartDefaults.axis}
              label={{ value: 'Date', position: 'insideBottom', offset: -10 }}
              tick={{ fontSize: 12 }}
              tickCount={tickCount}
            />
            <YAxis 
              tickFormatter={formatPace}
              {...chartDefaults.axis}
              domain={['dataMin - 10', 'dataMax + 10']}
              label={{ value: 'Pace (min/km)', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip content={CustomTooltip} />
            <Line
              type="monotone"
              dataKey="pace"
              stroke={chartTheme.colors.primary}
              strokeWidth={2}
              dot={(props: any) => {
                const { cx, cy, payload } = props;
                if (payload.isPR) {
                  return <circle cx={cx} cy={cy} r={4} fill={chartTheme.colors.success} stroke="#ffffff" strokeWidth={2} className="hover:r-6 transition-all cursor-pointer" />;
                }
                return <circle cx={cx} cy={cy} r={2} fill={chartTheme.colors.primary} className="hover:r-4 transition-all cursor-pointer" />;
              }}
              activeDot={{ 
                r: 6, 
                fill: chartTheme.colors.primary, 
                stroke: '#ffffff', 
                strokeWidth: 2,
                style: { cursor: 'pointer' }
              }}
              name="Pace"
            />
            {showMovingAverage && (
              <Line
                type="monotone"
                dataKey="movingAverage"
                stroke={chartTheme.colors.secondary}
                strokeWidth={1}
                strokeDasharray="5 5"
                dot={false}
                name="5-run moving average"
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
      
      <ChartLegend 
        items={[
          { 
            label: 'Pace', 
            color: chartTheme.colors.primary,
            description: 'Your actual pace for each run'
          },
          ...(showMovingAverage ? [{
            label: '5-run moving average',
            color: chartTheme.colors.secondary,
            description: 'Smoothed trend line showing average pace over last 5 runs'
          }] : []),
          ...(highlightPersonalRecords ? [{
            label: 'Personal Record',
            color: chartTheme.colors.success,
            description: 'Runs where you achieved a new personal best pace'
          }] : [])
        ]}
      />
      
      <div className="mt-2 text-right">
        <span className="text-xs text-gray-500">Lower pace values indicate faster running</span>
      </div>
    </div>
  );
};