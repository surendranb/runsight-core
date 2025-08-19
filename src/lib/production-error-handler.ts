/**
 * Production Environment Error Handler
 * 
 * Handles specific error scenarios that occur in the production stack:
 * - Netlify Function failures
 * - Supabase connection and RLS issues
 * - API rate limiting and quota exceeded scenarios
 * - Network and deployment-specific errors
 */

import { ErrorDisplayProps, RecoveryOption } from '../components/common/ErrorDisplay';

export interface ProductionErrorContext {
  operation: string;
  endpoint?: string;
  userId?: string;
  timestamp: string;
  userAgent: string;
  url: string;
  networkInfo?: {
    effectiveType?: string;
    downlink?: number;
    rtt?: number;
  };
}

export interface ProductionError {
  code: string;
  message: string;
  statusCode?: number;
  details?: string;
  context: ProductionErrorContext;
  retryable: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export class ProductionErrorHandler {
  private errorHistory: ProductionError[] = [];
  private maxHistorySize = 50;

  /**
   * Handle errors from Netlify Functions
   */
  handleNetlifyFunctionError(
    error: any,
    functionName: string,
    context: Partial<ProductionErrorContext> = {}
  ): ErrorDisplayProps['error'] {
    const productionError = this.createProductionError(error, {
      operation: `netlify-function-${functionName}`,
      endpoint: `/.netlify/functions/${functionName}`,
      ...context
    });

    this.logError(productionError);

    // Handle specific Netlify Function error patterns
    if (productionError.statusCode === 500) {
      return this.handleServerError(productionError, functionName);
    } else if (productionError.statusCode === 502 || productionError.statusCode === 503) {
      return this.handleServiceUnavailable(productionError, functionName);
    } else if (productionError.statusCode === 504) {
      return this.handleTimeout(productionError, functionName);
    } else if (productionError.code === 'CONFIG_ERROR') {
      return this.handleConfigurationError(productionError, functionName);
    } else if (productionError.code === 'MISSING_USER_ID' || productionError.code === 'INVALID_JSON') {
      return this.handleValidationError(productionError, functionName);
    }

    return this.handleGenericNetlifyError(productionError, functionName);
  }

  /**
   * Handle Supabase-specific errors
   */
  handleSupabaseError(
    error: any,
    operation: string,
    context: Partial<ProductionErrorContext> = {}
  ): ErrorDisplayProps['error'] {
    const productionError = this.createProductionError(error, {
      operation: `supabase-${operation}`,
      ...context
    });

    this.logError(productionError);

    // Handle RLS policy errors
    if (error?.code === '42501' || error?.message?.includes('RLS')) {
      return this.handleRLSError(productionError);
    }

    // Handle connection errors
    if (error?.code === 'PGRST301' || error?.message?.includes('connection')) {
      return this.handleDatabaseConnectionError(productionError);
    }

    // Handle authentication errors
    if (error?.code === 'PGRST302' || error?.message?.includes('JWT')) {
      return this.handleDatabaseAuthError(productionError);
    }

    // Handle query errors
    if (error?.code?.startsWith('PG') || error?.code?.startsWith('PGRST')) {
      return this.handleDatabaseQueryError(productionError);
    }

    return this.handleGenericDatabaseError(productionError);
  }

  /**
   * Handle API rate limiting and quota errors
   */
  handleAPIRateLimitError(
    error: any,
    apiName: string,
    context: Partial<ProductionErrorContext> = {}
  ): ErrorDisplayProps['error'] {
    const productionError = this.createProductionError(error, {
      operation: `api-${apiName}`,
      ...context
    });

    this.logError(productionError);

    const retryAfter = this.extractRetryAfter(error);
    
    if (apiName === 'strava') {
      return this.handleStravaRateLimit(productionError, retryAfter);
    } else if (apiName === 'openweather') {
      return this.handleWeatherAPILimit(productionError, retryAfter);
    }

    return this.handleGenericRateLimit(productionError, apiName, retryAfter);
  }

  /**
   * Handle network and deployment errors
   */
  handleNetworkError(
    error: any,
    context: Partial<ProductionErrorContext> = {}
  ): ErrorDisplayProps['error'] {
    const productionError = this.createProductionError(error, {
      operation: 'network-request',
      ...context
    });

    this.logError(productionError);

    // Check if it's a CORS error
    if (error?.message?.includes('CORS') || error?.name === 'TypeError' && error?.message?.includes('fetch')) {
      return this.handleCORSError(productionError);
    }

    // Check if it's a DNS/connection error
    if (error?.code === 'ENOTFOUND' || error?.message?.includes('ERR_NAME_NOT_RESOLVED')) {
      return this.handleDNSError(productionError);
    }

    return this.handleGenericNetworkError(productionError);
  }

  /**
   * Create standardized production error object
   */
  private createProductionError(
    error: any,
    context: Partial<ProductionErrorContext>
  ): ProductionError {
    const fullContext: ProductionErrorContext = {
      operation: 'unknown',
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      networkInfo: this.getNetworkInfo(),
      ...context
    };

    return {
      code: error?.code || error?.error || 'UNKNOWN_ERROR',
      message: error?.message || String(error),
      statusCode: error?.status || error?.statusCode,
      details: error?.details || error?.stack,
      context: fullContext,
      retryable: this.isRetryable(error),
      severity: this.determineSeverity(error)
    };
  }

  /**
   * Handle server errors (500)
   */
  private handleServerError(error: ProductionError, functionName: string): ErrorDisplayProps['error'] {
    return {
      title: 'Server Error',
      message: `There's a temporary issue with our ${functionName} service. Our team has been notified.`,
      type: 'error',
      code: error.code,
      details: error.details,
      context: `Function: ${functionName}`,
      timestamp: error.context.timestamp,
      recoveryOptions: [
        {
          label: 'Try Again',
          description: 'Retry the operation',
          action: () => window.location.reload(),
          primary: true
        },
        {
          label: 'Report Issue',
          description: 'Report this problem',
          action: () => this.reportError(error),
          external: true
        }
      ]
    };
  }

  /**
   * Handle service unavailable errors (502, 503)
   */
  private handleServiceUnavailable(error: ProductionError, functionName: string): ErrorDisplayProps['error'] {
    return {
      title: 'Service Temporarily Unavailable',
      message: `The ${functionName} service is temporarily down for maintenance. Please try again in a few minutes.`,
      type: 'warning',
      code: error.code,
      details: error.details,
      context: `Function: ${functionName}`,
      timestamp: error.context.timestamp,
      recoveryOptions: [
        {
          label: 'Try Again in 5 Minutes',
          description: 'Wait and retry automatically',
          action: () => {
            setTimeout(() => window.location.reload(), 5 * 60 * 1000);
            alert('We\'ll automatically retry in 5 minutes.');
          },
          primary: true
        }
      ]
    };
  }

  /**
   * Handle timeout errors (504)
   */
  private handleTimeout(error: ProductionError, functionName: string): ErrorDisplayProps['error'] {
    return {
      title: 'Request Timed Out',
      message: `The ${functionName} operation took too long to complete. Try processing less data at once.`,
      type: 'warning',
      code: error.code,
      details: error.details,
      context: `Function: ${functionName}`,
      timestamp: error.context.timestamp,
      recoveryOptions: [
        {
          label: 'Try Smaller Range',
          description: 'Process less data at once',
          action: () => {
            alert('Try selecting a shorter time period (like "Last 30 days") and try again.');
          },
          primary: true
        },
        {
          label: 'Try Again',
          description: 'Retry the same operation',
          action: () => window.location.reload()
        }
      ]
    };
  }

  /**
   * Handle configuration errors
   */
  private handleConfigurationError(error: ProductionError, functionName: string): ErrorDisplayProps['error'] {
    return {
      title: 'Configuration Issue',
      message: 'There\'s a configuration problem with the application. The administrator has been notified.',
      type: 'error',
      code: error.code,
      details: error.details,
      context: `Function: ${functionName}`,
      timestamp: error.context.timestamp,
      recoveryOptions: [
        {
          label: 'Contact Support',
          description: 'Report this configuration issue',
          action: () => this.reportError(error),
          primary: true,
          external: true
        }
      ]
    };
  }

  /**
   * Handle RLS policy errors
   */
  private handleRLSError(error: ProductionError): ErrorDisplayProps['error'] {
    return {
      title: 'Access Denied',
      message: 'You don\'t have permission to access this data. Please reconnect your account.',
      type: 'error',
      code: error.code,
      details: error.details,
      context: 'Database security policy',
      timestamp: error.context.timestamp,
      recoveryOptions: [
        {
          label: 'Reconnect Account',
          description: 'Sign in again to refresh permissions',
          action: () => {
            localStorage.removeItem('strava_user');
            window.location.href = '/';
          },
          primary: true
        }
      ]
    };
  }

  /**
   * Handle database connection errors
   */
  private handleDatabaseConnectionError(error: ProductionError): ErrorDisplayProps['error'] {
    return {
      title: 'Database Connection Issue',
      message: 'Unable to connect to the database. This is usually temporary.',
      type: 'warning',
      code: error.code,
      details: error.details,
      context: 'Database connection',
      timestamp: error.context.timestamp,
      recoveryOptions: [
        {
          label: 'Try Again',
          description: 'Retry the database operation',
          action: () => window.location.reload(),
          primary: true
        },
        {
          label: 'Wait 2 Minutes',
          description: 'Wait for connection to restore',
          action: () => {
            setTimeout(() => window.location.reload(), 2 * 60 * 1000);
            alert('We\'ll automatically retry in 2 minutes.');
          }
        }
      ]
    };
  }

  /**
   * Handle Strava rate limiting
   */
  private handleStravaRateLimit(error: ProductionError, retryAfter?: number): ErrorDisplayProps['error'] {
    const waitTime = retryAfter || 15; // Default to 15 minutes
    const waitTimeText = waitTime > 60 ? `${Math.round(waitTime / 60)} minutes` : `${waitTime} seconds`;

    return {
      title: 'Strava Rate Limit Reached',
      message: `We've reached Strava's rate limit. Please wait ${waitTimeText} before trying again.`,
      type: 'warning',
      code: error.code,
      details: error.details,
      context: 'Strava API rate limiting',
      timestamp: error.context.timestamp,
      recoveryOptions: [
        {
          label: `Wait ${waitTimeText}`,
          description: 'Wait for rate limit to reset',
          action: () => {
            const waitMs = waitTime * 1000;
            setTimeout(() => window.location.reload(), waitMs);
            alert(`We'll automatically retry in ${waitTimeText}.`);
          },
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

  /**
   * Handle weather API quota exceeded
   */
  private handleWeatherAPILimit(error: ProductionError, retryAfter?: number): ErrorDisplayProps['error'] {
    return {
      title: 'Weather Data Limit Reached',
      message: 'The daily weather data quota has been exceeded. Weather information will be unavailable until tomorrow.',
      type: 'warning',
      code: error.code,
      details: error.details,
      context: 'OpenWeatherMap API quota',
      timestamp: error.context.timestamp,
      recoveryOptions: [
        {
          label: 'Continue Without Weather',
          description: 'Proceed without weather data',
          action: () => window.location.reload(),
          primary: true
        },
        {
          label: 'Try Tomorrow',
          description: 'Weather data will be available tomorrow',
          action: () => {
            alert('Weather data quota resets daily. Try again tomorrow for weather information.');
          }
        }
      ]
    };
  }

  /**
   * Handle CORS errors
   */
  private handleCORSError(error: ProductionError): ErrorDisplayProps['error'] {
    return {
      title: 'Connection Security Issue',
      message: 'There\'s a security configuration issue preventing the connection. This usually indicates a deployment problem.',
      type: 'error',
      code: error.code,
      details: error.details,
      context: 'CORS policy violation',
      timestamp: error.context.timestamp,
      recoveryOptions: [
        {
          label: 'Report Issue',
          description: 'Report this deployment issue',
          action: () => this.reportError(error),
          primary: true,
          external: true
        },
        {
          label: 'Try Different Browser',
          description: 'Test with another browser',
          action: () => {
            alert('Try opening the application in a different browser or incognito mode.');
          }
        }
      ]
    };
  }

  /**
   * Extract retry-after header from error
   */
  private extractRetryAfter(error: any): number | undefined {
    const retryAfter = error?.headers?.['retry-after'] || 
                      error?.response?.headers?.['retry-after'] ||
                      error?.retryAfter;
    
    if (retryAfter) {
      const parsed = parseInt(retryAfter, 10);
      return isNaN(parsed) ? undefined : parsed;
    }
    
    return undefined;
  }

  /**
   * Determine if error is retryable
   */
  private isRetryable(error: any): boolean {
    const nonRetryableCodes = ['AUTH_REQUIRED', 'INVALID_JSON', 'MISSING_USER_ID', 'CONFIG_ERROR'];
    const nonRetryableStatuses = [400, 401, 403, 404, 422];
    
    if (nonRetryableCodes.includes(error?.code)) return false;
    if (nonRetryableStatuses.includes(error?.status || error?.statusCode)) return false;
    
    return true;
  }

  /**
   * Determine error severity
   */
  private determineSeverity(error: any): ProductionError['severity'] {
    if (error?.code === 'CONFIG_ERROR' || error?.status === 500) return 'critical';
    if (error?.status === 401 || error?.status === 403) return 'high';
    if (error?.status === 429 || error?.status === 503) return 'medium';
    return 'low';
  }

  /**
   * Get network information if available
   */
  private getNetworkInfo() {
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    
    if (connection) {
      return {
        effectiveType: connection.effectiveType,
        downlink: connection.downlink,
        rtt: connection.rtt
      };
    }
    
    return undefined;
  }

  /**
   * Log error for debugging
   */
  private logError(error: ProductionError): void {
    console.error('[ProductionErrorHandler]', {
      code: error.code,
      message: error.message,
      severity: error.severity,
      context: error.context,
      timestamp: error.context.timestamp
    });

    // Add to error history
    this.errorHistory.unshift(error);
    if (this.errorHistory.length > this.maxHistorySize) {
      this.errorHistory = this.errorHistory.slice(0, this.maxHistorySize);
    }
  }

  /**
   * Report error to external service (placeholder)
   */
  private reportError(error: ProductionError): void {
    // In a real application, this would send the error to an error tracking service
    const errorReport = {
      code: error.code,
      message: error.message,
      severity: error.severity,
      context: error.context,
      userAgent: navigator.userAgent,
      url: window.location.href,
      timestamp: error.context.timestamp
    };

    console.log('[Error Report]', errorReport);
    
    // For now, copy to clipboard for manual reporting
    navigator.clipboard.writeText(JSON.stringify(errorReport, null, 2)).then(() => {
      alert('Error details copied to clipboard. Please paste this information when reporting the issue.');
    }).catch(() => {
      alert('Please copy the error details from the browser console and include them when reporting this issue.');
    });
  }

  /**
   * Handle generic errors with fallback
   */
  private handleGenericNetlifyError(error: ProductionError, functionName: string): ErrorDisplayProps['error'] {
    return {
      title: 'Service Error',
      message: `There was an issue with the ${functionName} service. Please try again.`,
      type: 'error',
      code: error.code,
      details: error.details,
      context: `Function: ${functionName}`,
      timestamp: error.context.timestamp,
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

  private handleValidationError(error: ProductionError, functionName: string): ErrorDisplayProps['error'] {
    return {
      title: 'Invalid Request',
      message: 'The request was not formatted correctly. Please refresh the page and try again.',
      type: 'warning',
      code: error.code,
      details: error.details,
      context: `Function: ${functionName}`,
      timestamp: error.context.timestamp,
      recoveryOptions: [
        {
          label: 'Refresh Page',
          description: 'Reload the application',
          action: () => window.location.reload(),
          primary: true
        }
      ]
    };
  }

  private handleDatabaseAuthError(error: ProductionError): ErrorDisplayProps['error'] {
    return {
      title: 'Database Authentication Issue',
      message: 'There\'s an authentication problem with the database. Please reconnect your account.',
      type: 'error',
      code: error.code,
      details: error.details,
      context: 'Database authentication',
      timestamp: error.context.timestamp,
      recoveryOptions: [
        {
          label: 'Reconnect Account',
          description: 'Sign in again',
          action: () => {
            localStorage.removeItem('strava_user');
            window.location.href = '/';
          },
          primary: true
        }
      ]
    };
  }

  private handleDatabaseQueryError(error: ProductionError): ErrorDisplayProps['error'] {
    return {
      title: 'Database Query Error',
      message: 'There was an issue processing your data. This might be a temporary problem.',
      type: 'error',
      code: error.code,
      details: error.details,
      context: 'Database query',
      timestamp: error.context.timestamp,
      recoveryOptions: [
        {
          label: 'Try Again',
          description: 'Retry the database operation',
          action: () => window.location.reload(),
          primary: true
        }
      ]
    };
  }

  private handleGenericDatabaseError(error: ProductionError): ErrorDisplayProps['error'] {
    return {
      title: 'Database Error',
      message: 'There was an issue with the database. Please try again in a few minutes.',
      type: 'error',
      code: error.code,
      details: error.details,
      context: 'Database operation',
      timestamp: error.context.timestamp,
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

  private handleGenericRateLimit(error: ProductionError, apiName: string, retryAfter?: number): ErrorDisplayProps['error'] {
    const waitTime = retryAfter || 60;
    const waitTimeText = waitTime > 60 ? `${Math.round(waitTime / 60)} minutes` : `${waitTime} seconds`;

    return {
      title: 'Rate Limit Exceeded',
      message: `The ${apiName} service rate limit has been exceeded. Please wait ${waitTimeText} before trying again.`,
      type: 'warning',
      code: error.code,
      details: error.details,
      context: `${apiName} API rate limiting`,
      timestamp: error.context.timestamp,
      recoveryOptions: [
        {
          label: `Wait ${waitTimeText}`,
          description: 'Wait for rate limit to reset',
          action: () => {
            const waitMs = waitTime * 1000;
            setTimeout(() => window.location.reload(), waitMs);
            alert(`We'll automatically retry in ${waitTimeText}.`);
          },
          primary: true
        }
      ]
    };
  }

  private handleDNSError(error: ProductionError): ErrorDisplayProps['error'] {
    return {
      title: 'Connection Failed',
      message: 'Unable to reach the server. This might be a network or DNS issue.',
      type: 'error',
      code: error.code,
      details: error.details,
      context: 'DNS resolution',
      timestamp: error.context.timestamp,
      recoveryOptions: [
        {
          label: 'Check Connection',
          description: 'Test your internet connection',
          action: () => window.open('https://www.google.com', '_blank'),
          primary: true,
          external: true
        },
        {
          label: 'Try Again',
          description: 'Retry the connection',
          action: () => window.location.reload()
        }
      ]
    };
  }

  private handleGenericNetworkError(error: ProductionError): ErrorDisplayProps['error'] {
    return {
      title: 'Network Error',
      message: 'There was a network connection problem. Please check your internet connection and try again.',
      type: 'error',
      code: error.code,
      details: error.details,
      context: 'Network request',
      timestamp: error.context.timestamp,
      recoveryOptions: [
        {
          label: 'Try Again',
          description: 'Retry the network request',
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

  /**
   * Get error history for debugging
   */
  getErrorHistory(): ProductionError[] {
    return [...this.errorHistory];
  }

  /**
   * Clear error history
   */
  clearErrorHistory(): void {
    this.errorHistory = [];
  }
}

// Global instance
export const productionErrorHandler = new ProductionErrorHandler();