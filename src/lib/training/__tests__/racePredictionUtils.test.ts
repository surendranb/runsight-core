// Advanced Race Prediction Models Tests
import {
  calculateAdvancedRacePrediction,
  createRaceStrategy,
  analyzeFitnessReadiness,
  getMultipleRacePredictions,
  formatRaceTime,
  formatPace,
  RacePrediction,
  RaceStrategy,
  FitnessBasedPrediction
} from '../racePredictionUtils';
import { EnrichedRun } from '../../../types';

// Mock data helpers
const createMockRun = (overrides: Partial<EnrichedRun> = {}): EnrichedRun => ({
  id: 'test-run-' + Math.random(),
  user_id: 'test-user',
  strava_id: Math.floor(Math.random() * 10000),
  name: 'Test Run',
  distance: 5000, // 5km
  moving_time: 1500, // 25 minutes (5:00/km pace)
  elapsed_time: 1500,
  start_date: new Date().toISOString(),
  start_date_local: new Date().toISOString(),
  average_speed: 3.33, // m/s (5:00/km)
  average_heartrate: 150,
  total_elevation_gain: 50,
  ...overrides
});

const createTrainingHistory = (weeks: number): EnrichedRun[] => {
  const runs: EnrichedRun[] = [];
  const baseDate = new Date();
  
  for (let week = 0; week < weeks; week++) {
    // 3-4 runs per week
    const runsThisWeek = 3 + (week % 2);
    
    for (let run = 0; run < runsThisWeek; run++) {
      const date = new Date(baseDate);
      date.setDate(date.getDate() - (week * 7) - run);
      
      // Vary run types and distances
      let distance = 5000; // Base 5km
      let pace = 300; // Base 5:00/km
      let heartRate = 150;
      
      if (run === 0) {
        // Long run
        distance = 10000 + (week * 500); // Progressive long runs
        pace = 320; // Slower long run pace
        heartRate = 145;
      } else if (run === 1) {
        // Tempo run
        distance = 6000;
        pace = 280; // Faster tempo pace
        heartRate = 165;
      } else {
        // Easy run
        distance = 4000 + (run * 1000);
        pace = 330; // Easy pace
        heartRate = 140;
      }
      
      // Add some fitness progression over time
      const fitnessImprovement = Math.max(0, (weeks - week) * 2); // Getting fitter over time
      pace -= fitnessImprovement;
      heartRate -= fitnessImprovement * 0.5;
      
      const movingTime = (distance / 1000) * pace;
      
      runs.push(createMockRun({
        start_date: date.toISOString(),
        distance,
        moving_time: movingTime,
        average_speed: distance / movingTime,
        average_heartrate: Math.round(heartRate),
        total_elevation_gain: 20 + (run * 10)
      }));
    }
  }
  
  return runs.sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime());
};

describe('Advanced Race Prediction Models', () => {
  describe('calculateAdvancedRacePrediction', () => {
    it('should create minimal prediction with insufficient data', () => {
      const runs = createTrainingHistory(1); // Only 1 week of data
      const prediction = calculateAdvancedRacePrediction(runs, 5000);
      
      expect(prediction.distance).toBe(5000);
      expect(prediction.distanceName).toBe('5K');
      expect(prediction.predictedTime).toBeGreaterThan(0);
      expect(prediction.confidence).toBeLessThan(0.5);
      expect(prediction.basedOn.recentPerformance).toBe(false);
      expect(prediction.recommendations.length).toBeGreaterThan(0);
      expect(prediction.recommendations[0]).toContain('Limited training data');
    });

    it('should create comprehensive prediction with sufficient data', () => {
      const runs = createTrainingHistory(12); // 12 weeks of data
      const prediction = calculateAdvancedRacePrediction(runs, 10000);
      
      expect(prediction.distance).toBe(10000);
      expect(prediction.distanceName).toBe('10K');
      expect(prediction.predictedTime).toBeGreaterThan(0);
      expect(prediction.predictedPace).toBeGreaterThan(0);
      expect(prediction.confidence).toBeGreaterThan(0.5);
      expect(prediction.basedOn.recentPerformance).toBe(true);
      expect(prediction.basedOn.trainingLoad).toBe(true);
      expect(prediction.confidenceInterval.optimistic).toBeLessThan(prediction.confidenceInterval.realistic);
      expect(prediction.confidenceInterval.realistic).toBeLessThan(prediction.confidenceInterval.conservative);
    });

    it('should apply environmental adjustments when provided', () => {
      const runs = createTrainingHistory(8);
      const hotConditions = {
        temperature: 30, // Hot
        humidity: 80, // High humidity
        elevationGain: 200 // Hilly
      };
      
      const prediction = calculateAdvancedRacePrediction(runs, 10000, hotConditions);
      
      expect(prediction.environmentalAdjustments).toBeDefined();
      expect(prediction.environmentalAdjustments!.temperature).toBe(30);
      expect(prediction.environmentalAdjustments!.humidity).toBe(80);
      expect(prediction.environmentalAdjustments!.elevation).toBe(200);
      expect(prediction.environmentalAdjustments!.paceAdjustment).toBeGreaterThan(0);
      expect(prediction.basedOn.environmentalFactors).toBe(true);
    });

    it('should handle different race distances correctly', () => {
      const runs = createTrainingHistory(10);
      
      const fiveK = calculateAdvancedRacePrediction(runs, 5000);
      const tenK = calculateAdvancedRacePrediction(runs, 10000);
      const halfMarathon = calculateAdvancedRacePrediction(runs, 21097);
      const marathon = calculateAdvancedRacePrediction(runs, 42195);
      
      expect(fiveK.distanceName).toBe('5K');
      expect(tenK.distanceName).toBe('10K');
      expect(halfMarathon.distanceName).toBe('Half Marathon');
      expect(marathon.distanceName).toBe('Marathon');
      
      // All predictions should be reasonable (between 3:00/km and 8:00/km)
      [fiveK, tenK, halfMarathon, marathon].forEach(prediction => {
        expect(prediction.predictedPace).toBeGreaterThan(180); // Faster than 3:00/km
        expect(prediction.predictedPace).toBeLessThan(480); // Slower than 8:00/km
        expect(prediction.predictedTime).toBeGreaterThan(0);
        expect(prediction.confidence).toBeGreaterThan(0);
      });
    });

    it('should generate appropriate recommendations based on training status', () => {
      const runs = createTrainingHistory(6);
      const prediction = calculateAdvancedRacePrediction(runs, 10000);
      
      expect(prediction.recommendations.length).toBeGreaterThan(0);
      expect(prediction.recommendations.some(rec => 
        rec.includes('training') || rec.includes('fitness') || rec.includes('pace')
      )).toBe(true);
    });

    it('should calculate confidence intervals correctly', () => {
      const runs = createTrainingHistory(8);
      const prediction = calculateAdvancedRacePrediction(runs, 5000);
      
      const { optimistic, realistic, conservative } = prediction.confidenceInterval;
      
      expect(optimistic).toBeLessThan(realistic);
      expect(realistic).toBeLessThan(conservative);
      expect(conservative - optimistic).toBeGreaterThan(0); // Should have meaningful range
      expect((conservative - optimistic) / realistic).toBeLessThan(0.3); // Range shouldn't be too wide
    });
  });

  describe('createRaceStrategy', () => {
    let prediction: RacePrediction;

    beforeEach(() => {
      const runs = createTrainingHistory(8);
      prediction = calculateAdvancedRacePrediction(runs, 10000);
    });

    it('should create comprehensive race strategy', () => {
      const strategy = createRaceStrategy(prediction);
      
      expect(strategy.distance).toBe(prediction.distance);
      expect(strategy.targetPace).toBeGreaterThan(0);
      expect(strategy.paceStrategy.firstQuarter).toBeDefined();
      expect(strategy.paceStrategy.secondQuarter).toBeDefined();
      expect(strategy.paceStrategy.thirdQuarter).toBeDefined();
      expect(strategy.paceStrategy.finalQuarter).toBeDefined();
      expect(strategy.fuelStrategy.length).toBeGreaterThan(0);
      expect(strategy.hydrationStrategy.length).toBeGreaterThan(0);
      expect(strategy.pacingAdvice.length).toBeGreaterThan(0);
    });

    it('should adjust strategy based on risk tolerance', () => {
      const conservativeStrategy = createRaceStrategy(prediction, {
        riskTolerance: 'conservative',
        experienceLevel: 'beginner'
      });
      
      const aggressiveStrategy = createRaceStrategy(prediction, {
        riskTolerance: 'aggressive',
        experienceLevel: 'advanced'
      });
      
      expect(conservativeStrategy.targetPace).toBeGreaterThan(aggressiveStrategy.targetPace);
      expect(conservativeStrategy.riskFactors.length).toBeGreaterThanOrEqual(aggressiveStrategy.riskFactors.length);
    });

    it('should create different strategies for different distances', () => {
      const runs = createTrainingHistory(8);
      const fiveKPrediction = calculateAdvancedRacePrediction(runs, 5000);
      const marathonPrediction = calculateAdvancedRacePrediction(runs, 42195);
      
      const fiveKStrategy = createRaceStrategy(fiveKPrediction);
      const marathonStrategy = createRaceStrategy(marathonPrediction);
      
      // 5K should have more aggressive pacing
      expect(fiveKStrategy.paceStrategy.firstQuarter.pace).toBeLessThan(fiveKStrategy.targetPace);
      
      // Marathon should have conservative start
      expect(marathonStrategy.paceStrategy.firstQuarter.pace).toBeGreaterThan(marathonStrategy.targetPace);
      
      // Different fueling strategies
      expect(fiveKStrategy.fuelStrategy[0]).toContain('No fueling needed');
      expect(marathonStrategy.fuelStrategy.some(advice => advice.includes('60-90g carbs'))).toBe(true);
    });

    it('should adapt hydration strategy to environmental conditions', () => {
      const runs = createTrainingHistory(8);
      const hotRacePrediction = calculateAdvancedRacePrediction(runs, 21097, {
        temperature: 28,
        humidity: 85
      });
      
      const hotStrategy = createRaceStrategy(hotRacePrediction);
      
      expect(hotStrategy.hydrationStrategy.some(advice => 
        advice.includes('environmental conditions') || advice.includes('electrolyte')
      )).toBe(true);
    });
  });

  describe('analyzeFitnessReadiness', () => {
    it('should analyze fitness with insufficient data', () => {
      const runs = createTrainingHistory(2);
      const fitness = analyzeFitnessReadiness(runs);
      
      expect(fitness.currentFitnessLevel).toBe('building');
      expect(fitness.fitnessScore).toBeLessThan(50);
      expect(fitness.readinessScore).toBeLessThan(50);
      expect(fitness.peakingAdvice[0]).toContain('Need more training data');
    });

    it('should analyze fitness with comprehensive data', () => {
      const runs = createTrainingHistory(12);
      const fitness = analyzeFitnessReadiness(runs);
      
      expect(fitness.currentFitnessLevel).toMatch(/^(peak|good|moderate|building|detrained)$/);
      expect(fitness.fitnessScore).toBeGreaterThanOrEqual(0);
      expect(fitness.fitnessScore).toBeLessThanOrEqual(100);
      expect(fitness.fatigueLevel).toMatch(/^(fresh|moderate|high|overreached)$/);
      expect(fitness.trainingLoadStatus).toMatch(/^(optimal|high|low|risky)$/);
      expect(fitness.readinessScore).toBeGreaterThanOrEqual(0);
      expect(fitness.readinessScore).toBeLessThanOrEqual(100);
      expect(fitness.peakingAdvice.length).toBeGreaterThan(0);
    });

    it('should identify peak fitness correctly', () => {
      // Create high-volume, progressive training
      const runs: EnrichedRun[] = [];
      const baseDate = new Date();
      
      // 12 weeks of progressive training
      for (let week = 0; week < 12; week++) {
        const weeklyDistance = 40000 + (week * 2000); // Progressive volume
        const runsThisWeek = 5;
        
        for (let run = 0; run < runsThisWeek; run++) {
          const date = new Date(baseDate);
          date.setDate(date.getDate() - (week * 7) - run);
          
          const distance = weeklyDistance / runsThisWeek;
          const pace = 290 - (week * 2); // Getting faster over time
          const movingTime = (distance / 1000) * pace;
          
          runs.push(createMockRun({
            start_date: date.toISOString(),
            distance,
            moving_time: movingTime,
            average_speed: distance / movingTime,
            average_heartrate: 155
          }));
        }
      }
      
      const fitness = analyzeFitnessReadiness(runs);
      
      expect(fitness.currentFitnessLevel).toMatch(/^(peak|good)$/);
      expect(fitness.fitnessScore).toBeGreaterThan(60);
    });

    it('should identify overreaching correctly', () => {
      // Create high-volume training with recent spike
      const runs: EnrichedRun[] = [];
      const baseDate = new Date();
      
      // Recent high volume
      for (let day = 0; day < 14; day++) {
        const date = new Date(baseDate);
        date.setDate(date.getDate() - day);
        
        runs.push(createMockRun({
          start_date: date.toISOString(),
          distance: 15000, // Very high daily volume
          moving_time: 4500, // 5:00/km pace
          average_heartrate: 160
        }));
      }
      
      const fitness = analyzeFitnessReadiness(runs);
      
      // Should provide valid fitness assessment
      expect(fitness.currentFitnessLevel).toMatch(/^(peak|good|moderate|building|detrained)$/);
      expect(fitness.fatigueLevel).toMatch(/^(fresh|moderate|high|overreached)$/);
      expect(fitness.trainingLoadStatus).toMatch(/^(optimal|high|low|risky)$/);
      expect(fitness.fitnessScore).toBeGreaterThanOrEqual(0);
      expect(fitness.fitnessScore).toBeLessThanOrEqual(100);
      expect(fitness.readinessScore).toBeGreaterThanOrEqual(0);
      expect(fitness.readinessScore).toBeLessThanOrEqual(100);
    });
  });

  describe('getMultipleRacePredictions', () => {
    it('should return predictions for all standard distances', () => {
      const runs = createTrainingHistory(8);
      const predictions = getMultipleRacePredictions(runs);
      
      expect(predictions).toHaveLength(4);
      expect(predictions[0].distanceName).toBe('5K');
      expect(predictions[1].distanceName).toBe('10K');
      expect(predictions[2].distanceName).toBe('Half Marathon');
      expect(predictions[3].distanceName).toBe('Marathon');
      
      // Verify all predictions are reasonable
      predictions.forEach(prediction => {
        expect(prediction.predictedPace).toBeGreaterThan(180); // Faster than 3:00/km
        expect(prediction.predictedPace).toBeLessThan(480); // Slower than 8:00/km
        expect(prediction.predictedTime).toBeGreaterThan(0);
        expect(prediction.confidence).toBeGreaterThan(0);
      });
    });

    it('should apply environmental conditions to all predictions', () => {
      const runs = createTrainingHistory(8);
      const conditions = { temperature: 25, humidity: 70 };
      const predictions = getMultipleRacePredictions(runs, conditions);
      
      predictions.forEach(prediction => {
        expect(prediction.environmentalAdjustments).toBeDefined();
        expect(prediction.environmentalAdjustments!.temperature).toBe(25);
        expect(prediction.environmentalAdjustments!.humidity).toBe(70);
      });
    });
  });

  describe('Utility Functions', () => {
    describe('formatRaceTime', () => {
      it('should format times correctly', () => {
        expect(formatRaceTime(1500)).toBe('25:00'); // 25 minutes
        expect(formatRaceTime(3661)).toBe('1:01:01'); // 1 hour, 1 minute, 1 second
        expect(formatRaceTime(7200)).toBe('2:00:00'); // 2 hours
        expect(formatRaceTime(125)).toBe('2:05'); // 2 minutes, 5 seconds
      });
    });

    describe('formatPace', () => {
      it('should format paces correctly', () => {
        expect(formatPace(300)).toBe('5:00/km'); // 5:00/km
        expect(formatPace(270)).toBe('4:30/km'); // 4:30/km
        expect(formatPace(330)).toBe('5:30/km'); // 5:30/km
        expect(formatPace(245)).toBe('4:05/km'); // 4:05/km
      });
    });
  });

  describe('Edge Cases and Data Quality', () => {
    it('should handle empty run history', () => {
      const prediction = calculateAdvancedRacePrediction([], 5000);
      
      expect(prediction.confidence).toBeLessThan(0.5);
      expect(prediction.basedOn.recentPerformance).toBe(false);
      expect(prediction.recommendations[0]).toContain('Limited training data');
    });

    it('should handle runs without heart rate data', () => {
      const runs = createTrainingHistory(6).map(run => ({
        ...run,
        average_heartrate: undefined
      }));
      
      const prediction = calculateAdvancedRacePrediction(runs, 10000);
      
      expect(prediction.predictedTime).toBeGreaterThan(0);
      expect(prediction.basedOn.currentVO2Max).toBeUndefined();
    });

    it('should handle extreme environmental conditions', () => {
      const runs = createTrainingHistory(6);
      const extremeConditions = {
        temperature: 40, // Very hot
        humidity: 95, // Very humid
        elevationGain: 1000 // Very hilly
      };
      
      const prediction = calculateAdvancedRacePrediction(runs, 10000, extremeConditions);
      
      expect(prediction.environmentalAdjustments!.paceAdjustment).toBeGreaterThan(20);
      expect(prediction.recommendations.some(rec => 
        rec.includes('Hot conditions') || rec.includes('humidity')
      )).toBe(true);
    });

    it('should provide reasonable predictions for all fitness levels', () => {
      // Test with different training volumes
      const lowVolumeRuns = createTrainingHistory(4);
      const highVolumeRuns = createTrainingHistory(16);
      
      const lowVolumePrediction = calculateAdvancedRacePrediction(lowVolumeRuns, 10000);
      const highVolumePrediction = calculateAdvancedRacePrediction(highVolumeRuns, 10000);
      
      expect(lowVolumePrediction.predictedTime).toBeGreaterThan(0);
      expect(highVolumePrediction.predictedTime).toBeGreaterThan(0);
      expect(lowVolumePrediction.confidence).toBeLessThan(highVolumePrediction.confidence);
    });

    it('should maintain consistency across multiple predictions', () => {
      const runs = createTrainingHistory(8);
      
      const prediction1 = calculateAdvancedRacePrediction(runs, 10000);
      const prediction2 = calculateAdvancedRacePrediction(runs, 10000);
      
      expect(prediction1.predictedTime).toBe(prediction2.predictedTime);
      expect(prediction1.confidence).toBe(prediction2.confidence);
    });

    it('should handle very recent runs correctly', () => {
      const runs = createTrainingHistory(8);
      
      // Add a run from today
      const today = new Date();
      runs.unshift(createMockRun({
        start_date: today.toISOString(),
        distance: 5000,
        moving_time: 1200, // Fast recent run
        average_heartrate: 170
      }));
      
      const prediction = calculateAdvancedRacePrediction(runs, 5000);
      
      expect(prediction.predictedTime).toBeGreaterThan(0);
      expect(prediction.basedOn.recentPerformance).toBe(true);
    });
  });
});