// Secure Authentication Hook - Uses secure, HttpOnly cookie-based session
import { useState, useEffect, useCallback } from 'react';
import { apiClient, type User } from '../lib/secure-api-client';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  setupRequired: {
    required: boolean;
    message: string;
  };
}

export const useSecureAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isLoading: true,
    error: null,
    setupRequired: { required: false, message: '' },
  });

  const checkExistingSession = useCallback(async () => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true, error: null }));
      const response = await fetch('/.netlify/functions/get-user');
      
      const data = await response.json();

      if (!response.ok) {
        if (response.status === 400 && data.error === 'CONFIG_REQUIRED') {
          setAuthState({
            user: null,
            isLoading: false,
            error: null,
            setupRequired: { required: true, message: data.message }
          });
        } else if (response.status === 401) {
          setAuthState(prev => ({...prev, user: null, isLoading: false, error: null}));
        } else {
          throw new Error(data.message || 'Failed to check session');
        }
        return;
      }

      setAuthState({
        user: data.user,
        isLoading: false,
        error: null,
        setupRequired: { required: false, message: '' }
      });
    } catch (error) {
      console.error('Session check failed:', error);
      setAuthState({
        user: null,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Session check failed',
        setupRequired: { required: false, message: '' }
      });
    }
  }, []);

  useEffect(() => {
    checkExistingSession();
  }, [checkExistingSession]);

  const initiateStravaAuth = async () => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true, error: null }));
      const authUrl = await apiClient.getStravaAuthUrl();
      if (authUrl === '#') { // Dummy URL from auth-strava when config is missing
        await checkExistingSession(); // Re-check to trigger setup guide
        return;
      }
      window.location.href = authUrl;
    } catch (error) {
      console.error('Auth initiation failed:', error);
      setAuthState(prev => ({ ...prev, isLoading: false, error: error instanceof Error ? error.message : 'Authentication failed' }));
    }
  };

  const handleStravaCallback = useCallback(async (code: string) => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true, error: null }));
      await apiClient.authenticateWithStrava(code);
      await checkExistingSession();
    } catch (error) {
      console.error('Callback handling failed:', error);
      setAuthState(prev => ({ ...prev, isLoading: false, error: error instanceof Error ? error.message : 'Authentication failed' }));
      throw error;
    }
  }, [checkExistingSession]);

  const logout = async () => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true, error: null }));
      await fetch('/.netlify/functions/logout', { method: 'POST' });
      setAuthState({ user: null, isLoading: false, error: null, setupRequired: { required: false, message: '' } });
    } catch (error) {
      console.error('Logout failed:', error);
      setAuthState(prev => ({ ...prev, isLoading: false, error: error instanceof Error ? error.message : 'Logout failed' }));
    }
  };

  const clearError = () => {
    setAuthState(prev => ({ ...prev, error: null }));
  };

  return {
    ...authState,
    isAuthenticated: !!authState.user,
    initiateStravaAuth,
    handleStravaCallback,
    logout,
    clearError
  };
};