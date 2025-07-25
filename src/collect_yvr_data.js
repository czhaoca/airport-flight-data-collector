#!/usr/bin/env node

const ServiceContainer = require('./application/services/ServiceContainer');
const { getConfig } = require('./infrastructure/config/Configuration');

/**
 * Test script for YVR data collection
 */
async function main() {
  try {
    console.log('YVR Data Collection Test');
    console.log('========================\n');

    // Create service container
    const container = ServiceContainer.createDefault();
    const config = getConfig();
    const collector = container.get('yvrCollector');
    const storage = container.get('storageService');

    // Set specific date if provided as command line argument
    const date = process.argv[2] || new Date().toISOString().split('T')[0];
    console.log(`Collecting data for date: ${date}`);
    console.log('Note: YVR has firewall protection, testing carefully...\n');

    // Collect data with options
    const options = {
      date: date,
      saveIfEmpty: false
    };

    console.log('Starting YVR data collection...');
    const result = await collector.collect(options);

    if (!result.isSuccess()) {
      throw new Error(result.error);
    }

    const data = result.data;

    // Display statistics
    console.log('\nCollection successful!');
    console.log(`Airport: ${data.airport}`);
    console.log(`Date: ${data.date}`);
    console.log(`Total flights: ${data.statistics.total}`);
    console.log(`Arrivals: ${data.statistics.arrivals}`);
    console.log(`Departures: ${data.statistics.departures}`);

    // Show sample flights
    if (data.flights.length > 0) {
      console.log('\nSample flights:');
      data.flights.slice(0, 5).forEach(flight => {
        const type = flight.type === 'arrival' ? 'ARR' : 'DEP';
        const route = flight.type === 'arrival' 
          ? `${flight.origin} -> YVR` 
          : `YVR -> ${flight.destination}`;
        console.log(`  ${type} ${flight.flightNumber} (${flight.airline.name}) ${route} - ${flight.status}`);
      });
    }

    // Save data
    if (config.get('features.saveTestData') || process.argv.includes('--save')) {
      console.log('\nSaving data...');
      const filename = await storage.save(data, 'YVR');
      console.log(`Data saved to: ${filename}`);
    }

  } catch (error) {
    console.error('\nError collecting YVR data:');
    console.error(error.message);
    
    if (error.message.includes('Cloudflare') || error.message.includes('403')) {
      console.error('\nNote: YVR uses Cloudflare protection. Try the following:');
      console.error('1. Use a different HTTP client (set HTTP_CLIENT_TYPE=curl)');
      console.error('2. Add delays between requests');
      console.error('3. Use a proxy if available');
    }
    
    const config = getConfig();
    if (config.get('features.verboseLogging')) {
      console.error('\nDetailed error:', error);
    }
    
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = main;