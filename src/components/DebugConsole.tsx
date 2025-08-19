/**
 * Debug Console Component
 * Provides interactive debugging tools for troubleshooting the application
 */

import React, { useState, useEffect } from 'react';
import { errorHandler } from '../lib/debug/error-handler';
import { debugLogger } from '../lib/debug/debug-logger';

interface DebugConsoleProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DebugConsole: React.FC<DebugConsoleProps> = ({ isOpen, onClose }) => {
  const [logs, setLogs] = useState<string[]>([]);
  const [command, setCommand] = useState('');
  const [output, setOutput] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen) {
      // Load recent logs
      const recentLogs = debugLogger.getFormattedLogs().slice(0, 50);
      setLogs(recentLogs);
    }
  }, [isOpen]);

  const executeCommand = async (cmd: string) => {
    const trimmedCmd = cmd.trim();
    setOutput(prev => [...prev, `> ${trimmedCmd}`]);

    try {
      switch (trimmedCmd.toLowerCase()) {
        case 'help':
          setOutput(prev => [...prev, 
            'Available commands:',
            '  help - Show this help',
            '  logs - Show recent logs',
            '  clear - Clear console',
            '  test-error - Test error handling',
            '  test-sync - Test sync endpoint',
            '  env-check - Check environment variables',
            '  health-check - Run health checks',
            '  export-debug - Export debug information'
          ]);
          break;

        case 'logs':
          const recentLogs = debugLogger.getFormattedLogs().slice(0, 20);
          setOutput(prev => [...prev, ...recentLogs]);
          break;

        case 'clear':
          setOutput([]);
          setLogs([]);
          break;

        case 'test-error':
          try {
            throw new Error('Test error for debugging');
          } catch (error) {
            errorHandler.handleError(error as Error, {
              component: 'DebugConsole',
              showUserFeedback: false
            });
            setOutput(prev => [...prev, 'Test error generated and handled']);
          }
          break;

        case 'test-sync':
          setOutput(prev => [...prev, 'Testing sync endpoint...']);
          try {
            const response = await fetch('/.netlify/functions/sync-orchestrator', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                action: 'health-check'
              })
            });

            if (!response.ok) {
              throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            setOutput(prev => [...prev, `Sync endpoint response: ${JSON.stringify(data, null, 2)}`]);
          } catch (error) {
            setOutput(prev => [...prev, `Sync endpoint error: ${(error as Error).message}`]);
          }
          break;

        case 'env-check':
          setOutput(prev => [...prev, 'Checking environment variables...']);
          const envCheck = {
            hasSupabaseUrl: !!import.meta.env.VITE_SUPABASE_URL,
            hasSupabaseAnonKey: !!import.meta.env.VITE_SUPABASE_ANON_KEY,
            hasStravaClientId: !!import.meta.env.VITE_STRAVA_CLIENT_ID,
            nodeEnv: import.meta.env.MODE,
            baseUrl: import.meta.env.BASE_URL
          };
          setOutput(prev => [...prev, JSON.stringify(envCheck, null, 2)]);
          break;

        case 'health-check':
          setOutput(prev => [...prev, 'Running health checks...']);
          // Basic health checks
          const healthStatus = {
            timestamp: new Date().toISOString(),
            browser: {
              userAgent: navigator.userAgent,
              online: navigator.onLine,
              cookieEnabled: navigator.cookieEnabled
            },
            localStorage: {
              available: typeof Storage !== 'undefined',
              hasAuthData: !!localStorage.getItem('sb-' + import.meta.env.VITE_SUPABASE_URL?.split('//')[1]?.split('.')[0] + '-auth-token')
            },
            network: {
              connectionType: (navigator as any).connection?.effectiveType || 'unknown'
            }
          };
          setOutput(prev => [...prev, JSON.stringify(healthStatus, null, 2)]);
          break;

        case 'export-debug':
          const debugInfo = errorHandler.exportDebugInfo();
          const blob = new Blob([debugInfo], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `debug-info-${new Date().toISOString().slice(0, 19)}.json`;
          a.click();
          URL.revokeObjectURL(url);
          setOutput(prev => [...prev, 'Debug information exported to file']);
          break;

        default:
          setOutput(prev => [...prev, `Unknown command: ${trimmedCmd}. Type 'help' for available commands.`]);
      }
    } catch (error) {
      setOutput(prev => [...prev, `Error executing command: ${(error as Error).message}`]);
    }

    setCommand('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      executeCommand(command);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-gray-900 text-green-400 w-4/5 h-4/5 rounded-lg flex flex-col font-mono text-sm">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-gray-700">
          <h2 className="text-lg font-bold">Debug Console</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            ✕
          </button>
        </div>

        {/* Output Area */}
        <div className="flex-1 p-4 overflow-y-auto">
          <div className="mb-4">
            <h3 className="text-yellow-400 mb-2">Recent Logs:</h3>
            {logs.map((log, index) => (
              <div key={index} className="text-xs text-gray-300 mb-1">
                {log}
              </div>
            ))}
          </div>

          <div className="mb-4">
            <h3 className="text-yellow-400 mb-2">Console Output:</h3>
            {output.map((line, index) => (
              <div key={index} className="mb-1">
                {line}
              </div>
            ))}
          </div>
        </div>

        {/* Command Input */}
        <div className="p-4 border-t border-gray-700">
          <div className="flex items-center">
            <span className="text-green-400 mr-2">$</span>
            <input
              type="text"
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              onKeyPress={handleKeyPress}
              className="flex-1 bg-transparent text-green-400 outline-none"
              placeholder="Type 'help' for available commands"
              autoFocus
            />
          </div>
        </div>
      </div>
    </div>
  );
};