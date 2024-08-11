const { fetchAndUpload } = require('../utils/fetch_and_upload');
const { truncateData } = require('../utils/data_truncator');
const { pushToGitHub } = require('../utils/github_push');

async function fetchYYZDepartureData(date, isTestRun = fals, timestamp = '') {
  console.log(`Fetching YYZ Departure Data. isTestRun: ${isTestRun}`);
  const url = `https://gtaa-fl-prod.azureedge.net/api/flights/list?type=DEP&day=today&useScheduleTimeOnly=false`;
  let data = await fetchAndUpload(url, date, 'yyz_flight_status_dep', isTestRun, timestamp);
  
  // Check if data needs to be truncated
  if (JSON.stringify(data).length > 100 * 1024 * 1024) {
    console.warn('YYZ departure data exceeds size limit. Truncating...');
    const batchCount = truncateData(data, 'yyz_flight_status_dep', date, 
      (batchData, batchDate, batchFileName) => pushToGitHub(batchData, batchDate, batchFileName, isTestRun, timestamp));
    return { message: `Data truncated into ${batchCount} batches.` };
  }
  
  return data;
}

module.exports = { fetchYYZDepartureData };