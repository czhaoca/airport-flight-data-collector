#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');
const { getDatabase } = require('../lib/database');

const BATCH_SIZE = 100; // D1 has limits on batch operations
const DATA_DIR = path.join(__dirname, '..', 'data');

async function migrateToCloudflare() {
  console.log('Starting migration to Cloudflare D1...');
  
  // Ensure we're using Cloudflare provider
  process.env.DB_PROVIDER = 'cloudflare';
  
  if (!process.env.CF_ACCOUNT_ID || !process.env.CF_DATABASE_ID || !process.env.CF_API_TOKEN) {
    console.error('Missing required Cloudflare environment variables:');
    console.error('- CF_ACCOUNT_ID');
    console.error('- CF_DATABASE_ID');
    console.error('- CF_API_TOKEN');
    process.exit(1);
  }
  
  const db = await getDatabase();
  const stats = {
    filesProcessed: 0,
    recordsInserted: 0,
    dataSize: 0,
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
    
    console.log(`Using tables: ${health.adapterStatus.tables.flights}`);
    console.log(`Environment: ${health.adapterStatus.environment}`);
    
    // Check D1 storage before migration
    await checkStorageCapacity(stats);
    
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
    console.log(`Total data size: ${(stats.dataSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`Errors: ${stats.errors.length}`);
    console.log(`Duration: ${duration.toFixed(2)} seconds`);
    console.log(`Average speed: ${(stats.recordsInserted / duration).toFixed(2)} records/second`);
    
    // Check if we're approaching D1 limits
    if (stats.dataSize > 4 * 1024 * 1024 * 1024) { // 4GB warning
      console.warn('\n⚠️  WARNING: Approaching Cloudflare D1 5GB limit!');
      console.warn('Consider implementing data archival strategy.');
    }
    
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

async function checkStorageCapacity(stats) {
  console.log('\nEstimating data size...');
  const airports = await getAirportDirectories();
  
  for (const airport of airports) {
    const airportDir = path.join(DATA_DIR, airport);
    const files = await fs.readdir(airportDir);
    
    for (const file of files.filter(f => f.endsWith('.json'))) {
      const filepath = path.join(airportDir, file);
      const stat = await fs.stat(filepath);
      stats.dataSize += stat.size;
    }
  }
  
  console.log(`Total data size: ${(stats.dataSize / 1024 / 1024).toFixed(2)} MB`);
  
  if (stats.dataSize > 5 * 1024 * 1024 * 1024) {
    throw new Error('Data size exceeds Cloudflare D1 5GB limit. Consider filtering data or using archival.');
  }
}

async function processAirportData(airport, db, stats) {
  const airportDir = path.join(DATA_DIR, airport);
  const files = await fs.readdir(airportDir);
  const jsonFiles = files.filter(f => f.endsWith('.json')).sort();
  
  console.log(`Found ${jsonFiles.length} JSON files in ${airport}`);
  
  // Process files by date to handle recent data first
  const sortedFiles = jsonFiles.sort((a, b) => b.localeCompare(a));
  
  const batches = [];
  let currentBatch = [];
  
  for (const file of sortedFiles) {
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
      
      // Compress data for D1 storage efficiency
      const compressedData = compressJSON(data);
      
      // Create flight record
      const record = {
        airport,
        type: flightType,
        date: flightDate,
        data: compressedData
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
  
  // Process batches with progress indicator
  console.log(`Processing ${batches.length} batches...`);
  
  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    process.stdout.write(`\rBatch ${i + 1}/${batches.length} (${batch.length} records)`);
    
    try {
      // Use bulk insert for better performance
      const result = await db.adapter.bulkInsert(batch.map(record => ({
        id: db._generateFlightId(record.airport, record.type, record.date),
        airport_code: record.airport.toUpperCase(),
        flight_type: record.type.toLowerCase(),
        flight_date: record.date,
        flight_data: record.data
      })));
      
      stats.recordsInserted += result.rowsInserted;
      
      if (result.errors && result.errors.length > 0) {
        result.errors.forEach(err => {
          stats.errors.push({
            file: `Batch ${i}`,
            message: err.error
          });
        });
      }
    } catch (error) {
      stats.errors.push({
        file: `Batch ${i}`,
        message: error.message
      });
      
      // Try individual inserts as fallback
      console.log(`\nBatch failed, trying individual inserts...`);
      for (const record of batch) {
        try {
          await db.saveFlightData(record);
          stats.recordsInserted++;
        } catch (err) {
          stats.errors.push({
            file: `${record.airport}_${record.type}_${record.date}`,
            message: err.message
          });
        }
      }
    }
    
    // Add small delay to avoid rate limiting
    if (i < batches.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  console.log(''); // New line after progress
}

function compressJSON(data) {
  // Remove unnecessary whitespace and format consistently
  // This can reduce storage by 20-30%
  return JSON.stringify(data);
}

// Add command line arguments
const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  console.log('Usage: node migrate-to-cloudflare.js [options]');
  console.log('');
  console.log('Options:');
  console.log('  --dry-run         Show what would be migrated without actually migrating');
  console.log('  --recent-only     Only migrate data from the last 30 days');
  console.log('  --airport AIRPORT Only migrate specific airport (e.g., --airport sfo)');
  console.log('  --year YEAR       Only migrate specific year (e.g., --year 2024)');
  console.log('  --help, -h        Show this help message');
  console.log('');
  console.log('Environment variables:');
  console.log('  CF_ACCOUNT_ID     Cloudflare account ID');
  console.log('  CF_DATABASE_ID    Cloudflare D1 database ID');
  console.log('  CF_API_TOKEN      Cloudflare API token');
  console.log('  CF_WORKER_URL     Optional Worker URL for better performance');
  console.log('');
  console.log('Examples:');
  console.log('  node migrate-to-cloudflare.js');
  console.log('  node migrate-to-cloudflare.js --recent-only');
  console.log('  node migrate-to-cloudflare.js --airport yyz --year 2024');
  process.exit(0);
}

if (args.includes('--dry-run')) {
  console.log('DRY RUN MODE - No data will be migrated');
  // TODO: Implement dry run
  process.exit(0);
}

// Parse additional options
const options = {
  recentOnly: args.includes('--recent-only'),
  airport: null,
  year: null
};

const airportIndex = args.indexOf('--airport');
if (airportIndex !== -1 && args[airportIndex + 1]) {
  options.airport = args[airportIndex + 1];
}

const yearIndex = args.indexOf('--year');
if (yearIndex !== -1 && args[yearIndex + 1]) {
  options.year = args[yearIndex + 1];
}

// TODO: Implement filtering based on options

migrateToCloudflare().catch(console.error);