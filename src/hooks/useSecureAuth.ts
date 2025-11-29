// Secure Authentication Hook - Uses secure, HttpOnly cookie-based session
import { useState, useEffect, useCallback } from 'react';
import { apiClient, type User } from '../lib/secure-api-client'; // apiClient will be updated next

interface AuthState {
  user: User | null;
  isLoading: boolean;
  error: string | null;
}

export const useSecureAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isLoading: true,
    error: null
  });

  // Function to check for an existing session (now via API call)
  const checkExistingSession = useCallback(async () => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true, error: null }));
      // Call the new Netlify function to get the user based on the secure cookie
      const response = await fetch('/.netlify/functions/get-user');
      
      if (!response.ok) {
        // If not authenticated or session invalid, log out (clear state)
        if (response.status === 401) {
          setAuthState({
            user: null,
            isLoading: false,
            error: null
          });
          return;
        }
        const errorData = await response.json().catch(() => ({ message: 'Failed to check session' }));
        throw new Error(errorData.message || 'Failed to check session');
      }

      const data = await response.json();
      setAuthState({
        user: data.user,
        isLoading: false,
        error: null
      });
    } catch (error) {
      console.error('Session check failed:', error);
      setAuthState({
        user: null,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Session check failed'
      });
    }
  }, []); // Empty dependency array means this function is created once

  // Check for existing session on mount
  useEffect(() => {
    checkExistingSession();
  }, [checkExistingSession]); // Depend on checkExistingSession to avoid stale closures

  const initiateStravaAuth = async () => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true, error: null }));
      
      // Get authorization URL from server (Netlify Function)
      // apiClient.getStravaAuthUrl will make a fetch to /.netlify/functions/auth-strava (GET)
      const authUrl = await apiClient.getStravaAuthUrl();
      
      // Redirect to Strava
      window.location.href = authUrl;
      
    } catch (error) {
      console.error('Auth initiation failed:', error);
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Authentication failed'
      }));
    }
  };

  const handleStravaCallback = useCallback(async (code: string) => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true, error: null }));
      
      // apiClient.authenticateWithStrava will make a fetch to /.netlify/functions/auth-strava (POST)
      // This function now just initiates the server-side exchange and redirect.
      // The actual session establishment (cookie) happens server-side, and the
      // subsequent checkExistingSession (from useEffect) will pick it up.
      // The auth-strava function now performs a 302 redirect.
      // We don't expect a user object back directly anymore.
      await apiClient.authenticateWithStrava(code); // This call should trigger the redirect

      // If for some reason the redirect doesn't happen, or we are still here,
      // we can explicitly call checkExistingSession
      await checkExistingSession(); // Ensure session state is updated

      // We no longer return a user object directly as the session is cookie-based
      // and state is managed via checkExistingSession.
      
    } catch (error) {
      console.error('Callback handling failed:', error);
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Authentication failed'
      }));
      throw error;
    }
  }, [checkExistingSession]); // Depend on checkExistingSession

  const logout = async () => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true, error: null }));
      // Call the new Netlify function to clear the secure cookie
      const response = await fetch('/.netlify/functions/logout', { method: 'POST' });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Logout failed' }));
        throw new Error(errorData.message || 'Logout failed');
      }

      setAuthState({
        user: null,
        isLoading: false,
        error: null
      });
    } catch (error) {
      console.error('Logout failed:', error);
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Logout failed'
      }));
    }
  };

  const clearError = () => {
    setAuthState(prev => ({ ...prev, error: null }));
  };

  return {
    user: authState.user,
    isLoading: authState.isLoading,
    error: authState.error,
    isAuthenticated: !!authState.user,
    initiateStravaAuth,
    handleStravaCallback,
    logout,
    clearError
  };
};
