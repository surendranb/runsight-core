// Secure Strava Callback Component - No credentials exposed
// Handles OAuth callback through Netlify Functions

import React, { useEffect, useState, useRef } from 'react';
import { useSecureAuth } from '../hooks/useSecureAuth';
import { apiClient } from '../lib/secure-api-client';

interface CallbackState {
  step: 'authenticating' | 'syncing' | 'complete' | 'error';
  message: string;
  progress: number;
  error?: string;
}

const SecureStravaCallback: React.FC = () => {
  const { handleStravaCallback, user } = useSecureAuth();
  const [state, setState] = useState<CallbackState>({
    step: 'authenticating',
    message: 'Authenticating with Strava...',
    progress: 10
  });
  const hasProcessed = useRef(false);

  useEffect(() => {
    // Prevent multiple executions
    if (hasProcessed.current) return;
    hasProcessed.current = true;
    
    const processCallback = async () => {
      try {
        console.log('🔄 Starting callback processing...');
        
        // Get authorization code from URL
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const error = urlParams.get('error');
        
        console.log('📋 URL params:', { code: code?.substring(0, 10) + '...', error });

        if (error) {
          throw new Error(`Strava authorization failed: ${error}`);
        }

        if (!code) {
          throw new Error('No authorization code received from Strava');
        }

        // Step 1: Authenticate (server-side)
        setState({
          step: 'authenticating',
          message: 'Authenticating with Strava...',
          progress: 20
        });

        console.log('🔐 Calling handleStravaCallback...');
        const authenticatedUser = await handleStravaCallback(code);
        console.log('✅ Authentication successful:', authenticatedUser);

        setState({
          step: 'syncing',
          message: 'Fetching your running data...',
          progress: 40
        });

        // Step 2: Sync data using new robust sync system
        setState({
          step: 'syncing',
          message: 'Fetching your recent activities...',
          progress: 40
        });

        const syncResult = await apiClient.startSync(authenticatedUser.id, {
          userId: authenticatedUser.id,
          timeRange: {
            after: Math.floor((Date.now() - 14 * 24 * 60 * 60 * 1000) / 1000) // Last 14 days
          },
          options: {
            batchSize: 50,
            skipWeatherEnrichment: false
          }
        });

        setState({
          step: 'syncing',
          message: `Processing your activities...`,
          progress: 70
        });

        // Small delay to show progress
        await new Promise(resolve => setTimeout(resolve, 1000));

        const results = syncResult.results;
        const totalProcessed = results?.total_processed || 0;
        const saved = results?.activities_saved || 0;
        const failed = results?.activities_failed || 0;

        if (failed > 0) {
          setState({
            step: 'complete',
            message: `Imported ${saved} runs from ${totalProcessed} activities (${failed} failed)`,
            progress: 100
          });
        } else {
          setState({
            step: 'complete',
            message: `Successfully imported ${saved} runs from ${totalProcessed} activities!`,
            progress: 100
          });
        }

        // Redirect to dashboard after success
        setTimeout(() => {
          window.location.href = '/';
        }, 2000);

      } catch (error) {
        console.error('Callback processing failed:', error);
        setState({
          step: 'error',
          message: 'Authentication failed',
          progress: 0,
          error: error instanceof Error ? error.message : 'Unknown error occurred'
        });
      }
    };

    processCallback();
  }, []); // Run only once on mount

  const getStepIcon = () => {
    switch (state.step) {
      case 'authenticating':
        return '🔐';
      case 'syncing':
        return '🔄';
      case 'complete':
        return '✅';
      case 'error':
        return '❌';
      default:
        return '⏳';
    }
  };

  const getStepColor = () => {
    switch (state.step) {
      case 'complete':
        return '#10b981';
      case 'error':
        return '#ef4444';
      default:
        return '#3b82f6';
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: '40px',
        maxWidth: '500px',
        width: '90%',
        textAlign: 'center',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
      }}>
        <div style={{
          fontSize: '48px',
          marginBottom: '20px'
        }}>
          {getStepIcon()}
        </div>

        <h1 style={{
          fontSize: '24px',
          fontWeight: '600',
          color: '#1f2937',
          marginBottom: '16px'
        }}>
          {state.step === 'error' ? 'Authentication Failed' : 'Setting Up Your Account'}
        </h1>

        <p style={{
          color: '#6b7280',
          marginBottom: '32px',
          fontSize: '16px'
        }}>
          {state.message}
        </p>

        {state.step !== 'error' && (
          <div style={{
            width: '100%',
            height: '8px',
            backgroundColor: '#e5e7eb',
            borderRadius: '4px',
            overflow: 'hidden',
            marginBottom: '24px'
          }}>
            <div style={{
              width: `${state.progress}%`,
              height: '100%',
              backgroundColor: getStepColor(),
              borderRadius: '4px',
              transition: 'width 0.5s ease-in-out'
            }} />
          </div>
        )}

        {state.error && (
          <div style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '24px'
          }}>
            <p style={{
              color: '#dc2626',
              fontSize: '14px',
              margin: 0
            }}>
              {state.error}
            </p>
          </div>
        )}

        {state.step === 'complete' && (
          <div style={{
            background: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '24px'
          }}>
            <p style={{
              color: '#166534',
              fontSize: '14px',
              margin: 0
            }}>
              Redirecting to your dashboard...
            </p>
          </div>
        )}

        {state.step === 'error' && (
          <button
            onClick={() => window.location.href = '/'}
            style={{
              background: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '12px 24px',
              fontSize: '16px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'background-color 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#3b82f6'}
          >
            Try Again
          </button>
        )}

        <div style={{
          marginTop: '32px',
          padding: '16px',
          background: '#f9fafb',
          borderRadius: '8px',
          fontSize: '12px',
          color: '#6b7280'
        }}>
          <p style={{ margin: 0 }}>
            🔒 <strong>Secure Processing:</strong> All your credentials and data are processed securely on our servers. 
            No sensitive information is exposed to your browser.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SecureStravaCallback;