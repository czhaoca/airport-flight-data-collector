/**
 * Date utility functions
 */

/**
 * Gets today's date in YYYY-MM-DD format
 * @returns {string} Today's date
 */
function getTodayDate() {
  const today = new Date();
  return today.toISOString().split('T')[0];
}

/**
 * Gets yesterday's date in YYYY-MM-DD format
 * @returns {string} Yesterday's date
 */
function getYesterdayDate() {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return yesterday.toISOString().split('T')[0];
}

/**
 * Formats a date to YYYY-MM-DD format
 * @param {Date|string} date - The date to format
 * @returns {string} Formatted date
 */
function formatDate(date) {
  const d = date instanceof Date ? date : new Date(date);
  return d.toISOString().split('T')[0];
}

/**
 * Validates if a string is a valid date in YYYY-MM-DD format
 * @param {string} dateString - The date string to validate
 * @returns {boolean} True if valid
 */
function isValidDateFormat(dateString) {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateString)) return false;
  
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date);
}

module.exports = {
  getTodayDate,
  getYesterdayDate,
  formatDate,
  isValidDateFormat
};