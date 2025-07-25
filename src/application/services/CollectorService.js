/**
 * Main collector service that orchestrates data collection
 * Follows Dependency Inversion Principle - depends on abstractions
 */
class CollectorService {
  constructor(collectors, storageService, config) {
    this.collectors = collectors;
    this.storageService = storageService;
    this.config = config;
  }

  /**
   * Collects data from specified airport
   * @param {string} airport - Airport code
   * @param {Object} options - Collection options
   * @returns {Promise<Object>} Collection result
   */
  async collect(airport, options = {}) {
    // Find appropriate collector
    const collector = await this._findCollector(airport, options);
    if (!collector) {
      throw new Error(`No collector found for airport: ${airport}`);
    }

    // Collect data
    console.log(`Collecting data from ${airport}...`);
    const result = await collector.collect(options);

    // Handle result
    if (result.isSuccess()) {
      await this._saveData(airport, result.data, options);
      console.log(`Successfully collected data from ${airport}`);
    } else {
      console.error(`Failed to collect data from ${airport}:`, result.error);
      if (options.throwOnError) {
        throw new Error(result.error);
      }
    }

    return result;
  }

  /**
   * Collects data from all configured airports
   * @param {Object} options - Collection options
   * @returns {Promise<Object>} Collection results by airport
   */
  async collectAll(options = {}) {
    const results = {};
    const airports = options.airports || this._getConfiguredAirports();

    for (const airport of airports) {
      try {
        results[airport] = await this.collect(airport, options);
      } catch (error) {
        console.error(`Error collecting from ${airport}:`, error);
        results[airport] = {
          success: false,
          error: error.message
        };
      }
    }

    return results;
  }

  /**
   * Finds the appropriate collector for an airport
   * @private
   */
  async _findCollector(airport, options) {
    for (const collector of this.collectors) {
      if (await collector.canHandle({ ...options, airport })) {
        return collector;
      }
    }
    return null;
  }

  /**
   * Saves collected data
   * @private
   */
  async _saveData(airport, data, options) {
    if (options.skipSave) {
      return;
    }

    const date = options.date || new Date().toISOString().split('T')[0];
    const isTest = options.isTest || false;

    // Handle different data structures (YYZ has separate files)
    if (data.departures && data.arrivals) {
      // YYZ format
      if (data.departures) {
        const depPath = this._generatePath(airport, 'departures', date, isTest);
        await this.storageService.save(data.departures, depPath, {
          verbose: this.config.get('features.verboseLogging')
        });
      }
      
      if (data.arrivals) {
        const arrPath = this._generatePath(airport, 'arrivals', date, isTest);
        await this.storageService.save(data.arrivals, arrPath, {
          verbose: this.config.get('features.verboseLogging')
        });
      }
    } else {
      // Single file format (SFO)
      const path = this._generatePath(airport, 'flights', date, isTest);
      await this.storageService.save(data, path, {
        verbose: this.config.get('features.verboseLogging')
      });
    }
  }

  /**
   * Generates storage path
   * @private
   */
  _generatePath(airport, type, date, isTest) {
    const airportLower = airport.toLowerCase();
    
    if (isTest) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      return `test/${airportLower}_${type}_${date}-test-${timestamp}.json`;
    }
    
    return `${airportLower}/${airportLower}_${type}_${date}.json`;
  }

  /**
   * Gets configured airports
   * @private
   */
  _getConfiguredAirports() {
    return Object.keys(this.config.get('airports', {})).map(a => a.toUpperCase());
  }
}

module.exports = CollectorService;