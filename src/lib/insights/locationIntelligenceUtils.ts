import { EnrichedRun } from '../../types';

export interface LocationPerformance {
  location: string;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  runCount: number;
  averagePace: number; // seconds per km
  bestPace: number;
  totalDistance: number;
  averageDistance: number;
  elevationGain: number;
  averageHeartRate?: number;
  weatherConditions: string[];
  performanceScore: number; // 0-100 relative to user's overall performance
}

export interface LocationAnalysis {
  topPerformingLocations: LocationPerformance[];
  locationsByDistance: LocationPerformance[];
  elevationAnalysis: {
    highElevationLocations: LocationPerformance[];
    lowElevationLocations: LocationPerformance[];
    elevationVsPace: Array<{ elevation: number; pace: number; location: string }>;
  };
  recommendations: {
    bestForSpeed: LocationPerformance[];
    bestForDistance: LocationPerformance[];
    bestForConsistency: LocationPerformance[];
  };
  insights: string[];
}

export const analyzeLocationPerformance = (runs: EnrichedRun[]): LocationAnalysis => {
  if (runs.length === 0) {
    return {
      topPerformingLocations: [],
      locationsByDistance: [],
      elevationAnalysis: {
        highElevationLocations: [],
        lowElevationLocations: [],
        elevationVsPace: []
      },
      recommendations: {
        bestForSpeed: [],
        bestForDistance: [],
        bestForConsistency: []
      },
      insights: []
    };
  }

  // Filter runs with location data
  const runsWithLocation = runs.filter(run => run.city && run.city !== null && run.city.trim() !== '');
  
  if (runsWithLocation.length === 0) {
    return {
      topPerformingLocations: [],
      locationsByDistance: [],
      elevationAnalysis: {
        highElevationLocations: [],
        lowElevationLocations: [],
        elevationVsPace: []
      },
      recommendations: {
        bestForSpeed: [],
        bestForDistance: [],
        bestForConsistency: []
      },
      insights: ['No location data available for analysis. GPS data is needed for location insights.']
    };
  }

  // Calculate overall user performance for comparison
  const overallAveragePace = calculateOverallAveragePace(runs);
  
  // Group runs by location
  const locationGroups = groupRunsByLocation(runsWithLocation);
  
  // Calculate performance metrics for each location
  const locationPerformances = calculateLocationPerformances(locationGroups, overallAveragePace);
  
  // Sort and analyze
  const topPerformingLocations = [...locationPerformances]
    .filter(loc => loc.runCount >= 2) // Need at least 2 runs for meaningful analysis
    .sort((a, b) => b.performanceScore - a.performanceScore)
    .slice(0, 10);

  const locationsByDistance = [...locationPerformances]
    .sort((a, b) => b.totalDistance - a.totalDistance)
    .slice(0, 10);

  // Elevation analysis
  const elevationAnalysis = analyzeElevationPerformance(locationPerformances, runsWithLocation);
  
  // Generate recommendations
  const recommendations = generateLocationRecommendations(locationPerformances);
  
  // Generate insights
  const insights = generateLocationInsights(locationPerformances, overallAveragePace);

  return {
    topPerformingLocations,
    locationsByDistance,
    elevationAnalysis,
    recommendations,
    insights
  };
};

const calculateOverallAveragePace = (runs: EnrichedRun[]): number => {
  const validRuns = runs.filter(run => run.distance > 0 && run.moving_time > 0);
  if (validRuns.length === 0) return 0;
  
  const totalTime = validRuns.reduce((sum, run) => sum + run.moving_time, 0);
  const totalDistance = validRuns.reduce((sum, run) => sum + run.distance, 0);
  
  return totalTime / (totalDistance / 1000); // seconds per km
};

const groupRunsByLocation = (runs: EnrichedRun[]): Map<string, EnrichedRun[]> => {
  const groups = new Map<string, EnrichedRun[]>();
  
  runs.forEach(run => {
    const locationKey = `${run.city}, ${run.state || run.country}`;
    if (!groups.has(locationKey)) {
      groups.set(locationKey, []);
    }
    groups.get(locationKey)!.push(run);
  });
  
  return groups;
};

const calculateLocationPerformances = (
  locationGroups: Map<string, EnrichedRun[]>, 
  overallAveragePace: number
): LocationPerformance[] => {
  const performances: LocationPerformance[] = [];
  
  locationGroups.forEach((runs, locationKey) => {
    const validRuns = runs.filter(run => run.distance > 0 && run.moving_time > 0);
    if (validRuns.length === 0) return;
    
    // Calculate metrics
    const totalDistance = validRuns.reduce((sum, run) => sum + run.distance, 0);
    const totalTime = validRuns.reduce((sum, run) => sum + run.moving_time, 0);
    const averagePace = totalTime / (totalDistance / 1000);
    const bestPace = Math.min(...validRuns.map(run => run.moving_time / (run.distance / 1000)));
    const averageDistance = totalDistance / validRuns.length;
    const elevationGain = validRuns.reduce((sum, run) => sum + (run.total_elevation_gain || 0), 0);
    
    // Heart rate (if available)
    const runsWithHR = validRuns.filter(run => run.average_heartrate);
    const averageHeartRate = runsWithHR.length > 0 
      ? runsWithHR.reduce((sum, run) => sum + run.average_heartrate!, 0) / runsWithHR.length
      : undefined;
    
    // Weather conditions
    const weatherConditions = Array.from(new Set(
      validRuns
        .map(run => (run.weather_data as any)?.weather?.main)
        .filter(condition => condition)
    ));
    
    // Performance score (relative to overall average)
    const performanceScore = overallAveragePace > 0 
      ? Math.max(0, Math.min(100, 100 - ((averagePace - overallAveragePace) / overallAveragePace) * 100))
      : 50;
    
    // Extract location details
    const firstRun = validRuns[0];
    
    performances.push({
      location: locationKey,
      city: firstRun.city,
      state: firstRun.state,
      country: firstRun.country,
      runCount: validRuns.length,
      averagePace,
      bestPace,
      totalDistance,
      averageDistance,
      elevationGain,
      averageHeartRate,
      weatherConditions,
      performanceScore
    });
  });
  
  return performances;
};

const analyzeElevationPerformance = (
  locationPerformances: LocationPerformance[], 
  runs: EnrichedRun[]
) => {
  // Get elevation data for runs
  const elevationData = runs
    .filter(run => run.total_elevation_gain !== undefined && run.total_elevation_gain > 0)
    .map(run => ({
      elevation: run.total_elevation_gain!,
      pace: run.moving_time / (run.distance / 1000),
      location: `${run.city}, ${run.state || run.country}`
    }));
  
  // Sort locations by elevation
  const sortedByElevation = [...locationPerformances]
    .filter(loc => loc.elevationGain > 0)
    .sort((a, b) => b.elevationGain - a.elevationGain);
  
  const highElevationLocations = sortedByElevation.slice(0, 5);
  const lowElevationLocations = sortedByElevation.slice(-5).reverse();
  
  return {
    highElevationLocations,
    lowElevationLocations,
    elevationVsPace: elevationData.slice(0, 20) // Limit for performance
  };
};

const generateLocationRecommendations = (locationPerformances: LocationPerformance[]) => {
  const validLocations = locationPerformances.filter(loc => loc.runCount >= 2);
  
  const bestForSpeed = [...validLocations]
    .sort((a, b) => a.bestPace - b.bestPace)
    .slice(0, 3);
  
  const bestForDistance = [...validLocations]
    .sort((a, b) => b.averageDistance - a.averageDistance)
    .slice(0, 3);
  
  const bestForConsistency = [...validLocations]
    .filter(loc => loc.runCount >= 3)
    .sort((a, b) => b.performanceScore - a.performanceScore)
    .slice(0, 3);
  
  return {
    bestForSpeed,
    bestForDistance,
    bestForConsistency
  };
};

const generateLocationInsights = (
  locationPerformances: LocationPerformance[], 
  overallAveragePace: number
): string[] => {
  const insights: string[] = [];
  
  if (locationPerformances.length === 0) return insights;
  
  // Best performing location
  const bestLocation = locationPerformances
    .filter(loc => loc.runCount >= 2)
    .sort((a, b) => b.performanceScore - a.performanceScore)[0];
  
  if (bestLocation) {
    const improvement = ((overallAveragePace - bestLocation.averagePace) / overallAveragePace) * 100;
    if (improvement > 5) {
      insights.push(`You perform ${improvement.toFixed(1)}% better in ${bestLocation.city} compared to your overall average`);
    }
  }
  
  // Most frequent location
  const mostFrequentLocation = locationPerformances
    .sort((a, b) => b.runCount - a.runCount)[0];
  
  if (mostFrequentLocation && mostFrequentLocation.runCount >= 5) {
    insights.push(`${mostFrequentLocation.city} is your most frequent running location with ${mostFrequentLocation.runCount} runs`);
  }
  
  // Elevation insights
  const highElevationLocs = locationPerformances.filter(loc => loc.elevationGain > 100);
  const lowElevationLocs = locationPerformances.filter(loc => loc.elevationGain < 50);
  
  if (highElevationLocs.length > 0 && lowElevationLocs.length > 0) {
    const highElevAvgPace = highElevationLocs.reduce((sum, loc) => sum + loc.averagePace, 0) / highElevationLocs.length;
    const lowElevAvgPace = lowElevationLocs.reduce((sum, loc) => sum + loc.averagePace, 0) / lowElevationLocs.length;
    
    const paceImpact = ((highElevAvgPace - lowElevAvgPace) / lowElevAvgPace) * 100;
    if (Math.abs(paceImpact) > 5) {
      insights.push(`Elevation affects your pace by ${Math.abs(paceImpact).toFixed(1)}% - you run ${paceImpact > 0 ? 'slower' : 'faster'} in hilly areas`);
    }
  }
  
  // Weather pattern insights
  const weatherPatterns = new Map<string, number>();
  locationPerformances.forEach(loc => {
    loc.weatherConditions.forEach(condition => {
      weatherPatterns.set(condition, (weatherPatterns.get(condition) || 0) + loc.runCount);
    });
  });
  
  const topWeatherCondition = Array.from(weatherPatterns.entries())
    .sort((a, b) => b[1] - a[1])[0];
  
  if (topWeatherCondition && topWeatherCondition[1] >= 5) {
    insights.push(`Most of your runs happen in ${topWeatherCondition[0].toLowerCase()} conditions`);
  }
  
  return insights;
};

export const formatPace = (paceSeconds: number): string => {
  const minutes = Math.floor(paceSeconds / 60);
  const seconds = Math.floor(paceSeconds % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}/km`;
};

export const formatDistance = (meters: number): string => {
  return `${(meters / 1000).toFixed(1)} km`;
};