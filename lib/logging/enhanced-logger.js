const { logger, collectorLogger, apiLogger, databaseLogger } = require('./winston-logger');

/**
 * Enhanced logger with Winston integration
 * Maintains backward compatibility with existing logger interface
 */
class EnhancedLogger {
  constructor(options = {}) {
    this.context = options.context || 'General';
    this.component = options.component || 'app';
    
    // Select appropriate Winston logger based on component
    switch (this.component.toLowerCase()) {
      case 'collector':
      case 'collection':
        this.winstonLogger = collectorLogger;
        break;
      case 'api':
      case 'server':
        this.winstonLogger = apiLogger;
        break;
      case 'database':
      case 'db':
        this.winstonLogger = databaseLogger;
        break;
      default:
        this.winstonLogger = logger;
    }
  }

  /**
   * Formats the log data
   * @private
   */
  _formatData(data) {
    if (!data) return {};
    
    // Handle Error objects
    if (data instanceof Error) {
      return {
        error: {
          message: data.message,
          stack: data.stack,
          code: data.code,
          ...data
        }
      };
    }
    
    // Handle other data types
    return typeof data === 'object' ? data : { value: data };
  }

  /**
   * Log methods - maintain async interface for backward compatibility
   */
  async error(message, data) {
    const formattedData = this._formatData(data);
    this.winstonLogger.error(message, {
      context: this.context,
      component: this.component,
      ...formattedData
    });
  }

  async warn(message, data) {
    const formattedData = this._formatData(data);
    this.winstonLogger.warn(message, {
      context: this.context,
      component: this.component,
      ...formattedData
    });
  }

  async info(message, data) {
    const formattedData = this._formatData(data);
    this.winstonLogger.info(message, {
      context: this.context,
      component: this.component,
      ...formattedData
    });
  }

  async debug(message, data) {
    const formattedData = this._formatData(data);
    this.winstonLogger.debug(message, {
      context: this.context,
      component: this.component,
      ...formattedData
    });
  }

  /**
   * Creates a child logger with additional context
   * @param {string} childContext - Child context name
   * @returns {EnhancedLogger} Child logger
   */
  child(childContext) {
    return new EnhancedLogger({
      context: `${this.context}:${childContext}`,
      component: this.component
    });
  }

  /**
   * Logs collection statistics
   * @param {Object} stats - Collection statistics
   */
  async logCollectionStats(stats) {
    await this.info('Collection statistics', {
      type: 'collection_stats',
      stats: {
        airport: stats.airport,
        success: stats.success,
        flightCount: stats.flightCount,
        duration: stats.duration,
        errors: stats.errors
      }
    });
  }

  /**
   * Logs API request
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   * @param {number} duration - Request duration in ms
   */
  async logApiRequest(req, res, duration) {
    const logData = {
      type: 'api_request',
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration,
      ip: req.ip,
      userAgent: req.get('user-agent')
    };

    if (res.statusCode >= 500) {
      await this.error('API request failed', logData);
    } else if (res.statusCode >= 400) {
      await this.warn('API request client error', logData);
    } else {
      await this.info('API request completed', logData);
    }
  }

  /**
   * Logs database operation
   * @param {string} operation - Operation name
   * @param {Object} details - Operation details
   * @param {number} duration - Operation duration in ms
   */
  async logDatabaseOperation(operation, details, duration) {
    await this.debug('Database operation', {
      type: 'database_operation',
      operation,
      duration,
      ...details
    });
  }
}

// Factory functions
module.exports = {
  EnhancedLogger,
  
  /**
   * Creates a logger for collectors
   * @param {string} context - Logger context
   * @returns {EnhancedLogger} Collector logger
   */
  createCollectorLogger(context) {
    return new EnhancedLogger({
      context,
      component: 'collector'
    });
  },
  
  /**
   * Creates a logger for API
   * @param {string} context - Logger context
   * @returns {EnhancedLogger} API logger
   */
  createApiLogger(context) {
    return new EnhancedLogger({
      context,
      component: 'api'
    });
  },
  
  /**
   * Creates a logger for database operations
   * @param {string} context - Logger context
   * @returns {EnhancedLogger} Database logger
   */
  createDatabaseLogger(context) {
    return new EnhancedLogger({
      context,
      component: 'database'
    });
  },
  
  /**
   * Gets the default logger instance
   * @returns {EnhancedLogger} Default logger
   */
  getLogger() {
    return new EnhancedLogger();
  }
};