/**
 * Error Analysis and Categorization System
 * Provides comprehensive error analysis, categorization, and debugging context
 */

export type ErrorCategory = 
  | 'network'
  | 'authentication' 
  | 'data'
  | 'system'
  | 'validation'
  | 'external_api'
  | 'unknown';

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface ErrorContext {
  userId?: string;
  sessionId: string;
  userAgent: string;
  url: string;
  requestData?: any;
  environmentInfo: EnvironmentInfo;
  previousActions: UserAction[];
  timestamp: Date;
}

export interface EnvironmentInfo {
  platform: string;
  userAgent: string;
  viewport?: { width: number; height: number };
  connectionType?: string;
  language: string;
}

export interface UserAction {
  type: string;
  timestamp: Date;
  data?: any;
}

export interface ErrorAnalysis {
  id: string;
  timestamp: Date;
  category: ErrorCategory;
  severity: ErrorSeverity;
  message: string;
  stackTrace?: string;
  context: ErrorContext;
  suggestedSolutions: Solution[];
  frequency: number;
  isRecurring: boolean;
}

export interface Solution {
  title: string;
  description: string;
  steps: string[];
  priority: number;
}

export class ErrorAnalyzer {
  private errorFrequency = new Map<string, number>();
  private errorPatterns = new Map<string, ErrorPattern>();

  /**
   * Analyze an error and provide comprehensive debugging information
   */
  analyzeError(error: Error, context?: Partial<ErrorContext>): ErrorAnalysis {
    const errorId = this.generateErrorId(error);
    const category = this.categorizeError(error);
    const severity = this.determineSeverity(error, category);
    const fullContext = this.collectContext(context);
    const solutions = this.suggestSolutions(error, category);
    
    // Track frequency
    const frequency = this.trackErrorFrequency(errorId);
    const isRecurring = frequency > 1;

    return {
      id: errorId,
      timestamp: new Date(),
      category,
      severity,
      message: error.message,
      stackTrace: error.stack,
      context: fullContext,
      suggestedSolutions: solutions,
      frequency,
      isRecurring
    };
  }

  /**
   * Categorize error based on message and stack trace patterns
   */
  categorizeError(error: Error): ErrorCategory {
    const message = error.message.toLowerCase();
    const stack = error.stack?.toLowerCase() || '';

    // Network errors
    if (message.includes('fetch') || 
        message.includes('network') || 
        message.includes('timeout') ||
        message.includes('cors') ||
        message.includes('connection')) {
      return 'network';
    }

    // Authentication errors
    if (message.includes('unauthorized') ||
        message.includes('forbidden') ||
        message.includes('token') ||
        message.includes('auth') ||
        message.includes('login')) {
      return 'authentication';
    }

    // Data/JSON parsing errors
    if (message.includes('json') ||
        message.includes('parse') ||
        message.includes('unexpected end') ||
        message.includes('syntax error')) {
      return 'data';
    }

    // Validation errors
    if (message.includes('validation') ||
        message.includes('required') ||
        message.includes('invalid') ||
        message.includes('missing')) {
      return 'validation';
    }

    // External API errors
    if (message.includes('strava') ||
        message.includes('openweather') ||
        message.includes('supabase') ||
        message.includes('api')) {
      return 'external_api';
    }

    // System errors
    if (message.includes('memory') ||
        message.includes('timeout') ||
        message.includes('function') ||
        stack.includes('netlify')) {
      return 'system';
    }

    return 'unknown';
  }

  /**
   * Determine error severity based on category and context
   */
  determineSeverity(error: Error, category: ErrorCategory): ErrorSeverity {
    const message = error.message.toLowerCase();

    // Critical errors that break core functionality
    if (category === 'authentication' || 
        message.includes('database') ||
        message.includes('critical') ||
        message.includes('fatal')) {
      return 'critical';
    }

    // High severity for data and system errors
    if (category === 'data' || 
        category === 'system' ||
        message.includes('sync') ||
        message.includes('save')) {
      return 'high';
    }

    // Medium for external API and network issues
    if (category === 'external_api' || 
        category === 'network') {
      return 'medium';
    }

    return 'low';
  }

  /**
   * Collect comprehensive error context
   */
  collectContext(partialContext?: Partial<ErrorContext>): ErrorContext {
    return {
      sessionId: this.generateSessionId(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      environmentInfo: {
        platform: navigator.platform,
        userAgent: navigator.userAgent,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        },
        language: navigator.language
      },
      previousActions: this.getPreviousActions(),
      timestamp: new Date(),
      ...partialContext
    };
  }

  /**
   * Suggest solutions based on error category and patterns
   */
  suggestSolutions(error: Error, category: ErrorCategory): Solution[] {
    const solutions: Solution[] = [];
    const message = error.message.toLowerCase();

    switch (category) {
      case 'network':
        solutions.push({
          title: 'Check Network Connection',
          description: 'Verify internet connectivity and try again',
          steps: [
            'Check your internet connection',
            'Try refreshing the page',
            'Check if the service is down'
          ],
          priority: 1
        });
        break;

      case 'authentication':
        solutions.push({
          title: 'Re-authenticate with Strava',
          description: 'Your authentication token may have expired',
          steps: [
            'Click "Logout" in the top right',
            'Click "Connect with Strava" to re-authenticate',
            'Grant necessary permissions'
          ],
          priority: 1
        });
        break;

      case 'data':
        if (message.includes('json')) {
          solutions.push({
            title: 'API Response Issue',
            description: 'The server returned invalid data',
            steps: [
              'Try the operation again',
              'Check browser console for detailed errors',
              'Contact support if the issue persists'
            ],
            priority: 1
          });
        }
        break;

      case 'external_api':
        solutions.push({
          title: 'External Service Issue',
          description: 'There may be an issue with Strava or weather services',
          steps: [
            'Wait a few minutes and try again',
            'Check Strava service status',
            'Try syncing a smaller date range'
          ],
          priority: 1
        });
        break;
    }

    return solutions;
  }

  /**
   * Track error frequency for pattern recognition
   */
  private trackErrorFrequency(errorId: string): number {
    const current = this.errorFrequency.get(errorId) || 0;
    const newCount = current + 1;
    this.errorFrequency.set(errorId, newCount);
    return newCount;
  }

  /**
   * Generate unique error ID based on message and stack
   */
  private generateErrorId(error: Error): string {
    const content = error.message + (error.stack || '');
    return btoa(content).substring(0, 16);
  }

  /**
   * Generate session ID for tracking
   */
  private generateSessionId(): string {
    return Math.random().toString(36).substring(2, 15);
  }

  /**
   * Get previous user actions for context
   */
  private getPreviousActions(): UserAction[] {
    // This would be populated by action tracking
    return [];
  }

  /**
   * Get error statistics and patterns
   */
  getErrorStats(): { totalErrors: number; categories: Record<ErrorCategory, number> } {
    const categories = {} as Record<ErrorCategory, number>;
    let totalErrors = 0;

    for (const count of this.errorFrequency.values()) {
      totalErrors += count;
    }

    return { totalErrors, categories };
  }
}

interface ErrorPattern {
  pattern: string;
  category: ErrorCategory;
  solutions: Solution[];
}

// Global error analyzer instance
export const errorAnalyzer = new ErrorAnalyzer();