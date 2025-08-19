import React, { useState } from 'react';
import { User, EnrichedRun } from '../types';
import { 
  Activity, 
  Zap, 
  CloudRain, 
  Timer, 
  AlertTriangle, 
  Trophy,
  TrendingUp,
  Settings
} from 'lucide-react';
import TrainingLoadDashboard from './training/TrainingLoadDashboard';
import { AdvancedPacingAnalysis } from './training/AdvancedPacingAnalysis';
import PowerZonesAnalysis from './training/PowerZonesAnalysis';
import EnvironmentalAnalysis from './training/EnvironmentalAnalysis';
import InjuryRiskAnalysis from './training/InjuryRiskAnalysis';
import RacePredictions from './training/RacePredictions';

interface AdvancedPageProps {
  user: User;
  runs: EnrichedRun[];
  isLoading: boolean;
  error: string | null;
}

type AdvancedView = 'overview' | 'training-load' | 'power-zones' | 'environmental' | 'pacing' | 'injury-risk' | 'race-predictions';

interface AdvancedNavItem {
  id: AdvancedView;
  label: string;
  icon: React.ComponentType<any>;
  description: string;
  isImplemented: boolean;
}

const advancedNavItems: AdvancedNavItem[] = [
  {
    id: 'overview',
    label: 'Overview',
    icon: TrendingUp,
    description: 'Advanced metrics summary and feature discovery',
    isImplemented: true
  },
  {
    id: 'training-load',
    label: 'Training Load',
    icon: Activity,
    description: 'ACWR, TRIMP, CTL/ATL/TSB analysis',
    isImplemented: true
  },
  {
    id: 'power-zones',
    label: 'Power & Zones',
    icon: Zap,
    description: 'Running power estimation and personalized training zones',
    isImplemented: true
  },
  {
    id: 'environmental',
    label: 'Environmental',
    icon: CloudRain,
    description: 'Weather impact analysis and heat stress monitoring',
    isImplemented: true
  },
  {
    id: 'pacing',
    label: 'Pacing Analysis',
    icon: Timer,
    description: 'Negative split probability and fatigue resistance',
    isImplemented: true
  },
  {
    id: 'injury-risk',
    label: 'Injury Risk',
    icon: AlertTriangle,
    description: 'Overreaching detection and injury prevention',
    isImplemented: true
  },
  {
    id: 'race-predictions',
    label: 'Race Predictions',
    icon: Trophy,
    description: 'Sophisticated race time predictions with confidence intervals',
    isImplemented: true
  }
];

export const AdvancedPage: React.FC<AdvancedPageProps> = ({
  user,
  runs,
  isLoading,
  error
}) => {
  const [currentView, setCurrentView] = useState<AdvancedView>('overview');

  // Let components use their own local user physiology data from localStorage
  // This allows the useUserPhysiology hook to work properly

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
      case 'overview':
        return <AdvancedOverview runs={runs} onNavigate={setCurrentView} />;
      case 'training-load':
        return <TrainingLoadDashboard runs={runs} />;
      case 'pacing':
        return <AdvancedPacingAnalysis runs={runs} />;
      case 'power-zones':
        return <PowerZonesAnalysis runs={runs} user={user} />;
      case 'environmental':
        return <EnvironmentalAnalysis runs={runs} />;
      case 'injury-risk':
        return <InjuryRiskAnalysis runs={runs} />;
      case 'race-predictions':
        return <RacePredictions runs={runs} />;
      default:
        return <AdvancedOverview runs={runs} onNavigate={setCurrentView} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Advanced Navigation Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-4">
            <div className="flex items-center mb-4">
              <Zap className="w-6 h-6 text-blue-600 mr-2" />
              <h1 className="text-2xl font-bold text-gray-900">Advanced Analytics</h1>
            </div>
            <p className="text-gray-600 mb-6">
              Sophisticated training metrics and performance analysis for serious runners
            </p>
            
            {/* Sub-navigation */}
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
                    {!isImplemented && (
                      <span className="ml-2 text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded">
                        Soon
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderContent()}
      </main>
    </div>
  );
};

// Advanced Overview Component
const AdvancedOverview: React.FC<{
  runs: EnrichedRun[];
  onNavigate: (view: AdvancedView) => void;
}> = ({ runs, onNavigate }) => {
  const implementedFeatures = advancedNavItems.filter(item => item.isImplemented);
  const comingSoonFeatures = advancedNavItems.filter(item => !item.isImplemented);

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-8 text-white">
        <h2 className="text-3xl font-bold mb-4">Welcome to Advanced Analytics</h2>
        <p className="text-blue-100 text-lg mb-6">
          Unlock sophisticated training insights that were previously only available to elite athletes and professional coaches.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold">{runs.length}</div>
            <div className="text-blue-100">Total Runs</div>
          </div>
          <div>
            <div className="text-2xl font-bold">{implementedFeatures.length}</div>
            <div className="text-blue-100">Available Features</div>
          </div>
          <div>
            <div className="text-2xl font-bold">{comingSoonFeatures.length}</div>
            <div className="text-blue-100">Coming Soon</div>
          </div>
        </div>
      </div>

      {/* Available Features */}
      <div>
        <h3 className="text-xl font-semibold text-gray-900 mb-6">Available Advanced Features</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {implementedFeatures.map((feature) => {
            if (feature.id === 'overview') return null; // Skip overview in the list
            
            const IconComponent = feature.icon;
            return (
              <div
                key={feature.id}
                onClick={() => onNavigate(feature.id)}
                className="bg-white rounded-lg p-6 shadow-sm border hover:shadow-md transition-shadow cursor-pointer group"
              >
                <div className="flex items-center mb-4">
                  <div className="p-2 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
                    <IconComponent className="w-6 h-6 text-blue-600" />
                  </div>
                  <h4 className="text-lg font-semibold text-gray-900 ml-3">{feature.label}</h4>
                </div>
                <p className="text-gray-600 mb-4">{feature.description}</p>
                <div className="flex items-center text-blue-600 text-sm font-medium group-hover:text-blue-700">
                  Explore Feature
                  <TrendingUp className="w-4 h-4 ml-1" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Coming Soon Features */}
      <div>
        <h3 className="text-xl font-semibold text-gray-900 mb-6">Coming Soon</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {comingSoonFeatures.map((feature) => {
            const IconComponent = feature.icon;
            return (
              <div
                key={feature.id}
                className="bg-white rounded-lg p-6 shadow-sm border opacity-75"
              >
                <div className="flex items-center mb-4">
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <IconComponent className="w-6 h-6 text-gray-400" />
                  </div>
                  <h4 className="text-lg font-semibold text-gray-700 ml-3">{feature.label}</h4>
                  <span className="ml-auto text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded">
                    Soon
                  </span>
                </div>
                <p className="text-gray-500 mb-4">{feature.description}</p>
                <div className="text-gray-400 text-sm">
                  Feature in development
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Getting Started */}
      <div className="bg-white rounded-lg p-6 shadow-sm border">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Advanced Analytics Journey</h3>
        <div className="space-y-4">
          <div className="flex items-start">
            <div className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3 mt-0.5">
              1
            </div>
            <div>
              <h4 className="font-medium text-gray-900">Monitor Training Load</h4>
              <p className="text-gray-600 text-sm">
                Track your ACWR to stay in the optimal training zone (0.8-1.3) and prevent injury while maximizing fitness gains.
              </p>
            </div>
          </div>
          <div className="flex items-start">
            <div className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3 mt-0.5">
              2
            </div>
            <div>
              <h4 className="font-medium text-gray-900">Understand Your Pacing</h4>
              <p className="text-gray-600 text-sm">
                Discover your negative split probability and fatigue resistance to optimize race strategy and training approach.
              </p>
            </div>
          </div>
          <div className="flex items-start">
            <div className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3 mt-0.5">
              3
            </div>
            <div>
              <h4 className="font-medium text-gray-900">Optimize Performance</h4>
              <p className="text-gray-600 text-sm">
                Use power estimation, environmental analysis, and injury risk detection to fine-tune your training.
              </p>
            </div>
          </div>
        </div>
        
        {runs.length < 10 && (
          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center">
              <AlertTriangle className="w-5 h-5 text-yellow-600 mr-2" />
              <h4 className="font-medium text-yellow-800">Need More Data</h4>
            </div>
            <p className="text-yellow-700 text-sm mt-1">
              You have {runs.length} runs. Advanced analytics work best with 15+ runs for reliable insights.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

// Coming Soon Component
const ComingSoonView: React.FC<{ feature: AdvancedNavItem }> = ({ feature }) => {
  const IconComponent = feature.icon;
  
  return (
    <div className="bg-white rounded-lg p-12 text-center shadow-sm border">
      <div className="p-4 bg-gray-100 rounded-full inline-block mb-6">
        <IconComponent className="w-12 h-12 text-gray-400" />
      </div>
      <h2 className="text-2xl font-semibold text-gray-900 mb-4">{feature.label}</h2>
      <p className="text-gray-600 mb-6 max-w-md mx-auto">
        {feature.description}
      </p>
      <div className="bg-blue-50 rounded-lg p-6 max-w-lg mx-auto">
        <h3 className="font-medium text-blue-900 mb-2">Coming Soon</h3>
        <p className="text-blue-700 text-sm">
          This advanced feature is currently in development. We're working hard to bring you 
          sophisticated analytics that will help optimize your training and performance.
        </p>
      </div>
      <div className="mt-8">
        <Settings className="w-6 h-6 text-gray-400 mx-auto mb-2" />
        <p className="text-sm text-gray-500">
          Feature development in progress
        </p>
      </div>
    </div>
  );
};

export default AdvancedPage;