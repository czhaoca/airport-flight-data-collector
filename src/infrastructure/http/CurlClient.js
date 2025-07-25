const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const IHttpClient = require('../../core/interfaces/IHttpClient');
const { NetworkError } = require('../../core/errors/CollectionError');

/**
 * Curl-based implementation of IHttpClient
 * Useful for bypassing certain bot protections
 */
class CurlClient extends IHttpClient {
  constructor(defaultOptions = {}) {
    super();
    this.defaultOptions = defaultOptions;
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
   * Makes a GET request using curl
   * @param {string} url - The URL to request
   * @param {Object} options - Request options
   * @returns {Promise<Object>} The response data
   */
  async get(url, options = {}) {
    const headers = { ...this.defaultHeaders, ...(options.headers || {}) };
    const headerFlags = Object.entries(headers)
      .map(([key, value]) => `-H "${key}: ${value}"`)
      .join(' ');

    const curlCommand = `curl -s -L ${headerFlags} --compressed "${url}"`;

    try {
      const { stdout, stderr } = await execAsync(curlCommand, {
        maxBuffer: 1024 * 1024 * 50 // 50MB buffer
      });

      if (stderr) {
        throw new NetworkError(`Curl error: ${stderr}`, { url });
      }

      // Try to parse as JSON, fallback to text
      try {
        return JSON.parse(stdout);
      } catch {
        return stdout;
      }
    } catch (error) {
      throw new NetworkError(
        `Curl request failed: ${error.message}`,
        {
          originalError: error.message,
          code: error.code,
          url
        }
      );
    }
  }

  /**
   * Makes a POST request using curl
   * @param {string} url - The URL to request
   * @param {Object} data - The data to send
   * @param {Object} options - Request options
   * @returns {Promise<Object>} The response data
   */
  async post(url, data, options = {}) {
    const headers = { 
      'Content-Type': 'application/json',
      ...this.defaultHeaders, 
      ...(options.headers || {}) 
    };
    
    const headerFlags = Object.entries(headers)
      .map(([key, value]) => `-H "${key}: ${value}"`)
      .join(' ');

    const dataString = JSON.stringify(data).replace(/"/g, '\\"');
    const curlCommand = `curl -s -L -X POST ${headerFlags} -d "${dataString}" --compressed "${url}"`;

    try {
      const { stdout, stderr } = await execAsync(curlCommand, {
        maxBuffer: 1024 * 1024 * 50
      });

      if (stderr) {
        throw new NetworkError(`Curl error: ${stderr}`, { url });
      }

      try {
        return JSON.parse(stdout);
      } catch {
        return stdout;
      }
    } catch (error) {
      throw new NetworkError(
        `Curl request failed: ${error.message}`,
        {
          originalError: error.message,
          code: error.code,
          url
        }
      );
    }
  }
}

module.exports = CurlClient;