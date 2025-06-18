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
    // Use curl directly for departure data
    const depCurlCmd = `curl -s -H "Referer: https://www.torontopearson.com/en/departures" -H "Accept: application/json" "${depUrl}"`;
    const { stdout: depStdout } = await execAsync(depCurlCmd);
    console.log('Departure response raw data:', depStdout.substring(0, 200) + '...');
    console.log('Departure response length:', depStdout.length);
    
    if (!depStdout || depStdout.trim().length === 0) {
      throw new Error('Empty response received for departure data');
    }
    
    if (depStdout.trim().startsWith('<')) {
      throw new Error('Received HTML instead of JSON for departure data. Response: ' + depStdout.substring(0, 500));
    }
    
    const depData = JSON.parse(depStdout);
    await saveData(depData, `yyz/yyz_departures_${date}.json`, isTest);
    console.log(`YYZ departure data collected and saved successfully for ${date}`);

    // Use curl directly for arrival data
    const arrCurlCmd = `curl -s -H "Referer: https://www.torontopearson.com/en/arrivals" -H "Accept: application/json" "${arrUrl}"`;
    const { stdout: arrStdout } = await execAsync(arrCurlCmd);
    console.log('Arrival response raw data:', arrStdout.substring(0, 200) + '...');
    console.log('Arrival response length:', arrStdout.length);
    
    if (!arrStdout || arrStdout.trim().length === 0) {
      throw new Error('Empty response received for arrival data');
    }
    
    if (arrStdout.trim().startsWith('<')) {
      throw new Error('Received HTML instead of JSON for arrival data. Response: ' + arrStdout.substring(0, 500));
    }
    
    const arrData = JSON.parse(arrStdout);
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
