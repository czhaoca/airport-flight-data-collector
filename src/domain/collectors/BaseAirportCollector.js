const IDataCollector = require('../../core/interfaces/IDataCollector');
const CollectionResult = require('../../core/models/CollectionResult');
const { ValidationError } = require('../../core/errors/CollectionError');

/**
 * Base class for airport data collectors
 * Follows Template Method pattern and Single Responsibility Principle
 */
class BaseAirportCollector extends IDataCollector {
  constructor(httpClient, retryStrategy, config) {
    super();
    this.httpClient = httpClient;
    this.retryStrategy = retryStrategy;
    this.config = config;
  }

  /**
   * Template method for collecting data
   * @param {Object} options - Collection options
   * @returns {Promise<CollectionResult>} The collection result
   */
  async collect(options = {}) {
    try {
      // Validate options
      this.validateOptions(options);

      // Prepare request
      const requestConfig = await this.prepareRequest(options);

      // Execute request with retry
      const rawData = await this.retryStrategy.execute(
        () => this.fetchData(requestConfig),
        { maxRetries: options.maxRetries }
      );

      // Transform data
      const transformedData = await this.transformData(rawData, options);

      // Validate data
      this.validateData(transformedData);

      return CollectionResult.success(transformedData, {
        airport: this.getAirportCode(),
        timestamp: new Date(),
        options
      });
    } catch (error) {
      return CollectionResult.failure(error, {
        airport: this.getAirportCode(),
        timestamp: new Date(),
        options
      });
    }
  }

  /**
   * Validates collection options
   * @param {Object} options - Options to validate
   * @throws {ValidationError} If options are invalid
   */
  validateOptions(options) {
    // Can be overridden by subclasses
  }

  /**
   * Prepares the request configuration
   * @param {Object} options - Collection options
   * @returns {Promise<Object>} Request configuration
   */
  async prepareRequest(options) {
    throw new Error('Method prepareRequest() must be implemented by subclass');
  }

  /**
   * Fetches data from the API
   * @param {Object} requestConfig - Request configuration
   * @returns {Promise<Object>} Raw API data
   */
  async fetchData(requestConfig) {
    const { url, headers, method = 'GET' } = requestConfig;
    
    if (method === 'GET') {
      return await this.httpClient.get(url, { headers });
    } else {
      return await this.httpClient.post(url, requestConfig.data, { headers });
    }
  }

  /**
   * Transforms raw API data
   * @param {Object} rawData - Raw data from API
   * @param {Object} options - Collection options
   * @returns {Promise<Object>} Transformed data
   */
  async transformData(rawData, options) {
    throw new Error('Method transformData() must be implemented by subclass');
  }

  /**
   * Validates the transformed data
   * @param {Object} data - Data to validate
   * @throws {ValidationError} If data is invalid
   */
  validateData(data) {
    if (!data) {
      throw new ValidationError('No data received');
    }
  }

  /**
   * Gets the airport code
   * @returns {string} Airport code
   */
  getAirportCode() {
    throw new Error('Method getAirportCode() must be implemented by subclass');
  }

  /**
   * Gets the collector name
   * @returns {string} Collector name
   */
  getName() {
    return `${this.getAirportCode()}Collector`;
  }

  /**
   * Checks if collector can handle the request
   * @param {Object} options - Collection options
   * @returns {Promise<boolean>} True if can handle
   */
  async canHandle(options) {
    return options.airport === this.getAirportCode();
  }
}

module.exports = BaseAirportCollector;