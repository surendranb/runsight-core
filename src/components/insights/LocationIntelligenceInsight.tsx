import React, { useState } from 'react';
import { MapPin, TrendingUp, Mountain, Award, BarChart3, Navigation } from 'lucide-react';
import { EnrichedRun } from '../../types';
import { 
  analyzeLocationPerformance, 
  LocationPerformance, 
  formatPace, 
  formatDistance 
} from '../../lib/insights/locationIntelligenceUtils';

interface LocationIntelligenceInsightProps {
  runs: EnrichedRun[];
}

export const LocationIntelligenceInsight: React.FC<LocationIntelligenceInsightProps> = ({ runs }) => {
  const [selectedTab, setSelectedTab] = useState<'performance' | 'elevation' | 'recommendations'>('performance');
  
  const locationAnalysis = analyzeLocationPerformance(runs);
  const { 
    topPerformingLocations, 
    locationsByDistance, 
    elevationAnalysis, 
    recommendations, 
    insights 
  } = locationAnalysis;

  if (insights.length === 1 && insights[0].includes('No location data')) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center mb-4">
          <MapPin className="w-6 h-6 text-blue-500 mr-2" />
          <h3 className="text-lg font-semibold text-gray-800">Location Intelligence</h3>
        </div>
        <div className="text-center py-8 text-gray-500">
          <Navigation className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>No location data available for analysis.</p>
          <p className="text-sm">GPS data is needed for location insights.</p>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'performance', label: 'Performance', icon: TrendingUp },
    { id: 'elevation', label: 'Elevation', icon: Mountain },
    { id: 'recommendations', label: 'Recommendations', icon: Award }
  ];

  const getPerformanceColor = (score: number) => {
    if (score >= 70) return 'text-green-600 bg-green-100';
    if (score >= 50) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <MapPin className="w-6 h-6 text-blue-500 mr-2" />
          <h3 className="text-lg font-semibold text-gray-800">Location Intelligence</h3>
        </div>
        
        <div className="flex bg-gray-100 rounded-lg p-1">
          {tabs.map(tab => {
            const IconComponent = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setSelectedTab(tab.id as any)}
                className={`flex items-center px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  selectedTab === tab.id
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <IconComponent className="w-4 h-4 mr-1" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Insights Summary */}
      {insights.length > 0 && (
        <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h4 className="font-medium text-blue-800 mb-2 flex items-center">
            <BarChart3 className="w-4 h-4 mr-2" />
            Key Insights
          </h4>
          <ul className="text-sm text-blue-700 space-y-1">
            {insights.map((insight, index) => (
              <li key={index} className="flex items-start">
                <span className="text-blue-500 mr-2">•</span>
                <span>{insight}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Tab Content */}
      {selectedTab === 'performance' && (
        <div className="space-y-6">
          {/* Top Performing Locations */}
          <div>
            <h4 className="font-medium text-gray-800 mb-3">Top Performing Locations</h4>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-3 font-medium text-gray-700">Location</th>
                    <th className="text-left py-2 px-3 font-medium text-gray-700">Runs</th>
                    <th className="text-left py-2 px-3 font-medium text-gray-700">Avg Pace</th>
                    <th className="text-left py-2 px-3 font-medium text-gray-700">Best Pace</th>
                    <th className="text-left py-2 px-3 font-medium text-gray-700">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {topPerformingLocations.slice(0, 8).map((location, index) => (
                    <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-2 px-3">
                        <div className="flex items-center">
                          <MapPin className="w-3 h-3 text-gray-400 mr-2" />
                          <span className="font-medium text-gray-900">{location.city}</span>
                          {location.state && (
                            <span className="text-gray-500 text-sm ml-1">, {location.state}</span>
                          )}
                        </div>
                      </td>
                      <td className="py-2 px-3 text-sm text-gray-600">{location.runCount}</td>
                      <td className="py-2 px-3 text-sm font-mono text-gray-900">
                        {formatPace(location.averagePace)}
                      </td>
                      <td className="py-2 px-3 text-sm font-mono text-green-600">
                        {formatPace(location.bestPace)}
                      </td>
                      <td className="py-2 px-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getPerformanceColor(location.performanceScore)}`}>
                          {location.performanceScore.toFixed(0)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Locations by Distance */}
          <div>
            <h4 className="font-medium text-gray-800 mb-3">Most Frequent Locations</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {locationsByDistance.slice(0, 6).map((location, index) => (
                <div key={index} className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-2">
                    <h5 className="font-medium text-gray-900">{location.city}</h5>
                    <span className="text-sm text-gray-500">{location.runCount} runs</span>
                  </div>
                  <div className="space-y-1 text-sm text-gray-600">
                    <div>Total: {formatDistance(location.totalDistance)}</div>
                    <div>Avg: {formatDistance(location.averageDistance)}</div>
                    <div>Pace: {formatPace(location.averagePace)}</div>
                  </div>
                  {location.weatherConditions.length > 0 && (
                    <div className="mt-2">
                      <div className="flex flex-wrap gap-1">
                        {location.weatherConditions.slice(0, 3).map((condition, idx) => (
                          <span key={idx} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                            {condition}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {selectedTab === 'elevation' && (
        <div className="space-y-6">
          {/* High Elevation Locations */}
          <div>
            <h4 className="font-medium text-gray-800 mb-3 flex items-center">
              <Mountain className="w-4 h-4 mr-2" />
              High Elevation Locations
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {elevationAnalysis.highElevationLocations.slice(0, 4).map((location, index) => (
                <div key={index} className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h5 className="font-medium text-gray-900">{location.city}</h5>
                    <span className="text-sm font-medium text-orange-600">
                      {location.elevationGain.toFixed(0)}m gain
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                    <div>
                      <div>Runs: {location.runCount}</div>
                      <div>Pace: {formatPace(location.averagePace)}</div>
                    </div>
                    <div>
                      <div>Distance: {formatDistance(location.totalDistance)}</div>
                      <div>Score: {location.performanceScore.toFixed(0)}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Low Elevation Locations */}
          <div>
            <h4 className="font-medium text-gray-800 mb-3">Flat Terrain Locations</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {elevationAnalysis.lowElevationLocations.slice(0, 4).map((location, index) => (
                <div key={index} className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h5 className="font-medium text-gray-900">{location.city}</h5>
                    <span className="text-sm font-medium text-green-600">
                      {location.elevationGain.toFixed(0)}m gain
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                    <div>
                      <div>Runs: {location.runCount}</div>
                      <div>Pace: {formatPace(location.averagePace)}</div>
                    </div>
                    <div>
                      <div>Distance: {formatDistance(location.totalDistance)}</div>
                      <div>Score: {location.performanceScore.toFixed(0)}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {selectedTab === 'recommendations' && (
        <div className="space-y-6">
          {/* Best for Speed */}
          <div>
            <h4 className="font-medium text-gray-800 mb-3 flex items-center">
              <Award className="w-4 h-4 mr-2 text-yellow-500" />
              Best Locations for Speed
            </h4>
            <div className="space-y-2">
              {recommendations.bestForSpeed.map((location, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                  <div>
                    <span className="font-medium text-gray-900">{location.city}</span>
                    <span className="text-gray-500 text-sm ml-2">({location.runCount} runs)</span>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-sm text-yellow-700">Best: {formatPace(location.bestPace)}</div>
                    <div className="font-mono text-xs text-gray-600">Avg: {formatPace(location.averagePace)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Best for Distance */}
          <div>
            <h4 className="font-medium text-gray-800 mb-3 flex items-center">
              <Award className="w-4 h-4 mr-2 text-blue-500" />
              Best Locations for Long Runs
            </h4>
            <div className="space-y-2">
              {recommendations.bestForDistance.map((location, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div>
                    <span className="font-medium text-gray-900">{location.city}</span>
                    <span className="text-gray-500 text-sm ml-2">({location.runCount} runs)</span>
                  </div>
                  <div className="text-right">
                    <div className="font-medium text-blue-700">Avg: {formatDistance(location.averageDistance)}</div>
                    <div className="text-xs text-gray-600">Total: {formatDistance(location.totalDistance)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Best for Consistency */}
          <div>
            <h4 className="font-medium text-gray-800 mb-3 flex items-center">
              <Award className="w-4 h-4 mr-2 text-green-500" />
              Most Consistent Locations
            </h4>
            <div className="space-y-2">
              {recommendations.bestForConsistency.map((location, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                  <div>
                    <span className="font-medium text-gray-900">{location.city}</span>
                    <span className="text-gray-500 text-sm ml-2">({location.runCount} runs)</span>
                  </div>
                  <div className="text-right">
                    <div className="font-medium text-green-700">Score: {location.performanceScore.toFixed(0)}</div>
                    <div className="text-xs text-gray-600">{formatPace(location.averagePace)} avg</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};