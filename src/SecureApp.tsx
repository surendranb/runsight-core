// src/SecureApp.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useSecureAuth } from './hooks/useSecureAuth';
import SecureStravaCallback from './components/SecureStravaCallback';
import { NavigationBar, SyncPeriod } from './components/NavigationBar';
import { ModernDashboard } from './components/ModernDashboard';
import { InsightsPage } from './components/InsightsPage';
import { AdvancedPage } from './components/AdvancedPage';
import { GoalsPage } from './components/GoalsPage';
import { formatRunDate } from './lib/dateUtils';
import { DebugConsole } from './components/DebugConsole';
import { useToast } from './components/common/ErrorToast';
import { EnrichedRun, RunStats } from './types';
import { apiClient } from './lib/secure-api-client';
import { productionErrorHandler } from './lib/production-error-handler';
import { SetupGuide } from './components/common/SetupGuide';

type View = 'dashboard' | 'insights' | 'advanced' | 'welcome' | 'callback' | 'loading' | 'setup';

const SecureApp: React.FC = () => {
  const {
    user: authUser,
    isLoading: authLoading,
    error: authError,
    setupRequired,
    initiateStravaAuth,
    logout: secureLogout,
    clearError: clearAuthError,
  } = useSecureAuth();

  const { showError } = useToast();
  
  const user = authUser;

  const [currentView, setCurrentView] = useState<View>('loading');
  const [runs, setRuns] = useState<EnrichedRun[]>([]);
  const [stats, setStats] = useState<RunStats | null>(null);
  const [dataLoading, setDataLoading] = useState<boolean>(false);
  const [dataError, setDataError] = useState<string | null>(null);

  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncProgressMessage, setSyncProgressMessage] = useState<string>('');
  const [debugConsoleOpen, setDebugConsoleOpen] = useState<boolean>(false);
  const [initialSyncAttempted, setInitialSyncAttempted] = useState(false);

  useEffect(() => {
    if (setupRequired.required) {
      setCurrentView('setup');
    } else if (authLoading) {
      setCurrentView('loading');
    } else if (window.location.pathname === '/auth/callback' || window.location.pathname === '/callback') {
      if (!user) {
        setCurrentView('callback');
      } else {
        window.history.replaceState({}, document.title, "/");
        setCurrentView('dashboard');
      }
    } else if (user) {
      setCurrentView('dashboard');
    } else {
      setCurrentView('welcome');
    }
  }, [authLoading, user, setupRequired.required]);

  const fetchData = useCallback(async (isInitialLoad = false) => {
    if (!user || !user.id) {
      if (!isInitialLoad) setDataError("User ID is missing, cannot fetch data.");
      setRuns([]);
      setStats(null);
      setDataLoading(false);
      return;
    }

    if (!isInitialLoad) setDataLoading(true);
    if (!isInitialLoad) setDataError(null);
    try {
      const { runs: fetchedRuns, stats: fetchedStats } = await apiClient.getUserRuns();
      setRuns(fetchedRuns as EnrichedRun[]);
      setStats(fetchedStats);
    } catch (err: any) {
      console.error("SecureApp: Error fetching data via apiClient:", err);
      const productionError = productionErrorHandler.handleNetlifyFunctionError(err, 'get-runs', { operation: 'fetch-data' });
      if (!isInitialLoad) {
        setDataError(productionError.message);
        showError(productionError);
      }
      setRuns([]);
      setStats(null);
    } finally {
      if (!isInitialLoad) setDataLoading(false);
    }
  }, [user, showError]);

  useEffect(() => {
    if (user && user.id && ['dashboard', 'insights', 'advanced'].includes(currentView)) {
      fetchData(authLoading);
    }
  }, [user, user?.id, currentView, fetchData, authLoading]);

  const handleSyncData = useCallback(async (period: SyncPeriod) => {
    if (!user || !user.id) {
      setSyncProgressMessage("❌ Please log in to sync data.");
      return;
    }

    setIsSyncing(true);
    setDataError(null);
    setSyncProgressMessage('Starting sync...');

    try {
      const getTimestamps = (p: SyncPeriod): { after?: number; before?: number } => {
          const now = new Date();
          let startDate: Date | undefined;
          let endDate: Date = now;
          switch (p) {
              case "14days": startDate = new Date(now); startDate.setUTCDate(now.getUTCDate() - 14); startDate.setUTCHours(0, 0, 0, 0); break;
              case "30days": startDate = new Date(now); startDate.setUTCDate(now.getUTCDate() - 30); startDate.setUTCHours(0, 0, 0, 0); break;
              case "allTime":
              default: startDate = undefined; endDate = new Date(); break;
          }
          return {
              after: startDate ? Math.floor(startDate.getTime() / 1000) : undefined,
              before: endDate ? Math.floor(endDate.getTime() / 1000) : undefined
          };
      };

      const timeRange = getTimestamps(period);
      let readableAfter = timeRange.after ? formatRunDate(new Date(timeRange.after * 1000).toISOString()) : "beginning of time";
      
      setSyncProgressMessage(`Fetching activities from ${readableAfter}...`);
      
      const response = await apiClient.startSync({ timeRange }, (message: string, progress?: number) => {
        setSyncProgressMessage(message);
      });

      if (response.success) {
        setSyncProgressMessage(`🎉 Sync complete! Processed ${response.results.total_processed} activities.`);
        await fetchData(false);
      } else {
        throw new Error(response.error?.message || response.message || 'Sync failed');
      }

    } catch (error: any) {
      console.error('Sync failed:', error);
      const productionError = productionErrorHandler.handleNetlifyFunctionError(error, 'sync-data', { operation: 'sync-data' });
      showError(productionError);
      setDataError(productionError.message);
      setSyncProgressMessage(`❌ Sync failed: ${productionError.message}`);
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncProgressMessage(''), 5000);
    }
  }, [user, showError, fetchData]);

  useEffect(() => {
    if (user && !authLoading && !dataLoading && runs.length === 0 && !initialSyncAttempted && currentView === 'dashboard') {
      console.log("Detected empty runs for new user. Initiating first sync...");
      setInitialSyncAttempted(true);
      handleSyncData('allTime');
    }
  }, [user, authLoading, dataLoading, runs, initialSyncAttempted, handleSyncData, currentView]);

  const handleLogout = () => {
    secureLogout();
    setCurrentView('welcome');
    setRuns([]);
    setStats(null);
    setSyncProgressMessage('');
    setInitialSyncAttempted(false);
  };

  if (currentView === 'setup') {
    return <SetupGuide missingVars={setupRequired.message} />;
  }

  if (currentView === 'callback' && !user) {
    return <SecureStravaCallback />;
  }

  if (authLoading || (currentView === 'loading')) {
    return <div style={{minHeight: '100vh',display: 'flex',alignItems: 'center',justifyContent: 'center',background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'}}><div style={{textAlign: 'center'}}><div style={{ fontSize: '48px', marginBottom: '20px' }}>⏳</div><h2 style={{ color: 'white', margin: 0 }}>Loading...</h2></div></div>;
  }
  
  if (!user && currentView === 'welcome') {
    return <div style={{minHeight: '100vh',display: 'flex',alignItems: 'center',justifyContent: 'center',background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'}}><div style={{background: 'white',borderRadius: '16px',padding: '40px',maxWidth: '500px',textAlign: 'center'}}><div style={{fontSize: '64px',marginBottom: '24px'}}>🏃‍♂️</div><h1 style={{fontSize: '32px',fontWeight: '700',color: '#1f2937'}}>RunSight</h1><p style={{color: '#6b7280',marginBottom: '32px'}}>Discover insights from your running data.</p>{authError && (<div><p>❌ {authError}</p><button onClick={clearAuthError}>Dismiss</button></div>)}<button onClick={initiateStravaAuth}>🔗 Connect with Strava</button></div></div>;
  }

  if (user) {
    return (
      <div className="min-h-screen bg-gray-100">
        <NavigationBar
          currentView={currentView}
          onNavigate={(viewName) => setCurrentView(viewName as View)}
          userName={user.name || 'Runner'}
          onLogout={handleLogout}
          onSyncData={handleSyncData}
          isSyncing={isSyncing}
        />
        {(isSyncing || syncProgressMessage) && (
            <div><p>{syncProgressMessage}</p></div>
        )}
        {currentView === 'dashboard' && <ModernDashboard user={user} runs={runs} isLoading={dataLoading} error={dataError} onSync={(period) => handleSyncData(period)} onLogout={handleLogout} />}
        {currentView === 'insights' && <InsightsPage user={user} runs={runs} isLoading={dataLoading} error={dataError} />}
        {currentView === 'advanced' && <AdvancedPage user={user} runs={runs} isLoading={dataLoading} error={dataError} />}
        {currentView === 'goals' && <GoalsPage user={user} runs={runs} isLoading={dataLoading} error={dataError} />}
        <DebugConsole isOpen={debugConsoleOpen} onClose={() => setDebugConsoleOpen(false)} />
      </div>
    );
  }

  return <div><p>Something went wrong.</p></div>;
};

export default SecureApp;