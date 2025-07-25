const fs = require('fs').promises;
const path = require('path');

/**
 * Simple logger implementation
 * Follows Single Responsibility Principle - only handles logging
 */
class Logger {
  constructor(options = {}) {
    this.logLevel = options.logLevel || process.env.LOG_LEVEL || 'info';
    this.logToFile = options.logToFile !== false;
    this.logDir = options.logDir || 'logs';
    this.logFile = options.logFile || `app-${new Date().toISOString().split('T')[0]}.log`;
    this.console = options.console !== false;
    
    this.levels = {
      error: 0,
      warn: 1,
      info: 2,
      debug: 3
    };
    
    this._ensureLogDirectory();
  }

  /**
   * Ensures log directory exists
   * @private
   */
  async _ensureLogDirectory() {
    if (this.logToFile) {
      try {
        await fs.mkdir(this.logDir, { recursive: true });
      } catch (error) {
        console.error('Failed to create log directory:', error);
        this.logToFile = false;
      }
    }
  }

  /**
   * Logs a message
   * @private
   */
  async _log(level, message, data = null) {
    if (this.levels[level] > this.levels[this.logLevel]) {
      return;
    }

    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      ...(data && { data })
    };

    // Console output
    if (this.console) {
      const color = {
        error: '\x1b[31m',
        warn: '\x1b[33m',
        info: '\x1b[36m',
        debug: '\x1b[90m'
      }[level];
      const reset = '\x1b[0m';
      
      console.log(`${color}[${timestamp}] [${level.toUpperCase()}]${reset} ${message}`);
      if (data) {
        console.log(JSON.stringify(data, null, 2));
      }
    }

    // File output
    if (this.logToFile) {
      const logPath = path.join(this.logDir, this.logFile);
      const logLine = JSON.stringify(logEntry) + '\n';
      
      try {
        await fs.appendFile(logPath, logLine, 'utf8');
      } catch (error) {
        console.error('Failed to write to log file:', error);
      }
    }
  }

  /**
   * Log methods
   */
  async error(message, data) {
    await this._log('error', message, data);
  }

  async warn(message, data) {
    await this._log('warn', message, data);
  }

  async info(message, data) {
    await this._log('info', message, data);
  }

  async debug(message, data) {
    await this._log('debug', message, data);
  }

  /**
   * Creates a child logger with context
   * @param {string} context - Context name
   * @returns {Logger} Child logger
   */
  child(context) {
    const childLogger = new Logger({
      logLevel: this.logLevel,
      logToFile: this.logToFile,
      logDir: this.logDir,
      logFile: this.logFile,
      console: this.console
    });
    
    // Override log method to include context
    const originalLog = childLogger._log.bind(childLogger);
    childLogger._log = async (level, message, data) => {
      await originalLog(level, `[${context}] ${message}`, data);
    };
    
    return childLogger;
  }
}

// Singleton instance
let defaultLogger = null;

module.exports = {
  Logger,
  
  /**
   * Gets the default logger instance
   * @returns {Logger} Default logger
   */
  getLogger() {
    if (!defaultLogger) {
      defaultLogger = new Logger();
    }
    return defaultLogger;
  },
  
  /**
   * Creates a new logger instance
   * @param {Object} options - Logger options
   * @returns {Logger} New logger
   */
  createLogger(options) {
    return new Logger(options);
  }
};