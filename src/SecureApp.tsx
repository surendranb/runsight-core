// src/SecureApp.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useSecureAuth } from './hooks/useSecureAuth';
import SecureStravaCallback from './components/SecureStravaCallback';
// Duplicate imports for React, useSecureAuth, SecureStravaCallback removed
import { NavigationBar, SyncPeriod } from './components/NavigationBar';

import { ModernDashboard } from './components/ModernDashboard';
import { InsightsPage } from './components/InsightsPage';
import { AdvancedPage } from './components/AdvancedPage';
import { GoalsPage } from './components/GoalsPage';
import { formatRunDate } from './lib/dateUtils';
import { DebugConsole } from './components/DebugConsole';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { ToastProvider, useToast } from './components/common/ErrorToast';
import { User, EnrichedRun, RunStats } from './types';
import { apiClient } from './lib/secure-api-client';
import { productionErrorHandler } from './lib/production-error-handler';

// View type consistent with NavigationBar and App.tsx's previous definition
type View = 'dashboard' | 'insights' | 'advanced' | 'welcome' | 'callback' | 'loading';

const SecureApp: React.FC = () => {
  const {
    user: authUser,
    isLoading: authLoading,
    error: authError,
    initiateStravaAuth,
    logout: secureLogout,
    clearError: clearAuthError,
    handleStravaCallback // Make sure useSecureAuth exports this
  } = useSecureAuth();

  // Toast hook for error notifications
  const { showError } = useToast();

  // Adapt user object from useSecureAuth if its structure is different, primarily for display name
  // For now, assume components will adapt to use `authUser.name`
  const user = authUser as User | null;

  const [currentView, setCurrentView] = useState<View>('loading');
  const [runs, setRuns] = useState<EnrichedRun[]>([]);
  // REMOVED: const [splits, setSplits] = useState<RunSplit[]>([]);
  const [stats, setStats] = useState<RunStats | null>(null);
  const [dataLoading, setDataLoading] = useState<boolean>(false);
  const [dataError, setDataError] = useState<string | null>(null);

  // Sync specific states
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncProgressMessage, setSyncProgressMessage] = useState<string>('');

  // Debug console state
  const [debugConsoleOpen, setDebugConsoleOpen] = useState<boolean>(false);
  
  // Dashboard toggle state - Modern is now default and only option
  const [useModernDashboard] = useState<boolean>(true);

  // Effect to handle view changes based on auth state (remains mostly the same)
  useEffect(() => {
    // ... (previous logic for setting currentView based on authLoading, user, callback path)
    if (authLoading) {
      setCurrentView('loading');
    } else if (window.location.pathname === '/auth/callback' || window.location.pathname === '/callback') {
      // Callback is handled by SecureStravaCallback component if no user yet
      // If user is hydrated by callback, this effect will run again
      if (!user) {
        setCurrentView('callback');
      } else {
        setCurrentView('dashboard'); // User just authenticated via callback
      }
    } else if (user) {
      setCurrentView('dashboard'); // Default view for logged-in user
    } else {
      setCurrentView('welcome'); // No user, not loading, not callback -> show welcome/login
    }
  }, [authLoading, user]);

  const fetchData = useCallback(async (isInitialLoad = false) => {
    if (!user || !user.id) {
      if (!isInitialLoad) setDataError("User ID is missing, cannot fetch data.");
      setRuns([]);
      setStats(null);
      setDataLoading(false);
      return;
    }

    if (!isInitialLoad) setDataLoading(true); // Avoid double loading indicator if auth is also loading
    if (!isInitialLoad) setDataError(null);
    try {
      const { runs: fetchedRuns, stats: fetchedStats } = await apiClient.getUserRuns(user.id);
      setRuns(fetchedRuns as EnrichedRun[]);
      setStats(fetchedStats);
    } catch (err: any) {
      console.error("SecureApp: Error fetching data via apiClient:", err);
      
      // Use production error handler for data fetching errors
      const productionError = productionErrorHandler.handleNetlifyFunctionError(
        err,
        'get-runs',
        { 
          operation: 'fetch-data',
          userId: String(user.id)
        }
      );
      
      if (!isInitialLoad) {
        setDataError(productionError.message);
        // Show error toast for non-initial loads
        showError(productionError);
      }
      
      setRuns([]); // Clear data on error too
      setStats(null);
    } finally {
      if (!isInitialLoad) setDataLoading(false);
    }
  }, [user]); // user is the dependency

  useEffect(() => {
    if (user && user.id && (currentView === 'dashboard' || currentView === 'insights' || currentView === 'advanced')) {
      // Pass true if authLoading is also true to avoid double loading indicators
      fetchData(authLoading);
    }
  }, [user, user?.id, currentView, fetchData, authLoading]);

  // Debug console keyboard shortcut (Ctrl+Shift+D or Cmd+Shift+D)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'D') {
        event.preventDefault();
        setDebugConsoleOpen(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);


  const handleLogout = () => {
    secureLogout();
    setCurrentView('welcome');
    setRuns([]);
    setStats(null);
    setSyncProgressMessage('');
  };

  // OLD CODE REMOVED - No longer needed with new sync orchestrator

const getTimestamps = (period: SyncPeriod): { after: number; before: number } => {
  // Always work in UTC to avoid timezone issues
  const now = new Date();
  const nowUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  
  let startDate: Date;
  let endDate: Date = now; // Default end date is now for most cases

  console.log(`[getTimestamps] Period: ${period}, Local time: ${now.toISOString()}, UTC time: ${nowUTC.toISOString()}`);

  switch (period) {
    case "14days":
      startDate = new Date(now);
      startDate.setUTCDate(now.getUTCDate() - 14);
      startDate.setUTCHours(0, 0, 0, 0);
      break;
    case "30days":
      startDate = new Date(now);
      startDate.setUTCDate(now.getUTCDate() - 30);
      startDate.setUTCHours(0, 0, 0, 0);
      break;
    case "60days":
      startDate = new Date(now);
      startDate.setUTCDate(now.getUTCDate() - 60);
      startDate.setUTCHours(0, 0, 0, 0);
      break;
    case "90days":
      startDate = new Date(now);
      startDate.setUTCDate(now.getUTCDate() - 90);
      startDate.setUTCHours(0, 0, 0, 0);
      break;
    case "thisYear":
      // Jan 1st of current year at 00:00:00 UTC
      startDate = new Date(Date.UTC(now.getUTCFullYear(), 0, 1, 0, 0, 0));
      // End at current time to include today's activities
      endDate = new Date();
      console.log(`[getTimestamps] thisYear range: ${startDate.toISOString()} to ${endDate.toISOString()}`);
      break;
    case "lastYear":
      const lastYear = now.getUTCFullYear() - 1;
      // Jan 1st at 00:00:00 UTC
      startDate = new Date(Date.UTC(lastYear, 0, 1, 0, 0, 0));
      // Dec 31st at 23:59:59 UTC
      endDate = new Date(Date.UTC(lastYear, 11, 31, 23, 59, 59));
      console.log(`[getTimestamps] lastYear range: ${startDate.toISOString()} to ${endDate.toISOString()}`);
      break;
    case "allTime":
    default:
      // Jan 1, 2000 00:00:00 UTC as a far-back date
      startDate = new Date(Date.UTC(2000, 0, 1, 0, 0, 0));
      // Current time
      endDate = new Date();
      console.log(`[getTimestamps] allTime range: ${startDate.toISOString()} to ${endDate.toISOString()}`);
      break;
  }

  const afterEpochSec = Math.floor(startDate.getTime() / 1000);
  const beforeEpochSec = Math.floor(endDate.getTime() / 1000);

  console.log(`[getTimestamps] Returning timestamps - after: ${afterEpochSec} (${new Date(afterEpochSec * 1000).toISOString()}), ` +
    `before: ${beforeEpochSec} (${new Date(beforeEpochSec * 1000).toISOString()})`);

  return { after: afterEpochSec, before: beforeEpochSec };
};

  // NEW: Simplified sync using the robust sync orchestrator with production error handling
  const handleSyncData = async (period: SyncPeriod) => {
      if (!user || !user.id) {
          setSyncProgressMessage("❌ Please log in to sync data.");
          return;
      }

      setIsSyncing(true);
      setDataError(null);
      setSyncProgressMessage('Starting sync...');

      try {
          const { after, before } = getTimestamps(period);

          let readableAfter = formatRunDate(new Date(after * 1000).toISOString());
          let readableBefore = formatRunDate(new Date(before * 1000).toISOString());
          if (period === "allTime") readableAfter = "beginning of time";

          setSyncProgressMessage(`Fetching activities from ${readableAfter} to ${readableBefore}...`);

          // Use the simplified sync function with progress updates
          const response = await apiClient.startSync(user.id, {
              userId: user.id,
              timeRange: { after, before },
              options: {
                  batchSize: 50,
                  skipWeatherEnrichment: false
              }
          }, (message: string, progress?: number) => {
              // Update UI with real-time progress
              setSyncProgressMessage(message);
          });

          if (response.success && response.status === 'completed') {
              const results = response.results;
              
              if (results.activities_failed > 0) {
                  // Partial success - some activities failed
                  setSyncProgressMessage(`⚠️ Sync completed with ${results.activities_failed} failures - Successfully saved ${results.activities_saved} of ${results.total_processed} activities`);
              } else {
                  // Complete success
                  setSyncProgressMessage(`🎉 Sync complete! Successfully processed ${results.total_processed} activities (${results.activities_saved} saved)`);
              }
              
              // Refresh data regardless of partial failures
              await fetchData();
          } else {
              throw new Error(response.error?.message || response.message || 'Sync failed');
          }

      } catch (error: any) {
          console.error('Sync failed:', error);
          
          // Use production error handler to create user-friendly error
          const productionError = productionErrorHandler.handleNetlifyFunctionError(
            error,
            'sync-data',
            { 
              operation: 'sync-data',
              userId: String(user.id)
            }
          );
          
          // Show error toast with recovery options
          showError(productionError);
          
          let errorMessage = productionError.message;
          
          setDataError(errorMessage);
          setSyncProgressMessage(`❌ Sync failed: ${errorMessage}`);
      } finally {
          setIsSyncing(false);
          // Clear progress message after a delay
          setTimeout(() => setSyncProgressMessage(''), 5000);
      }
  };


  // ... (Callback, Loading, Welcome views remain the same) ...
  if (currentView === 'callback' && !user) {
    return <SecureStravaCallback />;
  }
  if (authLoading && currentView === 'loading') {
    return ( /* Original Loading JSX */ <div style={{minHeight: '100vh',display: 'flex',alignItems: 'center',justifyContent: 'center',background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',fontFamily: 'system-ui, -apple-system, sans-serif'}}><div style={{background: 'white',borderRadius: '16px',padding: '40px',textAlign: 'center',boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'}}><div style={{ fontSize: '48px', marginBottom: '20px' }}>⏳</div><h2 style={{ color: '#1f2937', margin: 0 }}>Loading...</h2></div></div>);
  }
  if (!user && currentView === 'welcome') {
    return ( /* Original Welcome JSX with initiateStravaAuth and authError display */ <div style={{minHeight: '100vh',display: 'flex',alignItems: 'center',justifyContent: 'center',background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',fontFamily: 'system-ui, -apple-system, sans-serif'}}><div style={{background: 'white',borderRadius: '16px',padding: '40px',maxWidth: '500px',width: '90%',textAlign: 'center',boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'}}><div style={{fontSize: '64px',marginBottom: '24px'}}>🏃‍♂️</div><h1 style={{fontSize: '32px',fontWeight: '700',color: '#1f2937',marginBottom: '16px'}}>RunSight</h1><p style={{color: '#6b7280',marginBottom: '32px',fontSize: '18px',lineHeight: '1.6'}}>Discover insights from your running data. Connect Strava.</p>{authError && (<div style={{background: '#fef2f2',border: '1px solid #fecaca',borderRadius: '8px',padding: '16px',marginBottom: '24px'}}><p style={{color: '#dc2626',fontSize: '14px',margin: 0}}>❌ {authError}</p><button onClick={clearAuthError} style={{background: 'transparent',border: 'none',color: '#dc2626',fontSize: '12px',cursor: 'pointer',marginTop: '8px',textDecoration: 'underline'}}>Dismiss</button></div>)}<button onClick={initiateStravaAuth} style={{background: '#fc4c02',color: 'white',border: 'none',borderRadius: '8px',padding: '16px 32px',fontSize: '18px',fontWeight: '600',cursor: 'pointer',transition: 'all 0.2s',display: 'flex',alignItems: 'center',justifyContent: 'center',gap: '12px',width: '100%',marginBottom: '24px'}}> <span style={{ fontSize: '24px' }}>🔗</span> Connect with Strava </button></div></div>);
  }


  if (user) {
    return (
      <div className="min-h-screen bg-gray-100">
        <NavigationBar
          currentView={currentView}
          onNavigate={(viewName) => setCurrentView(viewName as View)}
          userName={user.name}
          onLogout={handleLogout}
          onSyncData={handleSyncData} // Pass the updated handler
          isSyncing={isSyncing}
        />

        {/* Display Sync Status Messages */}
        {(isSyncing || syncProgressMessage) && (
            <div className={`px-4 py-3 shadow-md text-center transition-all duration-300 ${
                syncProgressMessage.includes('❌') || syncProgressMessage.includes('failed') 
                    ? 'bg-red-100 border-t-4 border-red-500 text-red-700'
                    : syncProgressMessage.includes('🎉') || syncProgressMessage.includes('completed successfully')
                    ? 'bg-green-100 border-t-4 border-green-500 text-green-700'
                    : syncProgressMessage.includes('partially')
                    ? 'bg-yellow-100 border-t-4 border-yellow-500 text-yellow-700'
                    : 'bg-blue-100 border-t-4 border-blue-500 text-blue-700'
            }`} role="alert">
                <div className="flex items-center justify-center space-x-2">
                    {isSyncing && (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                    )}
                    <p className="font-medium">{syncProgressMessage}</p>
                </div>
            </div>
        )}

        {currentView === 'dashboard' && (
          <ModernDashboard
            user={user}
            runs={runs}
            isLoading={dataLoading}
            error={dataError}
            onSync={() => handleSyncData('30days')}
            onLogout={handleLogout}
          />
        )}
        {currentView === 'insights' && (
          <InsightsPage
            user={user}
            runs={runs}
            isLoading={dataLoading}
            error={dataError}
          />
        )}
        {currentView === 'advanced' && (
          <AdvancedPage
            user={user}
            runs={runs}
            isLoading={dataLoading}
            error={dataError}
          />
        )}
        {/* Hidden views - Goals and Settings are temporarily hidden from navigation (v2) */}
        {currentView === 'goals' && (
          <GoalsPage 
            user={user}
            runs={runs}
            isLoading={dataLoading}
            error={dataError}
          />
        )}
        
        {currentView === 'settings' && (
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              <div className="bg-white shadow rounded-lg p-12 text-center">
                  <h2 className="text-2xl font-semibold text-gray-700">Coming Soon!</h2>
                  <p className="text-gray-500 mt-2">The 'settings' section is under construction.</p>
              </div>
          </main>
        )}

        {/* Debug Console */}
        <DebugConsole 
          isOpen={debugConsoleOpen} 
          onClose={() => setDebugConsoleOpen(false)} 
        />
      </div>
    );
  }

  // Fallback / default (should ideally not be reached if logic above is correct)
  return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <p>Something went wrong. Current view: {currentView}. User authenticated: {!!user}</p>
    </div>
  );
};

export default SecureApp;