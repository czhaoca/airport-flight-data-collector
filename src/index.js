addEventListener('scheduled', event => {
  event.waitUntil(handleScheduled(event.scheduledTime));
});

async function handleScheduled(scheduledTime) {
  const yesterday = new Date(scheduledTime - 24 * 60 * 60 * 1000);
  const date = yesterday.toISOString().split('T')[0];

  try {
    // SFO Airport
    await get_api_json_data('sfo_flight_status', `https://www.flysfo.com/flysfo/api/flight-status?date=${date}`);

    // Toronto Airport - Departures
    await get_api_json_data('yyz_flight_status_dep', `https://gtaa-fl-prod.azureedge.net/api/flights/list?type=DEP&day=yesterday&useScheduleTimeOnly=false`);

    // Toronto Airport - Arrivals
    await get_api_json_data('yyz_flight_status_arr', `https://gtaa-fl-prod.azureedge.net/api/flights/list?type=ARR&day=yesterday&useScheduleTimeOnly=false`);

    console.log('All data successfully fetched and pushed to GitHub');
  } catch (error) {
    console.error('Error:', error);
  }
}

async function get_api_json_data(folderName, url) {
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    // Get yesterday's date
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const date = yesterday.toISOString().split('T')[0];
    
    // Push to GitHub
    await pushToGitHub(data, date, folderName);
    
    console.log(`Data successfully fetched and pushed to GitHub for ${folderName}`);
  } catch (error) {
    console.error(`Error in get_api_json_data for ${folderName}:`, error);
  }
}

async function pushToGitHub(data, date, folderName) {
  const owner = GITHUB_USERNAME;
  const repo = GITHUB_REPO;
  const token = GITHUB_TOKEN;
  const path = `data/${folderName}/${date}.json`;
  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
  
  const content = btoa(JSON.stringify(data, null, 2));
  
  const payload = {
    message: `Add ${folderName} data for ${date}`,
    content: content,
    branch: 'main'
  };

  const response = await fetch(apiUrl, {
    method: 'PUT',
    headers: {
      'Authorization': `token ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.statusText}`);
  }
}

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  if (request.method === 'POST' && new URL(request.url).pathname === '/test') {
    const authHeader = request.headers.get('Authorization');
    if (authHeader !== `Bearer ${TEST_AUTH_TOKEN}`) {
      return new Response('Unauthorized', { status: 401 });
    }
    return handleTestRun();
  }
  return new Response('Not Found', { status: 404 });
}

async function handleTestRun() {
  const today = new Date();
  const date = today.toISOString().split('T')[0];

  try {
    // Test with SFO Airport data
    await get_api_json_data(`test/sfo_flight_status`, `https://www.flysfo.com/flysfo/api/flight-status?date=${date}`);
    return new Response('Test run completed successfully', { status: 200 });
  } catch (error) {
    console.error('Error during test run:', error);
    return new Response(`Test run failed: ${error.message}`, { status: 500 });
  }
}