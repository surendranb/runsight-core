import React from 'react';
import { 
  BarChart3, 
  Trophy, 
  Calendar, 
  CloudRain, 
  TrendingUp 
} from 'lucide-react';

export type InsightsTab = 'overview' | 'performance' | 'training' | 'environment' | 'analysis';

interface TabConfig {
  id: InsightsTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

const TAB_CONFIGS: TabConfig[] = [
  // HIDDEN: Overview tab - content redistributed to other tabs
  // {
  //   id: 'overview',
  //   label: 'Overview',
  //   icon: BarChart3,
  //   description: 'Key insights and monthly summary'
  // },
  {
    id: 'performance',
    label: 'Performance',
    icon: Trophy,
    description: 'Personal records and metrics'
  },
  {
    id: 'training',
    label: 'Training',
    icon: Calendar,
    description: 'Consistency and patterns'
  },
  {
    id: 'environment',
    label: 'Environment',
    icon: CloudRain,
    description: 'Weather, time, and location'
  },
  // HIDDEN: Analysis tab - sparse content, not valuable
  // {
  //   id: 'analysis',
  //   label: 'Analysis',
  //   icon: TrendingUp,
  //   description: 'Advanced analytics'
  // }
];

interface TabButtonProps {
  config: TabConfig;
  isActive: boolean;
  onClick: () => void;
}

const TabButton: React.FC<TabButtonProps> = ({ config, isActive, onClick }) => {
  const Icon = config.icon;
  
  return (
    <button
      onClick={onClick}
      className={`
        flex items-center space-x-2 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200
        min-h-[44px] min-w-[44px] select-none
        md:px-6 md:py-3
        ${isActive 
          ? 'bg-blue-600 text-white shadow-sm' 
          : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50 active:bg-gray-100'
        }
      `}
      role="tab"
      aria-selected={isActive}
      aria-controls={`${config.id}-panel`}
      id={`${config.id}-tab`}
      title={config.description}
      style={{ 
        WebkitTapHighlightColor: 'transparent',
        touchAction: 'manipulation'
      }}
    >
      <Icon className="w-4 h-4 flex-shrink-0" />
      <span className="whitespace-nowrap">{config.label}</span>
    </button>
  );
};

interface InsightsTabNavigationProps {
  activeTab: InsightsTab;
  onTabChange: (tab: InsightsTab) => void;
  className?: string;
}

export const InsightsTabNavigation: React.FC<InsightsTabNavigationProps> = ({
  activeTab,
  onTabChange,
  className = ''
}) => {
  const handleKeyDown = (event: React.KeyboardEvent, tabId: InsightsTab) => {
    const currentIndex = TAB_CONFIGS.findIndex(config => config.id === tabId);
    let newIndex = currentIndex;

    switch (event.key) {
      case 'ArrowLeft':
        event.preventDefault();
        newIndex = currentIndex > 0 ? currentIndex - 1 : TAB_CONFIGS.length - 1;
        break;
      case 'ArrowRight':
        event.preventDefault();
        newIndex = currentIndex < TAB_CONFIGS.length - 1 ? currentIndex + 1 : 0;
        break;
      case 'Home':
        event.preventDefault();
        newIndex = 0;
        break;
      case 'End':
        event.preventDefault();
        newIndex = TAB_CONFIGS.length - 1;
        break;
      default:
        return;
    }

    onTabChange(TAB_CONFIGS[newIndex].id);
  };

  return (
    <div className={`border-b border-gray-200 ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <nav 
          className="flex space-x-1 overflow-x-auto scrollbar-hide py-4"
          role="tablist"
          aria-label="Insights navigation"
        >
          {TAB_CONFIGS.map((config) => (
            <div
              key={config.id}
              onKeyDown={(e) => handleKeyDown(e, config.id)}
            >
              <TabButton
                config={config}
                isActive={activeTab === config.id}
                onClick={() => onTabChange(config.id)}
              />
            </div>
          ))}
        </nav>
      </div>
    </div>
  );
};

export { TAB_CONFIGS };