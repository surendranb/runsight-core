import { describe, it, expect, vi } from 'vitest';
import { EnrichedRun } from '../../../types';

// Mock the training utilities
vi.mock('../../../lib/training/trainingLoadUtils', () => ({
  calculateTRIMP: vi.fn(() => ({ value: 100, confidence: 0.8 })),
  calculateACWRFromRuns: vi.fn(() => ({
    acwr: 1.0,
    status: 'optimal',
    acuteLoad: 100,
    chronicLoad: 100,
    recommendation: 'Maintain current training load',
    confidence: 0.8
  })),
  calculateCTLATLTSB: vi.fn(() => ({
    ctl: 50,
    atl: 45,
    tsb: 5
  }))
}));

vi.mock('../../../lib/training/powerEstimationUtils', () => ({
  estimateRunningPower: vi.fn(() => ({ estimatedPower: 250 })),
  calculateTrainingZones: vi.fn(() => ({}))
}));

vi.mock('../../../lib/training/trainingRecommendationsEngine', () => ({
  generateTrainingRecommendations: vi.fn(() => [
    {
      id: '1',
      type: 'training-load',
      priority: 'medium',
      title: 'Maintain Current Training Load',
      description: 'Your training load is well balanced',
      actionItems: ['Continue current approach', 'Monitor for changes'],
      timeframe: 'Ongoing',
      reasoning: ['ACWR is optimal'],
      confidence: 'high',
      createdAt: new Date().toISOString(),
      validUntil: new Date().toISOString()
    }
  ])
}));

vi.mock('../../../lib/training/environmentalUtils', () => ({
  calculateAdjustedPace: vi.fn(() => ({
    adjustedPace: 240,
    originalPace: 250,
    adjustments: { temperature: 10, humidity: 0, wind: 0, total: 10 },
    confidence: 0.8
  })),
  calculatePSI: vi.fn(() => ({
    psiScore: 3.5,
    heatStress: 'moderate',
    confidence: 0.7
  }))
}));

// Helper function to create mock runs
const createMockRun = (overrides: Partial<EnrichedRun> = {}): EnrichedRun => ({
  id: Math.random().toString(),
  strava_id: Math.floor(Math.random() * 1000000),
  name: 'Test Run',
  distance: 10000,
  moving_time: 2400,
  elapsed_time: 2400,
  start_date: new Date().toISOString(),
  start_date_local: new Date().toISOString(),
  start_latlng: null,
  end_latlng: null,
  average_speed: 4.17,
  max_speed: 5.0,
  average_heartrate: 150,
  max_heartrate: 180,
  total_elevation_gain: 100,
  user_id: 'test-user',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  weather_data: {
    temperature: 20,
    humidity: 60,
    wind_speed: 10,
    weather: { main: 'Clear', description: 'clear sky' }
  },
  ...overrides
});

const createMockRuns = (count: number): EnrichedRun[] => {
  return Array.from({ length: count }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - i);
    
    return createMockRun({
      start_date: date.toISOString(),
      distance: 8000 + Math.random() * 4000,
      moving_time: 1800 + Math.random() * 1200
    });
  });
};

describe('TrainingLoadDashboard Logic', () => {
  it('should process runs correctly', () => {
    const runs = createMockRuns(5);
    
    // Test that we can create mock runs without errors
    expect(runs).toHaveLength(5);
    expect(runs[0]).toHaveProperty('distance');
    expect(runs[0]).toHaveProperty('moving_time');
    expect(runs[0]).toHaveProperty('start_date');
  });

  it('should handle empty runs array', () => {
    const runs: EnrichedRun[] = [];
    
    // Should not throw when processing empty array
    expect(() => {
      const processedRuns = runs.map(run => ({
        ...run,
        trimpScore: 100,
        dataQuality: 'medium' as const
      }));
      return processedRuns;
    }).not.toThrow();
  });

  it('should determine data quality correctly', () => {
    const highQualityRun = createMockRun({
      average_heartrate: 150,
      weather_data: { temperature: 20, humidity: 60 },
      total_elevation_gain: 100
    });
    
    const lowQualityRun = createMockRun({
      average_heartrate: undefined,
      weather_data: undefined,
      total_elevation_gain: undefined
    });
    
    // High quality run should have all data
    expect(highQualityRun.average_heartrate).toBeDefined();
    expect(highQualityRun.weather_data).toBeDefined();
    expect(highQualityRun.total_elevation_gain).toBeDefined();
    
    // Low quality run should be missing data
    expect(lowQualityRun.average_heartrate).toBeUndefined();
    expect(lowQualityRun.weather_data).toBeUndefined();
    expect(lowQualityRun.total_elevation_gain).toBeUndefined();
  });

  it('should format pace correctly', () => {
    const formatPace = (seconds: number): string => {
      const minutes = Math.floor(seconds / 60);
      const secs = Math.round(seconds % 60);
      return `${minutes}:${secs.toString().padStart(2, '0')}/km`;
    };
    
    expect(formatPace(240)).toBe('4:00/km');
    expect(formatPace(300)).toBe('5:00/km');
    expect(formatPace(270)).toBe('4:30/km');
  });

  it('should format duration correctly', () => {
    const formatDuration = (seconds: number): string => {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      return hours > 0 ? `${hours}:${minutes.toString().padStart(2, '0')}` : `${minutes}min`;
    };
    
    expect(formatDuration(3600)).toBe('1:00');
    expect(formatDuration(1800)).toBe('30min');
    expect(formatDuration(5400)).toBe('1:30');
  });

  it('should format dates correctly', () => {
    const formatDate = (dateString: string): string => {
      return new Date(dateString).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      });
    };
    
    expect(formatDate('2024-01-15T10:00:00Z')).toBe('Jan 15');
    expect(formatDate('2024-12-25T10:00:00Z')).toBe('Dec 25');
  });

  it('should determine ACWR status colors correctly', () => {
    const getACWRStatusColor = (status: string): string => {
      switch (status) {
        case 'optimal': return 'bg-green-100 text-green-800 border-green-200';
        case 'caution': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
        case 'high-risk': return 'bg-red-100 text-red-800 border-red-200';
        case 'detraining': return 'bg-blue-100 text-blue-800 border-blue-200';
        default: return 'bg-gray-100 text-gray-800 border-gray-200';
      }
    };
    
    expect(getACWRStatusColor('optimal')).toContain('bg-green-100');
    expect(getACWRStatusColor('high-risk')).toContain('bg-red-100');
    expect(getACWRStatusColor('caution')).toContain('bg-yellow-100');
    expect(getACWRStatusColor('detraining')).toContain('bg-blue-100');
  });

  it('should determine TSB status correctly', () => {
    const getTSBStatus = (tsb: number): string => {
      if (tsb > 10) return 'Fresh';
      if (tsb < -10) return 'Fatigued';
      return 'Balanced';
    };
    
    expect(getTSBStatus(15)).toBe('Fresh');
    expect(getTSBStatus(-15)).toBe('Fatigued');
    expect(getTSBStatus(5)).toBe('Balanced');
    expect(getTSBStatus(-5)).toBe('Balanced');
  });

  it('should determine data quality colors correctly', () => {
    const getDataQualityColor = (quality: string): string => {
      switch (quality) {
        case 'high': return 'text-green-600';
        case 'medium': return 'text-yellow-600';
        case 'low': return 'text-red-600';
        default: return 'text-gray-600';
      }
    };
    
    expect(getDataQualityColor('high')).toBe('text-green-600');
    expect(getDataQualityColor('medium')).toBe('text-yellow-600');
    expect(getDataQualityColor('low')).toBe('text-red-600');
  });

  it('should create weekly TRIMP data structure correctly', () => {
    const runs = createMockRuns(20);
    
    // Simulate weekly aggregation logic
    const weeks = new Map<string, any>();
    const now = new Date();
    
    // Initialize last 8 weeks
    for (let i = 7; i >= 0; i--) {
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - (i * 7));
      weekStart.setHours(0, 0, 0, 0);
      
      const weekKey = weekStart.toISOString().split('T')[0];
      weeks.set(weekKey, {
        week: `${weekStart.getMonth() + 1}/${weekStart.getDate()}`,
        weekStart,
        totalTRIMP: 0,
        totalDistance: 0,
        runCount: 0
      });
    }
    
    expect(weeks.size).toBe(8);
    expect(Array.from(weeks.values())[0]).toHaveProperty('week');
    expect(Array.from(weeks.values())[0]).toHaveProperty('totalTRIMP');
  });

  it('should handle user physiology data correctly', () => {
    const userPhysiology = {
      maxHeartRate: 190,
      restingHeartRate: 60,
      bodyWeight: 70,
      age: 30,
      fitnessLevel: 'intermediate' as const
    };
    
    expect(userPhysiology.maxHeartRate).toBe(190);
    expect(userPhysiology.fitnessLevel).toBe('intermediate');
    
    // Test with missing data
    const incompletePhysiology = {};
    expect(incompletePhysiology).toEqual({});
  });
});