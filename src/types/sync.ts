// Core data models and TypeScript interfaces for the robust data sync system

// Sync Session Types
export type SyncStatus = 
  | 'initiated'
  | 'fetching'
  | 'enriching'
  | 'storing'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type SyncPhase = 'fetching' | 'enriching' | 'storing';

export type SyncType = 'full' | 'incremental' | 'date_range';

export interface SyncSession {
  id: string;
  user_id: string;
  sync_type: SyncType;
  time_range_start?: string;
  time_range_end?: string;
  status: SyncStatus;
  current_phase: SyncPhase;
  total_activities_estimated: number;
  activities_fetched: number;
  activities_enriched: number;
  activities_stored: number;
  activities_failed: number;
  error_count: number;
  last_error?: SyncError;
  retry_count: number;
  started_at: string;
  completed_at?: string;
  last_activity_at: string;
  last_successful_page: number;
  checkpoint_data?: CheckpointData;
  created_at: string;
  updated_at: string;
}

export interface CheckpointData {
  last_strava_page: number;
  last_processed_activity_id?: number;
  batch_progress: {
    fetched: number;
    enriched: number;
    stored: number;
  };
  error_activities: number[];
  resume_params?: {
    after?: number;
    before?: number;
    page: number;
    per_page: number;
  };
}

// Progress Tracking Types
export interface SyncProgress {
  total_activities: number;
  processed_activities: number;
  current_phase: SyncPhase;
  phase_progress: {
    fetching: PhaseProgress;
    enriching: PhaseProgress;
    storing: PhaseProgress;
  };
  start_time: string;
  estimated_completion?: string;
  percentage_complete: number;
}

export interface PhaseProgress {
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  processed: number;
  total: number;
  errors: number;
  start_time?: string;
  end_time?: string;
}

// Error Handling Types
export type ErrorType = 
  | 'network_error'
  | 'rate_limit'
  | 'temporary_api_error'
  | 'database_timeout'
  | 'authentication_error'
  | 'invalid_data'
  | 'permission_denied'
  | 'quota_exceeded'
  | 'function_timeout'
  | 'memory_limit'
  | 'unknown_error';

export interface SyncError {
  code: string;
  message: string;
  type: ErrorType;
  phase: SyncPhase;
  retryable: boolean;
  context: Record<string, any>;
  timestamp: string;
  stack_trace?: string;
}

// Activity Data Types
export interface EnrichedActivity {
  // Database fields
  id?: string;
  user_id: string;
  strava_id: number;
  name: string;
  activity_type: string;
  distance_meters: number;
  moving_time_seconds: number;
  elapsed_time_seconds: number;
  start_date_utc: string;
  start_date_local: string;
  timezone?: string;
  
  // Location data
  start_latitude?: number;
  start_longitude?: number;
  end_latitude?: number;
  end_longitude?: number;
  city?: string;
  state?: string;
  country?: string;
  
  // Performance metrics
  average_speed_ms?: number;
  max_speed_ms?: number;
  average_heartrate_bpm?: number;
  max_heartrate_bpm?: number;
  total_elevation_gain_meters?: number;
  
  // Weather data (structured)
  temperature_celsius?: number;
  feels_like_celsius?: number;
  humidity_percent?: number;
  pressure_hpa?: number;
  wind_speed_ms?: number;
  wind_direction_degrees?: number;
  weather_condition?: string;
  visibility_meters?: number;
  uv_index?: number;
  
  // Metadata
  enrichment_status: EnrichmentStatus;
  strava_data?: Record<string, any>;
  sync_session_id?: string;
  created_at?: string;
  updated_at?: string;
}

export interface EnrichmentStatus {
  weather: boolean;
  geocoding: boolean;
  errors?: string[];
}

// Raw Strava Activity (from API)
export interface StravaActivity {
  id: number;
  name: string;
  type: string;
  distance: number;
  moving_time: number;
  elapsed_time: number;
  total_elevation_gain: number;
  start_date: string;
  start_date_local: string;
  timezone: string;
  utc_offset: number;
  start_latlng?: [number, number];
  end_latlng?: [number, number];
  location_city?: string;
  location_state?: string;
  location_country?: string;
  average_speed: number;
  max_speed: number;
  average_heartrate?: number;
  max_heartrate?: number;
  // Additional Strava fields...
  [key: string]: any;
}

// Weather Data Types
export interface WeatherData {
  temperature: number;
  feels_like: number;
  humidity: number;
  pressure: number;
  wind_speed: number;
  wind_deg: number;
  weather_conditions: WeatherCondition[];
  uvi?: number;
  visibility?: number;
}

export interface WeatherCondition {
  id: number;
  main: string;
  description: string;
  icon: string;
}

export interface GeocodingData {
  city?: string;
  state?: string;
  country?: string;
}

// API Request/Response Types
export interface SyncRequest {
  userId: string;
  timeRange?: {
    after?: number;
    before?: number;
  };
  options?: {
    batchSize?: number;
    maxRetries?: number;
    skipWeatherEnrichment?: boolean;
  };
}

export interface SyncResponse {
  syncId: string;
  status: SyncStatus;
  progress: SyncProgress;
  results?: SyncResults;
  error?: SyncError;
}

export interface SyncResults {
  total_processed: number;
  activities_saved: number;
  activities_updated: number;
  activities_skipped: number;
  activities_failed: number;
  weather_enriched: number;
  geocoded: number;
  duration_seconds: number;
}

// Pagination Types
export interface PaginationParams {
  page: number;
  per_page: number;
  after?: number;
  before?: number;
}

export interface PaginationResponse<T> {
  data: T[];
  pagination: {
    current_page: number;
    has_more: boolean;
    next_page?: number;
    total_estimated?: number;
  };
  metadata: {
    total_fetched: number;
    filtered_count: number;
    duplicates_skipped: number;
  };
}

// Batch Processing Types
export interface BatchInfo {
  batch_id: string;
  activities: number[]; // Strava activity IDs
  phase: SyncPhase;
  retry_count: number;
  last_error?: string;
  created_at: string;
}

export interface BatchResult {
  batch_id: string;
  processed: number;
  successful: number;
  failed: number;
  errors: Array<{
    activity_id: number;
    error: string;
  }>;
}

// Statistics and Analytics Types
export interface SyncStatistics {
  total_syncs: number;
  successful_syncs: number;
  failed_syncs: number;
  average_duration_seconds: number;
  average_activities_per_sync: number;
  last_sync_at?: string;
  total_activities_synced: number;
  weather_enrichment_rate: number;
  geocoding_success_rate: number;
}

export interface ActivityStatistics {
  total_runs: number;
  total_distance_meters: number;
  total_moving_time_seconds: number;
  average_pace_seconds_per_km: number;
  average_distance_per_run_meters: number;
  runs_with_weather: number;
  runs_with_location: number;
  date_range: {
    earliest: string;
    latest: string;
  };
}