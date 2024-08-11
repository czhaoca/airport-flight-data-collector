const { fetchYYZDepartureData } = require('../endpoints/yyz_dep_data');
const { fetchYYZArrivalData } = require('../endpoints/yyz_arr_data');
const { fetchSFOData } = require('../endpoints/sfo_data');

async function runTests() {
  const date = new Date().toISOString().split('T')[0];
  
  try {
    console.log('Testing YYZ Departure Data...');
    await fetchYYZDepartureData(date);
    
    console.log('Testing YYZ Arrival Data...');
    await fetchYYZArrivalData(date);
    
    console.log('Testing SFO Data...');
    await fetchSFOData(date);
    
    console.log('All tests passed successfully!');
  } catch (error) {
    console.error('Test failed:', error);
  }
}

module.exports = { runTests };