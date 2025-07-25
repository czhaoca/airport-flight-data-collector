/**
 * Interface for data collectors
 * 
 * Follows Interface Segregation Principle - clients should not be forced to depend on interfaces they don't use.
 * This interface defines the contract that all data collectors must implement to ensure
 * consistent behavior across different data sources.
 * 
 * @interface IDataCollector
 * @abstract
 */
class IDataCollector {
  /**
   * Collects data from the source
   * 
   * @param {Object} options - Collection options
   * @param {string} [options.date] - Target date in YYYY-MM-DD format
   * @param {string} [options.type] - Collection type (e.g., 'arrival', 'departure')
   * @param {number} [options.maxRetries] - Maximum retry attempts
   * @param {boolean} [options.throwOnError] - Whether to throw on error
   * @returns {Promise<CollectionResult>} The collection result containing data or error
   * @throws {Error} When method is not implemented by concrete class
   * 
   * @example
   * const result = await collector.collect({ date: '2025-07-25' });
   * if (result.isSuccess()) {
   *   console.log('Collected flights:', result.data.flights.length);
   * }
   */
  async collect(options) {
    throw new Error('Method collect() must be implemented');
  }

  /**
   * Validates if the collector can handle the request
   * 
   * @param {Object} options - Collection options to validate
   * @returns {Promise<boolean>} True if this collector can handle the request
   * @throws {Error} When method is not implemented by concrete class
   */
  async canHandle(options) {
    throw new Error('Method canHandle() must be implemented');
  }

  /**
   * Gets the collector name
   * 
   * @returns {string} The collector name/identifier
   * @throws {Error} When method is not implemented by concrete class
   */
  getName() {
    throw new Error('Method getName() must be implemented');
  }
}

module.exports = IDataCollector;