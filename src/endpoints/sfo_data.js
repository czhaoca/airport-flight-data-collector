const { fetchAndUpload } = require('../utils/fetch_and_upload');

async function fetchSFOData(date) {
  const url = `https://www.flysfo.com/flysfo/api/flight-status?date=${date}`;
  return fetchAndUpload(url, date, 'sfo_flight_status');
}

module.exports = { fetchSFOData };