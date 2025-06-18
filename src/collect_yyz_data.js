const { saveData } = require('./utils');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

/**
 * Collects flight data from Toronto Pearson International Airport (YYZ)
 * Fetches both departure and arrival data for the previous day
 * @param {boolean} isTest - Whether to run in test mode
 * @returns {Promise<void>}
 */
async function collectYYZData(isTest = false) {
  // Get today's date
  const today = new Date();
  const date = today.toISOString().split('T')[0];

  const depUrl = `https://www.torontopearson.com/api/flightsapidata/getflightlist?type=DEP&day=today&useScheduleTimeOnly=false`;
  const arrUrl = `https://www.torontopearson.com/api/flightsapidata/getflightlist?type=ARR&day=today&useScheduleTimeOnly=false`;
  
  try {
    // Use curl directly for departure data with proper headers to avoid bot detection
    const depCurlCmd = `curl -s -L -H "Referer: https://www.torontopearson.com/en/departures" -H "Accept: application/json" -H "User-Agent: Mozilla/5.0 (compatible; DataCollector/1.0)" "${depUrl}"`;
    const { stdout: depStdout } = await execAsync(depCurlCmd);
    console.log('Departure response raw data:', depStdout.substring(0, 200) + '...');
    console.log('Departure response length:', depStdout.length);
    
    if (!depStdout || depStdout.trim().length === 0) {
      throw new Error('Empty response received for departure data');
    }
    
    if (depStdout.trim().startsWith('<')) {
      console.error('YYZ API returned HTML instead of JSON - API may be blocked or changed');
      console.error('Departure response preview:', depStdout.substring(0, 500));
      throw new Error('YYZ API is currently unavailable or blocking requests');
    }
    
    const depData = JSON.parse(depStdout);
    console.log('=== YYZ DEPARTURE DATA DEBUG ===');
    console.log('Number of flights:', depData.list ? depData.list.length : 'No list property');
    console.log('Data structure keys:', Object.keys(depData));
    console.log('Sample flight (first 3):', JSON.stringify(depData.list ? depData.list.slice(0, 3) : depData, null, 2));
    console.log('=== END DEBUG ===');
    
    await saveData(depData, `yyz/yyz_departures_${date}.json`, isTest);
    console.log(`YYZ departure data collected and saved successfully for ${date}`);

    // Use curl directly for arrival data with additional headers to avoid redirects
    const arrCurlCmd = `curl -s -L -H "Referer: https://www.torontopearson.com/en/arrivals" -H "Accept: application/json" -H "User-Agent: Mozilla/5.0 (compatible; DataCollector/1.0)" "${arrUrl}"`;
    const { stdout: arrStdout } = await execAsync(arrCurlCmd);
    console.log('Arrival response raw data:', arrStdout.substring(0, 200) + '...');
    console.log('Arrival response length:', arrStdout.length);
    
    if (!arrStdout || arrStdout.trim().length === 0) {
      throw new Error('Empty response received for arrival data');
    }
    
    if (arrStdout.trim().startsWith('<')) {
      console.warn('Arrival data API returned HTML - possibly blocked or changed. Skipping arrival data collection.');
      console.log('Arrival response preview:', arrStdout.substring(0, 500));
      console.log('YYZ departure data collected successfully, but arrival data unavailable');
      return;
    }
    
    const arrData = JSON.parse(arrStdout);
    console.log('=== YYZ ARRIVAL DATA DEBUG ===');
    console.log('Number of flights:', arrData.list ? arrData.list.length : 'No list property');
    console.log('Data structure keys:', Object.keys(arrData));
    console.log('Sample flight (first 3):', JSON.stringify(arrData.list ? arrData.list.slice(0, 3) : arrData, null, 2));
    console.log('=== END DEBUG ===');
    
    await saveData(arrData, `yyz/yyz_arrivals_${date}.json`, isTest);
    console.log(`YYZ arrival data collected and saved successfully for ${date}`);
  } catch (error) {
    console.error('Error collecting YYZ data:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  collectYYZData(process.argv.includes('--test'));
}

module.exports = { collectYYZData };
