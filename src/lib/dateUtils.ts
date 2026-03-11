// Simplified date utilities - work directly with database timestamps

/**
 * Return the raw database date string as-is
 */
export const parseRunDate = (dateString: string): string => {
  return dateString || '';
};

/**
 * Format database date string to DD MMM format (e.g., "09 Aug", "12 Jul")
 * Extract date directly from ISO string to avoid timezone conversion
 */
export const formatRunDate = (dateString: string): string => {
  if (!dateString) return '';
  
  // Check if string looks like an ISO date (YYYY-MM-DD...)
  if (dateString.length < 10 || !dateString.match(/^\d{4}-\d{2}-\d{2}/)) return dateString;
  
  // Extract date parts directly from ISO string (YYYY-MM-DD)
  const datePart = dateString.substring(0, 10); // "2025-08-09"
  const parts = datePart.split('-');
  
  if (parts.length !== 3) return dateString;
  
  const [year, month, day] = parts;
  const monthNum = parseInt(month, 10);
  const dayNum = parseInt(day, 10);
  
  // Validate numeric values
  if (isNaN(monthNum) || isNaN(dayNum) || monthNum < 1 || monthNum > 12 || dayNum < 1 || dayNum > 31) {
    return dateString;
  }
  
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                     'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  return `${day} ${monthNames[monthNum - 1]}`;
};

/**
 * Format database date string for charts in DD MMM format (e.g., "09 Aug", "12 Jul")
 * Extract date directly from ISO string to avoid timezone conversion
 */
export const formatChartDate = (dateString: string): string => {
  if (!dateString) return '';
  
  // Check if string looks like an ISO date (YYYY-MM-DD...)
  if (dateString.length < 10 || !dateString.match(/^\d{4}-\d{2}-\d{2}/)) return dateString;
  
  // Extract date parts directly from ISO string (YYYY-MM-DD)
  const datePart = dateString.substring(0, 10); // "2025-08-09"
  const parts = datePart.split('-');
  
  if (parts.length !== 3) return dateString;
  
  const [year, month, day] = parts;
  const monthNum = parseInt(month, 10);
  const dayNum = parseInt(day, 10);
  
  // Validate numeric values
  if (isNaN(monthNum) || isNaN(dayNum) || monthNum < 1 || monthNum > 12 || dayNum < 1 || dayNum > 31) {
    return dateString;
  }
  
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                     'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  return `${day} ${monthNames[monthNum - 1]}`;
};

