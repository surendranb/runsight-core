import { describe, it, expect } from 'vitest';
import {
  generateACWRRecommendations,
  generateEnvironmentalRecommendations,
  generateProgressionRecommendations,
  generateRecoveryRecommendations,
  generateTrainingRecommendations,
  filterRecommendations,
  type TrainingRecommendation,
  type RecommendationContext
} from '../trainingRecommendationsEngine';
import { EnrichedRun, ACWRResult } from '../../../types';

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
  ...overrides
});

const createMockACWR = (overrides: Partial<ACWRResult> = {}): ACWRResult => ({
  acwr: 1.0,
  status: 'optimal',
  acuteLoad: 100,
  chronicLoad: 100,
  recommendation: 'Maintain current training load',
  confidence: 0.8,
  ...overrides
});

const createMockContext = (overrides: Partial<RecommendationContext> = {}): RecommendationContext => ({
  acwr: createMockACWR(),
  recentTrainingLoad: {
    weeklyDistance: 50,
    weeklyTRIMP: 300,
    intensityDistribution: { zone1: 60, zone2: 25, zone3: 10, zone4: 4, zone5: 1 },
    restDays: 1
  },
  recentPerformance: {
    trend: 'stable',
    fatigueLevel: 'moderate',
    injuryRisk: 'low'
  },
  experienceLevel: 'intermediate',
  availableTime: 8,
  ...overrides
});

describe('Training Recommendations Engine', () => {
  describe('generateACWRRecommendations', () => {
    it('should generate high-risk recommendations', () => {
      const highRiskACWR = createMockACWR({
        acwr: 1.8,
        status: 'high-risk'
      });
      
      const trainingLoad = {
        weeklyDistance: 60,
        weeklyTRIMP: 400,
        intensityDistribution: { zone1: 50, zone2: 30, zone3: 15, zone4: 4, zone5: 1 },
        restDays: 0
      };
      
      const recommendations = generateACWRRecommendations(
        highRiskACWR,
        trainingLoad,
        'intermediate'
      );
      
      expect(recommendations).toHaveLength(1);
      expect(recommendations[0].priority).toBe('critical');
      expect(recommendations[0].title).toContain('High Injury Risk');
      expect(recommendations[0].actionItems.some(item => 
        item.includes('Reduce weekly distance')
      )).toBe(true);
      expect(recommendations[0].targetMetrics?.weeklyDistance?.max).toBeLessThan(60);
      expect(recommendations[0].targetMetrics?.intensityDistribution?.hard).toBe(0);
    });

    it('should generate caution recommendations', () => {
      const cautionACWR = createMockACWR({
        acwr: 1.2,
        status: 'caution'
      });
      
      const trainingLoad = {
        weeklyDistance: 50,
        weeklyTRIMP: 300,
        intensityDistribution: { zone1: 60, zone2: 25, zone3: 10, zone4: 4, zone5: 1 },
        restDays: 1
      };
      
      const recommendations = generateACWRRecommendations(
        cautionACWR,
        trainingLoad,
        'intermediate'
      );
      
      expect(recommendations).toHaveLength(1);
      expect(recommendations[0].priority).toBe('high');
      expect(recommendations[0].title).toContain('Monitor Training Load');
      expect(recommendations[0].actionItems.some(item => 
        item.includes('Maintain current weekly distance')
      )).toBe(true);
    });

    it('should generate detraining recommendations', () => {
      const detrainingACWR = createMockACWR({
        acwr: 0.6,
        status: 'detraining'
      });
      
      const trainingLoad = {
        weeklyDistance: 30,
        weeklyTRIMP: 200,
        intensityDistribution: { zone1: 80, zone2: 15, zone3: 5, zone4: 0, zone5: 0 },
        restDays: 2
      };
      
      const recommendations = generateACWRRecommendations(
        detrainingACWR,
        trainingLoad,
        'intermediate'
      );
      
      expect(recommendations).toHaveLength(1);
      expect(recommendations[0].type).toBe('progression');
      expect(recommendations[0].title).toContain('Increase Training Load');
      expect(recommendations[0].targetMetrics?.weeklyDistance?.min).toBeGreaterThan(30);
    });

    it('should generate optimal recommendations', () => {
      const optimalACWR = createMockACWR({
        acwr: 1.0,
        status: 'optimal'
      });
      
      const trainingLoad = {
        weeklyDistance: 50,
        weeklyTRIMP: 300,
        intensityDistribution: { zone1: 60, zone2: 25, zone3: 10, zone4: 4, zone5: 1 },
        restDays: 1
      };
      
      const recommendations = generateACWRRecommendations(
        optimalACWR,
        trainingLoad,
        'intermediate'
      );
      
      expect(recommendations).toHaveLength(1);
      expect(recommendations[0].priority).toBe('low');
      expect(recommendations[0].title).toContain('Maintain Current');
      expect(recommendations[0].actionItems.some(item => 
        item.includes('Maintain current')
      )).toBe(true);
    });

    it('should adjust recommendations based on experience level', () => {
      const detrainingACWR = createMockACWR({
        acwr: 0.6,
        status: 'detraining'
      });
      
      const trainingLoad = {
        weeklyDistance: 30,
        weeklyTRIMP: 200,
        intensityDistribution: { zone1: 80, zone2: 15, zone3: 5, zone4: 0, zone5: 0 },
        restDays: 2
      };
      
      const beginnerRecs = generateACWRRecommendations(detrainingACWR, trainingLoad, 'beginner');
      const advancedRecs = generateACWRRecommendations(detrainingACWR, trainingLoad, 'advanced');
      
      expect(beginnerRecs[0].actionItems.some(item => item.includes('10%'))).toBe(true);
      expect(advancedRecs[0].actionItems.some(item => item.includes('15%'))).toBe(true);
    });
  });

  describe('generateEnvironmentalRecommendations', () => {
    it('should generate hot weather recommendations', () => {
      const hotWeather = {
        temperature: 32,
        humidity: 60,
        windSpeed: 5,
        conditions: 'sunny'
      };
      
      const recommendations = generateEnvironmentalRecommendations(hotWeather, []);
      
      expect(recommendations.length).toBeGreaterThan(0);
      const hotWeatherRec = recommendations.find(r => r.title.includes('Hot Weather'));
      expect(hotWeatherRec).toBeDefined();
      expect(hotWeatherRec?.priority).toBe('high'); // >30°C
      expect(hotWeatherRec?.actionItems.some(item => 
        item.includes('Slow your pace')
      )).toBe(true);
      expect(hotWeatherRec?.environmentalGuidance?.paceAdjustments?.temperature).toBeGreaterThan(0);
    });

    it('should generate high humidity recommendations', () => {
      const humidWeather = {
        temperature: 22,
        humidity: 85,
        windSpeed: 3,
        conditions: 'humid'
      };
      
      const recommendations = generateEnvironmentalRecommendations(humidWeather, []);
      
      const humidityRec = recommendations.find(r => r.title.includes('Humidity'));
      expect(humidityRec).toBeDefined();
      expect(humidityRec?.actionItems.some(item => 
        item.includes('Reduce pace')
      )).toBe(true);
      expect(humidityRec?.environmentalGuidance?.hydrationStrategy?.toLowerCase()).toContain('increase');
    });

    it('should generate windy conditions recommendations', () => {
      const windyWeather = {
        temperature: 18,
        humidity: 50,
        windSpeed: 25,
        conditions: 'windy'
      };
      
      const recommendations = generateEnvironmentalRecommendations(windyWeather, []);
      
      const windyRec = recommendations.find(r => r.title.includes('Windy'));
      expect(windyRec).toBeDefined();
      expect(windyRec?.actionItems.some(item => 
        item.includes('out-and-back routes')
      )).toBe(true);
      expect(windyRec?.environmentalGuidance?.paceAdjustments?.wind).toBeGreaterThan(0);
    });

    it('should generate cold weather recommendations', () => {
      const coldWeather = {
        temperature: 2,
        humidity: 40,
        windSpeed: 10,
        conditions: 'cold'
      };
      
      const recommendations = generateEnvironmentalRecommendations(coldWeather, []);
      
      const coldRec = recommendations.find(r => r.title.includes('Cold Weather'));
      expect(coldRec).toBeDefined();
      expect(coldRec?.actionItems.some(item => 
        item.includes('layers')
      )).toBe(true);
      expect(coldRec?.actionItems.some(item => 
        item.includes('warm-up')
      )).toBe(true);
    });

    it('should return empty array when no weather data provided', () => {
      const recommendations = generateEnvironmentalRecommendations(undefined, []);
      expect(recommendations).toHaveLength(0);
    });

    it('should handle moderate conditions without recommendations', () => {
      const moderateWeather = {
        temperature: 18,
        humidity: 55,
        windSpeed: 8,
        conditions: 'partly cloudy'
      };
      
      const recommendations = generateEnvironmentalRecommendations(moderateWeather, []);
      expect(recommendations).toHaveLength(0);
    });
  });

  describe('generateProgressionRecommendations', () => {
    it('should generate volume progression recommendations', () => {
      const trainingLoad = {
        weeklyDistance: 30,
        weeklyTRIMP: 200,
        intensityDistribution: { zone1: 80, zone2: 15, zone3: 5, zone4: 0, zone5: 0 },
        restDays: 1
      };
      
      const performance = {
        trend: 'stable' as const,
        fatigueLevel: 'low' as const,
        injuryRisk: 'low' as const
      };
      
      const recommendations = generateProgressionRecommendations(
        trainingLoad,
        performance,
        'intermediate',
        10 // 10 hours available
      );
      
      const volumeRec = recommendations.find(r => r.title.includes('Volume'));
      expect(volumeRec).toBeDefined();
      expect(volumeRec?.targetMetrics?.weeklyDistance?.min).toBeGreaterThan(30);
      expect(volumeRec?.actionItems.some(item => 
        item.includes('Increase weekly distance')
      )).toBe(true);
    });

    it('should generate intensity progression recommendations', () => {
      const trainingLoad = {
        weeklyDistance: 50,
        weeklyTRIMP: 300,
        intensityDistribution: { zone1: 85, zone2: 12, zone3: 3, zone4: 0, zone5: 0 }, // Very low intensity
        restDays: 1
      };
      
      const performance = {
        trend: 'stable' as const,
        fatigueLevel: 'low' as const,
        injuryRisk: 'low' as const
      };
      
      const recommendations = generateProgressionRecommendations(
        trainingLoad,
        performance,
        'intermediate',
        8
      );
      
      const intensityRec = recommendations.find(r => r.title.includes('Intensity'));
      expect(intensityRec).toBeDefined();
      expect(intensityRec?.actionItems.some(item => 
        item.includes('tempo run') || item.includes('interval')
      )).toBe(true);
      expect(intensityRec?.targetMetrics?.intensityDistribution?.hard).toBeGreaterThan(0);
    });

    it('should not recommend progression for declining performance', () => {
      const trainingLoad = {
        weeklyDistance: 30,
        weeklyTRIMP: 200,
        intensityDistribution: { zone1: 80, zone2: 15, zone3: 5, zone4: 0, zone5: 0 },
        restDays: 1
      };
      
      const performance = {
        trend: 'declining' as const,
        fatigueLevel: 'high' as const,
        injuryRisk: 'moderate' as const
      };
      
      const recommendations = generateProgressionRecommendations(
        trainingLoad,
        performance,
        'intermediate',
        10
      );
      
      expect(recommendations).toHaveLength(0);
    });

    it('should adjust progression rates by experience level', () => {
      const trainingLoad = {
        weeklyDistance: 30,
        weeklyTRIMP: 200,
        intensityDistribution: { zone1: 80, zone2: 15, zone3: 5, zone4: 0, zone5: 0 },
        restDays: 1
      };
      
      const performance = {
        trend: 'stable' as const,
        fatigueLevel: 'low' as const,
        injuryRisk: 'low' as const
      };
      
      const beginnerRecs = generateProgressionRecommendations(trainingLoad, performance, 'beginner', 10);
      const advancedRecs = generateProgressionRecommendations(trainingLoad, performance, 'advanced', 10);
      
      if (beginnerRecs.length > 0 && advancedRecs.length > 0) {
        const beginnerIncrease = beginnerRecs[0].targetMetrics?.weeklyDistance?.min || 0;
        const advancedIncrease = advancedRecs[0].targetMetrics?.weeklyDistance?.min || 0;
        
        expect(advancedIncrease).toBeGreaterThanOrEqual(beginnerIncrease);
      }
    });
  });

  describe('generateRecoveryRecommendations', () => {
    it('should generate high fatigue recovery recommendations', () => {
      const performance = {
        trend: 'stable' as const,
        fatigueLevel: 'high' as const,
        injuryRisk: 'moderate' as const
      };
      
      const trainingLoad = {
        weeklyDistance: 60,
        weeklyTRIMP: 400,
        intensityDistribution: { zone1: 50, zone2: 30, zone3: 15, zone4: 4, zone5: 1 },
        restDays: 0
      };
      
      const recommendations = generateRecoveryRecommendations(performance, trainingLoad);
      
      const fatigueRec = recommendations.find(r => r.title.includes('Recovery Protocol'));
      expect(fatigueRec).toBeDefined();
      expect(fatigueRec?.priority).toBe('high');
      expect(fatigueRec?.actionItems.some(item => 
        item.includes('Reduce training intensity')
      )).toBe(true);
      expect(fatigueRec?.targetMetrics?.intensityDistribution?.easy).toBe(95);
    });

    it('should generate environmental stress recovery recommendations', () => {
      const performance = {
        trend: 'stable' as const,
        fatigueLevel: 'moderate' as const,
        injuryRisk: 'low' as const
      };
      
      const trainingLoad = {
        weeklyDistance: 50,
        weeklyTRIMP: 300,
        intensityDistribution: { zone1: 60, zone2: 25, zone3: 10, zone4: 4, zone5: 1 },
        restDays: 1
      };
      
      const hotWeather = {
        temperature: 35,
        humidity: 85,
        windSpeed: 5,
        conditions: 'hot and humid'
      };
      
      const recommendations = generateRecoveryRecommendations(performance, trainingLoad, hotWeather);
      
      const envStressRec = recommendations.find(r => r.title.includes('Environmental Stress'));
      expect(envStressRec).toBeDefined();
      expect(envStressRec?.actionItems.some(item => 
        item.includes('fluid intake')
      )).toBe(true);
      expect(envStressRec?.environmentalGuidance?.hydrationStrategy).toBeDefined();
    });

    it('should generate rest day recommendations', () => {
      const performance = {
        trend: 'stable' as const,
        fatigueLevel: 'moderate' as const,
        injuryRisk: 'low' as const
      };
      
      const trainingLoad = {
        weeklyDistance: 50,
        weeklyTRIMP: 300,
        intensityDistribution: { zone1: 60, zone2: 25, zone3: 10, zone4: 4, zone5: 1 },
        restDays: 0 // No rest days
      };
      
      const recommendations = generateRecoveryRecommendations(performance, trainingLoad);
      
      const restRec = recommendations.find(r => r.title.includes('Rest Days'));
      expect(restRec).toBeDefined();
      expect(restRec?.actionItems.some(item => 
        item.includes('1 complete rest day')
      )).toBe(true);
      expect(restRec?.targetMetrics?.restDays).toBe(1);
    });
  });

  describe('generateTrainingRecommendations', () => {
    it('should combine all recommendation types', () => {
      const runs = [createMockRun()];
      const context = createMockContext({
        upcomingWeather: {
          temperature: 30,
          humidity: 70,
          windSpeed: 5,
          conditions: 'hot'
        },
        recentPerformance: {
          trend: 'stable',
          fatigueLevel: 'low',
          injuryRisk: 'low'
        }
      });
      
      const recommendations = generateTrainingRecommendations(runs, context);
      
      expect(recommendations.length).toBeGreaterThan(1);
      
      // Should have ACWR recommendation
      expect(recommendations.some(r => r.type === 'training-load')).toBe(true);
      
      // Should have environmental recommendation
      expect(recommendations.some(r => r.type === 'environmental')).toBe(true);
      
      // Should have progression recommendation (low injury risk)
      expect(recommendations.some(r => r.type === 'progression')).toBe(true);
    });

    it('should prioritize recommendations correctly', () => {
      const runs = [createMockRun()];
      const context = createMockContext({
        acwr: createMockACWR({
          acwr: 1.8,
          status: 'high-risk'
        }),
        recentPerformance: {
          trend: 'declining',
          fatigueLevel: 'high',
          injuryRisk: 'high'
        }
      });
      
      const recommendations = generateTrainingRecommendations(runs, context);
      
      // First recommendation should be critical priority
      expect(recommendations[0].priority).toBe('critical');
      
      // Should not include progression recommendations due to high risk
      expect(recommendations.some(r => r.type === 'progression')).toBe(false);
    });

    it('should handle context without weather data', () => {
      const runs = [createMockRun()];
      const context = createMockContext({
        upcomingWeather: undefined
      });
      
      const recommendations = generateTrainingRecommendations(runs, context);
      
      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations.some(r => r.type === 'environmental')).toBe(false);
    });
  });

  describe('filterRecommendations', () => {
    const mockRecommendations: TrainingRecommendation[] = [
      {
        id: '1',
        type: 'training-load',
        priority: 'critical',
        title: 'Critical Rec',
        description: 'Critical',
        actionItems: [],
        timeframe: 'Immediate',
        reasoning: [],
        confidence: 'high',
        createdAt: new Date().toISOString(),
        validUntil: new Date().toISOString()
      },
      {
        id: '2',
        type: 'environmental',
        priority: 'high',
        title: 'High Rec',
        description: 'High',
        actionItems: [],
        timeframe: 'Next 1-2 days',
        reasoning: [],
        confidence: 'medium',
        createdAt: new Date().toISOString(),
        validUntil: new Date().toISOString()
      },
      {
        id: '3',
        type: 'progression',
        priority: 'medium',
        title: 'Medium Rec',
        description: 'Medium',
        actionItems: [],
        timeframe: 'Next 2-4 weeks',
        reasoning: [],
        confidence: 'low',
        createdAt: new Date().toISOString(),
        validUntil: new Date().toISOString()
      },
      {
        id: '4',
        type: 'recovery',
        priority: 'low',
        title: 'Low Rec',
        description: 'Low',
        actionItems: [],
        timeframe: 'Ongoing',
        reasoning: [],
        confidence: 'high',
        createdAt: new Date().toISOString(),
        validUntil: new Date().toISOString()
      }
    ];

    it('should filter by maximum number', () => {
      const filtered = filterRecommendations(mockRecommendations, {
        maxRecommendations: 2
      });
      
      expect(filtered).toHaveLength(2);
    });

    it('should filter by minimum priority', () => {
      const filtered = filterRecommendations(mockRecommendations, {
        minPriority: 'high'
      });
      
      expect(filtered).toHaveLength(2);
      expect(filtered.every(r => r.priority === 'critical' || r.priority === 'high')).toBe(true);
    });

    it('should exclude specific types', () => {
      const filtered = filterRecommendations(mockRecommendations, {
        excludeTypes: ['environmental', 'recovery']
      });
      
      expect(filtered).toHaveLength(2);
      expect(filtered.every(r => 
        r.type === 'training-load' || r.type === 'progression'
      )).toBe(true);
    });

    it('should filter by timeframe', () => {
      const filtered = filterRecommendations(mockRecommendations, {
        timeframe: 'immediate'
      });
      
      expect(filtered.length).toBeGreaterThan(0);
      expect(filtered.every(r => 
        r.timeframe.toLowerCase().includes('immediate') ||
        r.timeframe.toLowerCase().includes('next 1-2 days')
      )).toBe(true);
    });

    it('should combine multiple filters', () => {
      const filtered = filterRecommendations(mockRecommendations, {
        minPriority: 'medium',
        excludeTypes: ['recovery'],
        maxRecommendations: 2
      });
      
      expect(filtered.length).toBeLessThanOrEqual(2);
      expect(filtered.every(r => r.type !== 'recovery')).toBe(true);
      expect(filtered.every(r => 
        ['critical', 'high', 'medium'].includes(r.priority)
      )).toBe(true);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle empty runs array', () => {
      const context = createMockContext();
      const recommendations = generateTrainingRecommendations([], context);
      
      expect(recommendations.length).toBeGreaterThan(0);
    });

    it('should handle minimal context', () => {
      const minimalContext: RecommendationContext = {
        acwr: createMockACWR(),
        recentTrainingLoad: {
          weeklyDistance: 0,
          weeklyTRIMP: 0,
          intensityDistribution: { zone1: 100, zone2: 0, zone3: 0, zone4: 0, zone5: 0 },
          restDays: 7
        },
        recentPerformance: {
          trend: 'stable',
          fatigueLevel: 'low',
          injuryRisk: 'low'
        },
        experienceLevel: 'beginner',
        availableTime: 1
      };
      
      expect(() => generateTrainingRecommendations([], minimalContext)).not.toThrow();
    });

    it('should handle extreme weather conditions', () => {
      const extremeWeather = {
        temperature: 45,
        humidity: 95,
        windSpeed: 50,
        conditions: 'extreme'
      };
      
      const recommendations = generateEnvironmentalRecommendations(extremeWeather, []);
      
      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations.some(r => r.priority === 'high')).toBe(true);
    });

    it('should validate recommendation structure', () => {
      const context = createMockContext();
      const recommendations = generateTrainingRecommendations([], context);
      
      recommendations.forEach(rec => {
        expect(rec.id).toBeDefined();
        expect(rec.type).toBeDefined();
        expect(rec.priority).toBeOneOf(['critical', 'high', 'medium', 'low']);
        expect(rec.title).toBeDefined();
        expect(rec.description).toBeDefined();
        expect(rec.actionItems).toBeInstanceOf(Array);
        expect(rec.timeframe).toBeDefined();
        expect(rec.reasoning).toBeInstanceOf(Array);
        expect(rec.confidence).toBeOneOf(['high', 'medium', 'low']);
        expect(rec.createdAt).toBeDefined();
        expect(rec.validUntil).toBeDefined();
      });
    });
  });
});