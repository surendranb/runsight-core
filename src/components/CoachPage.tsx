import React, { useState } from 'react';
import { User, EnrichedRun } from '../types';

interface CoachPageProps {
  user: User;
  runs: EnrichedRun[];
}

export const CoachPage: React.FC<CoachPageProps> = ({ user, runs }) => {
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGetCoaching = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/.netlify/functions/ai-coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ runs })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to get coaching');
      }

      setAnalysis(data.analysis);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 mb-8">
        <div className="flex items-center space-x-4 mb-6">
          <div className="p-3 bg-purple-100 text-purple-600 rounded-xl">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">AI Coach</h1>
            <p className="text-gray-500">Expert analysis powered by Gemini AI</p>
          </div>
        </div>

        {!analysis && !loading && (
          <div className="text-center py-12">
            <p className="text-gray-600 mb-6">
              Ready for a personalized review of your recent training? The AI Coach analyzes your pace, distance, and consistency to give you actionable feedback.
            </p>
            <button
              onClick={handleGetCoaching}
              className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-8 rounded-full transition-colors"
            >
              Get Expert Analysis
            </button>
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mb-4"></div>
            <p className="text-gray-500">Analyzing your recent runs...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6">
            Error: {error}
          </div>
        )}

        {analysis && !loading && (
          <div className="prose prose-purple max-w-none">
            {analysis.split('\n').map((line, i) => (
              <p key={i} className="mb-2">
                {line.startsWith('**') && line.endsWith('**') ? <strong>{line.replace(/\*\*/g, '')}</strong> : line}
              </p>
            ))}
            <div className="mt-8 text-center">
              <button
                onClick={handleGetCoaching}
                className="text-purple-600 hover:text-purple-800 font-medium"
              >
                Refresh Analysis
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
