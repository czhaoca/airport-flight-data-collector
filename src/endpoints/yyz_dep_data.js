const { fetchAndUpload } = require('../utils/fetch_and_upload');

async function fetchYYZDepartureData(date) {
  const url = `https://gtaa-fl-prod.azureedge.net/api/flights/list?type=DEP&day=today&useScheduleTimeOnly=false`;
  return fetchAndUpload(url, date, 'yyz_flight_status_dep');
}

module.exports = { fetchYYZDepartureData };