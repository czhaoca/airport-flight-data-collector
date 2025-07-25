/**
 * Interface for data collectors
 * Follows Interface Segregation Principle - clients should not be forced to depend on interfaces they don't use
 */
class IDataCollector {
  /**
   * Collects data from the source
   * @param {Object} options - Collection options
   * @returns {Promise<Object>} The collected data
   */
  async collect(options) {
    throw new Error('Method collect() must be implemented');
  }

  /**
   * Validates if the collector can handle the request
   * @param {Object} options - Collection options
   * @returns {Promise<boolean>} True if can handle
   */
  async canHandle(options) {
    throw new Error('Method canHandle() must be implemented');
  }

  /**
   * Gets the collector name
   * @returns {string} The collector name
   */
  getName() {
    throw new Error('Method getName() must be implemented');
  }
}

module.exports = IDataCollector;