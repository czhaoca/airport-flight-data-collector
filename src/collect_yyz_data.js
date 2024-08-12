const { fetchData, saveData } = require('./utils');

async function collectYYZData(isTest = false) {
  // Get yesterday's date
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const date = yesterday.toISOString().split('T')[0];

  const depUrl = `https://gtaa-fl-prod.azureedge.net/api/flights/list?type=DEP&day=yesterday&useScheduleTimeOnly=false`;
  const arrUrl = `https://gtaa-fl-prod.azureedge.net/api/flights/list?type=ARR&day=yesterday&useScheduleTimeOnly=false`;
  
  try {
    // Collect departure data
    const depData = await fetchData(depUrl);
    await saveData(depData, `yyz/departures_${date}.json`, isTest);
    console.log(`YYZ departure data collected and saved successfully for ${date}`);

    // Collect arrival data
    const arrData = await fetchData(arrUrl);
    await saveData(arrData, `yyz/arrivals_${date}.json`, isTest);
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