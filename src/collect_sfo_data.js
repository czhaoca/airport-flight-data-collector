const { fetchData, saveData } = require('./utils');

async function collectSFOData(isTest = false) {
  // Get yesterday's date
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const date = yesterday.toISOString().split('T')[0];

  const url = `https://www.flysfo.com/flysfo/api/flight-status`;
  
  try {
    const data = await fetchData(url);
    await saveData(data, `data/sfo/sfo_flights_${date}.json`, isTest);
    console.log(`SFO data collected and saved successfully for ${date}`);
  } catch (error) {
    console.error('Error collecting SFO data:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  collectSFOData(process.argv.includes('--test'));
}

module.exports = { collectSFOData };