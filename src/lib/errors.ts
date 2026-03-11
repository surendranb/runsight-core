// Error handling utilities for the robust data sync system

import { ErrorType, SyncError, SyncPhase } from '../types/sync';

// Custom error classes
export class SyncError extends Error {
  constructor(
    message: string,
    public code: string,
    public type: ErrorType,
    public phase: SyncPhase,
    public retryable: boolean = false,
    public context: Record<string, any> = {}
  ) {
    super(message);
    this.name = 'SyncError';
  }

  toJSON(): SyncError {
    return {
      code: this.code,
      message: this.message,
      type: this.type,
      phase: this.phase,
      retryable: this.retryable,
      context: this.context,
      timestamp: new Date().toISOString(),
      stack_trace: this.stack
    };
  }
}

export class NetworkError extends SyncError {
  constructor(message: string, phase: SyncPhase, context: Record<string, any> = {}) {
    super(message, 'NETWORK_ERROR', 'network_error', phase, true, context);
    this.name = 'NetworkError';
  }
}

export class RateLimitError extends SyncError {
  constructor(message: string, phase: SyncPhase, retryAfter?: number) {
    super(
      message, 
      'RATE_LIMIT_EXCEEDED', 
      'rate_limit', 
      phase, 
      true, 
      { retry_after: retryAfter }
    );
    this.name = 'RateLimitError';
  }
}

export class AuthenticationError extends SyncError {
  constructor(message: string, phase: SyncPhase, context: Record<string, any> = {}) {
    super(message, 'AUTHENTICATION_FAILED', 'authentication_error', phase, false, context);
    this.name = 'AuthenticationError';
  }
}

export class ValidationError extends SyncError {
  constructor(message: string, phase: SyncPhase, field: string, value: any) {
    super(
      message, 
      'VALIDATION_FAILED', 
      'invalid_data', 
      phase, 
      false, 
      { field, value }
    );
    this.name = 'ValidationError';
  }
}

export class DatabaseError extends SyncError {
  constructor(message: string, phase: SyncPhase, operation: string, context: Record<string, any> = {}) {
    super(
      message, 
      'DATABASE_ERROR', 
      'database_timeout', 
      phase, 
      true, 
      { operation, ...context }
    );
    this.name = 'DatabaseError';
  }
}

// Error classification utility
export function classifyError(error: any, phase: SyncPhase): SyncError {
  // If it's already a SyncError, return as-is
  if (error instanceof SyncError) {
    return error;
  }

  const message = error?.message || 'Unknown error occurred';
  const context = {
    original_error: error?.name || 'Error',
    stack: error?.stack
  };

  // Network-related errors
  if (error?.code === 'ENOTFOUND' || 
      error?.code === 'ECONNREFUSED' || 
      error?.code === 'ETIMEDOUT' ||
      message.includes('network') ||
      message.includes('timeout')) {
    return new NetworkError(message, phase, context);
  }

  // Rate limiting errors
  if (error?.status === 429 || 
      error?.response?.status === 429 ||
      message.includes('rate limit') ||
      message.includes('too many requests')) {
    const retryAfter = error?.response?.headers?.['retry-after'] || 
                      error?.headers?.['retry-after'];
    return new RateLimitError(message, phase, retryAfter);
  }

  // Authentication errors
  if (error?.status === 401 || 
      error?.response?.status === 401 ||
      error?.status === 403 || 
      error?.response?.status === 403 ||
      message.includes('unauthorized') ||
      message.includes('forbidden') ||
      message.includes('authentication') ||
      message.includes('JWT')) {
    return new AuthenticationError(message, phase, context);
  }

  // Database errors
  if (error?.code?.startsWith('PG') || 
      message.includes('database') ||
      message.includes('connection') ||
      error?.name === 'PostgrestError') {
    return new DatabaseError(message, phase, 'unknown', context);
  }

  // Validation errors
  if (error?.name === 'ValidationError' ||
      message.includes('validation') ||
      message.includes('invalid')) {
    return new ValidationError(message, phase, 'unknown', error?.value);
  }

  // Function timeout errors
  if (message.includes('timeout') || 
      message.includes('function timeout') ||
      error?.code === 'FUNCTION_TIMEOUT') {
    return new SyncError(
      message,
      'FUNCTION_TIMEOUT',
      'function_timeout',
      phase,
      false,
      context
    );
  }

  // Memory limit errors
  if (message.includes('memory') || 
      message.includes('out of memory') ||
      error?.code === 'MEMORY_LIMIT') {
    return new SyncError(
      message,
      'MEMORY_LIMIT_EXCEEDED',
      'memory_limit',
      phase,
      false,
      context
    );
  }

  // Default to unknown error
  return new SyncError(
    message,
    'UNKNOWN_ERROR',
    'unknown_error',
    phase,
    true, // Default to retryable for unknown errors
    context
  );
}

// Retry logic utilities
export interface RetryOptions {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  retryableErrors?: ErrorType[];
}

export const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxRetries: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 30000, // 30 seconds
  backoffMultiplier: 2,
  retryableErrors: [
    'network_error',
    'rate_limit',
    'temporary_api_error',
    'database_timeout',
    'unknown_error'
  ]
};

export function shouldRetry(error: SyncError, options: RetryOptions = DEFAULT_RETRY_OPTIONS): boolean {
  if (!error.retryable) {
    return false;
  }

  if (options.retryableErrors && !options.retryableErrors.includes(error.type)) {
    return false;
  }

  return true;
}

export function calculateRetryDelay(
  attempt: number, 
  options: RetryOptions = DEFAULT_RETRY_OPTIONS
): number {
  const delay = options.baseDelay * Math.pow(options.backoffMultiplier, attempt - 1);
  return Math.min(delay, options.maxDelay);
}

export async function withRetry<T>(
  operation: () => Promise<T>,
  phase: SyncPhase,
  options: RetryOptions = DEFAULT_RETRY_OPTIONS
): Promise<T> {
  let lastError: SyncError;
  
  for (let attempt = 1; attempt <= options.maxRetries + 1; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = classifyError(error, phase);
      
      // Don't retry on the last attempt or if error is not retryable
      if (attempt > options.maxRetries || !shouldRetry(lastError, options)) {
        throw lastError;
      }
      
      const delay = calculateRetryDelay(attempt, options);
      console.warn(
        `Attempt ${attempt} failed, retrying in ${delay}ms:`, 
        lastError.message
      );
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
}

// Circuit breaker implementation
export class CircuitBreaker {
  private failures: number = 0;
  private lastFailureTime: number = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';

  constructor(
    private failureThreshold: number = 5,
    private recoveryTimeout: number = 60000 // 1 minute
  ) {}

  async execute<T>(operation: () => Promise<T>, phase: SyncPhase): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime > this.recoveryTimeout) {
        this.state = 'half-open';
      } else {
        throw new SyncError(
          'Circuit breaker is open',
          'CIRCUIT_BREAKER_OPEN',
          'temporary_api_error',
          phase,
          true,
          { 
            failures: this.failures,
            last_failure: new Date(this.lastFailureTime).toISOString()
          }
        );
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failures = 0;
    this.state = 'closed';
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();
    
    if (this.failures >= this.failureThreshold) {
      this.state = 'open';
    }
  }

  getState(): { state: string; failures: number; lastFailureTime: number } {
    return {
      state: this.state,
      failures: this.failures,
      lastFailureTime: this.lastFailureTime
    };
  }
}

// Error reporting utilities
export function formatErrorForUser(error: SyncError): string {
  switch (error.type) {
    case 'network_error':
      return 'Network connection issue. Please check your internet connection and try again.';
    
    case 'rate_limit':
      const retryAfter = error.context.retry_after;
      const waitTime = retryAfter ? `Please wait ${retryAfter} seconds before trying again.` : '';
      return `API rate limit exceeded. ${waitTime}`;
    
    case 'authentication_error':
      return 'Authentication failed. Please reconnect your Strava account.';
    
    case 'invalid_data':
      return 'Invalid data encountered. Some activities may be skipped.';
    
    case 'database_timeout':
      return 'Database is temporarily unavailable. Please try again in a few minutes.';
    
    case 'function_timeout':
      return 'Operation timed out. Please try syncing a smaller date range.';
    
    case 'memory_limit':
      return 'Too much data to process at once. Please try syncing a smaller date range.';
    
    case 'quota_exceeded':
      return 'API quota exceeded. Please try again later.';
    
    default:
      return 'An unexpected error occurred. Please try again.';
  }
}

export function logError(error: SyncError, context: Record<string, any> = {}): void {
  const logData = {
    error_code: error.code,
    error_type: error.type,
    error_message: error.message,
    phase: error.phase,
    retryable: error.retryable,
    context: { ...error.context, ...context },
    timestamp: new Date().toISOString(),
    stack_trace: error.stack
  };

  console.error('Sync error occurred:', logData);
}

// Error aggregation for batch operations
export class ErrorCollector {
  private errors: SyncError[] = [];

  add(error: SyncError): void {
    this.errors.push(error);
  }

  addFromCatch(error: any, phase: SyncPhase): void {
    const syncError = classifyError(error, phase);
    this.add(syncError);
  }

  getErrors(): SyncError[] {
    return [...this.errors];
  }

  hasErrors(): boolean {
    return this.errors.length > 0;
  }

  getErrorSummary(): { total: number; by_type: Record<ErrorType, number> } {
    const summary = {
      total: this.errors.length,
      by_type: {} as Record<ErrorType, number>
    };

    for (const error of this.errors) {
      summary.by_type[error.type] = (summary.by_type[error.type] || 0) + 1;
    }

    return summary;
  }

  clear(): void {
    this.errors = [];
  }
}