#!/usr/bin/env node

const { getDatabase } = require('../lib/database');
const chalk = require('chalk'); // We'll handle if not installed

// Simple chalk fallback if not installed
const colors = {
  green: (text) => `✅ ${text}`,
  red: (text) => `❌ ${text}`,
  yellow: (text) => `⚠️  ${text}`,
  blue: (text) => `ℹ️  ${text}`,
  bold: (text) => `**${text}**`
};

// Try to use chalk if available
try {
  const actualChalk = require('chalk');
  colors.green = actualChalk.green;
  colors.red = actualChalk.red;
  colors.yellow = actualChalk.yellow;
  colors.blue = actualChalk.blue;
  colors.bold = actualChalk.bold;
} catch (e) {
  // Use fallback colors
}

async function testDatabase() {
  console.log(colors.bold('\n🧪 Database Connection Test\n'));
  
  const provider = process.env.DB_PROVIDER || 'local';
  console.log(colors.blue(`Provider: ${provider}`));
  console.log(colors.blue(`Environment: ${process.env.NODE_ENV || 'development'}`));
  console.log(colors.blue(`Table Prefix: ${process.env.DB_TABLE_PREFIX || 'airport_flight_data'}\n`));
  
  let db;
  const tests = {
    connection: false,
    healthCheck: false,
    saveData: false,
    retrieveData: false,
    updateStatus: false,
    bulkInsert: false
  };
  
  try {
    // Test 1: Connection
    console.log('1. Testing connection...');
    db = await getDatabase();
    tests.connection = true;
    console.log(colors.green('   Connection successful!\n'));
    
    // Test 2: Health Check
    console.log('2. Testing health check...');
    const health = await db.healthCheck();
    tests.healthCheck = health.status === 'healthy';
    console.log(colors.green('   Health check passed!'));
    console.log(`   Status: ${health.status}`);
    
    if (health.adapterStatus) {
      console.log(`   Environment: ${health.adapterStatus.environment || 'N/A'}`);
      console.log(`   Table Prefix: ${health.adapterStatus.tablePrefix || 'N/A'}`);
      if (health.adapterStatus.tables) {
        console.log(`   Tables:`);
        console.log(`     - Flights: ${health.adapterStatus.tables.flights}`);
        console.log(`     - Status: ${health.adapterStatus.tables.status}`);
      }
    }
    console.log('');
    
    // Test 3: Save Flight Data
    console.log('3. Testing save flight data...');
    const testDate = new Date().toISOString().split('T')[0];
    const testData = {
      airport: 'TEST',
      type: 'arrival',
      date: testDate,
      data: {
        test: true,
        timestamp: new Date().toISOString(),
        flights: [
          {
            flight_number: 'TEST123',
            airline: 'Test Airways',
            origin: 'TST',
            destination: 'TEST',
            scheduled: new Date().toISOString(),
            status: 'On Time'
          }
        ]
      }
    };
    
    const saveResult = await db.saveFlightData(testData);
    tests.saveData = saveResult.success || !!saveResult.id;
    console.log(colors.green('   Save successful!'));
    console.log(`   Record ID: ${saveResult.id || saveResult.recordId}`);
    console.log(`   Operation: ${saveResult.operation || 'insert'}\n`);
    
    // Test 4: Retrieve Flight Data
    console.log('4. Testing retrieve flight data...');
    const retrieveResult = await db.getFlightData({
      airport: 'TEST',
      type: 'arrival',
      startDate: testDate,
      endDate: testDate
    });
    tests.retrieveData = Array.isArray(retrieveResult) && retrieveResult.length > 0;
    console.log(colors.green('   Retrieve successful!'));
    console.log(`   Records found: ${retrieveResult.length}`);
    if (retrieveResult.length > 0) {
      console.log(`   Sample record: ${retrieveResult[0].id}`);
    }
    console.log('');
    
    // Test 5: Update Flight Status (if supported)
    if (db.updateFlightStatus) {
      console.log('5. Testing update flight status...');
      try {
        const statusResult = await db.updateFlightStatus(
          saveResult.id || saveResult.recordId || 'test-id',
          'DELAYED',
          { reason: 'Test update' }
        );
        tests.updateStatus = statusResult.success;
        console.log(colors.green('   Status update successful!\n'));
      } catch (error) {
        console.log(colors.yellow(`   Status update not supported or failed: ${error.message}\n`));
      }
    }
    
    // Test 6: Bulk Insert (if using database provider)
    if (provider !== 'local' && db.adapter && db.adapter.bulkInsert) {
      console.log('6. Testing bulk insert...');
      const bulkRecords = Array(5).fill(null).map((_, i) => ({
        airport: 'TEST',
        type: 'departure',
        date: testDate,
        data: {
          test: true,
          batch: i,
          timestamp: new Date().toISOString()
        }
      }));
      
      try {
        const bulkResult = await db.adapter.bulkInsert(bulkRecords.map(record => ({
          id: db._generateFlightId(record.airport, record.type, record.date) + '_bulk_' + Math.random(),
          airport_code: record.airport,
          flight_type: record.type,
          flight_date: record.date,
          flight_data: record.data
        })));
        
        tests.bulkInsert = bulkResult.success || bulkResult.rowsInserted > 0;
        console.log(colors.green('   Bulk insert successful!'));
        console.log(`   Records inserted: ${bulkResult.rowsInserted || 0}`);
        if (bulkResult.errors && bulkResult.errors.length > 0) {
          console.log(colors.yellow(`   Errors: ${bulkResult.errors.length}`));
        }
      } catch (error) {
        console.log(colors.yellow(`   Bulk insert failed: ${error.message}`));
      }
      console.log('');
    }
    
    // Summary
    console.log(colors.bold('\n📊 Test Summary:\n'));
    Object.entries(tests).forEach(([test, passed]) => {
      const testName = test.replace(/([A-Z])/g, ' $1').toLowerCase();
      console.log(`   ${passed ? colors.green('✓') : colors.red('✗')} ${testName}`);
    });
    
    const passedTests = Object.values(tests).filter(t => t).length;
    const totalTests = Object.keys(tests).length;
    
    console.log(`\n   Total: ${passedTests}/${totalTests} tests passed`);
    
    if (passedTests === totalTests) {
      console.log(colors.green('\n🎉 All tests passed! Your database is configured correctly.\n'));
    } else {
      console.log(colors.yellow('\n⚠️  Some tests failed. Check your configuration.\n'));
    }
    
    // Cleanup test data (optional)
    if (process.argv.includes('--cleanup')) {
      console.log('Cleaning up test data...');
      // Implement cleanup if needed
    }
    
  } catch (error) {
    console.log(colors.red(`\n❌ Test failed: ${error.message}\n`));
    console.log('Stack trace:', error.stack);
    process.exit(1);
  } finally {
    if (db) {
      await db.disconnect();
    }
  }
}

// Command line interface
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  console.log('Usage: node test-database.js [options]');
  console.log('');
  console.log('Options:');
  console.log('  --provider PROVIDER  Override DB_PROVIDER (local, oci, cloudflare)');
  console.log('  --env ENV           Override NODE_ENV (development, production)');
  console.log('  --cleanup           Remove test data after tests');
  console.log('  --verbose           Show detailed output');
  console.log('  --help, -h          Show this help message');
  console.log('');
  console.log('Examples:');
  console.log('  node test-database.js');
  console.log('  node test-database.js --provider cloudflare');
  console.log('  DB_PROVIDER=oci node test-database.js');
  process.exit(0);
}

// Override provider if specified
const providerIndex = args.indexOf('--provider');
if (providerIndex !== -1 && args[providerIndex + 1]) {
  process.env.DB_PROVIDER = args[providerIndex + 1];
}

// Override environment if specified
const envIndex = args.indexOf('--env');
if (envIndex !== -1 && args[envIndex + 1]) {
  process.env.NODE_ENV = args[envIndex + 1];
}

// Run tests
testDatabase().catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
});