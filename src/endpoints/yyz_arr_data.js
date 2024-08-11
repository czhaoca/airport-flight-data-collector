const { fetchAndUpload } = require('../utils/fetch_and_upload');
const { truncateData } = require('../utils/data_truncator');
const { pushToGitHub } = require('../utils/github_push');

async function fetchYYZArrivalData(date, isTestRun = false) {
  const url = `https://gtaa-fl-prod.azureedge.net/api/flights/list?type=ARR&day=today&useScheduleTimeOnly=false`;

  let data = await fetchAndUpload(url, date, 'yyz_flight_status_arr', isTestRun);
  
  // Check if data needs to be truncated
  if (JSON.stringify(data).length > 100 * 1024 * 1024) {
    console.warn('YYZ arrival data exceeds size limit. Truncating...');
    const batchCount = truncateData(data.flights, 'yyz_flight_status_arr', date, 
      (batchData, batchDate, batchFileName) => pushToGitHub(batchData, batchDate, batchFileName, isTestRun));
    return { message: `Data truncated into ${batchCount} batches.` };
  }
  
  return data;
}

module.exports = { fetchYYZArrivalData };