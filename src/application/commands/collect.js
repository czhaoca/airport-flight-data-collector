#!/usr/bin/env node

const ServiceContainer = require('../services/ServiceContainer');

/**
 * Main collection command
 * Uses the new SOLID architecture
 */
async function main() {
  try {
    // Parse command line arguments
    const args = process.argv.slice(2);
    const options = parseArguments(args);

    // Create service container
    const container = ServiceContainer.createDefault();
    
    // Validate configuration
    container.get('config').validate();

    // Get collector service
    const collectorService = container.get('collectorService');

    // Execute collection
    if (options.airport) {
      // Collect specific airport
      const result = await collectorService.collect(options.airport, options);
      
      if (!result.isSuccess()) {
        console.error('Collection failed:', result.error);
        process.exit(1);
      }
    } else {
      // Collect all airports
      const results = await collectorService.collectAll(options);
      
      // Check if any failed
      const failures = Object.entries(results)
        .filter(([, result]) => !result.success)
        .map(([airport]) => airport);
      
      if (failures.length > 0) {
        console.error('Failed to collect from:', failures.join(', '));
        process.exit(1);
      }
    }

    console.log('Collection completed successfully');
  } catch (error) {
    console.error('Fatal error:', error.message);
    if (process.env.DEBUG === 'true') {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

/**
 * Parses command line arguments
 */
function parseArguments(args) {
  const options = {
    isTest: false,
    airport: null,
    date: null,
    throwOnError: false
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--test') {
      options.isTest = true;
    } else if (arg === '--airport' && i + 1 < args.length) {
      options.airport = args[++i].toUpperCase();
    } else if (arg === '--date' && i + 1 < args.length) {
      options.date = args[++i];
    } else if (arg === '--throw-on-error') {
      options.throwOnError = true;
    } else if (arg === '--help') {
      showHelp();
      process.exit(0);
    } else if (!arg.startsWith('--')) {
      // Assume it's an airport code
      options.airport = arg.toUpperCase();
    }
  }

  return options;
}

/**
 * Shows help message
 */
function showHelp() {
  console.log(`
Airport Flight Data Collector

Usage: node collect.js [options] [airport]

Options:
  --airport <code>    Collect data from specific airport (SFO, YYZ)
  --date <YYYY-MM-DD> Collect data for specific date
  --test              Save to test directory
  --throw-on-error    Exit with error on collection failure
  --help              Show this help message

Examples:
  node collect.js                    # Collect from all airports
  node collect.js SFO                # Collect from SFO
  node collect.js --airport YYZ      # Collect from YYZ
  node collect.js SFO --date 2025-07-24 --test

Environment Variables:
  STORAGE_TYPE        Storage type: local or github (default: local)
  HTTP_CLIENT_TYPE    HTTP client: fetch or curl (default: fetch)
  VERBOSE             Enable verbose logging (default: false)
  DEBUG               Show stack traces on error (default: false)
  `);
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { main };