#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');
const { getDatabase } = require('../lib/database');
const FlightModel = require('../lib/database/models/flight-model');

const BATCH_SIZE = 100;
const DATA_DIR = path.join(__dirname, '..', 'data');

async function migrateToOCI() {
  console.log('Starting migration to Oracle Cloud Infrastructure...');
  
  // Ensure we're using OCI provider
  process.env.DB_PROVIDER = 'oci';
  
  if (!process.env.OCI_USER || !process.env.OCI_PASSWORD || !process.env.OCI_CONNECTION_STRING) {
    console.error('Missing required OCI environment variables:');
    console.error('- OCI_USER');
    console.error('- OCI_PASSWORD');
    console.error('- OCI_CONNECTION_STRING');
    process.exit(1);
  }
  
  const db = await getDatabase();
  const stats = {
    filesProcessed: 0,
    recordsInserted: 0,
    errors: [],
    startTime: Date.now()
  };
  
  try {
    // Health check
    const health = await db.healthCheck();
    console.log('Database health:', health);
    
    if (health.status !== 'healthy') {
      throw new Error('Database is not healthy');
    }
    
    // Get all airport directories
    const airports = await getAirportDirectories();
    console.log(`Found ${airports.length} airport directories:`, airports);
    
    for (const airport of airports) {
      console.log(`\nProcessing ${airport} data...`);
      await processAirportData(airport, db, stats);
    }
    
    // Print summary
    const duration = (Date.now() - stats.startTime) / 1000;
    console.log('\n=== Migration Summary ===');
    console.log(`Files processed: ${stats.filesProcessed}`);
    console.log(`Records inserted: ${stats.recordsInserted}`);
    console.log(`Errors: ${stats.errors.length}`);
    console.log(`Duration: ${duration.toFixed(2)} seconds`);
    
    if (stats.errors.length > 0) {
      console.log('\nErrors encountered:');
      stats.errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error.file}: ${error.message}`);
      });
    }
    
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await db.disconnect();
  }
}

async function getAirportDirectories() {
  const entries = await fs.readdir(DATA_DIR, { withFileTypes: true });
  return entries
    .filter(entry => entry.isDirectory() && !entry.name.startsWith('_'))
    .map(entry => entry.name);
}

async function processAirportData(airport, db, stats) {
  const airportDir = path.join(DATA_DIR, airport);
  const files = await fs.readdir(airportDir);
  const jsonFiles = files.filter(f => f.endsWith('.json'));
  
  console.log(`Found ${jsonFiles.length} JSON files in ${airport}`);
  
  const batches = [];
  let currentBatch = [];
  
  for (const file of jsonFiles) {
    const filepath = path.join(airportDir, file);
    
    try {
      const content = await fs.readFile(filepath, 'utf8');
      const data = JSON.parse(content);
      
      // Extract date from filename
      const dateMatch = file.match(/(\d{4}-\d{2}-\d{2})/);
      if (!dateMatch) {
        throw new Error('Could not extract date from filename');
      }
      
      const flightDate = dateMatch[1];
      const flightType = file.includes('departure') ? 'departure' : 'arrival';
      
      // Remove any existing metadata
      if (data._metadata) {
        delete data._metadata;
      }
      
      // Create flight record
      const record = {
        airport,
        type: flightType,
        date: flightDate,
        data: data
      };
      
      currentBatch.push(record);
      
      if (currentBatch.length >= BATCH_SIZE) {
        batches.push(currentBatch);
        currentBatch = [];
      }
      
      stats.filesProcessed++;
      
    } catch (error) {
      stats.errors.push({
        file: filepath,
        message: error.message
      });
      console.error(`Error processing ${file}:`, error.message);
    }
  }
  
  // Add remaining records
  if (currentBatch.length > 0) {
    batches.push(currentBatch);
  }
  
  // Process batches
  console.log(`Processing ${batches.length} batches...`);
  
  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    process.stdout.write(`\rBatch ${i + 1}/${batches.length} (${batch.length} records)`);
    
    for (const record of batch) {
      try {
        await db.saveFlightData(record);
        stats.recordsInserted++;
      } catch (error) {
        stats.errors.push({
          file: `${record.airport}_${record.type}_${record.date}`,
          message: error.message
        });
      }
    }
  }
  
  console.log(''); // New line after progress
}

// Add command line arguments
const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  console.log('Usage: node migrate-to-oci.js [options]');
  console.log('');
  console.log('Options:');
  console.log('  --dry-run    Show what would be migrated without actually migrating');
  console.log('  --help, -h   Show this help message');
  console.log('');
  console.log('Environment variables:');
  console.log('  OCI_USER              Oracle DB username');
  console.log('  OCI_PASSWORD          Oracle DB password');
  console.log('  OCI_CONNECTION_STRING Oracle DB connection string');
  console.log('  OCI_WALLET_LOCATION   Path to Oracle wallet (optional)');
  process.exit(0);
}

if (args.includes('--dry-run')) {
  console.log('DRY RUN MODE - No data will be migrated');
  // TODO: Implement dry run
} else {
  migrateToOCI().catch(console.error);
}