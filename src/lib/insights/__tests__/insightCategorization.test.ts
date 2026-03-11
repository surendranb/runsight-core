import { 
  categorizeInsight, 
  categorizeInsights, 
  getInsightsForTab,
  getPerformanceInsights,
  getTrainingInsights,
  getEnvironmentInsights,
  validateInsightCategorization
} from '../insightCategorization';
import { ActionableInsight } from '../../../components/insights/ActionableInsightCard';

// Mock insights for testing
const mockInsights: ActionableInsight[] = [
  {
    id: 'pace_trend',
    title: 'Pace Improvement Detected',
    category: 'performance',
    priority: 'high',
    finding: 'Your pace has improved by 5%',
    interpretation: 'This indicates improving fitness',
    recommendation: 'Keep up the great work',
    confidence: 0.8,
    sampleSize: 10,
    dataQuality: 'high',
    actionable: true,
    difficulty: 'easy',
    timeframe: 'short-term',
    data: {}
  },
  {
    id: 'running_frequency',
    title: 'Running Frequency Analysis',
    category: 'consistency',
    priority: 'medium',
    finding: 'You run 3 times per week',
    interpretation: 'Good foundation for fitness',
    recommendation: 'Consider adding one more run',
    confidence: 0.9,
    sampleSize: 15,
    dataQuality: 'high',
    actionable: true,
    difficulty: 'moderate',
    timeframe: 'short-term',
    data: {}
  },
  {
    id: 'weather_performance',
    title: 'Weather Performance Pattern',
    category: 'performance',
    priority: 'medium',
    finding: 'You run slower in warm weather',
    interpretation: 'Normal physiological response',
    recommendation: 'Run during cooler parts of day',
    confidence: 0.75,
    sampleSize: 20,
    dataQuality: 'high',
    actionable: true,
    difficulty: 'easy',
    timeframe: 'immediate',
    data: {}
  },
  {
    id: 'recovery_patterns',
    title: 'Recovery Pattern Analysis',
    category: 'health',
    priority: 'high',
    finding: 'You run on consecutive days frequently',
    interpretation: 'May increase injury risk',
    recommendation: 'Add rest days between efforts',
    confidence: 0.7,
    sampleSize: 12,
    dataQuality: 'medium',
    actionable: true,
    difficulty: 'moderate',
    timeframe: 'immediate',
    data: {}
  },
  {
    id: 'personal_records',
    title: 'Recent Personal Record',
    category: 'achievement',
    priority: 'medium',
    finding: 'You set a pace PR recently',
    interpretation: 'Great motivation booster',
    recommendation: 'Celebrate and build on success',
    confidence: 0.95,
    sampleSize: 8,
    dataQuality: 'high',
    actionable: true,
    difficulty: 'easy',
    timeframe: 'immediate',
    data: {}
  }
];

describe('insightCategorization', () => {
  describe('categorizeInsight', () => {
    it('should categorize performance insights correctly', () => {
      const paceInsight = mockInsights.find(i => i.id === 'pace_trend')!;
      expect(categorizeInsight(paceInsight)).toBe('performance');
    });

    it('should categorize achievement insights as performance', () => {
      const achievementInsight = mockInsights.find(i => i.id === 'personal_records')!;
      expect(categorizeInsight(achievementInsight)).toBe('performance');
    });

    it('should categorize consistency insights as training', () => {
      const consistencyInsight = mockInsights.find(i => i.id === 'running_frequency')!;
      expect(categorizeInsight(consistencyInsight)).toBe('training');
    });

    it('should categorize health insights as training', () => {
      const healthInsight = mockInsights.find(i => i.id === 'recovery_patterns')!;
      expect(categorizeInsight(healthInsight)).toBe('training');
    });

    it('should categorize weather insights as environment', () => {
      const weatherInsight = mockInsights.find(i => i.id === 'weather_performance')!;
      expect(categorizeInsight(weatherInsight)).toBe('environment');
    });

    it('should handle unknown categories', () => {
      const unknownInsight: ActionableInsight = {
        ...mockInsights[0],
        id: 'unknown_insight',
        category: 'unknown'
      };
      expect(categorizeInsight(unknownInsight)).toBe('uncategorized');
    });
  });

  describe('categorizeInsights', () => {
    it('should categorize all insights correctly', () => {
      const result = categorizeInsights(mockInsights);
      
      expect(result.performance).toHaveLength(2); // pace_trend, personal_records
      expect(result.training).toHaveLength(2); // running_frequency, recovery_patterns
      expect(result.environment).toHaveLength(1); // weather_performance
      expect(result.uncategorized).toHaveLength(0);
    });

    it('should handle empty insights array', () => {
      const result = categorizeInsights([]);
      
      expect(result.performance).toHaveLength(0);
      expect(result.training).toHaveLength(0);
      expect(result.environment).toHaveLength(0);
      expect(result.uncategorized).toHaveLength(0);
    });
  });

  describe('getInsightsForTab', () => {
    it('should return performance insights', () => {
      const result = getInsightsForTab(mockInsights, 'performance');
      expect(result).toHaveLength(2);
      expect(result.map(i => i.id)).toContain('pace_trend');
      expect(result.map(i => i.id)).toContain('personal_records');
    });

    it('should return training insights', () => {
      const result = getInsightsForTab(mockInsights, 'training');
      expect(result).toHaveLength(2);
      expect(result.map(i => i.id)).toContain('running_frequency');
      expect(result.map(i => i.id)).toContain('recovery_patterns');
    });

    it('should return environment insights', () => {
      const result = getInsightsForTab(mockInsights, 'environment');
      expect(result).toHaveLength(1);
      expect(result.map(i => i.id)).toContain('weather_performance');
    });
  });

  describe('helper functions', () => {
    it('getPerformanceInsights should return performance insights', () => {
      const result = getPerformanceInsights(mockInsights);
      expect(result).toHaveLength(2);
    });

    it('getTrainingInsights should return training insights', () => {
      const result = getTrainingInsights(mockInsights);
      expect(result).toHaveLength(2);
    });

    it('getEnvironmentInsights should return environment insights', () => {
      const result = getEnvironmentInsights(mockInsights);
      expect(result).toHaveLength(1);
    });
  });

  describe('validateInsightCategorization', () => {
    it('should provide correct validation statistics', () => {
      const result = validateInsightCategorization(mockInsights);
      
      expect(result.totalInsights).toBe(5);
      expect(result.categorizedInsights).toBe(5);
      expect(result.uncategorizedInsights).toBe(0);
      expect(result.categoryBreakdown.performance).toBe(2);
      expect(result.categoryBreakdown.training).toBe(2);
      expect(result.categoryBreakdown.environment).toBe(1);
    });
  });
});