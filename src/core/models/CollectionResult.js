/**
 * Collection result model
 * Encapsulates the result of a data collection operation
 */
class CollectionResult {
  constructor({
    success,
    data = null,
    error = null,
    metadata = {},
    timestamp = new Date()
  }) {
    this.success = success;
    this.data = data;
    this.error = error;
    this.metadata = metadata;
    this.timestamp = timestamp;
  }

  /**
   * Creates a successful result
   * @param {Object} data - The collected data
   * @param {Object} metadata - Additional metadata
   * @returns {CollectionResult} A successful result
   */
  static success(data, metadata = {}) {
    return new CollectionResult({
      success: true,
      data,
      metadata
    });
  }

  /**
   * Creates a failed result
   * @param {Error} error - The error that occurred
   * @param {Object} metadata - Additional metadata
   * @returns {CollectionResult} A failed result
   */
  static failure(error, metadata = {}) {
    return new CollectionResult({
      success: false,
      error: error.message || error,
      metadata
    });
  }

  /**
   * Checks if the result is successful
   * @returns {boolean} True if successful
   */
  isSuccess() {
    return this.success === true;
  }

  /**
   * Gets the data or throws if failed
   * @returns {Object} The data
   * @throws {Error} If the result is a failure
   */
  getDataOrThrow() {
    if (!this.success) {
      throw new Error(this.error || 'Collection failed');
    }
    return this.data;
  }

  /**
   * Converts to JSON
   * @returns {Object} JSON representation
   */
  toJSON() {
    return {
      success: this.success,
      data: this.data,
      error: this.error,
      metadata: this.metadata,
      timestamp: this.timestamp
    };
  }
}

module.exports = CollectionResult;