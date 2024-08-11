const { fetchYYZDepartureData } = require('./endpoints/yyz_dep_data');
const { fetchYYZArrivalData } = require('./endpoints/yyz_arr_data');
const { fetchSFOData } = require('./endpoints/sfo_data');

// Environment variables
const IS_TEST_MODE = typeof TEST_MODE !== 'undefined' ? TEST_MODE === 'true' : false;
const TEST_SCHEDULE = '*/5 * * * *'; // Every 5 minutes
const PROD_SCHEDULE = '0 14 * * *';  // Every day at 14:00 UTC

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

addEventListener('scheduled', event => {
  event.waitUntil(handleScheduled(event.scheduledTime, event.cron));
});

async function handleRequest(request) {
  const url = new URL(request.url);
  if (url.pathname === '/trigger-test') {
    await handleScheduled(new Date(), TEST_SCHEDULE);
    return new Response('Test schedule triggered', { status: 200 });
  }
  return new Response('Not Found', { status: 404 });
}

async function handleScheduled(scheduledTime, cron) {
  const isTestRun = IS_TEST_MODE || cron === TEST_SCHEDULE;
  const date = new Date(scheduledTime).toISOString().split('T')[0];

  console.log(`Starting ${isTestRun ? 'test' : 'production'} task for date: ${date}`);

  try {
    const results = await Promise.all([
      fetchSFOData(date, isTestRun),
      fetchYYZDepartureData(date, isTestRun),
      fetchYYZArrivalData(date, isTestRun)
    ]);

    console.log('All data successfully fetched and processed');
    return new Response(JSON.stringify(results), { status: 200 });
  } catch (error) {
    console.error('Error in scheduled task:', error.message);
    return new Response(`Error: ${error.message}`, { status: 500 });
  }
}

module.exports = { handleScheduled, handleRequest };