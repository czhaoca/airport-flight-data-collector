require('dotenv').config();
const { fetchYYZDepartureData } = require('../endpoints/yyz_dep_data');
const { fetchYYZArrivalData } = require('../endpoints/yyz_arr_data');
const { fetchSFOData } = require('../endpoints/sfo_data');

// Mock global variables that would be set by Cloudflare Workers
global.GITHUB_USERNAME = process.env.GITHUB_USERNAME;
global.GITHUB_REPO = process.env.GITHUB_REPO;
global.GITHUB_TOKEN = process.env.GITHUB_TOKEN;
global.IS_TEST_ENVIRONMENT = true;
global.MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE) || 100 * 1024 * 1024; // Default to 100MB if not set

async function runTests() {
  const date = new Date().toISOString().split('T')[0];
  const isTestRun = true;
  const timestamp = `-test-${Date.now()}`;
  
  try {
    console.log('Testing YYZ Departure Data...');
    await fetchYYZDepartureData(date, isTestRun, timestamp);
    
    console.log('Testing YYZ Arrival Data...');
    await fetchYYZArrivalData(date, isTestRun, timestamp);
    
    console.log('Testing SFO Data...');
    await fetchSFOData(date, isTestRun, timestamp);
    
    console.log('All tests passed successfully!');
  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  }
}

runTests();