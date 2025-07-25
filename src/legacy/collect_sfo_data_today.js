const { saveData } = require('./utils');
const fetch = require('node-fetch');

/**
 * Collects flight data from San Francisco International Airport (SFO) for TODAY
 * Note: The SFO API returns current day's real-time flight status
 * @param {boolean} isTest - Whether to run in test mode
 * @returns {Promise<void>}
 */
async function collectSFODataToday(isTest = false) {
  // Get today's date
  const today = new Date();
  const date = today.toISOString().split('T')[0];

  const url = `https://www.flysfo.com/flysfo/api/flight-status`;
  
  // Enhanced headers
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    'Referer': 'https://www.flysfo.com/flight-info/flight-status',
    'Origin': 'https://www.flysfo.com'
  };
  
  try {
    console.log(`Fetching SFO flight data for TODAY (${date})...`);
    
    const response = await fetch(url, { 
      headers,
      timeout: 60000,
      follow: 20,
      compress: true
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    // The API returns data with scheduled_date field
    // Filter to only include today's flights
    if (data.data && Array.isArray(data.data)) {
      const todayFlights = data.data.filter(flight => {
        return flight.scheduled_date === date;
      });
      
      console.log(`Total flights in response: ${data.data.length}`);
      console.log(`Today's flights (${date}): ${todayFlights.length}`);
      
      // Update data with filtered flights
      data.data = todayFlights;
      
      if (todayFlights.length === 0) {
        console.warn('No flights found for today. The API might be returning historical data.');
      }
    }
    
    await saveData(data, `sfo/sfo_flights_today_${date}.json`, isTest);
    console.log(`SFO today's data collected and saved successfully for ${date}`);
    
  } catch (error) {
    console.error('Error collecting SFO data:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  collectSFODataToday(process.argv.includes('--test'));
}

module.exports = { collectSFODataToday };