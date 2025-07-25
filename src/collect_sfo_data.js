#!/usr/bin/env node

/**
 * Backward compatibility wrapper for SFO data collection
 * This file maintains compatibility with existing scripts and GitHub Actions
 */

const ServiceContainer = require('./application/services/ServiceContainer');

async function collectSFOData(isTest = false) {
  try {
    const container = ServiceContainer.createDefault();
    container.get('config').validate();
    
    const collectorService = container.get('collectorService');
    const result = await collectorService.collect('SFO', { isTest });
    
    if (!result.isSuccess()) {
      throw new Error(result.error);
    }
  } catch (error) {
    console.error('Error collecting SFO data:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  const isTest = process.argv.includes('--test');
  collectSFOData(isTest);
}

module.exports = { collectSFOData };