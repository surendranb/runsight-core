import React from 'react';

/**
 * User Preferences System - External Memory Implementation
 * Stores user preferences persistently across sessions to reduce cognitive load
 */

export interface UserPreferences {
  // Dashboard preferences
  dashboard: {
    defaultTimePeriod: string;
    expandedSections: Record<string, boolean>;
    preferredChartTypes: Record<string, string>;
    showWeatherIndicators: boolean;
    showMovingAverage: boolean;
    highlightPersonalRecords: boolean;
  };
  
  // Insights preferences
  insights: {
    preferredInsightTypes: string[];
    hiddenInsights: string[];
    insightSortOrder: 'importance' | 'confidence' | 'recent';
  };
  
  // Help and onboarding preferences
  help: {
    dismissedTooltips: string[];
    completedOnboarding: string[];
    preferredHelpLevel: 'basic' | 'detailed' | 'expert';
    showContextualHelp: boolean;
  };
  
  // Interaction preferences
  interactions: {
    preferredUnits: 'metric' | 'imperial';
    dateFormat: 'relative' | 'absolute';
    timeFormat: '12h' | '24h';
    chartAnimations: boolean;
  };
  
  // Privacy and data preferences
  privacy: {
    shareUsageData: boolean;
    cachePreferences: boolean;
  };
  
  // Metadata
  meta: {
    version: string;
    lastUpdated: string;
    userId?: string;
  };
}

const DEFAULT_PREFERENCES: UserPreferences = {
  dashboard: {
    defaultTimePeriod: 'last30',
    expandedSections: {},
    preferredChartTypes: {},
    showWeatherIndicators: true,
    showMovingAverage: true,
    highlightPersonalRecords: true,
  },
  insights: {
    preferredInsightTypes: [],
    hiddenInsights: [],
    insightSortOrder: 'importance',
  },
  help: {
    dismissedTooltips: [],
    completedOnboarding: [],
    preferredHelpLevel: 'basic',
    showContextualHelp: true,
  },
  interactions: {
    preferredUnits: 'metric',
    dateFormat: 'relative',
    timeFormat: '24h',
    chartAnimations: true,
  },
  privacy: {
    shareUsageData: false,
    cachePreferences: true,
  },
  meta: {
    version: '1.0.0',
    lastUpdated: new Date().toISOString(),
  },
};

const STORAGE_KEY = 'runsight_user_preferences';
const STORAGE_VERSION = '1.0.0';

/**
 * User Preferences Manager - Handles persistent storage and retrieval
 */
export class UserPreferencesManager {
  private preferences: UserPreferences;
  private listeners: Set<(preferences: UserPreferences) => void> = new Set();

  constructor() {
    this.preferences = this.loadPreferences();
  }

  /**
   * Load preferences from localStorage with fallback to defaults
   */
  private loadPreferences(): UserPreferences {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        return { ...DEFAULT_PREFERENCES };
      }

      const parsed = JSON.parse(stored);
      
      // Version check and migration if needed
      if (parsed.meta?.version !== STORAGE_VERSION) {
        return this.migratePreferences(parsed);
      }

      // Merge with defaults to ensure all properties exist
      return this.mergeWithDefaults(parsed);
    } catch (error) {
      console.warn('Failed to load user preferences, using defaults:', error);
      return { ...DEFAULT_PREFERENCES };
    }
  }

  /**
   * Save preferences to localStorage
   */
  private savePreferences(): void {
    try {
      this.preferences.meta.lastUpdated = new Date().toISOString();
      this.preferences.meta.version = STORAGE_VERSION;
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.preferences));
      
      // Notify listeners
      this.listeners.forEach(listener => listener(this.preferences));
    } catch (error) {
      console.error('Failed to save user preferences:', error);
    }
  }

  /**
   * Migrate preferences from older versions
   */
  private migratePreferences(oldPreferences: any): UserPreferences {
    // For now, just merge with defaults
    // In the future, add specific migration logic here
    console.log('Migrating preferences from version', oldPreferences.meta?.version, 'to', STORAGE_VERSION);
    return this.mergeWithDefaults(oldPreferences);
  }

  /**
   * Merge stored preferences with defaults to ensure all properties exist
   */
  private mergeWithDefaults(stored: any): UserPreferences {
    const merged = { ...DEFAULT_PREFERENCES };
    
    // Deep merge each section
    Object.keys(DEFAULT_PREFERENCES).forEach(key => {
      if (stored[key] && typeof stored[key] === 'object') {
        merged[key as keyof UserPreferences] = {
          ...DEFAULT_PREFERENCES[key as keyof UserPreferences],
          ...stored[key]
        } as any;
      }
    });
    
    return merged;
  }

  /**
   * Get current preferences
   */
  getPreferences(): UserPreferences {
    return { ...this.preferences };
  }

  /**
   * Get a specific preference section
   */
  getSection<K extends keyof UserPreferences>(section: K): UserPreferences[K] {
    return { ...this.preferences[section] };
  }

  /**
   * Update preferences (partial update supported)
   */
  updatePreferences(updates: Partial<UserPreferences>): void {
    // Deep merge updates
    Object.keys(updates).forEach(key => {
      const typedKey = key as keyof UserPreferences;
      if (updates[typedKey] && typeof updates[typedKey] === 'object') {
        this.preferences[typedKey] = {
          ...this.preferences[typedKey],
          ...updates[typedKey]
        } as any;
      } else if (updates[typedKey] !== undefined) {
        this.preferences[typedKey] = updates[typedKey] as any;
      }
    });

    this.savePreferences();
  }

  /**
   * Update a specific section
   */
  updateSection<K extends keyof UserPreferences>(
    section: K, 
    updates: Partial<UserPreferences[K]>
  ): void {
    this.preferences[section] = {
      ...this.preferences[section],
      ...updates
    } as UserPreferences[K];

    this.savePreferences();
  }

  /**
   * Reset preferences to defaults
   */
  resetPreferences(): void {
    this.preferences = { ...DEFAULT_PREFERENCES };
    this.savePreferences();
  }

  /**
   * Reset a specific section to defaults
   */
  resetSection<K extends keyof UserPreferences>(section: K): void {
    this.preferences[section] = { ...DEFAULT_PREFERENCES[section] };
    this.savePreferences();
  }

  /**
   * Subscribe to preference changes
   */
  subscribe(listener: (preferences: UserPreferences) => void): () => void {
    this.listeners.add(listener);
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Record user interaction for smart defaults
   */
  recordInteraction(type: string, data: any): void {
    // This could be expanded to track user behavior patterns
    console.log('User interaction recorded:', type, data);
    
    // Example: Remember frequently used time periods
    if (type === 'timePeriodChange') {
      this.updateSection('dashboard', {
        defaultTimePeriod: data.period
      });
    }
    
    // Example: Remember expanded sections
    if (type === 'sectionToggle') {
      const expandedSections = { ...this.preferences.dashboard.expandedSections };
      expandedSections[data.section] = data.expanded;
      
      this.updateSection('dashboard', {
        expandedSections
      });
    }
  }

  /**
   * Dismiss a tooltip permanently
   */
  dismissTooltip(tooltipId: string): void {
    const dismissedTooltips = [...this.preferences.help.dismissedTooltips];
    if (!dismissedTooltips.includes(tooltipId)) {
      dismissedTooltips.push(tooltipId);
      this.updateSection('help', { dismissedTooltips });
    }
  }

  /**
   * Check if a tooltip should be shown
   */
  shouldShowTooltip(tooltipId: string): boolean {
    return !this.preferences.help.dismissedTooltips.includes(tooltipId);
  }

  /**
   * Mark onboarding step as completed
   */
  completeOnboardingStep(stepId: string): void {
    const completedOnboarding = [...this.preferences.help.completedOnboarding];
    if (!completedOnboarding.includes(stepId)) {
      completedOnboarding.push(stepId);
      this.updateSection('help', { completedOnboarding });
    }
  }

  /**
   * Check if onboarding step is completed
   */
  isOnboardingCompleted(stepId: string): boolean {
    return this.preferences.help.completedOnboarding.includes(stepId);
  }

  /**
   * Get smart defaults based on user preferences and behavior
   */
  getSmartDefaults() {
    return {
      timePeriod: this.preferences.dashboard.defaultTimePeriod,
      expandedSections: this.preferences.dashboard.expandedSections,
      chartSettings: {
        showWeatherIndicators: this.preferences.dashboard.showWeatherIndicators,
        showMovingAverage: this.preferences.dashboard.showMovingAverage,
        highlightPersonalRecords: this.preferences.dashboard.highlightPersonalRecords,
      },
      helpLevel: this.preferences.help.preferredHelpLevel,
      showContextualHelp: this.preferences.help.showContextualHelp,
    };
  }

  /**
   * Export preferences for backup
   */
  exportPreferences(): string {
    return JSON.stringify(this.preferences, null, 2);
  }

  /**
   * Import preferences from backup
   */
  importPreferences(preferencesJson: string): boolean {
    try {
      const imported = JSON.parse(preferencesJson);
      this.preferences = this.mergeWithDefaults(imported);
      this.savePreferences();
      return true;
    } catch (error) {
      console.error('Failed to import preferences:', error);
      return false;
    }
  }
}

// Global instance
export const userPreferences = new UserPreferencesManager();

// React hook for using preferences in components
export const useUserPreferences = () => {
  const [preferences, setPreferences] = React.useState(userPreferences.getPreferences());

  React.useEffect(() => {
    const unsubscribe = userPreferences.subscribe(setPreferences);
    return unsubscribe;
  }, []);

  return {
    preferences,
    updatePreferences: userPreferences.updatePreferences.bind(userPreferences),
    updateSection: userPreferences.updateSection.bind(userPreferences),
    recordInteraction: userPreferences.recordInteraction.bind(userPreferences),
    dismissTooltip: userPreferences.dismissTooltip.bind(userPreferences),
    shouldShowTooltip: userPreferences.shouldShowTooltip.bind(userPreferences),
    getSmartDefaults: userPreferences.getSmartDefaults.bind(userPreferences),
  };
};

import React from 'react';