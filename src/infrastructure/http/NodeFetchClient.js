const fetch = require('node-fetch');
const IHttpClient = require('../../core/interfaces/IHttpClient');
const { NetworkError } = require('../../core/errors/CollectionError');

/**
 * Node-fetch implementation of IHttpClient
 * Follows Dependency Inversion Principle - depends on abstraction not concretion
 */
class NodeFetchClient extends IHttpClient {
  constructor(defaultOptions = {}) {
    super();
    this.defaultOptions = {
      timeout: 30000,
      compress: true,
      follow: 20,
      ...defaultOptions
    };
    this.defaultHeaders = {};
  }

  /**
   * Sets default headers for all requests
   * @param {Object} headers - Default headers
   */
  setDefaultHeaders(headers) {
    this.defaultHeaders = { ...this.defaultHeaders, ...headers };
  }

  /**
   * Makes a GET request
   * @param {string} url - The URL to request
   * @param {Object} options - Request options
   * @returns {Promise<Object>} The response data
   */
  async get(url, options = {}) {
    return this._request('GET', url, null, options);
  }

  /**
   * Makes a POST request
   * @param {string} url - The URL to request
   * @param {Object} data - The data to send
   * @param {Object} options - Request options
   * @returns {Promise<Object>} The response data
   */
  async post(url, data, options = {}) {
    return this._request('POST', url, data, options);
  }

  /**
   * Internal request method
   * @private
   */
  async _request(method, url, data = null, options = {}) {
    const requestOptions = {
      method,
      ...this.defaultOptions,
      ...options,
      headers: {
        ...this.defaultHeaders,
        ...(options.headers || {})
      }
    };

    if (data && method !== 'GET') {
      requestOptions.body = JSON.stringify(data);
      requestOptions.headers['Content-Type'] = 'application/json';
    }

    try {
      const response = await fetch(url, requestOptions);
      
      if (!response.ok) {
        throw new NetworkError(
          `HTTP error! status: ${response.status}`,
          {
            status: response.status,
            statusText: response.statusText,
            url
          }
        );
      }

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      }
      
      return await response.text();
    } catch (error) {
      if (error instanceof NetworkError) {
        throw error;
      }
      
      throw new NetworkError(
        `Network request failed: ${error.message}`,
        {
          originalError: error.message,
          code: error.code,
          url
        }
      );
    }
  }
}

module.exports = NodeFetchClient;