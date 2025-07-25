const BaseAirportCollector = require('./BaseAirportCollector');
const Flight = require('../../core/models/Flight');
const CollectionResult = require('../../core/models/CollectionResult');
const { ValidationError, NetworkError } = require('../../core/errors/CollectionError');
const { getTodayDate } = require('../../utils/dateUtils');
const puppeteer = require('puppeteer');

/**
 * Vancouver International Airport data collector
 * Uses Puppeteer to bypass Cloudflare protection
 */
class YVRCollector extends BaseAirportCollector {
  constructor(httpClient, retryStrategy, config) {
    super(httpClient, retryStrategy, config);
    this.browser = null;
    this.page = null;
  }

  getAirportCode() {
    return 'YVR';
  }

  /**
   * Initializes browser session
   * @private
   */
  async initBrowser() {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: this.config.get('http.puppeteer.headless', true),
        executablePath: '/usr/bin/chromium-browser',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-blink-features=AutomationControlled'
        ]
      });
      
      this.page = await this.browser.newPage();
      
      // Set user agent
      await this.page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36');
      
      // Set viewport
      await this.page.setViewport({ width: 1920, height: 1080 });
      
      // Bypass webdriver detection
      await this.page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => false });
      });
    }
  }

  /**
   * Navigates to YVR website and waits for Cloudflare
   * @private
   */
  async bypassCloudflare() {
    const departuresUrl = this.config.get('airports.yvr.departureReferer');
    
    console.log('Navigating to YVR departures page...');
    await this.page.goto(departuresUrl, { waitUntil: 'networkidle2', timeout: 60000 });
    
    // Check for Cloudflare challenge
    const pageContent = await this.page.content();
    if (pageContent.includes('Checking your browser') || pageContent.includes('Just a moment')) {
      console.log('Cloudflare challenge detected, waiting for resolution...');
      
      // Wait for challenge to complete
      await this.page.waitForFunction(
        () => !document.body.innerHTML.includes('Checking your browser') && 
             !document.body.innerHTML.includes('Just a moment'),
        { timeout: 30000 }
      );
      
      console.log('Cloudflare challenge resolved');
    }
    
    // Wait for page to fully load
    await new Promise(resolve => setTimeout(resolve, 3000));
  }

  /**
   * Collects flight data using browser automation
   * @param {Object} options - Collection options
   * @returns {Promise<Object>} Flight data
   */
  async collect(options = {}) {
    try {
      await this.initBrowser();
      await this.bypassCloudflare();
      
      const targetDate = options.date || getTodayDate();
      const results = {
        airport: 'YVR',
        date: targetDate,
        lastUpdate: new Date().toISOString(),
        flights: []
      };
      
      // Collect departures
      console.log('Collecting departure data...');
      const departures = await this.collectFlightType('D', targetDate);
      
      // Navigate to arrivals page
      const arrivalsUrl = this.config.get('airports.yvr.arrivalReferer');
      await this.page.goto(arrivalsUrl, { waitUntil: 'networkidle2' });
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Collect arrivals
      console.log('Collecting arrival data...');
      const arrivals = await this.collectFlightType('A', targetDate);
      
      // Combine results
      results.flights = [...departures, ...arrivals];
      results.statistics = {
        total: results.flights.length,
        arrivals: arrivals.length,
        departures: departures.length
      };
      
      this.validateData(results);
      
      return CollectionResult.success(results, {
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
    } finally {
      // Close browser
      if (this.browser) {
        await this.browser.close();
        this.browser = null;
        this.page = null;
      }
    }
  }

  /**
   * Collects flights of a specific type
   * @private
   */
  async collectFlightType(flightType, targetDate) {
    // Build API URL
    const baseUrl = this.config.get('airports.yvr.baseUrl');
    const startDate = `${targetDate}T00:00:00`;
    const endDate = `${targetDate}T23:59:59`;
    
    const filter = `((FlightScheduledTime gt DateTime'${startDate}' and FlightScheduledTime lt DateTime'${endDate}' and FlightType eq '${flightType}') or (FlightEstimatedTime gt DateTime'${startDate}' and FlightEstimatedTime lt DateTime'${endDate}' and FlightType eq '${flightType}'))`;
    const orderby = 'FlightScheduledTime asc';
    const apiUrl = `${baseUrl}?$filter=${encodeURIComponent(filter)}&$orderby=${encodeURIComponent(orderby)}`;
    
    // Make API request through browser
    const response = await this.page.evaluate(async (url) => {
      try {
        const response = await fetch(url, {
          headers: {
            'Accept': '*/*',
            'X-Requested-With': 'XMLHttpRequest'
          }
        });
        const data = await response.json();
        return { success: true, data };
      } catch (error) {
        return { success: false, error: error.message };
      }
    }, apiUrl);
    
    if (!response.success) {
      throw new NetworkError(`Failed to fetch ${flightType} flights: ${response.error}`);
    }
    
    // Transform data
    return this.transformFlights(response.data.value || [], flightType);
  }

  /**
   * Transforms raw flight data
   * @private
   */
  transformFlights(flights, flightType) {
    return flights.map(flightData => {
      try {
        const mappedData = {
          flight_number: flightData.FlightNumber,
          airline: flightData.FlightAirlineName,
          airline_code: flightData.FlightCarrier,
          destination: flightType === 'D' ? flightData.FlightCity : null,
          origin: flightType === 'A' ? flightData.FlightCity : null,
          scheduled_time: flightData.FlightScheduledTime,
          estimated_time: flightData.FlightEstimatedTime,
          actual_time: flightData.FlightActualTime,
          terminal: flightData.FlightRange,
          gate: flightData.FlightGate,
          status: this._mapStatus(flightData.FlightStatus),
          type: flightType === 'D' ? 'departure' : 'arrival',
          destination_code: flightType === 'D' ? flightData.FlightAirportCode : null,
          origin_code: flightType === 'A' ? flightData.FlightAirportCode : null,
          remarks: flightData.FlightRemarks,
          carousel: flightData.FlightCarousel,
          aircraft_type: flightData.FlightAircraftType
        };
        
        const flight = Flight.fromApiData(mappedData, 'yvr');
        return flight.toJSON();
      } catch (error) {
        console.warn(`Failed to parse YVR flight: ${error.message}`, flightData);
        return null;
      }
    }).filter(Boolean);
  }

  /**
   * Maps YVR status to standard status
   * @private
   */
  _mapStatus(yvrStatus) {
    const statusMap = {
      'On Time': 'scheduled',
      'Delayed': 'delayed',
      'Arrived': 'landed',
      'Departed': 'departed',
      'Cancelled': 'cancelled',
      'Early': 'early'
    };
    
    return statusMap[yvrStatus] || yvrStatus?.toLowerCase() || 'unknown';
  }

  /**
   * Validates the transformed data
   * @param {Object} data - Data to validate
   * @throws {ValidationError} If data is invalid
   */
  validateData(data) {
    if (!data || typeof data !== 'object') {
      throw new ValidationError('Data must be an object');
    }

    if (!data.airport || data.airport !== 'YVR') {
      throw new ValidationError('Invalid airport code');
    }

    if (!data.flights || !Array.isArray(data.flights)) {
      throw new ValidationError('Flights data must be an array');
    }

    if (data.flights.length === 0 && this.config.get('features.verboseLogging')) {
      console.warn('No flights found in YVR data');
    }
  }
}

module.exports = YVRCollector;