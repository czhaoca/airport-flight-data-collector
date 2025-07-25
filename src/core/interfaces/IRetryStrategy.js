/**
 * Interface for retry strategies
 * Follows Open/Closed Principle - open for extension, closed for modification
 */
class IRetryStrategy {
  /**
   * Executes a function with retry logic
   * @param {Function} fn - The function to execute
   * @param {Object} options - Retry options
   * @returns {Promise<any>} The function result
   */
  async execute(fn, options = {}) {
    throw new Error('Method execute() must be implemented');
  }

  /**
   * Calculates the delay for the next retry
   * @param {number} attempt - The current attempt number
   * @returns {number} The delay in milliseconds
   */
  calculateDelay(attempt) {
    throw new Error('Method calculateDelay() must be implemented');
  }

  /**
   * Determines if should retry based on error
   * @param {Error} error - The error that occurred
   * @param {number} attempt - The current attempt number
   * @returns {boolean} True if should retry
   */
  shouldRetry(error, attempt) {
    throw new Error('Method shouldRetry() must be implemented');
  }
}

module.exports = IRetryStrategy;