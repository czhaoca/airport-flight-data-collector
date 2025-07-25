const { saveData } = require('./utils');
const fetch = require('node-fetch');
const https = require('https');

// Create custom HTTPS agent with TLS options
const httpsAgent = new https.Agent({
  rejectUnauthorized: true,
  minVersion: 'TLSv1.2',
  maxVersion: 'TLSv1.3'
});

/**
 * Collects flight data from Toronto Pearson International Airport (YYZ) using node-fetch
 * This approach uses better headers and session management to avoid bot detection
 * @param {boolean} isTest - Whether to run in test mode
 * @returns {Promise<void>}
 */
async function collectYYZDataFetch(isTest = false) {
  const today = new Date();
  const date = today.toISOString().split('T')[0];
  
  // Generate random session ID
  const sessionId = Math.random().toString(36).substring(2, 15);
  
  const baseHeaders = {
    'Host': 'www.torontopearson.com',
    'Connection': 'keep-alive',
    'Cache-Control': 'no-cache',
    'sec-ch-ua': '"Chromium";v="126", "Google Chrome";v="126", "Not)A;Brand";v="99"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Windows"',
    'Upgrade-Insecure-Requests': '1',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Sec-Fetch-Site': 'same-origin',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-User': '?1',
    'Sec-Fetch-Dest': 'empty',
    'Accept-Encoding': 'gzip, deflate, br',
    'Accept-Language': 'en-US,en;q=0.9',
    'X-Requested-With': 'XMLHttpRequest',
    'DNT': '1',
    'Cookie': `_ga=GA1.2.${sessionId}.${Date.now()}; _gid=GA1.2.${Math.random().toString(36).substring(2, 15)}.${Date.now()}`
  };
  
  try {
    // First, make a request to the main page to establish session
    console.log('Establishing session with YYZ website...');
    const mainPageResponse = await fetch('https://www.torontopearson.com/en/departures', {
      method: 'GET',
      headers: {
        ...baseHeaders,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate'
      },
      agent: httpsAgent,
      compress: true,
      follow: 20,
      timeout: 30000
    });
    
    // Extract any cookies from the response
    const cookies = mainPageResponse.headers.raw()['set-cookie'] || [];
    const cookieString = cookies.map(cookie => cookie.split(';')[0]).join('; ');
    
    console.log('Session established, waiting before API call...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Collect departure data
    console.log('Fetching departure data...');
    const depUrl = 'https://www.torontopearson.com/api/flightsapidata/getflightlist?type=DEP&day=today&useScheduleTimeOnly=false';
    
    const depResponse = await fetch(depUrl, {
      method: 'GET',
      headers: {
        ...baseHeaders,
        'Referer': 'https://www.torontopearson.com/en/departures',
        'Cookie': cookieString || baseHeaders.Cookie
      },
      agent: httpsAgent,
      compress: true,
      timeout: 30000
    });
    
    const depContentType = depResponse.headers.get('content-type');
    console.log('Departure response status:', depResponse.status);
    console.log('Departure response content-type:', depContentType);
    
    if (!depContentType || !depContentType.includes('application/json')) {
      const responseText = await depResponse.text();
      console.log('Non-JSON response received for departures');
      console.log('Response preview:', responseText.substring(0, 500));
      
      if (responseText.includes('Captcha') || responseText.includes('captcha')) {
        console.log('Bot protection detected. The API is currently blocking automated requests.');
        console.log('Consider using the browser-based collector or waiting for the protection to lift.');
        return;
      }
    }
    
    const depData = await depResponse.json();
    
    if (depData && depData.list) {
      console.log(`Departure data collected: ${depData.list.length} flights`);
      await saveData(depData, `yyz/yyz_departures_${date}.json`, isTest);
      console.log(`YYZ departure data saved successfully for ${date}`);
    } else {
      console.log('Invalid departure data structure received');
      return;
    }
    
    // Wait before fetching arrivals
    console.log('Waiting 15 seconds before fetching arrival data...');
    await new Promise(resolve => setTimeout(resolve, 15000));
    
    // Collect arrival data
    console.log('Fetching arrival data...');
    const arrUrl = 'https://www.torontopearson.com/api/flightsapidata/getflightlist?type=ARR&day=today&useScheduleTimeOnly=false';
    
    const arrResponse = await fetch(arrUrl, {
      method: 'GET',
      headers: {
        ...baseHeaders,
        'Referer': 'https://www.torontopearson.com/en/arrivals',
        'Cookie': cookieString || baseHeaders.Cookie
      },
      agent: httpsAgent,
      compress: true,
      timeout: 30000
    });
    
    const arrContentType = arrResponse.headers.get('content-type');
    console.log('Arrival response status:', arrResponse.status);
    console.log('Arrival response content-type:', arrContentType);
    
    if (!arrContentType || !arrContentType.includes('application/json')) {
      const responseText = await arrResponse.text();
      console.log('Non-JSON response received for arrivals');
      console.log('Response preview:', responseText.substring(0, 500));
      console.log('Departure data was collected successfully, but arrival data is unavailable');
      return;
    }
    
    const arrData = await arrResponse.json();
    
    if (arrData && arrData.list) {
      console.log(`Arrival data collected: ${arrData.list.length} flights`);
      await saveData(arrData, `yyz/yyz_arrivals_${date}.json`, isTest);
      console.log(`YYZ arrival data saved successfully for ${date}`);
    } else {
      console.log('Invalid arrival data structure received');
    }
    
  } catch (error) {
    console.error('Error collecting YYZ data:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  collectYYZDataFetch(process.argv.includes('--test'));
}

module.exports = { collectYYZDataFetch };