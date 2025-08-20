// src/components/NavigationBar.tsx
import React, { useState } from 'react';
import { Menu, X, Activity, BarChart3, Target, Settings as SettingsIcon, RefreshCw, HelpCircle, Zap, Github } from 'lucide-react';
import { StandardDropdown } from './common/StandardButton';
import { Heading } from './common/VisualHierarchy';

type View = 'dashboard' | 'insights' | 'advanced' | string;

// Update SyncPeriod type to include specific string literals
export type SyncPeriod = "14days" | "30days" | "60days" | "90days" | "thisYear" | "lastYear" | "allTime";

interface NavigationBarProps {
  currentView: View;
  onNavigate: (view: View) => void;
  userName?: string;
  onLogout?: () => void;
  onSyncData?: (period: SyncPeriod) => void; // Modified to pass SyncPeriod
  isSyncing?: boolean;
}

// ... (NavItem component remains the same)
const NavItem: React.FC<any> = ({ label, viewName, isActive, isDisabled, onClick }) => {
  const activeClasses = "bg-blue-600 text-white";
  const inactiveClasses = "text-gray-700 hover:bg-blue-500 hover:text-white";
  const disabledClasses = "text-gray-400 cursor-not-allowed";

  let classes = "px-3 py-2 rounded-md text-sm font-medium transition-colors";
  if (isDisabled) {
    classes += ` ${disabledClasses}`;
  } else if (isActive) {
    classes += ` ${activeClasses}`;
  } else {
    classes += ` ${inactiveClasses}`;
  }
  return (
    <button onClick={() => !isDisabled && onClick(viewName)} className={classes} disabled={isDisabled} aria-current={isActive ? 'page' : undefined}>
      {label}
    </button>
  );
};


export const NavigationBar: React.FC<NavigationBarProps> = ({
    currentView,
    onNavigate,
    userName,
    onLogout,
    onSyncData,
    isSyncing
}) => {
  const [selectedSyncPeriod, setSelectedSyncPeriod] = useState<SyncPeriod>("30days");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleSyncClick = () => {
    if (onSyncData) {
      onSyncData(selectedSyncPeriod);
    }
  };

  // Simplified navigation following Gmail/LinkedIn patterns
  const navItems = [
    { 
      label: "Overview",
      viewName: "dashboard", 
      icon: Activity, 
      isDisabled: false
    },
    { 
      label: "Insights",
      viewName: "insights", 
      icon: BarChart3, 
      isDisabled: false
    },
    { 
      label: "Advanced",
      viewName: "advanced", 
      icon: Zap, 
      isDisabled: false
    }
  ];

  return (
    <nav className="bg-white shadow-lg border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left side: App Name & Desktop Navigation */}
          <div className="flex items-center">
            <div className="flex items-center space-x-2">
              <Activity className="w-8 h-8 text-blue-600" />
              <Heading level={3} emphasis="accent" className="text-blue-600">
                RunSight
              </Heading>
            </div>
            
            {/* Clean Desktop Navigation - Gmail/LinkedIn Style with Fitts's Law compliance */}
            <div className="hidden md:flex items-center ml-8 space-x-1">
              {navItems.map((item) => {
                const IconComponent = item.icon;
                const isActive = currentView === item.viewName;
                return (
                  <button
                    key={item.viewName}
                    onClick={() => !item.isDisabled && onNavigate(item.viewName)}
                    disabled={item.isDisabled}
                    className={`flex items-center min-h-[36px] min-w-[36px] px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 select-none ${
                      item.isDisabled
                        ? 'text-gray-400 cursor-not-allowed opacity-50'
                        : isActive
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900 active:bg-gray-200'
                    }`}
                    aria-current={isActive ? 'page' : undefined}
                    title={item.isDisabled ? 'Coming soon' : `Go to ${item.label}`}
                    style={{ 
                      WebkitTapHighlightColor: 'transparent',
                      touchAction: 'manipulation'
                    }}
                  >
                    <IconComponent className="w-4 h-4 mr-2 flex-shrink-0" />
                    <span className="whitespace-nowrap">{item.label}</span>
                  </button>
                );
              })}
              <a
                href="https://github.com/surendranb/runsight-core"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center min-h-[36px] min-w-[36px] px-4 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900 active:bg-gray-200 transition-all duration-200 select-none"
                title="Star on GitHub"
                style={{ 
                  WebkitTapHighlightColor: 'transparent',
                  touchAction: 'manipulation'
                }}
              >
                <Github className="w-4 h-4 mr-2 flex-shrink-0" />
                <span className="whitespace-nowrap">GitHub</span>
              </a>
            </div>
          </div>

          {/* Right side: Sync Controls & User Menu */}
          <div className="flex items-center space-x-3">
            {/* Standardized Sync Controls */}
            {onSyncData && (
              <div className="hidden sm:flex items-center space-x-3 bg-gray-50 rounded-lg p-1">
                <StandardDropdown
                  options={SYNC_OPTIONS}
                  value={selectedSyncPeriod}
                  onChange={(value) => setSelectedSyncPeriod(value as SyncPeriod)}
                  disabled={isSyncing}
                  size="sm"
                  className="min-w-32"
                />
                
                <button
                  onClick={handleSyncClick}
                  disabled={isSyncing}
                  className={`flex items-center min-h-[36px] min-w-[36px] px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 select-none ${
                    isSyncing
                      ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white shadow-sm'
                  }`}
                  title={isSyncing ? 'Syncing...' : 'Sync from Strava'}
                  style={{ 
                    WebkitTapHighlightColor: 'transparent',
                    touchAction: 'manipulation'
                  }}
                >
                  <RefreshCw className={`w-4 h-4 mr-2 flex-shrink-0 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span className="whitespace-nowrap">{isSyncing ? 'Syncing' : 'Sync'}</span>
                </button>
              </div>
            )}



            {/* Logout Button - Hidden on mobile */}
            {onLogout && (
              <button
                onClick={onLogout}
                className="hidden sm:flex items-center min-h-[36px] min-w-[36px] px-4 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 active:bg-red-100 transition-all duration-200 select-none"
                style={{ 
                  WebkitTapHighlightColor: 'transparent',
                  touchAction: 'manipulation'
                }}
              >
                <span className="whitespace-nowrap">Logout</span>
              </button>
            )}

            {/* Mobile Menu Button - Fitts's Law compliant */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden min-h-[44px] min-w-[44px] p-3 rounded-lg text-gray-600 hover:bg-gray-100 active:bg-gray-200 transition-all duration-200 select-none flex items-center justify-center"
              aria-label="Toggle mobile menu"
              style={{ 
                WebkitTapHighlightColor: 'transparent',
                touchAction: 'manipulation'
              }}
            >
              {isMobileMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 bg-white">
            <div className="px-2 pt-2 pb-3 space-y-1">
              {navItems.map((item) => {
                const IconComponent = item.icon;
                const isActive = currentView === item.viewName;
                return (
                  <button
                    key={item.viewName}
                    onClick={() => {
                      if (!item.isDisabled) {
                        onNavigate(item.viewName);
                        setIsMobileMenuOpen(false);
                      }
                    }}
                    disabled={item.isDisabled}
                    className={`flex items-center w-full min-h-[48px] px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 select-none ${
                      item.isDisabled
                        ? 'text-gray-400 cursor-not-allowed opacity-50'
                        : isActive
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-700 hover:bg-gray-100 active:bg-gray-200'
                    }`}
                    style={{ 
                      WebkitTapHighlightColor: 'transparent',
                      touchAction: 'manipulation'
                    }}
                  >
                    <IconComponent className="w-5 h-5 mr-3 flex-shrink-0" />
                    <span className="flex-1 text-left">{item.label}</span>
                    {item.isDisabled && (
                      <span className="ml-auto text-xs text-gray-400">Soon</span>
                    )}
                  </button>
                );
              })}
              <a
                href="https://github.com/surendranb/runsight-core"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center w-full min-h-[48px] px-4 py-3 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 active:bg-gray-200 transition-all duration-200 select-none"
                style={{ 
                  WebkitTapHighlightColor: 'transparent',
                  touchAction: 'manipulation'
                }}
              >
                <Github className="w-5 h-5 mr-3 flex-shrink-0" />
                <span className="flex-1 text-left">Star on GitHub</span>
              </a>
              
              {/* Mobile Sync Controls */}
              {onSyncData && (
                <div className="pt-3 border-t border-gray-200">
                  <div className="px-3 py-2">
                    <div className="flex items-center space-x-2 mb-3">
                      <StandardDropdown
                        options={SYNC_OPTIONS}
                        value={selectedSyncPeriod}
                        onChange={(value) => setSelectedSyncPeriod(value as SyncPeriod)}
                        disabled={isSyncing}
                        size="md"
                        className="flex-1"
                      />
                      <button
                        onClick={() => {
                          handleSyncClick();
                          setIsMobileMenuOpen(false);
                        }}
                        disabled={isSyncing}
                        className={`flex items-center min-h-[44px] px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 select-none ${
                          isSyncing
                            ? 'bg-gray-400 text-gray-700 cursor-not-allowed'
                            : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white'
                        }`}
                        style={{ 
                          WebkitTapHighlightColor: 'transparent',
                          touchAction: 'manipulation'
                        }}
                      >
                        <RefreshCw className={`w-4 h-4 mr-2 flex-shrink-0 ${isSyncing ? 'animate-spin' : ''}`} />
                        <span>{isSyncing ? 'Syncing' : 'Sync'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Mobile User Info & Logout */}
              <div className="pt-3 border-t border-gray-200">
                {userName && (
                  <div className="px-3 py-2 text-sm text-gray-700">
                    Logged in as <span className="font-medium">{userName}</span>
                  </div>
                )}
                {onLogout && (
                  <button
                    onClick={() => {
                      onLogout();
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full flex items-center min-h-[48px] px-4 py-3 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 active:bg-red-100 transition-all duration-200 select-none"
                    style={{ 
                      WebkitTapHighlightColor: 'transparent',
                      touchAction: 'manipulation'
                    }}
                  >
                    <span className="text-left">Logout</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

const SYNC_OPTIONS = [
  { label: "Last 14 Days", value: "14days" },
  { label: "Last 30 Days", value: "30days" },
  { label: "Last 60 Days", value: "60days" },
  { label: "Last 90 Days", value: "90days" },
  { label: "This Year", value: "thisYear" },
  { label: "Last Year", value: "lastYear" },
  { label: "All Time", value: "allTime" },
];
