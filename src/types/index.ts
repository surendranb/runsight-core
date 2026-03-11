// src/types/index.ts

// Re-export advanced metrics types
export * from './advancedMetrics';

export interface User {
  id: string; // Supabase auth user ID (uuid)
  strava_id: number; // Strava athlete ID
  name: string; // User's full name from Strava/auth provider
  // Optional fields that might be used by components, ensure they are truly optional
  email?: string;
  first_name?: string; // Will be derived from 'name' or removed if 'name' is sole source
  last_name?: string;  // Will be derived from 'name' or removed
  profile_medium?: string;
  // Fields from old User type that might be relevant from useSimpleAuth if it was more comprehensive
  access_token?: string;
  refresh_token?: string;
  expires_at?: number;
  created_at?: string;
  updated_at?: string;
}

export interface EnrichedRun { // This should be compatible with 'Run' from secure-api-client
  id: string;
  user_id: string;
  strava_id: number;
  name: string;
  distance: number;
  moving_time: number;
  elapsed_time: number;
  start_date: string;
  start_date_local: string;
  start_latlng?: string | null;
  end_latlng?: string | null;
  average_speed: number;
  max_speed?: number | null;
  average_heartrate?: number | null;
  max_heartrate?: number | null;
  total_elevation_gain?: number | null;

  weather_data?: any; // JSON blob from 'runs' table
  strava_data?: any;  // Full Strava activity object, contains its own splits/laps

  // Explicit columns for split data if they exist on the 'runs' table schema
  // as per the migration file (enriched_runs table definition)
  splits_metric?: any;    // JSONB column for metric splits
  splits_standard?: any;  // JSONB column for standard (mile) splits
  laps?: any;             // JSONB column for lap data

  city?: string | null;
  state?: string | null;
  country?: string | null;

  created_at?: string;
  updated_at?: string;
  workout_type?: string | null; // from strava_data.workout_type or a direct column
}

export interface RunSplit {
  id: string;
  enriched_run_id: string;
  user_id: string;
  split_number: number;
  distance: number; // meters
  elapsed_time: number; // seconds
  moving_time?: number; // Optional: if available
  average_speed?: number; // Optional: m/s
  average_heartrate?: number | null; // Optional: bpm
  total_elevation_gain?: number | null; // Optional: meters for the split
  // Add other fields as per your 'run_splits' table schema if they exist
  // and are returned by the Netlify function.
}

// Add RunStats if it's to be passed around, though SimpleDashboard calculates its own
export interface RunStats {
  total_runs: number;
  total_distance: number; // in meters
  total_moving_time: number; // in seconds
  average_pace_seconds_per_km: number;
  average_distance_per_run_meters: number;
}


// Keep existing types that are not User, EnrichedRun, RunSplit, RunStats
export interface Activity { // This was the old type for runs from useSimpleAuth, may be different from EnrichedRun
  id: string;
  strava_id: number; // This was athlete_id in some Strava contexts, but activity_id here
  user_id: string; // Supabase user ID
  name: string;
  distance: number; // meters
  moving_time: number; // seconds
  elapsed_time: number; // seconds
  total_elevation_gain: number; // meters
  type: string; // e.g. "Run"
  start_date: string; // ISO 8601
  start_date_local: string; // ISO 8601
  timezone: string;
  utc_offset: number;
  start_latlng: [number, number] | null; // [lat, lng]
  end_latlng: [number, number] | null;   // [lat, lng]
  location_city: string | null;
  location_state: string | null;
  location_country: string | null;
  achievement_count: number;
  kudos_count: number;
  comment_count: number;
  athlete_count: number;
  photo_count: number;
  average_speed: number; // m/s
  max_speed: number; // m/s
  average_heartrate: number | null; // bpm
  max_heartrate: number | null; // bpm
  suffer_score: number | null;
  created_at: string; // ISO 8601
  updated_at: string; // ISO 8601
}

export interface Weather {
  id: string;
  activity_id: string;
  temperature: number;
  feels_like: number;
  humidity: number;
  pressure: number;
  visibility: number;
  wind_speed: number;
  wind_deg: number;
  weather_main: string;
  weather_description: string;
  weather_icon: string;
  clouds: number;
  created_at: string;
}

export interface StravaAuthResponse {
  token_type: string;
  expires_at: number;
  expires_in: number;
  refresh_token: string;
  access_token: string;
  athlete: {
    id: number;
    username: string;
    resource_state: number;
    firstname: string;
    lastname: string;
    bio: string;
    city: string;
    state: string;
    country: string;
    sex: string;
    premium: boolean;
    summit: boolean;
    created_at: string;
    updated_at: string;
    badge_type_id: number;
    weight: number;
    profile_medium: string;
    profile: string;
    friend: null;
    follower: null;
  };
}

export interface ActivityStats { // This was an old summary type, distinct from new RunStats
  totalRuns: number;
  totalDistance: number;
  totalTime: number;
  averagePace: number;
  totalElevation: number;
  averageHeartRate: number;
  bestDistance: number;
  bestTime: number;
  bestPace: number;
}

export interface StravaDetailedActivity { // This is for raw Strava data, distinct from EnrichedRun
  id: number;
  name: string;
  distance: number;
  moving_time: number;
  elapsed_time: number;
  total_elevation_gain: number;
  type: string;
  start_date: string;
  start_date_local: string;
  timezone: string;
  utc_offset: number;
  start_latlng: [number, number] | null;
  end_latlng: [number, number] | null;
  location_city: string | null;
  location_state: string | null;
  location_country: string | null;
  achievement_count: number;
  kudos_count: number;
  comment_count: number;
  athlete_count: number;
  photo_count: number;
  map: {
    id: string;
    summary_polyline: string | null;
    polyline: string | null;
  } | null;
  trainer: boolean;
  commute: boolean;
  manual: boolean;
  private: boolean;
  visibility: string;
  average_speed: number;
  max_speed: number;
  has_heartrate: boolean;
  average_heartrate: number | null;
  max_heartrate: number | null;
  suffer_score: number | null;
  device_name: string | null;
  gear_id: string | null;
  external_id: string | null;
  upload_id: number | null;
  upload_id_str?: string;
  splits_metric: Array<{
    distance: number;
    elapsed_time: number;
    elevation_difference: number | null;
    moving_time: number;
    split: number;
    average_speed?: number;
    average_heartrate?: number | null;
    pace_seconds?: number;
  }> | null;
  splits_standard: Array<{
    distance: number;
    elapsed_time: number;
    elevation_difference: number | null;
    moving_time: number;
    split: number;
    average_speed?: number;
    average_heartrate?: number | null;
    pace_seconds?: number;
  }> | null;
  laps: Array<{
    id: number;
    resource_state: number;
    name: string;
    activity: { id: number; resource_state: number; };
    athlete: { id: number; resource_state: number; };
    elapsed_time: number;
    moving_time: number;
    start_date: string;
    start_date_local: string;
    distance: number;
    start_index: number;
    end_index: number;
    total_elevation_gain: number;
    average_speed: number;
    max_speed: number;
    average_cadence?: number;
    device_watts?: boolean;
    average_watts?: number;
    lap_index: number;
    split: number;
    average_heartrate?: number | null;
    max_heartrate?: number | null;
  }> | null;
}