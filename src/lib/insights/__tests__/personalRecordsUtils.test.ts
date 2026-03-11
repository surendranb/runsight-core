import { describe, expect, it } from 'vitest';
import { EnrichedRun } from '../../../types';
import {
  ALL_DISTANCES,
  detectPersonalRecords,
  filterPRAnalysisByDistance,
  getCurrentPersonalRecord
} from '../personalRecordsUtils';

const createRun = (overrides: Partial<EnrichedRun>): EnrichedRun => ({
  id: crypto.randomUUID(),
  strava_id: Math.floor(Math.random() * 1000000),
  name: 'Test Run',
  distance: 5000,
  moving_time: 1500,
  elapsed_time: 1500,
  start_date: '2026-03-01T06:00:00.000Z',
  start_date_local: '2026-03-01T06:00:00.000Z',
  start_latlng: null,
  end_latlng: null,
  average_speed: 3.33,
  max_speed: 4.1,
  average_heartrate: 150,
  max_heartrate: 172,
  total_elevation_gain: 25,
  user_id: 'test-user',
  created_at: '2026-03-01T06:00:00.000Z',
  updated_at: '2026-03-01T06:00:00.000Z',
  weather_data: {
    temperature: 20,
    weather: { main: 'Clear', description: 'clear sky' }
  },
  city: 'Track',
  state: 'Test State',
  country: 'Test Country',
  ...overrides
});

describe('personalRecordsUtils', () => {
  it('filters PR analysis to the selected distance', () => {
    const runs: EnrichedRun[] = [
      createRun({
        name: '5K opener',
        distance: 5000,
        moving_time: 1500,
        start_date: '2026-02-20T06:00:00.000Z',
        start_date_local: '2026-02-20T06:00:00.000Z',
        city: 'Track',
        weather_data: { temperature: 20, weather: { main: 'Clear', description: 'clear sky' } }
      }),
      createRun({
        name: '5K breakthrough',
        distance: 5000,
        moving_time: 1380,
        start_date: '2026-02-25T06:00:00.000Z',
        start_date_local: '2026-02-25T06:00:00.000Z',
        city: 'Track',
        weather_data: { temperature: 22, weather: { main: 'Clear', description: 'clear sky' } }
      }),
      createRun({
        name: '10K benchmark',
        distance: 10000,
        moving_time: 3200,
        start_date: '2026-03-01T06:00:00.000Z',
        start_date_local: '2026-03-01T06:00:00.000Z',
        city: 'River Path',
        weather_data: { temperature: 24, weather: { main: 'Clouds', description: 'few clouds' } }
      })
    ];

    const analysis = detectPersonalRecords(runs);
    const filtered = filterPRAnalysisByDistance(analysis, '5K');

    expect(analysis.personalRecords).toHaveLength(3);
    expect(filtered.personalRecords).toHaveLength(2);
    expect(filtered.recentPRs).toHaveLength(2);
    expect(filtered.prProgression).toHaveLength(1);
    expect(filtered.prProgression[0].distance).toBe('5K');
    expect(filtered.prsByConditions.bestLocations).toEqual(['Track']);
    expect(filtered.prsByConditions.bestWeatherConditions).toEqual(['Clear']);
  });

  it('returns the fastest record in the current scope', () => {
    const runs: EnrichedRun[] = [
      createRun({
        name: '5K opener',
        distance: 5000,
        moving_time: 1500,
        start_date: '2026-02-20T06:00:00.000Z',
        start_date_local: '2026-02-20T06:00:00.000Z'
      }),
      createRun({
        name: '5K breakthrough',
        distance: 5000,
        moving_time: 1380,
        start_date: '2026-02-25T06:00:00.000Z',
        start_date_local: '2026-02-25T06:00:00.000Z'
      })
    ];

    const analysis = detectPersonalRecords(runs);
    const filtered = filterPRAnalysisByDistance(analysis, '5K');
    const currentBest = getCurrentPersonalRecord(filtered.personalRecords);

    expect(getCurrentPersonalRecord(filterPRAnalysisByDistance(analysis, ALL_DISTANCES).personalRecords)?.time).toBe(1380);
    expect(currentBest?.time).toBe(1380);
    expect(currentBest?.distance).toBe('5K');
  });
});
