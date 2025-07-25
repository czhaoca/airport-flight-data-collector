const { saveData } = require('./utils');
const fetch = require('node-fetch');

/**
 * Collects flight data from San Francisco International Airport (SFO)
 * Flexible version that can collect data for any date
 * @param {string} targetDate - Optional date in YYYY-MM-DD format (defaults to yesterday)
 * @param {boolean} isTest - Whether to run in test mode
 * @returns {Promise<void>}
 */
async function collectSFODataFlexible(targetDate = null, isTest = false) {
  // Determine target date
  let date;
  if (targetDate) {
    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(targetDate)) {
      console.error('Invalid date format. Please use YYYY-MM-DD');
      process.exit(1);
    }
    date = targetDate;
  } else {
    // Default to yesterday
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    date = yesterday.toISOString().split('T')[0];
  }

  const url = `https://www.flysfo.com/flysfo/api/flight-status`;
  
  // Enhanced headers
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    'Referer': 'https://www.flysfo.com/flight-info/flight-status',
    'Origin': 'https://www.flysfo.com',
    'Cache-Control': 'no-cache'
  };
  
  // Retry configuration
  const maxRetries = 3;
  const retryDelay = 5000; // 5 seconds
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Attempt ${attempt}/${maxRetries}: Fetching SFO flight data...`);
      console.log(`Target date: ${date}`);
      
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
      
      // Analyze the data
      if (data && data.data && Array.isArray(data.data)) {
        console.log(`Total flights in response: ${data.data.length}`);
        
        // Check date distribution
        const dateCounts = {};
        data.data.forEach(flight => {
          const flightDate = flight.scheduled_date;
          dateCounts[flightDate] = (dateCounts[flightDate] || 0) + 1;
        });
        
        console.log('Flight distribution by date:');
        Object.entries(dateCounts)
          .sort(([a], [b]) => a.localeCompare(b))
          .forEach(([date, count]) => {
            console.log(`  ${date}: ${count} flights`);
          });
        
        // Filter for target date if needed
        const targetFlights = data.data.filter(flight => flight.scheduled_date === date);
        if (targetFlights.length > 0) {
          console.log(`Flights for target date ${date}: ${targetFlights.length}`);
          
          const arrivals = targetFlights.filter(f => f.flight_kind === 'Arrival').length;
          const departures = targetFlights.filter(f => f.flight_kind === 'Departure').length;
          console.log(`Breakdown: ${arrivals} arrivals, ${departures} departures`);
          
          // Save only target date flights
          const filteredData = { ...data, data: targetFlights };
          await saveData(filteredData, `sfo/sfo_flights_${date}.json`, isTest);
          console.log(`SFO data collected and saved successfully for ${date}`);
        } else {
          console.warn(`No flights found for target date ${date}`);
          console.log('The API might be returning data for different dates only.');
        }
      } else {
        console.error('Invalid data structure received from API');
      }
      
      // Success - exit retry loop
      return;
      
    } catch (error) {
      console.error(`Attempt ${attempt} failed:`, error.message);
      
      if (attempt < maxRetries) {
        console.log(`Retrying in ${retryDelay / 1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      } else {
        console.error('All retry attempts failed');
        process.exit(1);
      }
    }
  }
}

// Command line argument parsing
if (require.main === module) {
  const args = process.argv.slice(2);
  let targetDate = null;
  let isTest = false;
  
  args.forEach(arg => {
    if (arg === '--test') {
      isTest = true;
    } else if (arg.startsWith('--date=')) {
      targetDate = arg.split('=')[1];
    } else if (/^\d{4}-\d{2}-\d{2}$/.test(arg)) {
      targetDate = arg;
    }
  });
  
  if (args.includes('--help')) {
    console.log('Usage: node collect_sfo_data_flexible.js [options]');
    console.log('Options:');
    console.log('  --date=YYYY-MM-DD  Collect data for specific date');
    console.log('  --test             Run in test mode');
    console.log('  --help             Show this help message');
    console.log('Examples:');
    console.log('  node collect_sfo_data_flexible.js --date=2025-07-24');
    console.log('  node collect_sfo_data_flexible.js 2025-07-24 --test');
    process.exit(0);
  }
  
  collectSFODataFlexible(targetDate, isTest);
}

module.exports = { collectSFODataFlexible };