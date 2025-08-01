/**
 * Logging module export
 * Provides centralized logging with Winston
 */

const winston = require('./winston-logger');
const enhanced = require('./enhanced-logger');

module.exports = {
  // Winston logger instances
  ...winston,
  
  // Enhanced logger with backward compatibility
  ...enhanced,
  
  // Express middleware for request logging
  requestLogger: winston.logger.logRequest,
  
  // Error logging helper
  logError: winston.logger.logError
};