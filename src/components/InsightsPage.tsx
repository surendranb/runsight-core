// src/components/InsightsPage.tsx
import React, { useMemo, useState, useEffect } from 'react';
import { User, EnrichedRun } from '../types';
import { InsightsTabNavigation, InsightsTab } from './insights/InsightsTabNavigation';
import { InsightsTabContent } from './insights/InsightsTabContent';
import { Section } from './common/VisualHierarchy';
import { ErrorDisplay, useErrorTranslation } from './common/ErrorDisplay';
import { HelpIcon } from './common/ContextualHelp';
import { BarChart3 } from 'lucide-react';

interface InsightsPageProps {
  user: User;
  runs: EnrichedRun[];
  isLoading: boolean;
  error: string | null;
  // onNavigateToDashboard prop is removed
}

export const InsightsPage: React.FC<InsightsPageProps> = ({ user, runs, isLoading, error }) => {
  // Tab state management
  const [activeTab, setActiveTab] = useState<InsightsTab>('performance');

  // URL state management for tab persistence
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    // UPDATED: Only show 3 tabs - Performance, Training, Environment
    const validTabs: InsightsTab[] = ['performance', 'training', 'environment'];
    // HIDDEN: 'overview', 'analysis' tabs removed from navigation
    
    if (validTabs.includes(hash as InsightsTab)) {
      setActiveTab(hash as InsightsTab);
    } else {
      // Default to performance tab if invalid or hidden tab is accessed
      setActiveTab('performance');
    }
  }, []);

  const handleTabChange = (tab: InsightsTab) => {
    setActiveTab(tab);
    window.location.hash = tab;
  };
  if (isLoading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center"> {/* Adjust height for navbar */}
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading Insights Data...</p>
      </div>
    );
  }

  // Use error translation hook
  const { translateError } = useErrorTranslation();

  if (error) {
    const translatedError = translateError(error, 'Insights loading failed');
    
    // Add insights-specific recovery options
    const errorWithRecovery = {
      ...translatedError,
      recoveryOptions: [
        {
          label: 'Retry Loading',
          description: 'Try loading the insights again',
          action: () => window.location.reload(),
          primary: true
        },
        {
          label: 'Go to Dashboard',
          description: 'Return to the main dashboard',
          action: () => {
            // Navigate to dashboard - this would be handled by the parent component
            window.location.hash = '#dashboard';
            window.location.reload();
          }
        },
        ...(translatedError.recoveryOptions || [])
      ]
    };

    return (
      <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="text-center mb-6">
            <div className="bg-blue-100 p-3 rounded-full inline-block mb-4">
              <BarChart3 className="w-8 h-8 text-blue-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Insights Hub
            </h1>
          </div>
          
          <ErrorDisplay 
            error={errorWithRecovery}
            className="shadow-lg"
          />
        </div>
      </div>
    );
  }

  // Main content of the InsightsPage with new tabbed navigation
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Section */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Section
            title="Insights Hub"
            subtitle={`Welcome, ${user.name}! Analyzing ${runs.length} runs to provide actionable insights for your training.`}
            level={1}
            icon={BarChart3}
            badge={{
              text: `${runs.length} runs`,
              color: 'blue'
            }}
            actions={
              <HelpIcon 
                content="Insights are automatically generated from your running data to help you understand patterns and improve your training."
                size="md"
              />
            }
            background="transparent"
            className="mb-0"
          />
        </div>
        
        {/* Tab Navigation */}
        <InsightsTabNavigation
          activeTab={activeTab}
          onTabChange={handleTabChange}
        />
      </div>

      {/* Tab Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {runs.length === 0 && !isLoading ? (
          <div className="bg-white shadow rounded-lg p-8 text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="mt-2 text-lg font-medium text-gray-900">No Run Data</h3>
            <p className="mt-1 text-sm text-gray-500">
              Run data is needed to generate insights.
            </p>
          </div>
        ) : (
          <InsightsTabContent
            activeTab={activeTab}
            user={user}
            runs={runs}
          />
        )}
      </main>
    </div>
  );
};
