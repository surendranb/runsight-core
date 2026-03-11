/**
 * Comprehensive Error Handler
 * Integrates error analysis, logging, and user feedback
 */

import { errorAnalyzer, ErrorAnalysis, ErrorContext } from './error-analyzer';
import { debugLogger } from './debug-logger';

export interface ErrorHandlerOptions {
  showUserFeedback?: boolean;
  logToConsole?: boolean;
  component: string;
  context?: Partial<ErrorContext>;
}

export interface UserFeedback {
  title: string;
  message: string;
  type: 'error' | 'warning' | 'info';
  actions?: UserAction[];
}

export interface UserAction {
  label: string;
  action: () => void;
  primary?: boolean;
}

export class ErrorHandler {
  private errorCallbacks: ((analysis: ErrorAnalysis) => void)[] = [];

  /**
   * Handle an error with comprehensive analysis and logging
   */
  handleError(
    error: Error, 
    options: ErrorHandlerOptions
  ): ErrorAnalysis {
    const correlationId = debugLogger.newCorrelation();
    
    // Analyze the error
    const analysis = errorAnalyzer.analyzeError(error, {
      ...options.context,
      sessionId: correlationId
    });

    // Log the error with correlation ID
    debugLogger.logWithCorrelation(
      analysis.severity === 'critical' ? 'critical' : 'error',
      `Error in ${options.component}: ${error.message}`,
      options.component,
      correlationId,
      {
        analysis,
        originalError: error,
        stack: error.stack
      }
    );

    // Show user feedback if requested
    if (options.showUserFeedback !== false) {
      this.showUserFeedback(analysis);
    }

    // Notify error callbacks
    this.notifyErrorCallbacks(analysis);

    return analysis;
  }

  /**
   * Handle async operation errors
   */
  async handleAsyncError<T>(
    operation: () => Promise<T>,
    options: ErrorHandlerOptions
  ): Promise<T | null> {
    try {
      debugLogger.info(
        `Starting async operation in ${options.component}`,
        options.component,
        options.context
      );

      const result = await operation();
      
      debugLogger.info(
        `Completed async operation in ${options.component}`,
        options.component
      );

      return result;
    } catch (error) {
      this.handleError(error as Error, options);
      return null;
    }
  }

  /**
   * Wrap a function with error handling
   */
  wrapWithErrorHandling<T extends (...args: any[]) => any>(
    fn: T,
    options: ErrorHandlerOptions
  ): T {
    return ((...args: any[]) => {
      try {
        const result = fn(...args);
        
        // Handle async functions
        if (result instanceof Promise) {
          return result.catch((error: Error) => {
            this.handleError(error, options);
            throw error;
          });
        }
        
        return result;
      } catch (error) {
        this.handleError(error as Error, options);
        throw error;
      }
    }) as T;
  }

  /**
   * Show user-friendly error feedback
   */
  private showUserFeedback(analysis: ErrorAnalysis): void {
    const feedback = this.createUserFeedback(analysis);
    
    // For now, use browser alert - in a real app this would be a toast/modal
    if (feedback.type === 'error') {
      const message = `${feedback.title}\n\n${feedback.message}`;
      
      if (analysis.suggestedSolutions.length > 0) {
        const solutions = analysis.suggestedSolutions
          .map((s, i) => `${i + 1}. ${s.title}: ${s.description}`)
          .join('\n');
        alert(`${message}\n\nSuggested solutions:\n${solutions}`);
      } else {
        alert(message);
      }
    }
  }

  /**
   * Create user-friendly feedback from error analysis
   */
  private createUserFeedback(analysis: ErrorAnalysis): UserFeedback {
    let title = 'An error occurred';
    let message = analysis.message;
    let type: 'error' | 'warning' | 'info' = 'error';

    switch (analysis.category) {
      case 'network':
        title = 'Connection Issue';
        message = 'There was a problem connecting to the server. Please check your internet connection and try again.';
        break;

      case 'authentication':
        title = 'Authentication Required';
        message = 'Your session has expired. Please log in again to continue.';
        break;

      case 'data':
        title = 'Data Processing Error';
        message = 'There was an issue processing the data. This might be a temporary problem.';
        break;

      case 'external_api':
        title = 'Service Unavailable';
        message = 'One of our external services is currently unavailable. Please try again in a few minutes.';
        break;

      case 'validation':
        title = 'Invalid Data';
        message = 'The provided data is invalid. Please check your input and try again.';
        type = 'warning';
        break;

      case 'system':
        title = 'System Error';
        message = 'A system error occurred. Our team has been notified and will investigate.';
        break;
    }

    // Add frequency information for recurring errors
    if (analysis.isRecurring) {
      message += ` (This error has occurred ${analysis.frequency} times)`;
    }

    const actions: UserAction[] = [];

    // Add actions based on suggested solutions
    if (analysis.suggestedSolutions.length > 0) {
      const primarySolution = analysis.suggestedSolutions[0];
      if (primarySolution.title.includes('Re-authenticate')) {
        actions.push({
          label: 'Re-authenticate',
          action: () => {
            // Trigger re-authentication
            window.location.href = '/auth/logout';
          },
          primary: true
        });
      }
    }

    return {
      title,
      message,
      type,
      actions
    };
  }

  /**
   * Register callback for error notifications
   */
  onError(callback: (analysis: ErrorAnalysis) => void): void {
    this.errorCallbacks.push(callback);
  }

  /**
   * Notify all error callbacks
   */
  private notifyErrorCallbacks(analysis: ErrorAnalysis): void {
    for (const callback of this.errorCallbacks) {
      try {
        callback(analysis);
      } catch (error) {
        console.error('Error in error callback:', error);
      }
    }
  }

  /**
   * Get error statistics
   */
  getErrorStats() {
    return errorAnalyzer.getErrorStats();
  }

  /**
   * Get recent logs
   */
  getRecentLogs(count = 50) {
    return debugLogger.getLogs().slice(0, count);
  }

  /**
   * Export debug information
   */
  exportDebugInfo(): string {
    const stats = this.getErrorStats();
    const recentLogs = this.getRecentLogs(100);
    
    return JSON.stringify({
      timestamp: new Date().toISOString(),
      errorStats: stats,
      recentLogs,
      userAgent: navigator.userAgent,
      url: window.location.href,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      }
    }, null, 2);
  }
}

// Global error handler instance
export const errorHandler = new ErrorHandler();

// Set up global error handling
window.addEventListener('error', (event) => {
  errorHandler.handleError(event.error || new Error(event.message), {
    component: 'global',
    context: {
      url: event.filename,
      requestData: {
        line: event.lineno,
        column: event.colno
      }
    }
  });
});

window.addEventListener('unhandledrejection', (event) => {
  const error = event.reason instanceof Error 
    ? event.reason 
    : new Error(String(event.reason));
    
  errorHandler.handleError(error, {
    component: 'promise',
    context: {
      type: 'unhandled_promise_rejection'
    }
  });
});