const { saveData } = require('./utils');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

/**
 * Collects flight data from Toronto Pearson International Airport (YYZ) with retry logic
 * Handles bot protection gracefully by retrying with exponential backoff
 * @param {boolean} isTest - Whether to run in test mode
 * @returns {Promise<void>}
 */
async function collectYYZDataWithRetry(isTest = false) {
  const today = new Date();
  const date = today.toISOString().split('T')[0];
  const maxRetries = 3;
  const baseDelay = 30000; // 30 seconds
  
  const depUrl = `https://www.torontopearson.com/api/flightsapidata/getflightlist?type=DEP&day=today&useScheduleTimeOnly=false`;
  const arrUrl = `https://www.torontopearson.com/api/flightsapidata/getflightlist?type=ARR&day=today&useScheduleTimeOnly=false`;
  
  // Helper function to execute curl with retry
  async function executeCurlWithRetry(url, type, referer) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Attempt ${attempt}/${maxRetries} for ${type} data...`);
        
        // Rotate user agents for each attempt
        const userAgents = [
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 Edg/126.0.0.0'
        ];
        
        const userAgent = userAgents[(attempt - 1) % userAgents.length];
        
        const curlCmd = `curl -s -L -H "User-Agent: ${userAgent}" -H "Accept: application/json, text/plain, */*" -H "Accept-Language: en-US,en;q=0.9" -H "Referer: ${referer}" -H "Origin: https://www.torontopearson.com" -H "DNT: 1" -H "Cache-Control: no-cache" -H "Pragma: no-cache" --compressed "${url}"`;
        
        const { stdout } = await execAsync(curlCmd);
        
        if (!stdout || stdout.trim().length === 0) {
          throw new Error('Empty response received');
        }
        
        if (stdout.trim().startsWith('<')) {
          if (stdout.includes('Captcha') || stdout.includes('captcha')) {
            console.log(`Captcha detected on attempt ${attempt}. ${attempt < maxRetries ? 'Retrying after delay...' : 'All attempts exhausted.'}`);
            if (attempt < maxRetries) {
              const delay = baseDelay * Math.pow(2, attempt - 1);
              console.log(`Waiting ${delay / 1000} seconds before retry...`);
              await new Promise(resolve => setTimeout(resolve, delay));
              continue;
            }
          }
          throw new Error('HTML response instead of JSON');
        }
        
        const data = JSON.parse(stdout);
        if (data && data.list) {
          console.log(`${type} data successfully collected: ${data.list.length} flights`);
          return data;
        }
        
        throw new Error('Invalid data structure');
        
      } catch (error) {
        console.error(`Attempt ${attempt} failed:`, error.message);
        if (attempt === maxRetries) {
          throw error;
        }
      }
    }
  }
  
  try {
    // Collect departure data
    console.log('Collecting YYZ departure data...');
    const depData = await executeCurlWithRetry(depUrl, 'Departure', 'https://www.torontopearson.com/en/departures');
    await saveData(depData, `yyz/yyz_departures_${date}.json`, isTest);
    console.log(`YYZ departure data saved successfully for ${date}`);
    
    // Wait before collecting arrival data
    console.log('Waiting 20 seconds before collecting arrival data...');
    await new Promise(resolve => setTimeout(resolve, 20000));
    
    // Collect arrival data
    console.log('Collecting YYZ arrival data...');
    const arrData = await executeCurlWithRetry(arrUrl, 'Arrival', 'https://www.torontopearson.com/en/arrivals');
    await saveData(arrData, `yyz/yyz_arrivals_${date}.json`, isTest);
    console.log(`YYZ arrival data saved successfully for ${date}`);
    
    console.log('YYZ data collection completed successfully!');
    
  } catch (error) {
    console.error('Error collecting YYZ data after all retries:', error.message);
    console.log('The YYZ API appears to be blocking automated requests persistently.');
    console.log('This may be due to enhanced bot protection. Manual intervention may be required.');
    process.exit(1);
  }
}

if (require.main === module) {
  collectYYZDataWithRetry(process.argv.includes('--test'));
}

module.exports = { collectYYZDataWithRetry };