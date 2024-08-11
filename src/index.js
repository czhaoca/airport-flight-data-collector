const { fetchYYZDepartureData } = require('./endpoints/yyz_dep_data');
const { fetchYYZArrivalData } = require('./endpoints/yyz_arr_data');
const { fetchSFOData } = require('./endpoints/sfo_data');

// Ensure IS_TEST_ENVIRONMENT is set to false for production
if (typeof IS_TEST_ENVIRONMENT === 'undefined') {
  global.IS_TEST_ENVIRONMENT = false;
}

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

addEventListener('scheduled', event => {
  event.waitUntil(handleScheduled(event.scheduledTime));
});

async function handleRequest(request) {
  return new Response('Not Found', { status: 404 });
}

async function handleScheduled(scheduledTime) {
  const date = new Date(scheduledTime).toISOString().split('T')[0];

  try {
    console.log(`Starting scheduled task for date: ${date}`);
    await fetchSFOData(date);
    await fetchYYZDepartureData(date);
    await fetchYYZArrivalData(date);
    console.log('All data successfully fetched and pushed to GitHub');
  } catch (error) {
    console.error('Error in scheduled task:', error.message);
    console.error('Error stack:', error.stack);
  }
}