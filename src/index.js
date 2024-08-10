// Event listener for HTTP requests
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

// Event listener for scheduled events
addEventListener('scheduled', event => {
  event.waitUntil(handleScheduled(event.scheduledTime));
});

async function handleRequest(request) {
  const url = new URL(request.url);

  if (request.method === 'POST' && url.pathname === '/test') {
    return handleTestRequest(request);
  }

  if (url.pathname === '/trigger-scheduled-task') {
    await handleScheduled(new Date());
    return new Response("Scheduled task triggered", { status: 200 });
  }

  return new Response('Not Found', { status: 404 });
}

async function handleTestRequest(request) {
  const authHeader = request.headers.get('Authorization');
  if (authHeader !== `Bearer ${TEST_AUTH_TOKEN}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  return new Response(JSON.stringify({
    message: 'Test endpoint reached successfully',
    timestamp: new Date().toISOString()
  }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    }
  });
}

async function handleScheduled(scheduledTime) {
  const date = new Date(scheduledTime).toISOString().split('T')[0];

  try {
    console.log(`Starting scheduled task for date: ${date}`);

    // SFO Airport
    console.log('Fetching SFO data...');
    const sfoData = await fetchAPIData(`https://www.flysfo.com/flysfo/api/flight-status?date=${date}`);
    console.log('Pushing SFO data to GitHub...');
    await pushToGitHub(sfoData, date, 'sfo_flight_status');

    // Toronto Airport - Departures
    console.log('Fetching YYZ departure data...');
    const yyzDepData = await fetchAPIData(`https://gtaa-fl-prod.azureedge.net/api/flights/list?type=DEP&day=today&useScheduleTimeOnly=false`);
    console.log('Pushing YYZ departure data to GitHub...');
    await pushToGitHub(yyzDepData, date, 'yyz_flight_status_dep');

    // Toronto Airport - Arrivals
    console.log('Fetching YYZ arrival data...');
    const yyzArrData = await fetchAPIData(`https://gtaa-fl-prod.azureedge.net/api/flights/list?type=ARR&day=today&useScheduleTimeOnly=false`);
    console.log('Pushing YYZ arrival data to GitHub...');
    await pushToGitHub(yyzArrData, date, 'yyz_flight_status_arr');

    console.log('All data successfully fetched and pushed to GitHub');
  } catch (error) {
    console.error('Error in scheduled task:', error.message);
    console.error('Error stack:', error.stack);
  }
}

async function fetchAPIData(url) {
  console.log(`Fetching data from: ${url}`);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`API responded with status: ${response.status}, ${response.statusText}`);
  }
  const data = await response.json();
  console.log(`Successfully fetched data from: ${url}`);
  return data;
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

  try {
    const response = await fetch(apiUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${token}`,
        'Content-Type': 'application/json',
        'User-Agent': `CloudflareWorker-${owner}`,
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`GitHub API error: ${response.status} ${response.statusText}\n${errorText}`);
    }

    console.log(`Successfully pushed data to GitHub: ${path}`);
  } catch (error) {
    console.error('Error pushing to GitHub:', error);
    throw error;
  }
}