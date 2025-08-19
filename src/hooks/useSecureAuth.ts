// Secure Authentication Hook - No credentials in frontend
// Uses session-based authentication with Netlify Functions

import { useState, useEffect, useCallback } from 'react';
import { apiClient, type User } from '../lib/secure-api-client';

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

  // Check for existing session on mount
  useEffect(() => {
    checkExistingSession();
  }, []);

  const checkExistingSession = () => {
    try {
      // Check localStorage for user session
      const storedUser = localStorage.getItem('runsight_user');
      if (storedUser) {
        const user = JSON.parse(storedUser);
        setAuthState({
          user,
          isLoading: false,
          error: null
        });
      } else {
        setAuthState({
          user: null,
          isLoading: false,
          error: null
        });
      }
    } catch (error) {
      console.error('Session check failed:', error);
      setAuthState({
        user: null,
        isLoading: false,
        error: 'Session check failed'
      });
    }
  };

  const initiateStravaAuth = async () => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true, error: null }));
      
      // Get authorization URL from server
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
      
      // Exchange code for user session (server-side)
      const { user, sessionUrl } = await apiClient.authenticateWithStrava(code);
      
      // Store user session
      localStorage.setItem('runsight_user', JSON.stringify(user));
      
      setAuthState({
        user,
        isLoading: false,
        error: null
      });

      return user;
      
    } catch (error) {
      console.error('Callback handling failed:', error);
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Authentication failed'
      }));
      throw error;
    }
  }, []);

  const logout = () => {
    localStorage.removeItem('runsight_user');
    setAuthState({
      user: null,
      isLoading: false,
      error: null
    });
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