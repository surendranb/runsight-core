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
import { DatabaseSetupGuide } from './components/common/DatabaseSetupGuide'; // Import the new DB setup guide

type View = 'dashboard' | 'insights' | 'advanced' | 'welcome' | 'callback' | 'loading' | 'setup';
type DbStatus = 'checking' | 'needs_setup' | 'ready';

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
  const [dbStatus, setDbStatus] = useState<DbStatus>('checking'); // New state for DB setup
  const [runs, setRuns] = useState<EnrichedRun[]>([]);
  const [stats, setStats] = useState<RunStats | null>(null);
  const [dataLoading, setDataLoading] = useState<boolean>(true); // Start as true
  const [dataError, setDataError] = useState<string | null>(null);

  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncProgressMessage, setSyncProgressMessage] = useState<string>('');
  const [debugConsoleOpen, setDebugConsoleOpen] = useState<boolean>(false);
  const [initialSyncAttempted, setInitialSyncAttempted] = useState(false);

  // Function to check the database status
  const checkDbStatus = useCallback(async () => {
    try {
      const response = await fetch('/.netlify/functions/check-db-status');
      if (!response.ok) {
          throw new Error('Could not connect to DB status check service.');
      }
      const data = await response.json();
      if (data.status === 'needs_setup') {
        setDbStatus('needs_setup');
      } else {
        setDbStatus('ready');
      }
    } catch (e) {
      console.error("DB status check failed:", e);
      // If this check fails, we can't know the DB state. Default to an error or ready state.
      // For now, let's assume it's ready and let other parts fail if it's not.
      setDbStatus('ready');
    }
  }, []);

  useEffect(() => {
    if (setupRequired.required) {
      setCurrentView('setup');
    } else if (authLoading) {
      setCurrentView('loading');
    } else if (window.location.pathname.includes('/auth/callback')) {
      if (!user) {
        setCurrentView('callback');
      } else {
        window.history.replaceState({}, document.title, "/");
        setCurrentView('dashboard');
      }
    } else if (user) {
      if (dbStatus === 'checking') {
        checkDbStatus();
      }
      if (dbStatus === 'ready') {
        setCurrentView('dashboard');
      }
    } else {
      setCurrentView('welcome');
    }
  }, [authLoading, user, setupRequired.required, dbStatus, checkDbStatus]);

  const fetchData = useCallback(async (isInitialLoad = false) => {
    if (!user || !user.id || dbStatus !== 'ready') return;

    setDataLoading(true);
    setDataError(null);
    try {
      const { runs: fetchedRuns, stats: fetchedStats } = await apiClient.getUserRuns();
      setRuns(fetchedRuns as EnrichedRun[]);
      setStats(fetchedStats);
    } catch (err: any) {
      console.error("SecureApp: Error fetching data:", err);
      const productionError = productionErrorHandler.handleNetlifyFunctionError(err, 'get-runs', { operation: 'fetch-data' });
      setDataError(productionError.message);
      showError(productionError);
      setRuns([]);
      setStats(null);
    } finally {
      setDataLoading(false);
    }
  }, [user, dbStatus, showError]);

  useEffect(() => {
    if (user && dbStatus === 'ready' && ['dashboard', 'insights', 'advanced'].includes(currentView)) {
      fetchData(true);
    }
  }, [user, dbStatus, currentView, fetchData]);

  const handleSyncData = useCallback(async (period: SyncPeriod) => {
    if (!user || !user.id) return;
    setIsSyncing(true);
    setDataError(null);
    setSyncProgressMessage('Starting sync...');
    try {
      const timeRange = {}; // Simplified for now
      setSyncProgressMessage(`Fetching activities...`);
      const response = await apiClient.startSync({ timeRange }, (message, progress) => setSyncProgressMessage(message));
      if (response.success) {
        setSyncProgressMessage(`🎉 Sync complete!`);
        await fetchData(false);
      } else {
        throw new Error(response.error?.message || 'Sync failed');
      }
    } catch (error: any) {
      const productionError = productionErrorHandler.handleNetlifyFunctionError(error, 'sync-data', { operation: 'sync-data' });
      showError(productionError);
      setSyncProgressMessage(`❌ Sync failed: ${productionError.message}`);
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncProgressMessage(''), 5000);
    }
  }, [user, showError, fetchData]);
  
  useEffect(() => {
    if (user && dbStatus === 'ready' && !authLoading && !dataLoading && runs.length === 0 && !initialSyncAttempted && currentView === 'dashboard') {
      setInitialSyncAttempted(true);
      handleSyncData('allTime');
    }
  }, [user, dbStatus, authLoading, dataLoading, runs.length, initialSyncAttempted, handleSyncData, currentView]);

  const handleLogout = () => {
    secureLogout();
    setInitialSyncAttempted(false);
  };

  // --- RENDER LOGIC ---

  if (currentView === 'setup') {
    return <SetupGuide missingVars={setupRequired.message} />;
  }

  if (user && dbStatus === 'needs_setup') {
    return <DatabaseSetupGuide onVerify={() => window.location.reload()} supabaseUrl={process.env.VITE_SUPABASE_URL || ''} />;
  }
  
  if (currentView === 'callback' && !user) {
    return <SecureStravaCallback />;
  }

  if (authLoading || (user && dbStatus === 'checking')) {
    return <div>Loading...</div>; // Simplified loading state
  }
  
  if (!user && currentView === 'welcome') {
    return <div><button onClick={initiateStravaAuth}>Connect with Strava</button></div>; // Simplified welcome
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
        {(isSyncing || syncProgressMessage) && <div><p>{syncProgressMessage}</p></div>}
        {currentView === 'dashboard' && <ModernDashboard user={user} runs={runs} isLoading={dataLoading} error={dataError} onSync={(period) => handleSyncData(period)} onLogout={handleLogout} />}
        {/* other views */}
      </div>
    );
  }

  return <div>Something went wrong.</div>;
};

// Simplified wrapper as previous changes
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { ToastProvider } from './components/common/ErrorToast';
const AppWithProviders: React.FC = () => (
    <ErrorBoundary>
        <ToastProvider>
            <SecureApp />
        </ToastProvider>
    </ErrorBoundary>
);

export default AppWithProviders;
