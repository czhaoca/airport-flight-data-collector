const { fetchData, saveData } = require('./utils');

/**
 * Collects flight data from San Francisco International Airport (SFO)
 * @param {boolean} isTest - Whether to run in test mode
 * @returns {Promise<void>}
 */
async function collectSFOData(isTest = false) {
  // Get yesterday's date
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const date = yesterday.toISOString().split('T')[0];

  const url = `https://www.flysfo.com/flysfo/api/flight-status`;
  
  // Add proper headers for better reliability
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'en-US,en;q=0.9',
    'Referer': 'https://www.flysfo.com/flight-info/flight-status',
    'Origin': 'https://www.flysfo.com'
  };
  
  try {
    console.log(`Fetching SFO flight data for ${date}...`);
    const data = await fetchData(url, headers);
    
    // Log some statistics about the data
    if (data && data.data && Array.isArray(data.data)) {
      console.log(`Collected ${data.data.length} flights`);
      const arrivals = data.data.filter(f => f.flight_kind === 'Arrival').length;
      const departures = data.data.filter(f => f.flight_kind === 'Departure').length;
      console.log(`Breakdown: ${arrivals} arrivals, ${departures} departures`);
    }
    
    await saveData(data, `sfo/sfo_flights_${date}.json`, isTest);
    console.log(`SFO data collected and saved successfully for ${date}`);
  } catch (error) {
    console.error('Error collecting SFO data:', error);
    console.error('Error details:', error.message);
    
    // Provide more helpful error messages
    if (error.code === 'ECONNREFUSED') {
      console.error('Connection refused. The SFO API server may be down.');
    } else if (error.code === 'ETIMEDOUT') {
      console.error('Request timed out. Try again later.');
    }
    
    process.exit(1);
  }
}

if (require.main === module) {
  collectSFOData(process.argv.includes('--test'));
}

module.exports = { collectSFOData };