import { EnrichedRun } from '../../types';

export interface PersonalRecord {
  distance: string;
  distanceMeters: number;
  time: number; // seconds
  pace: number; // seconds per km
  date: string;
  runId: string;
  runName: string;
  conditions?: {
    temperature?: number;
    weather?: string;
    location?: string;
  };
  isNewRecord?: boolean;
}

export interface PRAnalysis {
  personalRecords: PersonalRecord[];
  recentPRs: PersonalRecord[];
  prProgression: Array<{
    distance: string;
    records: PersonalRecord[];
  }>;
  prsByConditions: {
    bestWeatherConditions: string[];
    bestLocations: string[];
    temperatureRange: { min: number; max: number };
  };
}

// Standard race distances in meters
const STANDARD_DISTANCES = [
  { name: '1K', meters: 1000, tolerance: 50 },
  { name: '5K', meters: 5000, tolerance: 250 },
  { name: '10K', meters: 10000, tolerance: 500 },
  { name: '15K', meters: 15000, tolerance: 750 },
  { name: 'Half Marathon', meters: 21097, tolerance: 1000 },
  { name: 'Marathon', meters: 42195, tolerance: 2000 },
];

// Custom distance ranges for non-standard distances
const DISTANCE_RANGES = [
  { name: '2-3K', minMeters: 2000, maxMeters: 3000 },
  { name: '3-4K', minMeters: 3000, maxMeters: 4000 },
  { name: '6-8K', minMeters: 6000, maxMeters: 8000 },
  { name: '8-10K', minMeters: 8000, maxMeters: 10000 },
  { name: '12-15K', minMeters: 12000, maxMeters: 15000 },
  { name: '16-20K', minMeters: 16000, maxMeters: 20000 },
];

export const categorizeDistance = (distanceMeters: number): string => {
  // Check standard distances first
  for (const standard of STANDARD_DISTANCES) {
    if (Math.abs(distanceMeters - standard.meters) <= standard.tolerance) {
      return standard.name;
    }
  }
  
  // Check distance ranges
  for (const range of DISTANCE_RANGES) {
    if (distanceMeters >= range.minMeters && distanceMeters <= range.maxMeters) {
      return range.name;
    }
  }
  
  // For very long distances
  if (distanceMeters > 42195) {
    return 'Ultra';
  }
  
  // For very short distances
  if (distanceMeters < 1000) {
    return 'Sprint';
  }
  
  // Default to rounded km
  return `${Math.round(distanceMeters / 1000)}K`;
};

export const detectPersonalRecords = (runs: EnrichedRun[]): PRAnalysis => {
  if (runs.length === 0) {
    return {
      personalRecords: [],
      recentPRs: [],
      prProgression: [],
      prsByConditions: {
        bestWeatherConditions: [],
        bestLocations: [],
        temperatureRange: { min: 0, max: 0 }
      }
    };
  }

  // Sort runs by date (oldest first) to track progression
  const sortedRuns = [...runs].sort((a, b) => 
    new Date(a.start_date_local).getTime() - new Date(b.start_date_local).getTime()
  );

  // Group runs by distance category
  const runsByDistance = new Map<string, EnrichedRun[]>();
  
  sortedRuns.forEach(run => {
    if (run.distance > 0 && run.moving_time > 0) {
      const category = categorizeDistance(run.distance);
      if (!runsByDistance.has(category)) {
        runsByDistance.set(category, []);
      }
      runsByDistance.get(category)!.push(run);
    }
  });

  const personalRecords: PersonalRecord[] = [];
  const prProgression: Array<{ distance: string; records: PersonalRecord[] }> = [];

  // Find PRs for each distance category
  runsByDistance.forEach((categoryRuns, distance) => {
    const records: PersonalRecord[] = [];
    let bestTime = Infinity;

    categoryRuns.forEach(run => {
      const runTime = run.moving_time;
      const pace = runTime / (run.distance / 1000);
      
      if (runTime < bestTime) {
        bestTime = runTime;
        
        // Get weather and location conditions
        const weatherData = run.weather_data as any;
        const conditions = {
          temperature: weatherData?.temperature,
          weather: weatherData?.weather?.main,
          location: run.city || 'Unknown'
        };

        const record: PersonalRecord = {
          distance,
          distanceMeters: run.distance,
          time: runTime,
          pace,
          date: run.start_date_local,
          runId: run.id,
          runName: run.name,
          conditions,
          isNewRecord: true
        };

        records.push(record);
        personalRecords.push(record);
      }
    });

    if (records.length > 0) {
      prProgression.push({ distance, records });
    }
  });

  // Find recent PRs (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const recentPRs = personalRecords.filter(pr => 
    new Date(pr.date) >= thirtyDaysAgo
  );

  // Analyze PR conditions
  const prsByConditions = analyzePRConditions(personalRecords);

  return {
    personalRecords: personalRecords.sort((a, b) => a.distanceMeters - b.distanceMeters),
    recentPRs: recentPRs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    prProgression,
    prsByConditions
  };
};

const analyzePRConditions = (prs: PersonalRecord[]) => {
  const weatherConditions = new Map<string, number>();
  const locations = new Map<string, number>();
  const temperatures: number[] = [];

  prs.forEach(pr => {
    if (pr.conditions?.weather) {
      const count = weatherConditions.get(pr.conditions.weather) || 0;
      weatherConditions.set(pr.conditions.weather, count + 1);
    }
    
    if (pr.conditions?.location) {
      const count = locations.get(pr.conditions.location) || 0;
      locations.set(pr.conditions.location, count + 1);
    }
    
    if (pr.conditions?.temperature) {
      temperatures.push(pr.conditions.temperature);
    }
  });

  // Get top weather conditions and locations
  const bestWeatherConditions = Array.from(weatherConditions.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([condition]) => condition);

  const bestLocations = Array.from(locations.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([location]) => location);

  const temperatureRange = temperatures.length > 0 ? {
    min: Math.min(...temperatures),
    max: Math.max(...temperatures)
  } : { min: 0, max: 0 };

  return {
    bestWeatherConditions,
    bestLocations,
    temperatureRange
  };
};

export const formatTime = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
};

export const formatPace = (paceSeconds: number): string => {
  const minutes = Math.floor(paceSeconds / 60);
  const seconds = Math.floor(paceSeconds % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}/km`;
};