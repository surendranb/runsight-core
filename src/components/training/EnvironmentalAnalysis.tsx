import React, { useMemo } from 'react';
import { EnrichedRun } from '../../types';
import { CloudRain, Thermometer, Wind, Droplets, Sun, Snowflake, AlertTriangle } from 'lucide-react';
import { 
  calculateAdjustedPace, 
  calculatePSI,
  buildEnvironmentalProfile,
  identifyWeatherPerformancePatterns,
  getEnvironmentalRecommendations
} from '../../lib/training/environmentalUtils';


interface EnvironmentalAnalysisProps {
  runs: EnrichedRun[];
  userPhysiology?: {
    maxHeartRate?: number;
    restingHeartRate?: number;
    bodyWeight?: number;
  };
  className?: string;
}

export const EnvironmentalAnalysis: React.FC<EnvironmentalAnalysisProps> = ({
  runs = [],
  userPhysiology = {},
  className = ''
}) => {
  // Filter runs with weather data
  const runsWithWeather = useMemo(() => 
    Array.isArray(runs) ? runs.filter(run => run.weather_data) : [], [runs]);

  // Environmental profile
  const environmentalProfile = useMemo(() => {
    if (runsWithWeather.length < 10) return null;
    
    // Use the buildEnvironmentalProfile function from utils
    const profileData = buildEnvironmentalProfile(runsWithWeather);
    const performanceByTemperature = profileData.performanceByTemperature;

    return {
      performanceByTemperature,
      optimalConditions: {
        temperatureRange: { min: 10, max: 15 },
        humidityRange: { min: 30, max: 50 },
        confidenceScore: profileData.optimalConditions.confidence
      },
      heatTolerance: {
        level: profileData.heatTolerance.level,
        optimalTemperature: profileData.heatTolerance.optimalTemp,
        heatAdaptationScore: profileData.heatTolerance.adaptationScore
      },
      acclimatization: {
        heatAcclimatization: {
          trend: 'stable' as const,
          currentLevel: profileData.heatTolerance.adaptationScore
        }
      }
    };
  }, [runsWithWeather]);

  // Weather performance patterns
  const performancePatterns = useMemo(() => {
    if (runsWithWeather.length < 5) return null;
    return identifyWeatherPerformancePatterns(runsWithWeather);
  }, [runsWithWeather]);

  // Environmental recommendations
  const environmentalRecommendations = useMemo(() => {
    if (!environmentalProfile) return [];
    // Mock current conditions for recommendations
    const currentConditions = {
      temperature: 20,
      humidity: 60,
      windSpeed: 5,
      weatherDescription: 'clear'
    };
    return getEnvironmentalRecommendations(environmentalProfile, currentConditions);
  }, [environmentalProfile]);

  // Recent environmental impacts
  const recentEnvironmentalImpacts = useMemo(() => {
    if (!Array.isArray(runsWithWeather) || runsWithWeather.length === 0) {
      return [];
    }
    return runsWithWeather.slice(0, 10).map(run => {
      const adjustedPace = calculateAdjustedPace(run, run.weather_data!);
      const psi = run.average_heartrate ? 
        calculatePSI(run, run.weather_data!, userPhysiology) : null;
      
      return {
        run,
        adjustedPace,
        psi,
        weatherImpact: adjustedPace.adjustments.total
      };
    });
  }, [runsWithWeather, userPhysiology]);

  const formatPace = (seconds: number | null | undefined): string => {
    if (seconds === null || seconds === undefined || isNaN(seconds) || seconds <= 0) {
      return 'No data';
    }
    
    // Additional validation for realistic pace values
    if (seconds < 120 || seconds > 1800) { // Less than 2 min/km or more than 30 min/km
      return 'Invalid data';
    }
    
    const minutes = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${minutes}:${secs.toString().padStart(2, '0')}/km`;
  };

  const getTemperatureIcon = (temp: number) => {
    if (temp < 5) return <Snowflake className="w-4 h-4 text-blue-500" />;
    if (temp < 15) return <Wind className="w-4 h-4 text-blue-400" />;
    if (temp < 25) return <CloudRain className="w-4 h-4 text-green-500" />;
    return <Sun className="w-4 h-4 text-orange-500" />;
  };

  const getPSIColor = (psi: number): string => {
    if (psi < 3) return 'text-green-600 bg-green-50';
    if (psi < 5) return 'text-yellow-600 bg-yellow-50';
    if (psi < 7) return 'text-orange-600 bg-orange-50';
    return 'text-red-600 bg-red-50';
  };

  const getImpactColor = (impact: number): string => {
    if (Math.abs(impact) < 5) return 'text-green-600';
    if (Math.abs(impact) < 15) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (runsWithWeather.length < 3) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border p-6 ${className}`}>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Environmental Performance Analysis
        </h2>
        <div className="text-center py-8">
          <div className="text-gray-500 mb-2">
            Need at least 3 runs with weather data for environmental analysis
          </div>
          <div className="text-sm text-gray-400">
            Runs with weather: {runsWithWeather.length} / {Array.isArray(runs) ? runs.length : 0}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm border ${className}`}>
      <div className="p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">
          Environmental Performance Analysis
        </h2>

        {/* Environmental Performance Overview */}
        {environmentalProfile && environmentalProfile.performanceByTemperature && Array.isArray(environmentalProfile.performanceByTemperature) && (
          <div className="mb-8">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Performance by Temperature</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {environmentalProfile.performanceByTemperature.slice(0, 4).map((tempData, index) => {
                const icons = [
                  <Snowflake className="w-5 h-5 text-blue-600 mr-2" />,
                  <CloudRain className="w-5 h-5 text-green-600 mr-2" />,
                  <Sun className="w-5 h-5 text-yellow-600 mr-2" />,
                  <Thermometer className="w-5 h-5 text-red-600 mr-2" />
                ];
                const colors = ['blue', 'green', 'yellow', 'red'];
                const color = colors[index] || 'gray';
                
                return (
                  <div key={index} className={`bg-${color}-50 rounded-lg p-4`}>
                    <div className="flex items-center mb-2">
                      {icons[index]}
                      <h4 className="font-medium text-gray-900">{tempData.temperatureRange}</h4>
                    </div>
                    <div className={`text-2xl font-bold text-${color}-600 mb-1`}>
                      {formatPace(tempData.avgOriginalPace)}
                    </div>
                    <div className="text-sm text-gray-600">
                      {tempData.runCount} runs
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Environmental Profile */}
        {environmentalProfile && (
          <div className="mb-8">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Your Environmental Profile</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3">Optimal Conditions</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Temperature Range:</span>
                    <span className="font-medium">
                      {Math.round(environmentalProfile.optimalConditions.temperatureRange.min)}°C - {Math.round(environmentalProfile.optimalConditions.temperatureRange.max)}°C
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Humidity Range:</span>
                    <span className="font-medium">
                      {Math.round(environmentalProfile.optimalConditions.humidityRange.min)}% - {Math.round(environmentalProfile.optimalConditions.humidityRange.max)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Confidence:</span>
                    <span className="font-medium text-green-600">
                      {Math.round(environmentalProfile.optimalConditions.confidenceScore * 100)}%
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3">Heat Tolerance</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Tolerance Level:</span>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      environmentalProfile.heatTolerance.level === 'high' ? 'bg-green-100 text-green-800' :
                      environmentalProfile.heatTolerance.level === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {environmentalProfile.heatTolerance.level}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Optimal Temp:</span>
                    <span className="font-medium">
                      {Math.round(environmentalProfile.heatTolerance.optimalTemperature)}°C
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Adaptation Score:</span>
                    <span className="font-medium text-blue-600">
                      {environmentalProfile.heatTolerance.heatAdaptationScore}/100
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Acclimatization Analysis */}
        {environmentalProfile && (
          <div className="mb-8">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Acclimatization Status</h3>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600 mb-1">
                    {environmentalProfile.acclimatization.heatAcclimatization.trend === 'improving' ? '↗' :
                     environmentalProfile.acclimatization.heatAcclimatization.trend === 'declining' ? '↘' : '→'}
                  </div>
                  <div className="text-sm text-gray-600">Heat Adaptation</div>
                  <div className="font-medium capitalize">
                    {environmentalProfile.acclimatization.heatAcclimatization.trend}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600 mb-1">
                    {environmentalProfile.acclimatization.heatAcclimatization.currentLevel}
                  </div>
                  <div className="text-sm text-gray-600">Adaptation Level</div>
                  <div className="font-medium">out of 100</div>
                </div>
              </div>
              
              {environmentalRecommendations && Array.isArray(environmentalRecommendations) && environmentalRecommendations.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <h5 className="font-medium text-gray-900 mb-2">Recommendations:</h5>
                  <ul className="space-y-1">
                    {environmentalRecommendations.slice(0, 3).map((rec, index) => (
                      <li key={index} className="flex items-start text-sm text-gray-600">
                        <span className="text-blue-500 mr-2 mt-0.5">•</span>
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Recent Environmental Impacts */}
        <div className="mb-8">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Environmental Impacts</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Weather</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Original Pace</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Adjusted Pace</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Impact</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">PSI</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {Array.isArray(recentEnvironmentalImpacts) && recentEnvironmentalImpacts.map(({ run, adjustedPace, psi, weatherImpact }, index) => (
                  <tr key={run.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {new Date(run.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center">
                        {getTemperatureIcon(run.weather_data!.temperature)}
                        <span className="ml-2">
                          {Math.round(run.weather_data!.temperature)}°C, {Math.round(run.weather_data!.humidity)}%
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {formatPace(adjustedPace.originalPace)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {formatPace(adjustedPace.adjustedPace)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      <span className={`font-medium ${getImpactColor(weatherImpact)}`}>
                        {weatherImpact > 0 ? '+' : ''}{weatherImpact.toFixed(1)}s/km
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      {psi ? (
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getPSIColor(psi.psiScore)}`}>
                          {psi.psiScore.toFixed(1)}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Environmental Tips */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center mb-3">
            <AlertTriangle className="w-5 h-5 text-blue-600 mr-2" />
            <h4 className="font-medium text-blue-800">Environmental Training Tips</h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-700">
            <div>
              <div className="font-medium mb-1">Hot Weather (&gt;25°C):</div>
              <ul className="space-y-1 text-blue-600">
                <li>• Start hydrating 2-3 hours before running</li>
                <li>• Run during cooler parts of the day</li>
                <li>• Reduce pace by 10-20 seconds per km</li>
              </ul>
            </div>
            <div>
              <div className="font-medium mb-1">Cold Weather (&lt;5°C):</div>
              <ul className="space-y-1 text-blue-600">
                <li>• Warm up indoors before heading out</li>
                <li>• Layer clothing for temperature regulation</li>
                <li>• Start slower and gradually increase pace</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnvironmentalAnalysis;