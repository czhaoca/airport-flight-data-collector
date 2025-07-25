const { saveData } = require('./utils');
const fetch = require('node-fetch');

/**
 * Collects flight data from San Francisco International Airport (SFO)
 * Enhanced version with better error handling and headers
 * @param {boolean} isTest - Whether to run in test mode
 * @returns {Promise<void>}
 */
async function collectSFODataImproved(isTest = false) {
  // Get yesterday's date (SFO API design choice)
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const date = yesterday.toISOString().split('T')[0];

  const url = `https://www.flysfo.com/flysfo/api/flight-status`;
  
  // Enhanced headers to ensure reliable data collection
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    'Referer': 'https://www.flysfo.com/flight-info/flight-status',
    'Origin': 'https://www.flysfo.com',
    'DNT': '1',
    'Connection': 'keep-alive',
    'Sec-Fetch-Dest': 'empty',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'same-origin',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache'
  };
  
  try {
    console.log(`Fetching SFO flight data for ${date}...`);
    console.log('API URL:', url);
    
    const response = await fetch(url, { 
      headers,
      timeout: 60000, // Increased timeout for large dataset
      follow: 20,
      compress: true
    });
    
    console.log('Response status:', response.status);
    console.log('Response headers:', response.headers.raw());
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      console.warn('Unexpected content type:', contentType);
      const text = await response.text();
      console.log('Response preview:', text.substring(0, 500));
      throw new Error('Expected JSON response but got ' + contentType);
    }
    
    const data = await response.json();
    
    // Validate data structure
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid data structure received');
    }
    
    // Log data statistics
    if (data.data && Array.isArray(data.data)) {
      console.log(`Data collected successfully: ${data.data.length} flights`);
      
      // Count arrivals vs departures
      const arrivals = data.data.filter(f => f.flight_kind === 'Arrival').length;
      const departures = data.data.filter(f => f.flight_kind === 'Departure').length;
      console.log(`Arrivals: ${arrivals}, Departures: ${departures}`);
      
      // Get unique airlines
      const airlines = [...new Set(data.data.map(f => f.airline?.airline_name))].filter(Boolean);
      console.log(`Airlines: ${airlines.length} unique carriers`);
      
      // Sample flight info
      if (data.data.length > 0) {
        const sample = data.data[0];
        console.log('Sample flight:', {
          flight: `${sample.airline?.iata_code}${sample.flight_number}`,
          type: sample.flight_kind,
          airport: sample.airport?.iata_code,
          scheduled: sample.scheduled_aod_time,
          status: sample.remark
        });
      }
    }
    
    await saveData(data, `sfo/sfo_flights_${date}.json`, isTest);
    console.log(`SFO data collected and saved successfully for ${date}`);
    console.log(`File size: ${JSON.stringify(data).length} bytes`);
    
  } catch (error) {
    console.error('Error collecting SFO data:', error.message);
    
    // Provide helpful error messages
    if (error.code === 'ECONNREFUSED') {
      console.error('Connection refused. The SFO API server may be down.');
    } else if (error.code === 'ETIMEDOUT') {
      console.error('Request timed out. The SFO API may be slow or experiencing issues.');
    } else if (error.message.includes('ENOTFOUND')) {
      console.error('DNS lookup failed. Check your internet connection.');
    }
    
    process.exit(1);
  }
}

if (require.main === module) {
  collectSFODataImproved(process.argv.includes('--test'));
}

module.exports = { collectSFODataImproved };