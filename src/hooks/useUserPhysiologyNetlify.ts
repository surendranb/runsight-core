
import { useState, useEffect, useCallback } from 'react';

export interface UserPhysiologyData {
  maxHeartRate?: number;
  restingHeartRate?: number;
  bodyWeight?: number;
  age?: number;
  fitnessLevel?: 'beginner' | 'intermediate' | 'advanced' | 'elite';
}

export const useUserPhysiologyNetlify = (userId?: string) => {
  const [data, setData] = useState<UserPhysiologyData>({});
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!userId) {
      setIsLoaded(true);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/.netlify/functions/get-user-physiology?userId=${userId}`);
      if (!response.ok) {
        throw new Error(`Netlify function failed with status ${response.status}`);
      }
      const result = await response.json();
      setData(result);
    } catch (err) {
      console.error('Error loading user physiology data from Netlify:', err);
      setError(err instanceof Error ? err.message : 'Failed to load profile data');
    } finally {
      setIsLoading(false);
      setIsLoaded(true);
    }
  }, [userId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const updateData = async (newData: UserPhysiologyData) => {
    if (!userId) {
      setError('User not authenticated');
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/.netlify/functions/update-user-physiology', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, ...newData }),
      });

      if (!response.ok) {
        throw new Error(`Netlify function failed with status ${response.status}`);
      }

      const result = await response.json();
      setData(result);
      return true;
    } catch (err) {
      console.error('Error updating user physiology data from Netlify:', err);
      setError(err instanceof Error ? err.message : 'Failed to save profile data');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const hasCompleteData = () => {
    return !!(data.maxHeartRate && data.restingHeartRate && data.bodyWeight);
  };

  return {
    data,
    isLoaded,
    isLoading,
    error,
    updateData,
    hasCompleteData,
    refetch: loadData,
  };
};
