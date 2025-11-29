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
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { useToast } from './components/common/ErrorToast';
import { EnrichedRun, RunStats } from './types';
import { apiClient } from './lib/secure-api-client';
import { productionErrorHandler } from './lib/production-error-handler';
import { SetupGuide } from './components/common/SetupGuide'; // Import the new setup guide

type View = 'dashboard' | 'insights' | 'advanced' | 'welcome' | 'callback' | 'loading' | 'setup';

const SecureApp: React.FC = () => {
  const {
    user: authUser,
    isLoading: authLoading,
    error: authError,
    setupRequired, // New state from the hook
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

  useEffect(() => {
    if (setupRequired.required) {
      setCurrentView('setup');
    } else if (authLoading) {
      setCurrentView('loading');
    } else if (window.location.pathname === '/auth/callback' || window.location.pathname === '/callback') {
      if (!user) {
        setCurrentView('callback');
      } else {
        window.history.replaceState({}, document.title, "/"); // Clean up URL after callback
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
      // apiClient.getUserRuns no longer needs user.id
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

  const getTimestamps = (period: SyncPeriod): { after?: number; before?: number } => {
    const now = new Date();
    const nowUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    let startDate: Date | undefined;
    let endDate: Date = now;

    switch (period) {
      case "14days": startDate = new Date(now); startDate.setUTCDate(now.getUTCDate() - 14); startDate.setUTCHours(0, 0, 0, 0); break;
      case "30days": startDate = new Date(now); startDate.setUTCDate(now.getUTCDate() - 30); startDate.setUTCHours(0, 0, 0, 0); break;
      case "60days": startDate = new Date(now); startDate.setUTCDate(now.getUTCDate() - 60); startDate.setUTCHours(0, 0, 0, 0); break;
      case "90days": startDate = new Date(now); startDate.setUTCDate(now.getUTCDate() - 90); startDate.setUTCHours(0, 0, 0, 0); break;
      case "thisYear": startDate = new Date(Date.UTC(now.getUTCFullYear(), 0, 1, 0, 0, 0)); break;
      case "lastYear":
        const lastYear = now.getUTCFullYear() - 1;
        startDate = new Date(Date.UTC(lastYear, 0, 1, 0, 0, 0));
        endDate = new Date(Date.UTC(lastYear, 11, 31, 23, 59, 59));
        break;
      case "allTime":
      default:
        startDate = undefined; // No start date for all time
        endDate = new Date();
        break;
    }
    
    return {
        after: startDate ? Math.floor(startDate.getTime() / 1000) : undefined,
        before: endDate ? Math.floor(endDate.getTime() / 1000) : undefined
    };
  };

  const handleSyncData = async (period: SyncPeriod) => {
    if (!user || !user.id) {
      setSyncProgressMessage("❌ Please log in to sync data.");
      return;
    }

    setIsSyncing(true);
    setDataError(null);
    setSyncProgressMessage('Starting sync...');

    try {
      const timeRange = getTimestamps(period);
      let readableAfter = timeRange.after ? formatRunDate(new Date(timeRange.after * 1000).toISOString()) : "beginning of time";
      let readableBefore = timeRange.before ? formatRunDate(new Date(timeRange.before * 1000).toISOString()) : "now";

      setSyncProgressMessage(`Fetching activities from ${readableAfter} to ${readableBefore}...`);
      
      // apiClient.startSync no longer needs user.id
      const response = await apiClient.startSync({ timeRange }, (message: string, progress?: number) => {
        setSyncProgressMessage(message);
      });

      if (response.success && response.status === 'completed') {
        const results = response.results;
        setSyncProgressMessage(`🎉 Sync complete! Processed ${results.total_processed} activities.`);
        await fetchData();
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
  };

  // --- Render Logic ---

  if (currentView === 'setup') {
    return <SetupGuide missingVars={setupRequired.message} />;
  }

  if (currentView === 'callback' && !user) {
    return <SecureStravaCallback />;
  }

  if (currentView === 'loading') {
    return <div style={{minHeight: '100vh',display: 'flex',alignItems: 'center',justifyContent: 'center',background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',fontFamily: 'system-ui, -apple-system, sans-serif'}}><div style={{background: 'white',borderRadius: '16px',padding: '40px',textAlign: 'center',boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'}}><div style={{ fontSize: '48px', marginBottom: '20px' }}>⏳</div><h2 style={{ color: '#1f2937', margin: 0 }}>Loading...</h2></div></div>;
  }
  
  if (!user && currentView === 'welcome') {
    return <div style={{minHeight: '100vh',display: 'flex',alignItems: 'center',justifyContent: 'center',background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',fontFamily: 'system-ui, -apple-system, sans-serif'}}><div style={{background: 'white',borderRadius: '16px',padding: '40px',maxWidth: '500px',width: '90%',textAlign: 'center',boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'}}><div style={{fontSize: '64px',marginBottom: '24px'}}>🏃‍♂️</div><h1 style={{fontSize: '32px',fontWeight: '700',color: '#1f2937',marginBottom: '16px'}}>RunSight</h1><p style={{color: '#6b7280',marginBottom: '32px',fontSize: '18px',lineHeight: '1.6'}}>Discover insights from your running data. Connect Strava.</p>{authError && (<div style={{background: '#fef2f2',border: '1px solid #fecaca',borderRadius: '8px',padding: '16px',marginBottom: '24px'}}><p style={{color: '#dc2626',fontSize: '14px',margin: 0}}>❌ {authError}</p><button onClick={clearAuthError} style={{background: 'transparent',border: 'none',color: '#dc2626',fontSize: '12px',cursor: 'pointer',marginTop: '8px',textDecoration: 'underline'}}>Dismiss</button></div>)}<button onClick={initiateStravaAuth} style={{background: '#fc4c02',color: 'white',border: 'none',borderRadius: '8px',padding: '16px 32px',fontSize: '18px',fontWeight: '600',cursor: 'pointer',transition: 'all 0.2s',display: 'flex',alignItems: 'center',justifyContent: 'center',gap: '12px',width: '100%',marginBottom: '24px'}}> <span style={{ fontSize: '24px' }}>🔗</span> Connect with Strava </button></div></div>;
  }

  if (user) {
    return (
      <div className="min-h-screen bg-gray-100">
        <NavigationBar
          currentView={currentView}
          onNavigate={(viewName) => setCurrentView(viewName as View)}
          userName={user.name}
          onLogout={handleLogout}
          onSyncData={handleSyncData}
          isSyncing={isSyncing}
        />
        {(isSyncing || syncProgressMessage) && (
            <div className={`px-4 py-3 shadow-md text-center transition-all duration-300 ${syncProgressMessage.includes('❌') ? 'bg-red-100 border-t-4 border-red-500 text-red-700' : syncProgressMessage.includes('🎉') ? 'bg-green-100 border-t-4 border-green-500 text-green-700' : 'bg-blue-100 border-t-4 border-blue-500 text-blue-700'}`} role="alert">
                <div className="flex items-center justify-center space-x-2">
                    {isSyncing && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>}
                    <p className="font-medium">{syncProgressMessage}</p>
                </div>
            </div>
        )}
        {currentView === 'dashboard' && <ModernDashboard user={user} runs={runs} isLoading={dataLoading} error={dataError} onSync={() => handleSyncData('30days')} onLogout={handleLogout} />}
        {currentView === 'insights' && <InsightsPage user={user} runs={runs} isLoading={dataLoading} error={dataError} />}
        {currentView === 'advanced' && <AdvancedPage user={user} runs={runs} isLoading={dataLoading} error={dataError} />}
        {currentView === 'goals' && <GoalsPage user={user} runs={runs} isLoading={dataLoading} error={dataError} />}
        <DebugConsole isOpen={debugConsoleOpen} onClose={() => setDebugConsoleOpen(false)} />
      </div>
    );
  }

  return <div style={{ padding: '20px', textAlign: 'center' }}><p>Something went wrong.</p></div>;
};

// Wrap SecureApp with ToastProvider
const AppWithToast: React.FC = () => (
    <ErrorBoundary>
        <ToastProvider>
            <SecureApp />
        </ToastProvider>
    </ErrorBoundary>
);

export default AppWithToast;
