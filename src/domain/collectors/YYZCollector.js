const BaseAirportCollector = require('./BaseAirportCollector');
const Flight = require('../../core/models/Flight');
const { ValidationError, CaptchaError } = require('../../core/errors/CollectionError');

/**
 * Toronto Pearson International Airport data collector
 * Handles both arrivals and departures with bot protection awareness
 */
class YYZCollector extends BaseAirportCollector {
  getAirportCode() {
    return 'YYZ';
  }

  /**
   * Collects both arrival and departure data
   * @param {Object} options - Collection options
   * @returns {Promise<CollectionResult>} The collection result
   */
  async collect(options = {}) {
    const results = {
      departures: null,
      arrivals: null
    };

    // Collect departures
    const depOptions = { ...options, type: 'departure' };
    results.departures = await super.collect(depOptions);

    // Wait before collecting arrivals to avoid rate limiting
    if (results.departures.isSuccess()) {
      const delay = options.delayBetweenRequests || 15000;
      console.log(`Waiting ${delay/1000} seconds before collecting arrivals...`);
      await this._sleep(delay);
    }

    // Collect arrivals
    const arrOptions = { ...options, type: 'arrival' };
    results.arrivals = await super.collect(arrOptions);

    // Combine results
    return this._combineResults(results);
  }

  /**
   * Prepares the request for YYZ API
   * @param {Object} options - Collection options
   * @returns {Promise<Object>} Request configuration
   */
  async prepareRequest(options) {
    const type = options.type || 'departure';
    const baseUrl = this.config.get('airports.yyz.baseUrl');
    const url = `${baseUrl}?type=${type === 'departure' ? 'DEP' : 'ARR'}&day=today&useScheduleTimeOnly=false`;
    
    const referer = type === 'departure' 
      ? this.config.get('airports.yyz.departureReferer')
      : this.config.get('airports.yyz.arrivalReferer');

    // Use different user agents for each request type
    const userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 Edg/126.0.0.0'
    ];

    const userAgent = userAgents[Math.floor(Math.random() * userAgents.length)];
    
    const headers = {
      'User-Agent': userAgent,
      'Accept': 'application/json, text/plain, */*',
      'Accept-Language': 'en-US,en;q=0.9',
      'Referer': referer,
      'Origin': 'https://www.torontopearson.com',
      'DNT': '1',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
      'Sec-Fetch-Dest': 'empty',
      'Sec-Fetch-Mode': 'cors',
      'Sec-Fetch-Site': 'same-origin'
    };

    return { url, headers };
  }

  /**
   * Handles response and checks for captcha
   * @param {Object} requestConfig - Request configuration
   * @returns {Promise<Object>} Raw API data
   */
  async fetchData(requestConfig) {
    const response = await super.fetchData(requestConfig);
    
    // Check if response is HTML (captcha page)
    if (typeof response === 'string' && response.trim().startsWith('<')) {
      if (response.includes('Captcha') || response.includes('captcha')) {
        throw new CaptchaError(
          'YYZ API returned captcha page - bot protection active',
          { 
            responsePreview: response.substring(0, 500),
            url: requestConfig.url 
          }
        );
      }
      throw new ValidationError('YYZ API returned HTML instead of JSON');
    }

    return response;
  }

  /**
   * Transforms YYZ API data
   * @param {Object} rawData - Raw data from API
   * @param {Object} options - Collection options
   * @returns {Promise<Object>} Transformed data
   */
  async transformData(rawData, options) {
    if (!rawData || !rawData.list || !Array.isArray(rawData.list)) {
      throw new ValidationError('Invalid YYZ API response structure');
    }

    const type = options.type || 'departure';
    const targetDate = options.date || new Date().toISOString().split('T')[0];

    // Transform to Flight models
    const transformedFlights = rawData.list.map(flightData => {
      try {
        return Flight.fromApiData(flightData, 'yyz');
      } catch (error) {
        console.warn(`Failed to parse flight: ${error.message}`, flightData);
        return null;
      }
    }).filter(Boolean);

    return {
      airport: 'YYZ',
      type: type,
      date: targetDate,
      lastUpdate: rawData.lastUpdate,
      serverTime: rawData.serverTime,
      statistics: {
        total: transformedFlights.length
      },
      flights: transformedFlights.map(f => f.toJSON())
    };
  }

  /**
   * Combines departure and arrival results
   * @private
   */
  _combineResults(results) {
    const CollectionResult = require('../../core/models/CollectionResult');
    
    const depSuccess = results.departures.isSuccess();
    const arrSuccess = results.arrivals.isSuccess();
    
    const combinedData = {
      airport: 'YYZ',
      date: new Date().toISOString().split('T')[0],
      departures: depSuccess ? results.departures.data : null,
      arrivals: arrSuccess ? results.arrivals.data : null
    };

    const metadata = {
      departuresCollected: depSuccess,
      arrivalsCollected: arrSuccess,
      timestamp: new Date()
    };

    if (depSuccess || arrSuccess) {
      return CollectionResult.success(combinedData, metadata);
    } else {
      const error = new Error('Failed to collect both departures and arrivals');
      error.details = {
        departuresError: results.departures.error,
        arrivalsError: results.arrivals.error
      };
      return CollectionResult.failure(error, metadata);
    }
  }

  /**
   * Sleep helper
   * @private
   */
  async _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = YYZCollector;