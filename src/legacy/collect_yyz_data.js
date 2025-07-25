const { saveData } = require('./utils');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

/**
 * Collects flight data from Toronto Pearson International Airport (YYZ)
 * Fetches both departure and arrival data for the current day
 * Handles bot protection gracefully by trying multiple strategies
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
    // Updated to use latest Chrome version and additional headers
    const depCurlCmd = `curl -s -L -H "Host: www.torontopearson.com" -H "Connection: keep-alive" -H "Cache-Control: max-age=0" -H "sec-ch-ua: \\"Chromium\\";v=\\"126\\", \\"Google Chrome\\";v=\\"126\\", \\"Not)A;Brand\\";v=\\"99\\"" -H "sec-ch-ua-mobile: ?0" -H "sec-ch-ua-platform: \\"Windows\\"" -H "Upgrade-Insecure-Requests: 1" -H "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36" -H "Accept: application/json, text/plain, */*" -H "Sec-Fetch-Site: same-origin" -H "Sec-Fetch-Mode: cors" -H "Sec-Fetch-User: ?1" -H "Sec-Fetch-Dest: empty" -H "Referer: https://www.torontopearson.com/en/departures" -H "Accept-Encoding: gzip, deflate, br" -H "Accept-Language: en-US,en;q=0.9" -H "Cookie: _ga=GA1.2.123456789.1234567890; _gid=GA1.2.987654321.1234567890" --compressed "${depUrl}"`;
    const { stdout: depStdout } = await execAsync(depCurlCmd);
    console.log('Departure response raw data:', depStdout.substring(0, 200) + '...');
    console.log('Departure response length:', depStdout.length);
    
    if (!depStdout || depStdout.trim().length === 0) {
      throw new Error('Empty response received for departure data');
    }
    
    if (depStdout.trim().startsWith('<')) {
      console.warn('YYZ API returned HTML instead of JSON - API may be blocked or changed');
      console.warn('Departure response preview:', depStdout.substring(0, 500));
      console.log('YYZ API is currently unavailable or blocking requests. Skipping data collection for now.');
      console.log('This is expected when bot protection is active. The service will retry on the next scheduled run.');
      return;
    }
    
    const depData = JSON.parse(depStdout);
    console.log('=== YYZ DEPARTURE DATA DEBUG ===');
    console.log('Number of flights:', depData.list ? depData.list.length : 'No list property');
    console.log('Data structure keys:', Object.keys(depData));
    console.log('Sample flight (first 3):', JSON.stringify(depData.list ? depData.list.slice(0, 3) : depData, null, 2));
    console.log('=== END DEBUG ===');
    
    await saveData(depData, `yyz/yyz_departures_${date}.json`, isTest);
    console.log(`YYZ departure data collected and saved successfully for ${date}`);

    // Wait 15 seconds before making the second request to avoid triggering bot protection
    console.log('Waiting 15 seconds before requesting arrival data to avoid rate limiting...');
    await new Promise(resolve => setTimeout(resolve, 15000));

    // Try multiple strategies for arrival data collection
    let arrStdout = '';
    let attemptSuccessful = false;
    
    const strategies = [
      // Strategy 1: Latest Chrome with full headers
      `curl -s -L -H "Host: www.torontopearson.com" -H "Connection: keep-alive" -H "sec-ch-ua: \\"Chromium\\";v=\\"126\\", \\"Google Chrome\\";v=\\"126\\", \\"Not)A;Brand\\";v=\\"99\\"" -H "sec-ch-ua-mobile: ?0" -H "sec-ch-ua-platform: \\"Windows\\"" -H "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36" -H "Accept: application/json, text/plain, */*" -H "Sec-Fetch-Site: same-origin" -H "Sec-Fetch-Mode: cors" -H "Sec-Fetch-Dest: empty" -H "Referer: https://www.torontopearson.com/en/arrivals" -H "Accept-Language: en-US,en;q=0.9" --compressed "${arrUrl}"`,
      
      // Strategy 2: Edge browser headers
      `curl -s -L -H "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 Edg/126.0.0.0" -H "Accept: application/json, text/plain, */*" -H "Accept-Language: en-US,en;q=0.9" -H "Referer: https://www.torontopearson.com/en/arrivals" -H "Origin: https://www.torontopearson.com" -H "DNT: 1" --compressed "${arrUrl}"`,
      
      // Strategy 3: macOS Chrome
      `curl -s -L -H "User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36" -H "Accept: application/json, text/plain, */*" -H "Accept-Language: en-US,en;q=0.9" -H "Referer: https://www.torontopearson.com/en/arrivals" -H "sec-ch-ua: \\"Google Chrome\\";v=\\"126\\", \\"Chromium\\";v=\\"126\\", \\"Not=A?Brand\\";v=\\"24\\"" -H "sec-ch-ua-mobile: ?0" -H "sec-ch-ua-platform: \\"macOS\\"" --compressed "${arrUrl}"`
    ];
    
    for (let i = 0; i < strategies.length && !attemptSuccessful; i++) {
      console.log(`Trying arrival data collection strategy ${i + 1}/${strategies.length}...`);
      try {
        const { stdout } = await execAsync(strategies[i]);
        if (stdout && !stdout.trim().startsWith('<')) {
          arrStdout = stdout;
          attemptSuccessful = true;
          console.log(`Strategy ${i + 1} successful!`);
          break;
        } else {
          console.log(`Strategy ${i + 1} blocked, trying next...`);
          if (i < strategies.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds between attempts
          }
        }
      } catch (error) {
        console.log(`Strategy ${i + 1} failed with error, trying next...`);
        if (i < strategies.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
      }
    }
    
    if (!attemptSuccessful || !arrStdout || arrStdout.trim().length === 0) {
      console.warn('All arrival data collection strategies failed. Arrival API appears to be blocked.');
      console.log('YYZ departure data collected successfully, but arrival data unavailable');
      return;
    }
    
    console.log('Arrival response raw data:', arrStdout.substring(0, 200) + '...');
    console.log('Arrival response length:', arrStdout.length);
    
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
