const { fetchAndUpload } = require('../utils/fetch_and_upload');

async function fetchYYZArrivalData(date) {
  const url = `https://gtaa-fl-prod.azureedge.net/api/flights/list?type=ARR&day=today&useScheduleTimeOnly=false`;
  return fetchAndUpload(url, date, 'yyz_flight_status_arr');
}

module.exports = { fetchYYZArrivalData };