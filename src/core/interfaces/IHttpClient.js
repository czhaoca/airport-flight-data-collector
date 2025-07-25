/**
 * Interface for HTTP clients
 * Follows Dependency Inversion Principle - high-level modules should not depend on low-level modules
 */
class IHttpClient {
  /**
   * Makes a GET request
   * @param {string} url - The URL to request
   * @param {Object} options - Request options
   * @returns {Promise<Object>} The response data
   */
  async get(url, options = {}) {
    throw new Error('Method get() must be implemented');
  }

  /**
   * Makes a POST request
   * @param {string} url - The URL to request
   * @param {Object} data - The data to send
   * @param {Object} options - Request options
   * @returns {Promise<Object>} The response data
   */
  async post(url, data, options = {}) {
    throw new Error('Method post() must be implemented');
  }

  /**
   * Sets default headers
   * @param {Object} headers - Default headers
   */
  setDefaultHeaders(headers) {
    throw new Error('Method setDefaultHeaders() must be implemented');
  }
}

module.exports = IHttpClient;