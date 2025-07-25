const BaseAirportCollector = require('./BaseAirportCollector');
const Flight = require('../../core/models/Flight');
const { ValidationError } = require('../../core/errors/CollectionError');
const { getYesterdayDate } = require('../../utils/dateUtils');

/**
 * San Francisco International Airport data collector
 * Follows Single Responsibility Principle - only handles SFO data collection
 */
class SFOCollector extends BaseAirportCollector {
  getAirportCode() {
    return 'SFO';
  }

  /**
   * Prepares the request for SFO API
   * @param {Object} options - Collection options
   * @returns {Promise<Object>} Request configuration
   */
  async prepareRequest(options) {
    const url = this.config.get('airports.sfo.url');
    const referer = this.config.get('airports.sfo.referer');
    
    const headers = {
      'User-Agent': this.config.get('http.userAgent'),
      'Accept': 'application/json, text/plain, */*',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Referer': referer,
      'Origin': 'https://www.flysfo.com',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache'
    };

    return { url, headers };
  }

  /**
   * Transforms SFO API data
   * @param {Object} rawData - Raw data from API
   * @param {Object} options - Collection options
   * @returns {Promise<Object>} Transformed data
   */
  async transformData(rawData, options) {
    if (!rawData || !rawData.data || !Array.isArray(rawData.data)) {
      throw new ValidationError('Invalid SFO API response structure');
    }

    // Get target date (default to yesterday)
    const targetDate = options.date || getYesterdayDate();

    // Filter flights by date if specified
    let flights = rawData.data;
    if (options.filterByDate !== false) {
      flights = flights.filter(flight => flight.scheduled_date === targetDate);
    }

    // Transform to Flight models
    const transformedFlights = flights.map(flightData => {
      try {
        return Flight.fromApiData(flightData, 'sfo');
      } catch (error) {
        console.warn(`Failed to parse flight: ${error.message}`, flightData);
        return null;
      }
    }).filter(Boolean);

    // Group by type
    const arrivals = transformedFlights.filter(f => f.type === 'arrival');
    const departures = transformedFlights.filter(f => f.type === 'departure');

    return {
      airport: 'SFO',
      date: targetDate,
      lastUpdate: rawData.last_update,
      statistics: {
        total: transformedFlights.length,
        arrivals: arrivals.length,
        departures: departures.length
      },
      flights: transformedFlights.map(f => f.toJSON())
    };
  }

  /**
   * Validates the transformed data
   * @param {Object} data - Data to validate
   * @throws {ValidationError} If data is invalid
   */
  validateData(data) {
    super.validateData(data);

    if (!data.flights || !Array.isArray(data.flights)) {
      throw new ValidationError('Flights data must be an array');
    }

    if (data.flights.length === 0 && this.config.get('features.verboseLogging')) {
      console.warn('No flights found in SFO data');
    }
  }
}

module.exports = SFOCollector;