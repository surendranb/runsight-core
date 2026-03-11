// Data validation schemas and utilities for the robust data sync system

import { StravaActivity, EnrichedActivity, SyncSession, WeatherData } from '../types/sync';

// Validation error class
export class ValidationError extends Error {
  constructor(
    message: string,
    public field: string,
    public value: any
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

// Utility functions for validation
export function isValidNumber(value: any, min?: number, max?: number): boolean {
  if (typeof value !== 'number' || isNaN(value) || !isFinite(value)) {
    return false;
  }
  if (min !== undefined && value < min) return false;
  if (max !== undefined && value > max) return false;
  return true;
}

export function isValidString(value: any, minLength?: number, maxLength?: number): boolean {
  if (typeof value !== 'string') return false;
  if (minLength !== undefined && value.length < minLength) return false;
  if (maxLength !== undefined && value.length > maxLength) return false;
  return true;
}

export function isValidDate(value: any): boolean {
  if (typeof value !== 'string') return false;
  const date = new Date(value);
  return !isNaN(date.getTime());
}

export function isValidLatLng(lat: any, lng: any): boolean {
  return isValidNumber(lat, -90, 90) && isValidNumber(lng, -180, 180);
}

// Strava Activity Validation
export function validateStravaActivity(activity: any): StravaActivity {
  const errors: string[] = [];

  // Required fields
  if (!isValidNumber(activity.id, 1)) {
    errors.push('Invalid or missing activity ID');
  }

  if (!isValidString(activity.name, 1, 500)) {
    errors.push('Invalid or missing activity name');
  }

  if (!isValidString(activity.type, 1, 50)) {
    errors.push('Invalid or missing activity type');
  }

  if (!isValidNumber(activity.distance, 0)) {
    errors.push('Invalid distance value');
  }

  if (!isValidNumber(activity.moving_time, 0)) {
    errors.push('Invalid moving time value');
  }

  if (!isValidNumber(activity.elapsed_time, 0)) {
    errors.push('Invalid elapsed time value');
  }

  if (!isValidDate(activity.start_date)) {
    errors.push('Invalid start date');
  }

  if (!isValidDate(activity.start_date_local)) {
    errors.push('Invalid local start date');
  }

  // Optional fields validation
  if (activity.start_latlng && Array.isArray(activity.start_latlng)) {
    const [lat, lng] = activity.start_latlng;
    if (!isValidLatLng(lat, lng)) {
      errors.push('Invalid start coordinates');
    }
  }

  if (activity.end_latlng && Array.isArray(activity.end_latlng)) {
    const [lat, lng] = activity.end_latlng;
    if (!isValidLatLng(lat, lng)) {
      errors.push('Invalid end coordinates');
    }
  }

  if (activity.average_speed !== undefined && !isValidNumber(activity.average_speed, 0)) {
    errors.push('Invalid average speed');
  }

  if (activity.max_speed !== undefined && !isValidNumber(activity.max_speed, 0)) {
    errors.push('Invalid max speed');
  }

  if (activity.average_heartrate !== undefined && !isValidNumber(activity.average_heartrate, 30, 250)) {
    errors.push('Invalid average heart rate');
  }

  if (activity.max_heartrate !== undefined && !isValidNumber(activity.max_heartrate, 30, 250)) {
    errors.push('Invalid max heart rate');
  }

  if (activity.total_elevation_gain !== undefined && !isValidNumber(activity.total_elevation_gain, 0)) {
    errors.push('Invalid elevation gain');
  }

  if (errors.length > 0) {
    throw new ValidationError(
      `Strava activity validation failed: ${errors.join(', ')}`,
      'activity',
      activity
    );
  }

  return activity as StravaActivity;
}

// Weather Data Validation
export function validateWeatherData(weather: any): WeatherData {
  const errors: string[] = [];

  if (!isValidNumber(weather.temperature, -50, 60)) {
    errors.push('Invalid temperature value');
  }

  if (!isValidNumber(weather.feels_like, -50, 60)) {
    errors.push('Invalid feels like temperature');
  }

  if (!isValidNumber(weather.humidity, 0, 100)) {
    errors.push('Invalid humidity percentage');
  }

  if (!isValidNumber(weather.pressure, 800, 1200)) {
    errors.push('Invalid pressure value');
  }

  if (!isValidNumber(weather.wind_speed, 0)) {
    errors.push('Invalid wind speed');
  }

  if (!isValidNumber(weather.wind_deg, 0, 360)) {
    errors.push('Invalid wind direction');
  }

  if (!Array.isArray(weather.weather_conditions) || weather.weather_conditions.length === 0) {
    errors.push('Invalid weather conditions');
  }

  if (errors.length > 0) {
    throw new ValidationError(
      `Weather data validation failed: ${errors.join(', ')}`,
      'weather',
      weather
    );
  }

  return weather as WeatherData;
}

// Enriched Activity Validation (for database storage)
export function validateEnrichedActivity(activity: any): EnrichedActivity {
  const errors: string[] = [];

  // Required fields
  if (!isValidString(activity.user_id, 36, 36)) { // UUID length
    errors.push('Invalid user ID');
  }

  if (!isValidNumber(activity.strava_id, 1)) {
    errors.push('Invalid Strava ID');
  }

  if (!isValidString(activity.name, 1, 500)) {
    errors.push('Invalid activity name');
  }

  if (!isValidString(activity.activity_type, 1, 50)) {
    errors.push('Invalid activity type');
  }

  if (!isValidNumber(activity.distance_meters, 0)) {
    errors.push('Invalid distance');
  }

  if (!isValidNumber(activity.moving_time_seconds, 0)) {
    errors.push('Invalid moving time');
  }

  if (!isValidNumber(activity.elapsed_time_seconds, 0)) {
    errors.push('Invalid elapsed time');
  }

  if (!isValidDate(activity.start_date_utc)) {
    errors.push('Invalid UTC start date');
  }

  if (!isValidDate(activity.start_date_local)) {
    errors.push('Invalid local start date');
  }

  // Optional coordinate validation
  if (activity.start_latitude !== undefined && activity.start_longitude !== undefined) {
    if (!isValidLatLng(activity.start_latitude, activity.start_longitude)) {
      errors.push('Invalid start coordinates');
    }
  }

  if (activity.end_latitude !== undefined && activity.end_longitude !== undefined) {
    if (!isValidLatLng(activity.end_latitude, activity.end_longitude)) {
      errors.push('Invalid end coordinates');
    }
  }

  // Optional performance metrics validation
  if (activity.average_speed_ms !== undefined && !isValidNumber(activity.average_speed_ms, 0)) {
    errors.push('Invalid average speed');
  }

  if (activity.max_speed_ms !== undefined && !isValidNumber(activity.max_speed_ms, 0)) {
    errors.push('Invalid max speed');
  }

  if (activity.average_heartrate_bpm !== undefined && !isValidNumber(activity.average_heartrate_bpm, 30, 250)) {
    errors.push('Invalid average heart rate');
  }

  if (activity.max_heartrate_bpm !== undefined && !isValidNumber(activity.max_heartrate_bpm, 30, 250)) {
    errors.push('Invalid max heart rate');
  }

  // Weather data validation (optional)
  if (activity.temperature_celsius !== undefined && !isValidNumber(activity.temperature_celsius, -50, 60)) {
    errors.push('Invalid temperature');
  }

  if (activity.humidity_percent !== undefined && !isValidNumber(activity.humidity_percent, 0, 100)) {
    errors.push('Invalid humidity');
  }

  if (activity.wind_speed_ms !== undefined && !isValidNumber(activity.wind_speed_ms, 0)) {
    errors.push('Invalid wind speed');
  }

  // Enrichment status validation
  if (!activity.enrichment_status || typeof activity.enrichment_status !== 'object') {
    errors.push('Missing enrichment status');
  } else {
    if (typeof activity.enrichment_status.weather !== 'boolean') {
      errors.push('Invalid weather enrichment status');
    }
    if (typeof activity.enrichment_status.geocoding !== 'boolean') {
      errors.push('Invalid geocoding enrichment status');
    }
  }

  if (errors.length > 0) {
    throw new ValidationError(
      `Enriched activity validation failed: ${errors.join(', ')}`,
      'enriched_activity',
      activity
    );
  }

  return activity as EnrichedActivity;
}

// Sync Session Validation
export function validateSyncSession(session: any): Partial<SyncSession> {
  const errors: string[] = [];

  if (!isValidString(session.user_id, 36, 36)) {
    errors.push('Invalid user ID');
  }

  const validSyncTypes = ['full', 'incremental', 'date_range'];
  if (session.sync_type && !validSyncTypes.includes(session.sync_type)) {
    errors.push('Invalid sync type');
  }

  const validStatuses = ['initiated', 'fetching', 'enriching', 'storing', 'completed', 'failed', 'cancelled'];
  if (session.status && !validStatuses.includes(session.status)) {
    errors.push('Invalid sync status');
  }

  const validPhases = ['fetching', 'enriching', 'storing'];
  if (session.current_phase && !validPhases.includes(session.current_phase)) {
    errors.push('Invalid current phase');
  }

  // Validate progress counters
  const progressFields = [
    'total_activities_estimated',
    'activities_fetched',
    'activities_enriched',
    'activities_stored',
    'activities_failed',
    'error_count',
    'retry_count',
    'last_successful_page'
  ];

  for (const field of progressFields) {
    if (session[field] !== undefined && !isValidNumber(session[field], 0)) {
      errors.push(`Invalid ${field}`);
    }
  }

  // Validate time range if provided
  if (session.time_range_start && !isValidDate(session.time_range_start)) {
    errors.push('Invalid time range start');
  }

  if (session.time_range_end && !isValidDate(session.time_range_end)) {
    errors.push('Invalid time range end');
  }

  if (errors.length > 0) {
    throw new ValidationError(
      `Sync session validation failed: ${errors.join(', ')}`,
      'sync_session',
      session
    );
  }

  return session as Partial<SyncSession>;
}

// Data sanitization utilities
export function sanitizeString(value: any, maxLength: number = 500): string {
  if (typeof value !== 'string') {
    return String(value || '').substring(0, maxLength);
  }
  return value.trim().substring(0, maxLength);
}

export function sanitizeNumber(value: any, min?: number, max?: number): number | null {
  const num = Number(value);
  if (isNaN(num) || !isFinite(num)) return null;
  
  if (min !== undefined && num < min) return min;
  if (max !== undefined && num > max) return max;
  
  return num;
}

export function sanitizeCoordinate(value: any, isLatitude: boolean = false): number | null {
  const coord = sanitizeNumber(value, isLatitude ? -90 : -180, isLatitude ? 90 : 180);
  return coord;
}