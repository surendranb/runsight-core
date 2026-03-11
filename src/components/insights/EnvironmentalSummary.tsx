import React, { useMemo } from 'react';
import { CloudRain, MapPin, Clock, Mountain, Wind, Thermometer, Target } from 'lucide-react';
import { EnrichedRun } from '../../types';
import { Section } from '../common/VisualHierarchy';

interface EnvironmentalSummaryProps {
  runs: EnrichedRun[];
}

interface EnvironmentalAnalysis {
  optimalConditions: {
    temperature: { min: number; max: number; avgPace: number };
    weather: string[];
    timeOfDay: string;
    locations: string[];
  };
  performanceFactors: {
    temperatureImpact: number; // percentage slower in hot weather
    elevationImpact: number; // percentage slower per 100m elevation
    windImpact: number; // percentage slower in strong wind
  };
  recommendations: string[];
}

export const EnvironmentalSummary: React.FC<EnvironmentalSummaryProps> = ({ runs }) => {
  const analysis = useMemo((): EnvironmentalAnalysis => {
    const runsWithWeather = runs.filter(run => run.weather_data?.temperature !== undefined);
    
    if (runsWithWeather.length < 5) {
      return {
        optimalConditions: {
          temperature: { min: 15, max: 20, avgPace: 0 },
          weather: ['Clear'],
          timeOfDay: 'Morning',
          locations: []
        },
        performanceFactors: {
          temperatureImpact: 0,
          elevationImpact: 0,
          windImpact: 0
        },
        recommendations: ['Need more runs with weather data for detailed analysis']
      };
    }

    // Temperature analysis
    const coolRuns = runsWithWeather.filter(run => (run.weather_data as any).temperature < 15);
    const moderateRuns = runsWithWeather.filter(run => {
      const temp = (run.weather_data as any).temperature;
      return temp >= 15 && temp <= 25;
    });
    const warmRuns = runsWithWeather.filter(run => (run.weather_data as any).temperature > 25);

    const calculateAvgPace = (runList: EnrichedRun[]) => {
      if (runList.length === 0) return 0;
      const totalTime = runList.reduce((sum, run) => sum + run.moving_time, 0);
      const totalDistance = runList.reduce((sum, run) => sum + run.distance, 0);
      return totalDistance > 0 ? totalTime / (totalDistance / 1000) : 0;
    };

    const coolPace = calculateAvgPace(coolRuns);
    const moderatePace = calculateAvgPace(moderateRuns);
    const warmPace = calculateAvgPace(warmRuns);

    // Find optimal temperature range
    let optimalTemp = { min: 15, max: 20, avgPace: moderatePace };
    if (coolPace > 0 && (moderatePace === 0 || coolPace < moderatePace)) {
      optimalTemp = { min: 5, max: 15, avgPace: coolPace };
    } else if (warmPace > 0 && (moderatePace === 0 || warmPace < moderatePace)) {
      optimalTemp = { min: 20, max: 30, avgPace: warmPace };
    }

    // Temperature impact calculation
    const temperatureImpact = moderatePace > 0 && warmPace > 0 
      ? ((warmPace - moderatePace) / moderatePace) * 100 
      : 0;

    // Weather conditions analysis
    const weatherCounts = runsWithWeather.reduce((acc, run) => {
      const weather = run.weather_data?.weather?.main || 'Unknown';
      acc[weather] = (acc[weather] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const bestWeather = Object.entries(weatherCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([weather]) => weather);

    // Time of day analysis
    const timeAnalysis = runs.reduce((acc, run) => {
      const hour = new Date(run.start_date_local).getHours();
      let timeOfDay: string;
      if (hour < 6) timeOfDay = 'Early Morning';
      else if (hour < 12) timeOfDay = 'Morning';
      else if (hour < 17) timeOfDay = 'Afternoon';
      else if (hour < 20) timeOfDay = 'Evening';
      else timeOfDay = 'Night';

      if (!acc[timeOfDay]) {
        acc[timeOfDay] = { count: 0, totalPace: 0 };
      }
      acc[timeOfDay].count++;
      acc[timeOfDay].totalPace += run.moving_time / (run.distance / 1000);
      return acc;
    }, {} as Record<string, { count: number; totalPace: number }>);

    const bestTimeOfDay = Object.entries(timeAnalysis)
      .map(([time, data]) => ({ time, avgPace: data.totalPace / data.count, count: data.count }))
      .sort((a, b) => a.avgPace - b.avgPace)[0]?.time || 'Morning';

    // Location analysis (simplified)
    const locations = runs
      .filter(run => run.start_latlng)
      .map(run => `${run.start_latlng![0].toFixed(2)},${run.start_latlng![1].toFixed(2)}`)
      .reduce((acc, loc) => {
        acc[loc] = (acc[loc] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

    const topLocations = Object.entries(locations)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([loc]) => `Location ${loc.split(',')[0]}`);

    // Generate recommendations
    const recommendations: string[] = [];
    
    if (temperatureImpact > 10) {
      recommendations.push(`You run ${temperatureImpact.toFixed(1)}% slower in hot weather. Consider running during cooler parts of the day.`);
    }
    
    if (optimalTemp.min < 15) {
      recommendations.push('You perform best in cooler temperatures. Early morning or evening runs may be optimal.');
    } else if (optimalTemp.min > 20) {
      recommendations.push('You handle warm weather well. Midday runs could work for you.');
    }
    
    if (bestTimeOfDay === 'Morning' || bestTimeOfDay === 'Early Morning') {
      recommendations.push('Morning runs appear to be your sweet spot for performance.');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('Your performance is consistent across different conditions - great adaptability!');
    }

    return {
      optimalConditions: {
        temperature: optimalTemp,
        weather: bestWeather,
        timeOfDay: bestTimeOfDay,
        locations: topLocations
      },
      performanceFactors: {
        temperatureImpact: Math.abs(temperatureImpact),
        elevationImpact: 0, // Would need elevation data
        windImpact: 0 // Would need wind data
      },
      recommendations
    };
  }, [runs]);

  const formatPace = (seconds: number): string => {
    if (seconds === 0) return 'N/A';
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Section
      title="Environmental Performance Summary"
      subtitle="Your optimal running conditions and environmental impact analysis"
      level={2}
      icon={Target}
      className="mb-6"
    >
      <div className="space-y-6">
        {/* Optimal Conditions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center mb-2">
              <Thermometer className="w-4 h-4 text-blue-600 mr-2" />
              <h4 className="font-medium text-blue-800">Optimal Temperature</h4>
            </div>
            <div className="text-lg font-bold text-blue-900">
              {analysis.optimalConditions.temperature.min}°C - {analysis.optimalConditions.temperature.max}°C
            </div>
            <div className="text-sm text-blue-700">
              Avg pace: {formatPace(analysis.optimalConditions.temperature.avgPace)}/km
            </div>
          </div>

          <div className="p-4 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-center mb-2">
              <CloudRain className="w-4 h-4 text-green-600 mr-2" />
              <h4 className="font-medium text-green-800">Best Weather</h4>
            </div>
            <div className="text-sm text-green-700 space-y-1">
              {analysis.optimalConditions.weather.slice(0, 2).map((weather, index) => (
                <div key={index} className="font-medium">{weather}</div>
              ))}
            </div>
          </div>

          <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
            <div className="flex items-center mb-2">
              <Clock className="w-4 h-4 text-purple-600 mr-2" />
              <h4 className="font-medium text-purple-800">Best Time</h4>
            </div>
            <div className="text-lg font-bold text-purple-900">
              {analysis.optimalConditions.timeOfDay}
            </div>
          </div>

          <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
            <div className="flex items-center mb-2">
              <MapPin className="w-4 h-4 text-orange-600 mr-2" />
              <h4 className="font-medium text-orange-800">Top Locations</h4>
            </div>
            <div className="text-sm text-orange-700">
              {analysis.optimalConditions.locations.length > 0 
                ? `${analysis.optimalConditions.locations.length} favorite spots`
                : 'Various locations'
              }
            </div>
          </div>
        </div>

        {/* Performance Impact Factors */}
        {analysis.performanceFactors.temperatureImpact > 0 && (
          <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
            <h4 className="font-medium text-yellow-800 mb-3 flex items-center">
              <Thermometer className="w-4 h-4 mr-2" />
              Environmental Impact on Performance
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              {analysis.performanceFactors.temperatureImpact > 0 && (
                <div>
                  <span className="font-medium text-yellow-700">Heat Impact:</span>
                  <div className="text-yellow-600">
                    {analysis.performanceFactors.temperatureImpact.toFixed(1)}% slower in hot weather
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Key Recommendations */}
        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
          <h4 className="font-medium text-gray-800 mb-3 flex items-center">
            <Target className="w-4 h-4 mr-2" />
            Environmental Optimization Tips
          </h4>
          <ul className="space-y-2">
            {analysis.recommendations.map((rec, index) => (
              <li key={index} className="flex items-start text-sm text-gray-700">
                <span className="text-gray-500 mr-2">•</span>
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-blue-600">
              {runs.filter(r => r.weather_data?.temperature).length}
            </div>
            <div className="text-sm text-gray-600">Runs with weather data</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-600">
              {analysis.optimalConditions.weather.length}
            </div>
            <div className="text-sm text-gray-600">Weather types experienced</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-purple-600">
              {analysis.optimalConditions.locations.length}
            </div>
            <div className="text-sm text-gray-600">Favorite locations</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-orange-600">
              {analysis.performanceFactors.temperatureImpact > 5 ? 'High' : 'Low'}
            </div>
            <div className="text-sm text-gray-600">Weather sensitivity</div>
          </div>
        </div>
      </div>
    </Section>
  );
};