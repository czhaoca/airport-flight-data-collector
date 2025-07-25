/**
 * Configuration management
 * Follows Single Responsibility Principle - manages application configuration
 */
class Configuration {
  constructor(env = process.env) {
    this.env = env;
    this.config = this._loadConfig();
  }

  _loadConfig() {
    return {
      // Environment
      environment: this.env.NODE_ENV || 'development',
      isProduction: this.env.NODE_ENV === 'production',
      isTest: this.env.NODE_ENV === 'test',

      // Storage
      storage: {
        type: this.env.STORAGE_TYPE || 'local',
        basePath: this.env.STORAGE_BASE_PATH || 'data',
        github: {
          token: this.env.GITHUB_TOKEN,
          repository: this.env.GITHUB_REPOSITORY,
          committer: {
            name: this.env.GITHUB_COMMITTER_NAME || 'Airport Data Bot',
            email: this.env.GITHUB_COMMITTER_EMAIL || 'bot@airport-data.com'
          }
        }
      },

      // HTTP Client
      http: {
        timeout: parseInt(this.env.HTTP_TIMEOUT) || 30000,
        userAgent: this.env.HTTP_USER_AGENT || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        clientType: this.env.HTTP_CLIENT_TYPE || 'fetch' // 'fetch' or 'curl'
      },

      // Retry
      retry: {
        maxRetries: parseInt(this.env.RETRY_MAX_ATTEMPTS) || 3,
        baseDelay: parseInt(this.env.RETRY_BASE_DELAY) || 1000,
        maxDelay: parseInt(this.env.RETRY_MAX_DELAY) || 60000
      },

      // Airports
      airports: {
        sfo: {
          url: this.env.SFO_API_URL || 'https://www.flysfo.com/flysfo/api/flight-status',
          referer: 'https://www.flysfo.com/flight-info/flight-status'
        },
        yyz: {
          baseUrl: 'https://www.torontopearson.com/api/flightsapidata/getflightlist',
          departureReferer: 'https://www.torontopearson.com/en/departures',
          arrivalReferer: 'https://www.torontopearson.com/en/arrivals'
        },
        yvr: {
          baseUrl: this.env.YVR_API_URL || 'https://www.yvr.ca/en/_api/Flights',
          departureReferer: 'https://www.yvr.ca/en/passengers/flights/departing-flights',
          arrivalReferer: 'https://www.yvr.ca/en/passengers/flights/arriving-flights',
          useBrowser: true
        }
      },

      // Features
      features: {
        verboseLogging: this.env.VERBOSE === 'true',
        saveTestData: this.env.SAVE_TEST_DATA === 'true',
        captchaHandling: this.env.ENABLE_CAPTCHA_HANDLING === 'true'
      }
    };
  }

  /**
   * Gets a configuration value by path
   * @param {string} path - Dot-separated path (e.g., 'storage.type')
   * @param {any} defaultValue - Default value if not found
   * @returns {any} The configuration value
   */
  get(path, defaultValue = undefined) {
    const keys = path.split('.');
    let value = this.config;

    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        return defaultValue;
      }
    }

    return value;
  }

  /**
   * Sets a configuration value
   * @param {string} path - Dot-separated path
   * @param {any} value - The value to set
   */
  set(path, value) {
    const keys = path.split('.');
    let target = this.config;

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!(key in target) || typeof target[key] !== 'object') {
        target[key] = {};
      }
      target = target[key];
    }

    target[keys[keys.length - 1]] = value;
  }

  /**
   * Validates required configuration
   * @throws {Error} If required configuration is missing
   */
  validate() {
    const required = [];

    if (this.get('storage.type') === 'github') {
      required.push(
        ['storage.github.token', 'GITHUB_TOKEN'],
        ['storage.github.repository', 'GITHUB_REPOSITORY']
      );
    }

    const missing = required
      .filter(([path]) => !this.get(path))
      .map(([, env]) => env);

    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
  }

  /**
   * Gets all configuration as plain object
   * @returns {Object} The configuration object
   */
  toJSON() {
    return JSON.parse(JSON.stringify(this.config));
  }
}

// Singleton instance
let instance = null;

module.exports = {
  Configuration,
  
  /**
   * Gets the singleton configuration instance
   * @returns {Configuration} The configuration instance
   */
  getConfig() {
    if (!instance) {
      instance = new Configuration();
    }
    return instance;
  },

  /**
   * Resets the configuration (useful for testing)
   */
  resetConfig() {
    instance = null;
  }
};