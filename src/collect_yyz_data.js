#!/usr/bin/env node

/**
 * Backward compatibility wrapper for YYZ data collection
 * This file maintains compatibility with existing scripts and GitHub Actions
 */

const ServiceContainer = require('./application/services/ServiceContainer');

async function collectYYZData(isTest = false) {
  try {
    // Use curl client for YYZ to handle bot protection
    process.env.HTTP_CLIENT_TYPE = 'curl';
    
    const container = ServiceContainer.createDefault();
    container.get('config').validate();
    
    const collectorService = container.get('collectorService');
    const result = await collectorService.collect('YYZ', { isTest });
    
    if (!result.isSuccess()) {
      throw new Error(result.error);
    }
  } catch (error) {
    console.error('Error collecting YYZ data:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  const isTest = process.argv.includes('--test');
  collectYYZData(isTest);
}

module.exports = { collectYYZData };