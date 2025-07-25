const { saveData } = require('./utils');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

// Use stealth plugin to avoid detection
puppeteer.use(StealthPlugin());

/**
 * Collects flight data from Toronto Pearson International Airport (YYZ) using headless browser
 * This approach bypasses bot protection by simulating a real browser
 * @param {boolean} isTest - Whether to run in test mode
 * @returns {Promise<void>}
 */
async function collectYYZDataBrowser(isTest = false) {
  const today = new Date();
  const date = today.toISOString().split('T')[0];
  
  let browser;
  try {
    console.log('Launching headless browser with stealth mode...');
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--disable-features=IsolateOrigins,site-per-process',
        '--window-size=1920,1080',
        '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'
      ]
    });
    
    const page = await browser.newPage();
    
    // Set viewport and additional headers
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9'
    });
    
    // Override user agent and platform
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', {
        get: () => false,
      });
      Object.defineProperty(navigator, 'plugins', {
        get: () => [1, 2, 3, 4, 5],
      });
      Object.defineProperty(navigator, 'languages', {
        get: () => ['en-US', 'en'],
      });
      window.chrome = {
        runtime: {},
      };
      Object.defineProperty(navigator, 'permissions', {
        get: () => ({
          query: () => Promise.resolve({ state: 'granted' }),
        }),
      });
    });
    
    // Collect departure data
    console.log('Navigating to YYZ departures page...');
    await page.goto('https://www.torontopearson.com/en/departures', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    // Wait for potential captcha or page load
    await page.waitForTimeout(5000);
    
    // Check if we hit a captcha
    const captchaPresent = await page.evaluate(() => {
      return document.body.innerHTML.includes('Captcha') || 
             document.body.innerHTML.includes('captcha') ||
             document.title.includes('Captcha');
    });
    
    if (captchaPresent) {
      console.log('Captcha detected. Waiting for manual resolution or trying to bypass...');
      // Try to wait for navigation away from captcha
      await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 60000 }).catch(() => {});
    }
    
    // Intercept API requests
    let depData = null;
    let arrData = null;
    
    page.on('response', async (response) => {
      const url = response.url();
      if (url.includes('/api/flightsapidata/getflightlist')) {
        try {
          const data = await response.json();
          if (url.includes('type=DEP')) {
            depData = data;
            console.log('Captured departure data from API');
          } else if (url.includes('type=ARR')) {
            arrData = data;
            console.log('Captured arrival data from API');
          }
        } catch (e) {
          console.log('Failed to parse API response:', e.message);
        }
      }
    });
    
    // Wait for API calls to complete
    await page.waitForTimeout(10000);
    
    // If we didn't capture data from intercepted requests, try direct API call
    if (!depData) {
      console.log('Attempting direct API call for departures...');
      try {
        depData = await page.evaluate(async () => {
          const response = await fetch('https://www.torontopearson.com/api/flightsapidata/getflightlist?type=DEP&day=today&useScheduleTimeOnly=false', {
            headers: {
              'Accept': 'application/json, text/plain, */*',
              'Referer': 'https://www.torontopearson.com/en/departures'
            }
          });
          return await response.json();
        });
      } catch (e) {
        console.log('Direct API call failed:', e.message);
      }
    }
    
    if (depData && depData.list) {
      console.log(`Departure data collected: ${depData.list.length} flights`);
      await saveData(depData, `yyz/yyz_departures_${date}.json`, isTest);
      console.log(`YYZ departure data saved successfully for ${date}`);
    } else {
      console.log('Failed to collect departure data');
    }
    
    // Navigate to arrivals page
    console.log('Navigating to YYZ arrivals page...');
    await page.goto('https://www.torontopearson.com/en/arrivals', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    await page.waitForTimeout(10000);
    
    // Try direct API call for arrivals
    if (!arrData) {
      console.log('Attempting direct API call for arrivals...');
      try {
        arrData = await page.evaluate(async () => {
          const response = await fetch('https://www.torontopearson.com/api/flightsapidata/getflightlist?type=ARR&day=today&useScheduleTimeOnly=false', {
            headers: {
              'Accept': 'application/json, text/plain, */*',
              'Referer': 'https://www.torontopearson.com/en/arrivals'
            }
          });
          return await response.json();
        });
      } catch (e) {
        console.log('Direct API call failed:', e.message);
      }
    }
    
    if (arrData && arrData.list) {
      console.log(`Arrival data collected: ${arrData.list.length} flights`);
      await saveData(arrData, `yyz/yyz_arrivals_${date}.json`, isTest);
      console.log(`YYZ arrival data saved successfully for ${date}`);
    } else {
      console.log('Failed to collect arrival data');
    }
    
  } catch (error) {
    console.error('Error collecting YYZ data with browser:', error);
    process.exit(1);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

if (require.main === module) {
  collectYYZDataBrowser(process.argv.includes('--test'));
}

module.exports = { collectYYZDataBrowser };