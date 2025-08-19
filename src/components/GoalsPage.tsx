import React from 'react';
import { Target } from 'lucide-react';
import { User, EnrichedRun } from '../types';

interface GoalsPageProps {
  user: User;
  runs: EnrichedRun[];
  isLoading: boolean;
  error: string | null;
}

export const GoalsPage: React.FC<GoalsPageProps> = ({ user, runs, isLoading, error }) => {
  if (isLoading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white shadow rounded-lg p-12 text-center">
        <Target className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h2 className="text-2xl font-semibold text-gray-700 mb-2">Goals & Progress</h2>
        <p className="text-gray-500 mb-4">Coming Soon!</p>
        <p className="text-gray-400 text-sm">
          We're working on an amazing goal tracking system to help you achieve your running objectives.
        </p>
      </div>
    </main>
  );
};