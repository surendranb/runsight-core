/**
 * Debug Logger with Structured Logging and Correlation IDs
 * Provides comprehensive logging for debugging and monitoring
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'critical';

export interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  message: string;
  correlationId: string;
  component: string;
  context?: any;
  userId?: string;
  sessionId?: string;
  error?: Error;
}

export interface LogFilter {
  level?: LogLevel;
  component?: string;
  correlationId?: string;
  startTime?: Date;
  endTime?: Date;
}

export class DebugLogger {
  private logs: LogEntry[] = [];
  private correlationId: string;
  private sessionId: string;
  private maxLogs = 1000; // Keep last 1000 logs in memory

  constructor() {
    this.correlationId = this.generateCorrelationId();
    this.sessionId = this.generateSessionId();
  }

  /**
   * Log debug information
   */
  debug(message: string, component: string, context?: any): void {
    this.log('debug', message, component, context);
  }

  /**
   * Log informational messages
   */
  info(message: string, component: string, context?: any): void {
    this.log('info', message, component, context);
  }

  /**
   * Log warnings
   */
  warn(message: string, component: string, context?: any): void {
    this.log('warn', message, component, context);
  }

  /**
   * Log errors
   */
  error(message: string, component: string, error?: Error, context?: any): void {
    this.log('error', message, component, { ...context, error });
  }

  /**
   * Log critical errors
   */
  critical(message: string, component: string, error?: Error, context?: any): void {
    this.log('critical', message, component, { ...context, error });
    
    // For critical errors, also send to external monitoring if available
    this.sendToExternalMonitoring('critical', message, component, error, context);
  }

  /**
   * Create a new correlation ID for tracking related operations
   */
  newCorrelation(): string {
    this.correlationId = this.generateCorrelationId();
    return this.correlationId;
  }

  /**
   * Get current correlation ID
   */
  getCurrentCorrelationId(): string {
    return this.correlationId;
  }

  /**
   * Log with specific correlation ID
   */
  logWithCorrelation(
    level: LogLevel, 
    message: string, 
    component: string, 
    correlationId: string,
    context?: any
  ): void {
    const originalCorrelationId = this.correlationId;
    this.correlationId = correlationId;
    this.log(level, message, component, context);
    this.correlationId = originalCorrelationId;
  }

  /**
   * Get logs with optional filtering
   */
  getLogs(filter?: LogFilter): LogEntry[] {
    let filteredLogs = [...this.logs];

    if (filter) {
      if (filter.level) {
        const levelPriority = this.getLevelPriority(filter.level);
        filteredLogs = filteredLogs.filter(log => 
          this.getLevelPriority(log.level) >= levelPriority
        );
      }

      if (filter.component) {
        filteredLogs = filteredLogs.filter(log => 
          log.component.includes(filter.component!)
        );
      }

      if (filter.correlationId) {
        filteredLogs = filteredLogs.filter(log => 
          log.correlationId === filter.correlationId
        );
      }

      if (filter.startTime) {
        filteredLogs = filteredLogs.filter(log => 
          log.timestamp >= filter.startTime!
        );
      }

      if (filter.endTime) {
        filteredLogs = filteredLogs.filter(log => 
          log.timestamp <= filter.endTime!
        );
      }
    }

    return filteredLogs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Get logs as formatted strings
   */
  getFormattedLogs(filter?: LogFilter): string[] {
    return this.getLogs(filter).map(log => this.formatLogEntry(log));
  }

  /**
   * Stream logs in real-time (for debug console)
   */
  async* streamLogs(filter?: LogFilter): AsyncIterable<LogEntry> {
    // Yield existing logs first
    for (const log of this.getLogs(filter)) {
      yield log;
    }

    // Then stream new logs as they come
    // This would be implemented with event listeners in a real scenario
  }

  /**
   * Export logs for external analysis
   */
  exportLogs(format: 'json' | 'csv' = 'json'): string {
    const logs = this.getLogs();
    
    if (format === 'json') {
      return JSON.stringify(logs, null, 2);
    } else {
      // CSV format
      const headers = ['timestamp', 'level', 'component', 'correlationId', 'message'];
      const csvRows = [headers.join(',')];
      
      for (const log of logs) {
        const row = [
          log.timestamp.toISOString(),
          log.level,
          log.component,
          log.correlationId,
          `"${log.message.replace(/"/g, '""')}"`
        ];
        csvRows.push(row.join(','));
      }
      
      return csvRows.join('\n');
    }
  }

  /**
   * Clear all logs
   */
  clearLogs(): void {
    this.logs = [];
  }

  /**
   * Core logging method
   */
  private log(level: LogLevel, message: string, component: string, context?: any): void {
    const logEntry: LogEntry = {
      timestamp: new Date(),
      level,
      message,
      correlationId: this.correlationId,
      component,
      context,
      sessionId: this.sessionId
    };

    // Add to memory
    this.logs.push(logEntry);

    // Trim logs if we exceed max
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Console output for development
    if (process.env.NODE_ENV === 'development') {
      const formattedMessage = this.formatLogEntry(logEntry);
      
      switch (level) {
        case 'debug':
          console.debug(formattedMessage);
          break;
        case 'info':
          console.info(formattedMessage);
          break;
        case 'warn':
          console.warn(formattedMessage);
          break;
        case 'error':
        case 'critical':
          console.error(formattedMessage);
          if (context?.error) {
            console.error(context.error);
          }
          break;
      }
    }
  }

  /**
   * Format log entry for display
   */
  private formatLogEntry(log: LogEntry): string {
    const timestamp = log.timestamp.toISOString();
    const level = log.level.toUpperCase().padEnd(8);
    const component = log.component.padEnd(20);
    const correlationId = log.correlationId.substring(0, 8);
    
    let formatted = `[${timestamp}] ${level} [${component}] [${correlationId}] ${log.message}`;
    
    if (log.context && Object.keys(log.context).length > 0) {
      formatted += ` | Context: ${JSON.stringify(log.context)}`;
    }
    
    return formatted;
  }

  /**
   * Get numeric priority for log level
   */
  private getLevelPriority(level: LogLevel): number {
    const priorities = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3,
      critical: 4
    };
    return priorities[level];
  }

  /**
   * Generate correlation ID
   */
  private generateCorrelationId(): string {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  }

  /**
   * Generate session ID
   */
  private generateSessionId(): string {
    return Math.random().toString(36).substring(2, 15);
  }

  /**
   * Send critical errors to external monitoring
   */
  private sendToExternalMonitoring(
    level: LogLevel, 
    message: string, 
    component: string, 
    error?: Error, 
    context?: any
  ): void {
    // This would integrate with external monitoring services
    // For now, just ensure it's logged to console
    console.error('CRITICAL ERROR:', {
      level,
      message,
      component,
      error: error?.message,
      stack: error?.stack,
      context,
      timestamp: new Date().toISOString(),
      correlationId: this.correlationId
    });
  }
}

// Global debug logger instance
export const debugLogger = new DebugLogger();