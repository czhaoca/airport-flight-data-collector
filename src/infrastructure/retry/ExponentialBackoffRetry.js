const IRetryStrategy = require('../../core/interfaces/IRetryStrategy');
const { CaptchaError, RateLimitError } = require('../../core/errors/CollectionError');

/**
 * Exponential backoff retry strategy
 * Follows Open/Closed Principle - new retry strategies can be added without modifying existing code
 */
class ExponentialBackoffRetry extends IRetryStrategy {
  constructor(options = {}) {
    super();
    this.maxRetries = options.maxRetries || 3;
    this.baseDelay = options.baseDelay || 1000;
    this.maxDelay = options.maxDelay || 60000;
    this.factor = options.factor || 2;
    this.jitter = options.jitter !== false;
  }

  /**
   * Executes a function with exponential backoff retry
   * @param {Function} fn - The function to execute
   * @param {Object} options - Execution options
   * @returns {Promise<any>} The function result
   */
  async execute(fn, options = {}) {
    const maxRetries = options.maxRetries || this.maxRetries;
    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        
        if (!this.shouldRetry(error, attempt)) {
          throw error;
        }

        if (attempt < maxRetries) {
          const delay = this.calculateDelay(attempt);
          console.log(`Retry attempt ${attempt}/${maxRetries} after ${delay}ms delay`);
          await this._sleep(delay);
        }
      }
    }

    throw lastError;
  }

  /**
   * Calculates the delay for the next retry
   * @param {number} attempt - The current attempt number
   * @returns {number} The delay in milliseconds
   */
  calculateDelay(attempt) {
    let delay = Math.min(
      this.baseDelay * Math.pow(this.factor, attempt - 1),
      this.maxDelay
    );

    if (this.jitter) {
      // Add random jitter (±25%)
      const jitterAmount = delay * 0.25;
      delay = delay + (Math.random() * 2 - 1) * jitterAmount;
    }

    return Math.round(delay);
  }

  /**
   * Determines if should retry based on error
   * @param {Error} error - The error that occurred
   * @param {number} attempt - The current attempt number
   * @returns {boolean} True if should retry
   */
  shouldRetry(error, attempt) {
    // Don't retry on captcha errors
    if (error instanceof CaptchaError) {
      return false;
    }

    // Respect rate limit retry-after header
    if (error instanceof RateLimitError && error.retryAfter) {
      return true;
    }

    // Don't retry on validation errors
    if (error.name === 'ValidationError') {
      return false;
    }

    // Retry on network errors
    if (error.name === 'NetworkError' || error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
      return attempt <= this.maxRetries;
    }

    // Retry on specific HTTP status codes
    if (error.details && error.details.status) {
      const retryableStatuses = [408, 429, 500, 502, 503, 504];
      return retryableStatuses.includes(error.details.status);
    }

    return false;
  }

  /**
   * Sleep helper
   * @private
   */
  async _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = ExponentialBackoffRetry;