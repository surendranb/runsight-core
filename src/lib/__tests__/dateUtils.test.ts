/**
 * Unit tests for Date Utilities
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { parseRunDate, formatRunDate, formatChartDate } from '../dateUtils';

describe('dateUtils', () => {
  describe('parseRunDate', () => {
    it('should return the raw date string as-is', () => {
      const dateString = '2024-01-15T10:30:00Z';
      const result = parseRunDate(dateString);
      
      expect(result).toBe(dateString);
    });

    it('should return empty string for empty input', () => {
      const result = parseRunDate('');
      
      expect(result).toBe('');
    });

    it('should return empty string for null/undefined', () => {
      const result1 = parseRunDate(null as any);
      const result2 = parseRunDate(undefined as any);
      
      expect(result1).toBe('');
      expect(result2).toBe('');
    });

    it('should return the string even if it looks invalid', () => {
      const result = parseRunDate('invalid-date');
      
      expect(result).toBe('invalid-date');
    });
  });

  describe('formatRunDate', () => {
    it('should format valid date strings to DD MMM format', () => {
      const dateString = '2024-01-15T10:30:00Z';
      const result = formatRunDate(dateString);
      
      expect(result).toBe('15 Jan');
    });

    it('should format different months correctly', () => {
      const dateString = '2023-12-01T10:30:00Z';
      const result = formatRunDate(dateString);
      
      expect(result).toBe('01 Dec');
    });

    it('should return original string for invalid dates', () => {
      const invalidString = 'not-a-date';
      const result = formatRunDate(invalidString);
      
      expect(result).toBe(invalidString);
    });

    it('should return empty string for empty input', () => {
      const result = formatRunDate('');
      
      expect(result).toBe('');
    });
  });

  describe('formatChartDate', () => {
    it('should format valid date strings to DD MMM format', () => {
      const dateString = '2024-01-15T10:30:00Z';
      const result = formatChartDate(dateString);
      
      expect(result).toBe('15 Jan');
    });

    it('should format different months correctly', () => {
      const dateString = '2024-12-25T10:30:00Z';
      const result = formatChartDate(dateString);
      
      expect(result).toBe('25 Dec');
    });

    it('should return original string for invalid dates', () => {
      const invalidString = 'invalid-date';
      const result = formatChartDate(invalidString);
      
      expect(result).toBe(invalidString);
    });

    it('should return empty string for empty input', () => {
      const result = formatChartDate('');
      
      expect(result).toBe('');
    });
  });
});