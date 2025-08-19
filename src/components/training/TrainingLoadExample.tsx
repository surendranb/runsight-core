import React from 'react';
import TrainingLoadDashboard from './TrainingLoadDashboard';
import { EnrichedRun } from '../../types';

// Example component showing how to use the Training Load Dashboard
export const TrainingLoadExample: React.FC = () => {
  // Example runs data - in a real app, this would come from your data source
  const exampleRuns: EnrichedRun[] = [
    {
      id: '1',
      strava_id: 12345,
      name: 'Morning Run',
      distance: 10000, // 10km
      moving_time: 2400, // 40 minutes
      elapsed_time: 2400,
      start_date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      start_date_local: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      start_latlng: null,
      end_latlng: null,
      average_speed: 4.17,
      max_speed: 5.0,
      average_heartrate: 155,
      max_heartrate: 175,
      total_elevation_gain: 150,
      user_id: 'user-123',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      weather_data: {
        temperature: 22,
        humidity: 65,
        wind_speed: 8,
        weather: { main: 'Clear', description: 'clear sky' }
      }
    },
    {
      id: '2',
      strava_id: 12346,
      name: 'Easy Recovery Run',
      distance: 5000, // 5km
      moving_time: 1500, // 25 minutes
      elapsed_time: 1500,
      start_date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      start_date_local: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      start_latlng: null,
      end_latlng: null,
      average_speed: 3.33,
      max_speed: 4.0,
      average_heartrate: 140,
      max_heartrate: 160,
      total_elevation_gain: 50,
      user_id: 'user-123',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      weather_data: {
        temperature: 18,
        humidity: 55,
        wind_speed: 5,
        weather: { main: 'Clouds', description: 'few clouds' }
      }
    },
    {
      id: '3',
      strava_id: 12347,
      name: 'Tempo Run',
      distance: 8000, // 8km
      moving_time: 1920, // 32 minutes
      elapsed_time: 1920,
      start_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      start_date_local: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      start_latlng: null,
      end_latlng: null,
      average_speed: 4.17,
      max_speed: 5.5,
      average_heartrate: 165,
      max_heartrate: 185,
      total_elevation_gain: 100,
      user_id: 'user-123',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      weather_data: {
        temperature: 25,
        humidity: 70,
        wind_speed: 12,
        weather: { main: 'Clear', description: 'clear sky' }
      }
    }
  ];

  // Example user physiology data
  const userPhysiology = {
    maxHeartRate: 190,
    restingHeartRate: 55,
    bodyWeight: 72,
    age: 28,
    fitnessLevel: 'intermediate' as const
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Training Load Dashboard Example
        </h1>
        <p className="text-gray-600">
          This example shows how the Training Load Dashboard displays your training metrics,
          ACWR status, weekly trends, and personalized recommendations.
        </p>
      </div>

      <TrainingLoadDashboard 
        runs={exampleRuns}
        userPhysiology={userPhysiology}
        className="mb-8"
      />

      <div className="bg-gray-50 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Dashboard Features
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-medium text-gray-900 mb-2">Key Metrics</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• ACWR (Acute-to-Chronic Workload Ratio) status</li>
              <li>• Current fitness level (CTL)</li>
              <li>• Fatigue level (ATL)</li>
              <li>• Training form (TSB)</li>
            </ul>
          </div>
          <div>
            <h3 className="font-medium text-gray-900 mb-2">Advanced Analytics</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• TRIMP scores for training load quantification</li>
              <li>• Weather-adjusted pace calculations</li>
              <li>• Physiological Strain Index (PSI)</li>
              <li>• Running power estimates</li>
            </ul>
          </div>
          <div>
            <h3 className="font-medium text-gray-900 mb-2">Visualizations</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• 8-week training load trend chart</li>
              <li>• Recent runs table with all metrics</li>
              <li>• Data quality indicators</li>
              <li>• Visual status indicators</li>
            </ul>
          </div>
          <div>
            <h3 className="font-medium text-gray-900 mb-2">Smart Recommendations</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• ACWR-based training adjustments</li>
              <li>• Environmental condition guidance</li>
              <li>• Recovery strategy suggestions</li>
              <li>• Progressive training recommendations</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrainingLoadExample;