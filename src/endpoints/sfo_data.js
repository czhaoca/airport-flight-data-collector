const { fetchAndUpload } = require('../utils/fetch_and_upload');
const { truncateData } = require('../utils/data_truncator');
const { pushToGitHub } = require('../utils/github_push');

async function fetchSFOData(date, isTestRun = false, timestamp = '') {
  const url = `https://www.flysfo.com/flysfo/api/flight-status?date=${date}`;
  let data = await fetchAndUpload(url, date, 'sfo_flight_status', isTestRun, timestamp);
  
  // Check if data needs to be truncated
  if (JSON.stringify(data).length > 100 * 1024 * 1024) {
    console.warn('SFO data exceeds size limit. Truncating...');
    const batchCount = truncateData(data, 'sfo_flight_status', date, 
      (batchData, batchDate, batchFileName) => pushToGitHub(batchData, batchDate, batchFileName, isTestRun, timestamp));
    return { message: `Data truncated into ${batchCount} batches.` };
  }
  
  return data;
}

module.exports = { fetchSFOData };