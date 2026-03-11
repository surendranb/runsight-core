/**
 * Unit tests for Error Analyzer
 */

import { ErrorAnalyzer, ErrorCategory } from '../error-analyzer';

describe('ErrorAnalyzer', () => {
  let analyzer: ErrorAnalyzer;

  beforeEach(() => {
    analyzer = new ErrorAnalyzer();
  });

  describe('categorizeError', () => {
    it('should categorize network errors correctly', () => {
      const networkErrors = [
        new Error('fetch failed'),
        new Error('Network request timeout'),
        new Error('CORS error occurred'),
        new Error('Connection refused')
      ];

      networkErrors.forEach(error => {
        expect(analyzer.categorizeError(error)).toBe('network');
      });
    });

    it('should categorize authentication errors correctly', () => {
      const authErrors = [
        new Error('Unauthorized access'),
        new Error('Token expired'),
        new Error('Authentication failed'),
        new Error('Login required')
      ];

      authErrors.forEach(error => {
        expect(analyzer.categorizeError(error)).toBe('authentication');
      });
    });

    it('should categorize data errors correctly', () => {
      const dataErrors = [
        new Error('Unexpected end of JSON input'),
        new Error('JSON parse error'),
        new Error('Invalid JSON syntax')
      ];

      dataErrors.forEach(error => {
        expect(analyzer.categorizeError(error)).toBe('data');
      });
    });

    it('should categorize validation errors correctly', () => {
      const validationErrors = [
        new Error('Validation failed'),
        new Error('Required field missing'),
        new Error('Invalid email format')
      ];

      validationErrors.forEach(error => {
        expect(analyzer.categorizeError(error)).toBe('validation');
      });
    });

    it('should categorize external API errors correctly', () => {
      const apiErrors = [
        new Error('Strava API error'),
        new Error('OpenWeather service unavailable'),
        new Error('Supabase connection failed')
      ];

      apiErrors.forEach(error => {
        expect(analyzer.categorizeError(error)).toBe('external_api');
      });
    });

    it('should return unknown for unrecognized errors', () => {
      const unknownError = new Error('Some random error message');
      expect(analyzer.categorizeError(unknownError)).toBe('unknown');
    });
  });

  describe('determineSeverity', () => {
    it('should assign critical severity to authentication errors', () => {
      const error = new Error('Authentication failed');
      const category = analyzer.categorizeError(error);
      expect(analyzer.determineSeverity(error, category)).toBe('critical');
    });

    it('should assign high severity to data errors', () => {
      const error = new Error('JSON parse error');
      const category = analyzer.categorizeError(error);
      expect(analyzer.determineSeverity(error, category)).toBe('high');
    });

    it('should assign medium severity to network errors', () => {
      const error = new Error('Network timeout');
      const category = analyzer.categorizeError(error);
      expect(analyzer.determineSeverity(error, category)).toBe('medium');
    });

    it('should assign low severity to unknown errors', () => {
      const error = new Error('Random error');
      const category = analyzer.categorizeError(error);
      expect(analyzer.determineSeverity(error, category)).toBe('low');
    });
  });

  describe('analyzeError', () => {
    it('should provide comprehensive error analysis', () => {
      const error = new Error('Strava API authentication failed');
      const analysis = analyzer.analyzeError(error);

      expect(analysis).toMatchObject({
        category: 'external_api',
        severity: 'medium',
        message: 'Strava API authentication failed',
        frequency: 1,
        isRecurring: false
      });

      expect(analysis.id).toBeDefined();
      expect(analysis.timestamp).toBeInstanceOf(Date);
      expect(analysis.context).toBeDefined();
      expect(analysis.suggestedSolutions).toBeInstanceOf(Array);
    });

    it('should track error frequency', () => {
      const error = new Error('Same error message');
      
      const firstAnalysis = analyzer.analyzeError(error);
      expect(firstAnalysis.frequency).toBe(1);
      expect(firstAnalysis.isRecurring).toBe(false);

      const secondAnalysis = analyzer.analyzeError(error);
      expect(secondAnalysis.frequency).toBe(2);
      expect(secondAnalysis.isRecurring).toBe(true);
    });

    it('should include context information', () => {
      const error = new Error('Test error');
      const context = {
        userId: 'user123',
        url: 'https://example.com/test'
      };

      const analysis = analyzer.analyzeError(error, context);
      
      expect(analysis.context.userId).toBe('user123');
      expect(analysis.context.url).toBe('https://example.com/test');
      expect(analysis.context.sessionId).toBeDefined();
      expect(analysis.context.userAgent).toBeDefined();
    });
  });

  describe('suggestSolutions', () => {
    it('should suggest re-authentication for auth errors', () => {
      const error = new Error('Token expired');
      const category = analyzer.categorizeError(error);
      const solutions = analyzer.suggestSolutions(error, category);

      expect(solutions).toHaveLength(1);
      expect(solutions[0].title).toBe('Re-authenticate with Strava');
      expect(solutions[0].steps).toContain('Click "Connect with Strava" to re-authenticate');
    });

    it('should suggest network troubleshooting for network errors', () => {
      const error = new Error('Network connection failed');
      const category = analyzer.categorizeError(error);
      const solutions = analyzer.suggestSolutions(error, category);

      expect(solutions).toHaveLength(1);
      expect(solutions[0].title).toBe('Check Network Connection');
      expect(solutions[0].steps).toContain('Check your internet connection');
    });

    it('should suggest API response handling for JSON errors', () => {
      const error = new Error('Unexpected end of JSON input');
      const category = analyzer.categorizeError(error);
      const solutions = analyzer.suggestSolutions(error, category);

      expect(solutions).toHaveLength(1);
      expect(solutions[0].title).toBe('API Response Issue');
      expect(solutions[0].steps).toContain('Try the operation again');
    });
  });

  describe('getErrorStats', () => {
    it('should return error statistics', () => {
      // Generate some errors
      analyzer.analyzeError(new Error('Network error'));
      analyzer.analyzeError(new Error('Auth error'));
      analyzer.analyzeError(new Error('Network error')); // Same error again

      const stats = analyzer.getErrorStats();
      
      expect(stats.totalErrors).toBe(3);
      expect(typeof stats.categories).toBe('object');
    });
  });
});