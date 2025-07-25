const puppeteer = require('puppeteer');
const IHttpClient = require('../../core/interfaces/IHttpClient');
const { NetworkError } = require('../../core/errors/CollectionError');

/**
 * Puppeteer-based implementation of IHttpClient
 * Used for bypassing advanced bot protections like Cloudflare
 */
class PuppeteerClient extends IHttpClient {
  constructor(options = {}) {
    super();
    this.browser = null;
    this.page = null;
    this.options = {
      headless: options.headless !== false, // Default to headless
      userAgent: options.userAgent || 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36',
      viewport: options.viewport || { width: 1920, height: 1080 },
      timeout: options.timeout || 30000,
      ...options
    };
    this.cookies = [];
  }

  /**
   * Initializes the browser and page
   * @private
   */
  async initialize() {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: this.options.headless,
        executablePath: '/usr/bin/chromium-browser',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-blink-features=AutomationControlled',
          '--disable-features=IsolateOrigins,site-per-process'
        ]
      });
      
      this.page = await this.browser.newPage();
      
      // Set user agent
      await this.page.setUserAgent(this.options.userAgent);
      
      // Set viewport
      await this.page.setViewport(this.options.viewport);
      
      // Enable request interception to handle headers
      await this.page.setRequestInterception(true);
      
      // Remove webdriver flag
      await this.page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'webdriver', {
          get: () => false,
        });
      });
      
      // Add chrome runtime
      await this.page.evaluateOnNewDocument(() => {
        window.chrome = {
          runtime: {},
        };
      });
      
      // Add permissions
      await this.page.evaluateOnNewDocument(() => {
        const originalQuery = window.navigator.permissions.query;
        return window.navigator.permissions.query = (parameters) => (
          parameters.name === 'notifications' ?
            Promise.resolve({ state: Notification.permission }) :
            originalQuery(parameters)
        );
      });
    }
  }

  /**
   * Makes a GET request using Puppeteer
   * @param {string} url - The URL to request
   * @param {Object} headers - Request headers
   * @returns {Promise<Object>} The response data
   */
  async get(url, headers = {}) {
    try {
      await this.initialize();
      
      // Handle request interception for headers
      this.page.on('request', (request) => {
        const overrides = { headers: { ...request.headers(), ...headers } };
        request.continue(overrides);
      });
      
      // Navigate to the page
      const response = await this.page.goto(url, {
        waitUntil: 'networkidle2',
        timeout: this.options.timeout
      });
      
      // Wait a bit for any JavaScript to execute
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Check if we hit a Cloudflare challenge
      const pageContent = await this.page.content();
      if (pageContent.includes('Checking your browser') || pageContent.includes('Just a moment')) {
        console.log('Cloudflare challenge detected, waiting for resolution...');
        
        // Wait for Cloudflare to resolve (up to 30 seconds)
        await this.page.waitForFunction(
          () => !document.body.innerHTML.includes('Checking your browser') && 
               !document.body.innerHTML.includes('Just a moment'),
          { timeout: 30000 }
        ).catch(() => {
          console.log('Cloudflare challenge timeout, continuing anyway...');
        });
        
        // Additional wait after challenge
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
      // Try to get JSON data if it's an API endpoint
      try {
        const jsonData = await this.page.evaluate(() => {
          const preElement = document.querySelector('pre');
          if (preElement && preElement.textContent) {
            try {
              return JSON.parse(preElement.textContent);
            } catch (e) {
              return null;
            }
          }
          
          // Try to parse body text as JSON
          try {
            return JSON.parse(document.body.textContent);
          } catch (e) {
            return null;
          }
        });
        
        if (jsonData) {
          // Store cookies for future requests
          this.cookies = await this.page.cookies();
          return jsonData;
        }
      } catch (e) {
        // Not JSON, continue
      }
      
      // If not JSON, return the page content
      const content = await this.page.content();
      
      // Store cookies for future requests
      this.cookies = await this.page.cookies();
      
      return content;
      
    } catch (error) {
      throw new NetworkError(
        `Puppeteer request failed: ${error.message}`,
        {
          originalError: error.message,
          url
        }
      );
    }
  }

  /**
   * Makes a POST request using Puppeteer
   * @param {string} url - The URL to request
   * @param {Object} data - The data to send
   * @param {Object} headers - Request headers
   * @returns {Promise<Object>} The response data
   */
  async post(url, data, headers = {}) {
    try {
      await this.initialize();
      
      // Use page.evaluate to make a fetch request
      const response = await this.page.evaluate(async (url, data, headers) => {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...headers
          },
          body: JSON.stringify(data)
        });
        
        const text = await response.text();
        try {
          return JSON.parse(text);
        } catch {
          return text;
        }
      }, url, data, headers);
      
      return response;
      
    } catch (error) {
      throw new NetworkError(
        `Puppeteer POST request failed: ${error.message}`,
        {
          originalError: error.message,
          url
        }
      );
    }
  }

  /**
   * Sets cookies for the browser session
   * @param {Array} cookies - Array of cookie objects
   */
  async setCookies(cookies) {
    await this.initialize();
    if (cookies && cookies.length > 0) {
      await this.page.setCookie(...cookies);
    }
  }

  /**
   * Gets current cookies from the browser session
   * @returns {Promise<Array>} Array of cookie objects
   */
  async getCookies() {
    await this.initialize();
    return await this.page.cookies();
  }

  /**
   * Closes the browser instance
   */
  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
    }
  }

  /**
   * Sets default headers (not used in Puppeteer, handled per request)
   * @param {Object} headers - Default headers
   */
  setDefaultHeaders(headers) {
    // Headers are set per request in Puppeteer
  }
}

module.exports = PuppeteerClient;