// Secure API Client - All communication now goes through Netlify Functions with JWT authentication
// This client is for the runsight-core application.
import { productionErrorHandler } from './production-error-handler';
import { User } from '../hooks/useSecureAuth'; // Get the User interface from the auth hook

// User interface defined in useSecureAuth.ts is now the source of truth
// export interface User {
//   id: string; // Supabase UID
//   strava_id: number | null;
//   name: string;
//   email?: string;
// }

export interface Run {
  id: string;
  strava_id: number;
  name: string;
  distance: number;
  distance_meters: number;
  moving_time: number;
  moving_time_seconds: number;
  elapsed_time: number;
  elapsed_time_seconds: number;
  start_date: string;
  start_date_local: string;
  start_latitude: number | null;
  start_longitude: number | null;
  end_latitude: number | null;
  end_longitude: number | null;
  average_speed: number;
  average_speed_ms: number;
  max_speed: number;
  max_speed_ms: number;
  average_heartrate: number | null;
  average_heartrate_bpm: number | null;
  max_heartrate: number | null;
  max_heartrate_bpm: number | null;
  total_elevation_gain: number;
  total_elevation_gain_meters: number;
  activity_type: string;
  weather_data: any;
  strava_data: any;
  city: string | null; // Added
  state: string | null; // Added
  country: string | null; // Added
  created_at: string;
  updated_at: string;
}

export interface RunStats {
  total_runs: number;
  total_distance: number;
  total_moving_time: number;
  average_pace_seconds_per_km: number;
  average_distance_per_run_meters: number;
}

export interface SyncRequest {
  timeRange?: {
    after?: number;
    before?: number;
  };
  options?: {
    batchSize?: number;
    skipWeatherEnrichment?: boolean;
    processAll?: boolean; // Added for sync-data chunking
  };
  chunkIndex?: number; // Added for sync-data chunking
  chunkSize?: number; // Added for sync-data chunking
}

export interface SyncResponse {
  success: boolean;
  message: string;
  timestamp: string;
  status: string;
  chunking?: { // Added for sync-data chunking
    currentChunk: number;
    totalChunks: number;
    hasMoreChunks: boolean;
    nextChunkIndex: number;
    totalActivities: number;
    processedSoFar: number;
  };
  results: {
    total_processed: number;
    activities_saved: number;
    activities_updated: number;
    activities_skipped: number;
    activities_failed: number;
    weather_enriched: number;
    geocoded: number;
    duration_seconds: number;
  };
  error?: any;
}

// User Training Profile (from supabase/migrations/20250812000000_add_advanced_training_metrics.sql)
export interface UserTrainingProfile {
  id: string;
  user_id: string;
  resting_heart_rate?: number;
  max_heart_rate?: number;
  estimated_weight?: number;
  current_vo2_max?: number;
  current_ctl?: number;
  current_atl?: number;
  current_tsb?: number;
  optimal_temperature?: number;
  heat_tolerance_level?: 'low' | 'medium' | 'high';
  heart_rate_zones?: any;
  pace_zones?: any;
  last_calculated: string;
  created_at: string;
  updated_at: string;
}


class SecureApiClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = '/.netlify/functions'; // All calls go to Netlify Functions
  }

  // --- Authentication Flow ---

  // Get Strava authorization URL from Netlify Function
  async getStravaAuthUrl(): Promise<string> {
    console.log('🔗 Getting Strava authorization URL from Netlify Function...');
    
    try {
      const response = await fetch(`${this.baseUrl}/auth-strava`, {
        method: 'GET',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to get authorization URL' }));
        const error = productionErrorHandler.handleNetlifyFunctionError(
          { ...errorData, statusCode: response.status },
          'auth-strava',
          { operation: 'get-auth-url' }
        );
        throw new Error(error.message);
      }

      const data = await response.json();
      return data.authUrl;
    } catch (error) {
      if (error instanceof Error && error.message.includes('fetch')) {
        const networkError = productionErrorHandler.handleNetworkError(error, {
          operation: 'get-auth-url',
          endpoint: `${this.baseUrl}/auth-strava`
        });
        throw new Error(networkError.message);
      }
      throw error;
    }
  }

  // Authenticate with Strava via Netlify Function
  async authenticateWithStrava(code: string): Promise<void> { // Now returns void, as auth-strava redirects
    console.log('🔐 Authenticating with Strava via Netlify Function...');
    
    try {
      const response = await fetch(`${this.baseUrl}/auth-strava`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });

      // auth-strava now handles the redirect directly by returning statusCode 302
      // So, if we get a 200 here, it means something went wrong server-side.
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Authentication failed' }));
        const error = productionErrorHandler.handleNetlifyFunctionError(
          { ...errorData, statusCode: response.status },
          'auth-strava',
          { operation: 'authenticate' }
        );
        throw new Error(error.message);
      }

      // We should not reach here if auth-strava correctly performs a redirect.
      // If it does, it implies an error or an unexpected response.
      console.warn('authenticateWithStrava received 200 OK, but expected redirect. Check auth-strava function.');
      const data = await response.json();
      if (data.error) {
        throw new Error(data.message || 'Authentication failed on server.');
      }
      // If we somehow reach here and there's no error, it means the redirect didn't happen client-side
      // but the server might have processed the request successfully.
      // The session should be established via cookie, so a subsequent get-user call will confirm.
      
    } catch (error) {
      if (error instanceof Error && error.message.includes('fetch')) {
        const networkError = productionErrorHandler.handleNetworkError(error, {
          operation: 'authenticate',
          endpoint: `${this.baseUrl}/auth-strava`
        });
        throw new Error(networkError.message);
      }
      throw error;
    }
  }

  // --- Data Synchronization ---

  // Start a sync using the Netlify sync-data function
  async startSync(syncRequest: SyncRequest = {}, onProgress?: (message: string, progress?: number) => void): Promise<SyncResponse> {
    console.log(`🔄 Starting sync via Netlify Function...`);
    
    // sync-data function now handles authentication via cookie
    try {
        const response = await fetch(`${this.baseUrl}/sync-data`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(syncRequest),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: 'Sync failed' }));
            const error = productionErrorHandler.handleNetlifyFunctionError(
                { ...errorData, statusCode: response.status },
                'sync-data',
                { operation: 'start-sync' }
            );
            throw new Error(error.message);
        }

        const data = await response.json();
        // Since sync-data can be chunked, it returns partial results
        // This apiClient method itself doesn't handle chunking logic,
        // it just makes one request and returns its response.
        return data;

    } catch (error) {
        if (error instanceof Error && error.message.includes('fetch')) {
            const networkError = productionErrorHandler.handleNetworkError(error, {
                operation: 'start-sync',
                endpoint: `${this.baseUrl}/sync-data`
            });
            throw new Error(networkError.message);
        }
        throw error;
    }
  }

  // --- User Data Fetching ---

  // Get user runs via Netlify get-runs function
  async getUserRuns(): Promise<{ runs: Run[]; stats: RunStats; count?: number }> { // No need for userId param anymore
    console.log(`📖 Fetching runs via Netlify Function...`);
    
    try {
      const response = await fetch(`${this.baseUrl}/get-runs`, { // userId is now implicit from cookie
        method: 'GET',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to fetch user runs and stats' }));
        const error = productionErrorHandler.handleNetlifyFunctionError(
          { ...errorData, statusCode: response.status },
          'get-runs',
          { operation: 'fetch-runs' }
        );
        throw new Error(error.message);
      }

      const data = await response.json();
      return {
        runs: data.runs || [],
        stats: data.stats,
        count: data.count
      };
    } catch (error) {
      if (error instanceof Error && error.message.includes('fetch')) {
        const networkError = productionErrorHandler.handleNetworkError(error, {
          operation: 'fetch-runs',
          endpoint: `${this.baseUrl}/get-runs`
        });
        throw new Error(networkError.message);
      }
      throw error;
    }
  }

  // Get user physiology via Netlify get-user-physiology function
  async getUserPhysiology(): Promise<UserTrainingProfile | null> { // No need for userId param anymore
    console.log(`🧠 Fetching user physiology via Netlify Function...`);
    
    try {
      const response = await fetch(`${this.baseUrl}/get-user-physiology`, { // userId is now implicit from cookie
        method: 'GET',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to fetch user physiology' }));
        if (response.status === 404 && errorData.message.includes('User training profile not found')) {
            return null; // No profile yet
        }
        const error = productionErrorHandler.handleNetlifyFunctionError(
          { ...errorData, statusCode: response.status },
          'get-user-physiology',
          { operation: 'fetch-physiology' }
        );
        throw new Error(error.message);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      if (error instanceof Error && error.message.includes('fetch')) {
        const networkError = productionErrorHandler.handleNetworkError(error, {
          operation: 'fetch-physiology',
          endpoint: `${this.baseUrl}/get-user-physiology`
        });
        throw new Error(networkError.message);
      }
      throw error;
    }
  }

  // Update user physiology via Netlify update-user-physiology function
  async updateUserPhysiology(profileData: Partial<UserTrainingProfile>): Promise<UserTrainingProfile> { // No need for userId param anymore
    console.log(`✍️ Updating user physiology via Netlify Function...`);
    
    try {
      const response = await fetch(`${this.baseUrl}/update-user-physiology`, { // userId is now implicit from cookie
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileData), // Send only profile data, user_id set by function
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to update user physiology' }));
        const error = productionErrorHandler.handleNetlifyFunctionError(
          { ...errorData, statusCode: response.status },
          'update-user-physiology',
          { operation: 'update-physiology' }
        );
        throw new Error(error.message);
      }

      const data = await response.json();
      return data.profile; // Netlify function returns { success: true, profile: updatedProfile }
    } catch (error) {
      if (error instanceof Error && error.message.includes('fetch')) {
        const networkError = productionErrorHandler.handleNetworkError(error, {
          operation: 'update-physiology',
          endpoint: `${this.baseUrl}/update-user-physiology`
        });
        throw new Error(networkError.message);
      }
      throw error;
    }
  }

  // --- AI Coach Functions ---

  // Call AI coach via Netlify ai-coach function
  async callAICoach(action: string, data: any): Promise<any> {
    console.log(`🤖 Calling AI Coach via Netlify Function for action: ${action}`);

    try {
      const response = await fetch(`${this.baseUrl}/ai-coach`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, data }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: `AI Coach ${action} failed` }));
        const error = productionErrorHandler.handleNetlifyFunctionError(
          { ...errorData, statusCode: response.status },
          'ai-coach',
          { operation: action }
        );
        throw new Error(error.message);
      }

      const responseData = await response.json();
      return responseData.response; // Netlify function returns { success, action, response }
    } catch (error) {
      if (error instanceof Error && error.message.includes('fetch')) {
        const networkError = productionErrorHandler.handleNetworkError(error, {
          operation: action,
          endpoint: `${this.baseUrl}/ai-coach`
        });
        throw new Error(networkError.message);
      }
      throw error;
    }
  }
}

// Create and export the API client instance
const apiClient = new SecureApiClient();
export { apiClient };
