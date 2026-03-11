import React, { useState } from 'react';
import { User, EnrichedRun } from '../types';
import {
  Activity,
  Zap,
  CloudRain,
  Timer,
  AlertTriangle,
  Trophy,
  Settings
} from 'lucide-react';
import TrainingLoadDashboard from './training/TrainingLoadDashboard';
import { AdvancedPacingAnalysis } from './training/AdvancedPacingAnalysis';
import PowerZonesAnalysis from './training/PowerZonesAnalysis';
import EnvironmentalAnalysis from './training/EnvironmentalAnalysis';
import InjuryRiskAnalysis from './training/InjuryRiskAnalysis';
import RacePredictions from './training/RacePredictions';
import { useUserPhysiologyNetlify } from '../hooks/useUserPhysiologyNetlify';
import { UserProfileSetup } from './common/UserProfileSetup';

interface AdvancedPageProps {
  user: User;
  runs: EnrichedRun[];
  isLoading: boolean;
  error: string | null;
}

type AdvancedView = 'training-load' | 'power-zones' | 'environmental' | 'pacing' | 'injury-risk' | 'race-predictions';

interface AdvancedNavItem {
  id: AdvancedView;
  label: string;
  icon: React.ComponentType<any>;
  description: string;
  isImplemented: boolean;
}

interface AdvancedTabGuidance {
  headline: string;
  subtext: string;
}

const advancedNavItems: AdvancedNavItem[] = [
  {
    id: 'training-load',
    label: 'Training Load',
    icon: Activity,
    description: 'Load, fatigue, readiness, and recent TRIMP trends',
    isImplemented: true
  },
  {
    id: 'power-zones',
    label: 'Power & Zones',
    icon: Zap,
    description: 'Estimated running power and training zones',
    isImplemented: true
  },
  {
    id: 'environmental',
    label: 'Environmental',
    icon: CloudRain,
    description: 'How conditions change pace, effort, and heat stress',
    isImplemented: true
  },
  {
    id: 'pacing',
    label: 'Pacing Analysis',
    icon: Timer,
    description: 'Pacing discipline, fatigue resistance, and race execution',
    isImplemented: true
  },
  {
    id: 'injury-risk',
    label: 'Injury Risk',
    icon: AlertTriangle,
    description: 'Overreaching signals and injury-risk indicators',
    isImplemented: true
  },
  {
    id: 'race-predictions',
    label: 'Race Predictions',
    icon: Trophy,
    description: 'Evidence-based race targets and pacing guidance',
    isImplemented: true
  }
];

const advancedTabGuidance: Record<AdvancedView, AdvancedTabGuidance> = {
  'training-load': {
    headline: 'Use this when you are deciding whether to push, hold steady, or back off for a few days.',
    subtext: 'It pulls together recent load, longer-term fitness, recovery balance, and the sessions creating that load so you can judge what your body is most likely to absorb next.'
  },
  'power-zones': {
    headline: 'Use this when pace stops telling the whole story and effort matters more.',
    subtext: 'Estimated running power and zones help you compare easy, steady, and hard work across hills, heat, and different routes without pretending every run happened in the same conditions.'
  },
  environmental: {
    headline: 'Use this to separate a tough day from a drop in fitness.',
    subtext: 'It looks at heat, humidity, wind, and related context so you can see when the conditions shaped the run more than your form did.'
  },
  pacing: {
    headline: 'Use this to spot whether you start too hard, fade late, or finish well.',
    subtext: 'The view focuses on pacing shape and fatigue behaviour across your runs so you can improve race execution and steadier efforts without obsessing over tiny split differences.'
  },
  'injury-risk': {
    headline: 'Use this as an early warning surface, not a diagnosis.',
    subtext: 'It watches how load, recovery, and recent training history line up so you can catch overreaching early and step back before a rough patch turns into a layoff.'
  },
  'race-predictions': {
    headline: 'Use this to turn recent training into race goals you could realistically chase.',
    subtext: 'The estimates weigh recent runs, heart-rate coverage, long-run evidence, and profile data, so shorter races are usually firmer than longer ones unless your training says otherwise.'
  }
};

export const AdvancedPage: React.FC<AdvancedPageProps> = ({
  user,
  runs,
  isLoading,
  error
}) => {
  const [currentView, setCurrentView] = useState<AdvancedView>('training-load');
  const [isProfileSetupOpen, setIsProfileSetupOpen] = useState(false);
  const { data: userPhysiology, updateData } = useUserPhysiologyNetlify(user.id);

  const isProfileComplete = Boolean(
    userPhysiology.maxHeartRate &&
      userPhysiology.restingHeartRate &&
      userPhysiology.bodyWeight &&
      userPhysiology.age
  );
  const tabGuidance = advancedTabGuidance[currentView];

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading advanced metrics...</span>
        </div>
      );
    }

    if (error) {
      return (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center">
            <AlertTriangle className="w-5 h-5 text-red-600 mr-2" />
            <h3 className="text-red-800 font-medium">Error Loading Data</h3>
          </div>
          <p className="text-red-700 mt-2">{error}</p>
        </div>
      );
    }

    switch (currentView) {
      case 'training-load':
        return <TrainingLoadDashboard user={user} runs={runs} userPhysiology={userPhysiology} />;
      case 'pacing':
        return <AdvancedPacingAnalysis runs={runs} />;
      case 'power-zones':
        return <PowerZonesAnalysis runs={runs} user={user} userPhysiology={userPhysiology} />;
      case 'environmental':
        return <EnvironmentalAnalysis runs={runs} />;
      case 'injury-risk':
        return <InjuryRiskAnalysis runs={runs} />;
      case 'race-predictions':
        return <RacePredictions user={user} runs={runs} userPhysiology={userPhysiology} />;
      default:
        return <TrainingLoadDashboard user={user} runs={runs} userPhysiology={userPhysiology} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-4">
            <div className="flex flex-col gap-4 mb-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center">
                <Zap className="w-6 h-6 text-blue-600 mr-2" />
                <h1 className="text-2xl font-bold text-gray-900">Advanced Analytics</h1>
              </div>
              <button
                onClick={() => setIsProfileSetupOpen(true)}
                className="inline-flex items-center justify-center rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 transition-colors hover:bg-blue-100"
              >
                <Settings className="mr-2 h-4 w-4" />
                {isProfileComplete ? 'Edit Profile' : 'Set Up Profile'}
              </button>
            </div>
            <p className="text-gray-600 mb-6">
              Use these views when you want more than a summary: load, pacing, conditions, and race readiness.
            </p>
            {!isProfileComplete && (
              <p className="mb-4 text-sm text-amber-700">
                Complete your profile to improve power, training load, and race prediction accuracy.
              </p>
            )}

            <div className="flex space-x-1 overflow-x-auto pb-2">
              {advancedNavItems.map((item) => {
                const IconComponent = item.icon;
                const isActive = currentView === item.id;
                const isImplemented = item.isImplemented;

                return (
                  <button
                    key={item.id}
                    onClick={() => isImplemented && setCurrentView(item.id)}
                    disabled={!isImplemented}
                    className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all duration-200 ${
                      !isImplemented
                        ? 'text-gray-400 cursor-not-allowed opacity-60'
                        : isActive
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                    title={!isImplemented ? 'Coming soon' : item.description}
                  >
                    <IconComponent className="w-4 h-4 mr-2" />
                    {item.label}
                  </button>
                );
              })}
            </div>

            <div className="mt-4 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                How to read this view
              </p>
              <p className="mt-1 text-base font-medium text-blue-950">
                {tabGuidance.headline}
              </p>
              <p className="mt-2 text-sm text-blue-800">
                {tabGuidance.subtext}
              </p>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderContent()}
      </main>

      <UserProfileSetup
        isOpen={isProfileSetupOpen}
        onClose={() => setIsProfileSetupOpen(false)}
        onSave={async (data) => {
          const success = await updateData(data);
          if (success) {
            setIsProfileSetupOpen(false);
          }
        }}
        initialData={userPhysiology}
        title="Edit Your Training Profile"
        description="Manage the physiology data used for power estimates, training load, and race predictions."
      />
    </div>
  );
};

export default AdvancedPage;
