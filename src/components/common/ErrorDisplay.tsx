import React, { useState } from 'react';
import { AlertTriangle, RefreshCw, ExternalLink, ChevronDown, ChevronUp, Info, X } from 'lucide-react';
import { formatRunDate } from '../../lib/dateUtils';

export interface ErrorDisplayProps {
  error: {
    title: string;
    message: string;
    type: 'error' | 'warning' | 'info';
    code?: string;
    details?: string;
    recoveryOptions?: RecoveryOption[];
    context?: string;
    timestamp?: string;
  };
  onDismiss?: () => void;
  onRetry?: () => void;
  className?: string;
}

export interface RecoveryOption {
  label: string;
  description: string;
  action: () => void;
  primary?: boolean;
  external?: boolean;
}

/**
 * Cognitive Load Aware Error Display Component
 * 
 * Features:
 * - Progressive disclosure (basic message first, details on demand)
 * - Plain language error messages without technical jargon
 * - Contextual recovery options based on error type
 * - Clear visual hierarchy with appropriate colors and icons
 * - Accessible design with proper ARIA labels
 */
export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  error,
  onDismiss,
  onRetry,
  className = ''
}) => {
  const [showDetails, setShowDetails] = useState(false);

  const getErrorIcon = () => {
    switch (error.type) {
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'info':
        return <Info className="w-5 h-5 text-blue-500" />;
      default:
        return <AlertTriangle className="w-5 h-5 text-red-500" />;
    }
  };

  const getErrorStyles = () => {
    switch (error.type) {
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'info':
        return 'bg-blue-50 border-blue-200 text-blue-800';
      default:
        return 'bg-red-50 border-red-200 text-red-800';
    }
  };

  const getButtonStyles = () => {
    switch (error.type) {
      case 'warning':
        return 'bg-yellow-100 hover:bg-yellow-200 text-yellow-800 border-yellow-300';
      case 'info':
        return 'bg-blue-100 hover:bg-blue-200 text-blue-800 border-blue-300';
      default:
        return 'bg-red-100 hover:bg-red-200 text-red-800 border-red-300';
    }
  };

  return (
    <div 
      className={`rounded-lg border p-4 ${getErrorStyles()} ${className}`}
      role="alert"
      aria-live="polite"
    >
      {/* Header with icon, title, and dismiss button */}
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3">
          {getErrorIcon()}
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium">
              {error.title}
            </h3>
            <p className="mt-1 text-sm opacity-90">
              {error.message}
            </p>
            
            {/* Context information if available */}
            {error.context && (
              <p className="mt-2 text-xs opacity-75">
                {error.context}
              </p>
            )}
          </div>
        </div>
        
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="ml-3 inline-flex rounded-md p-1.5 hover:bg-black hover:bg-opacity-10 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-transparent focus:ring-gray-600"
            aria-label="Dismiss error"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Recovery Options */}
      {error.recoveryOptions && error.recoveryOptions.length > 0 && (
        <div className="mt-4">
          <div className="flex flex-wrap gap-2">
            {error.recoveryOptions.map((option, index) => (
              <button
                key={index}
                onClick={option.action}
                className={`inline-flex items-center px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                  option.primary 
                    ? `${getButtonStyles()} font-semibold` 
                    : 'bg-white hover:bg-gray-50 text-gray-700 border-gray-300'
                }`}
                title={option.description}
              >
                {option.external && <ExternalLink className="w-3 h-3 mr-1" />}
                {option.label}
              </button>
            ))}
            
            {/* Generic retry button if onRetry is provided and no primary recovery option */}
            {onRetry && !error.recoveryOptions.some(opt => opt.primary) && (
              <button
                onClick={onRetry}
                className={`inline-flex items-center px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${getButtonStyles()}`}
              >
                <RefreshCw className="w-3 h-3 mr-1" />
                Try Again
              </button>
            )}
          </div>
        </div>
      )}

      {/* Progressive Disclosure for Technical Details */}
      {(error.details || error.code || error.timestamp) && (
        <div className="mt-4">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="inline-flex items-center text-xs font-medium hover:underline focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-transparent focus:ring-gray-600 rounded"
            aria-expanded={showDetails}
            aria-controls="error-details"
          >
            {showDetails ? (
              <>
                <ChevronUp className="w-3 h-3 mr-1" />
                Hide Details
              </>
            ) : (
              <>
                <ChevronDown className="w-3 h-3 mr-1" />
                Show Details
              </>
            )}
          </button>
          
          {showDetails && (
            <div 
              id="error-details"
              className="mt-2 p-3 bg-black bg-opacity-5 rounded text-xs font-mono"
            >
              {error.code && (
                <div className="mb-2">
                  <span className="font-semibold">Error Code:</span> {error.code}
                </div>
              )}
              {error.timestamp && (
                <div className="mb-2">
                  <span className="font-semibold">Time:</span> {formatRunDate(error.timestamp)}
                </div>
              )}
              {error.details && (
                <div>
                  <span className="font-semibold">Technical Details:</span>
                  <pre className="mt-1 whitespace-pre-wrap break-words">
                    {error.details}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * Hook for creating user-friendly error objects from various error types
 */
export const useErrorTranslation = () => {
  const translateError = (error: any, context?: string): ErrorDisplayProps['error'] => {
    // Handle different error formats
    const errorMessage = error?.message || error?.details || String(error);
    const errorCode = error?.code || error?.error;
    
    // Default error object
    let translatedError: ErrorDisplayProps['error'] = {
      title: 'Something went wrong',
      message: 'An unexpected error occurred. Please try again.',
      type: 'error',
      code: errorCode,
      details: errorMessage,
      context,
      timestamp: new Date().toISOString()
    };

    // Network and connection errors
    if (errorMessage.toLowerCase().includes('network') || 
        errorMessage.toLowerCase().includes('fetch') ||
        errorMessage.toLowerCase().includes('connection') ||
        errorCode === 'NETWORK_ERROR') {
      translatedError = {
        ...translatedError,
        title: 'Connection Problem',
        message: 'Unable to connect to the server. Please check your internet connection and try again.',
        recoveryOptions: [
          {
            label: 'Try Again',
            description: 'Retry the operation',
            action: () => window.location.reload(),
            primary: true
          },
          {
            label: 'Check Connection',
            description: 'Test your internet connection',
            action: () => window.open('https://www.google.com', '_blank'),
            external: true
          }
        ]
      };
    }

    // Authentication errors
    else if (errorMessage.toLowerCase().includes('unauthorized') ||
             errorMessage.toLowerCase().includes('authentication') ||
             errorMessage.toLowerCase().includes('token') ||
             errorCode === 'AUTH_REQUIRED' ||
             errorCode === 'TOKEN_REFRESH_FAILED') {
      translatedError = {
        ...translatedError,
        title: 'Authentication Required',
        message: 'Your session has expired or you need to connect with Strava. Please sign in again.',
        recoveryOptions: [
          {
            label: 'Connect with Strava',
            description: 'Reconnect your Strava account',
            action: () => {
              // Clear any stored auth data and redirect to auth
              localStorage.removeItem('strava_user');
              window.location.href = '/';
            },
            primary: true
          }
        ]
      };
    }

    // Strava API specific errors
    else if (errorMessage.toLowerCase().includes('strava') ||
             errorCode === 'STRAVA_API_ERROR') {
      translatedError = {
        ...translatedError,
        title: 'Strava Service Issue',
        message: 'There\'s a temporary issue with Strava\'s service. This usually resolves quickly.',
        recoveryOptions: [
          {
            label: 'Try Again',
            description: 'Retry the operation',
            action: () => window.location.reload(),
            primary: true
          },
          {
            label: 'Check Strava Status',
            description: 'View Strava service status',
            action: () => window.open('https://status.strava.com', '_blank'),
            external: true
          }
        ]
      };
    }

    // Rate limiting errors
    else if (errorMessage.toLowerCase().includes('rate limit') ||
             errorMessage.toLowerCase().includes('too many requests') ||
             errorCode === 'RATE_LIMIT_EXCEEDED') {
      translatedError = {
        ...translatedError,
        title: 'Please Wait a Moment',
        message: 'You\'re making requests too quickly. Please wait a few minutes before trying again.',
        type: 'warning',
        recoveryOptions: [
          {
            label: 'Wait and Retry',
            description: 'Wait 5 minutes then try again',
            action: () => {
              setTimeout(() => window.location.reload(), 5 * 60 * 1000);
              alert('We\'ll automatically retry in 5 minutes, or you can refresh the page later.');
            },
            primary: true
          }
        ]
      };
    }

    // Database/Supabase errors
    else if (errorMessage.toLowerCase().includes('database') ||
             errorMessage.toLowerCase().includes('supabase') ||
             errorCode === 'DB_ERROR' ||
             errorCode === 'CONFIG_ERROR') {
      translatedError = {
        ...translatedError,
        title: 'Data Service Unavailable',
        message: 'Our data service is temporarily unavailable. Please try again in a few minutes.',
        recoveryOptions: [
          {
            label: 'Try Again',
            description: 'Retry the operation',
            action: () => window.location.reload(),
            primary: true
          }
        ]
      };
    }

    // Weather API errors
    else if (errorMessage.toLowerCase().includes('weather') ||
             errorMessage.toLowerCase().includes('openweather')) {
      translatedError = {
        ...translatedError,
        title: 'Weather Data Unavailable',
        message: 'Weather information is temporarily unavailable. Your running data will still be saved.',
        type: 'warning',
        recoveryOptions: [
          {
            label: 'Continue Without Weather',
            description: 'Proceed without weather data',
            action: () => window.location.reload(),
            primary: true
          }
        ]
      };
    }

    // Sync specific errors
    else if (context === 'sync' || errorMessage.toLowerCase().includes('sync')) {
      translatedError = {
        ...translatedError,
        title: 'Sync Issue',
        message: 'There was a problem syncing your running data. Some activities may not have been updated.',
        recoveryOptions: [
          {
            label: 'Retry Sync',
            description: 'Try syncing your data again',
            action: () => window.location.reload(),
            primary: true
          },
          {
            label: 'Sync Smaller Range',
            description: 'Try syncing a shorter time period',
            action: () => {
              // This would trigger a smaller sync range - implementation depends on sync UI
              alert('Try selecting a shorter time period (like "Last 7 days") and sync again.');
            }
          }
        ]
      };
    }

    // Function timeout errors
    else if (errorMessage.toLowerCase().includes('timeout') ||
             errorCode === 'FUNCTION_TIMEOUT') {
      translatedError = {
        ...translatedError,
        title: 'Operation Timed Out',
        message: 'The operation took too long to complete. Try processing a smaller amount of data.',
        recoveryOptions: [
          {
            label: 'Try Smaller Range',
            description: 'Process less data at once',
            action: () => {
              alert('Try selecting a shorter time period (like "Last 30 days") and try again.');
            },
            primary: true
          }
        ]
      };
    }

    // Memory limit errors
    else if (errorMessage.toLowerCase().includes('memory') ||
             errorCode === 'MEMORY_LIMIT') {
      translatedError = {
        ...translatedError,
        title: 'Too Much Data',
        message: 'There\'s too much data to process at once. Try working with a smaller date range.',
        recoveryOptions: [
          {
            label: 'Use Smaller Range',
            description: 'Select a shorter time period',
            action: () => {
              alert('Try selecting "Last 30 days" or "Last 7 days" instead of a longer period.');
            },
            primary: true
          }
        ]
      };
    }

    return translatedError;
  };

  return { translateError };
};