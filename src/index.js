let testAuthToken = null;
let testEnvironment = null;

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
    
    // Get GitHub token from environment variable
    const githubToken = GITHUB_TOKEN;
    
    // Get yesterday's date
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const date = yesterday.toISOString().split('T')[0];
    
    // Push to GitHub
    await pushToGitHub(data, date, githubToken, folderName);
    
    console.log(`Data successfully fetched and pushed to GitHub for ${folderName}`);
  } catch (error) {
    console.error(`Error in get_api_json_data for ${folderName}:`, error);
  }
}

async function pushToGitHub(data, date, token, folderName) {
  const owner = GITHUB_USERNAME;
  const repo = GITHUB_REPO;
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
  if (event.request.method === 'POST') {
    event.respondWith(handleTestRequest(event.request));
  } else if (event.request.method === 'GET' && new URL(event.request.url).pathname === '/generate-test-token') {
    event.respondWith(generateTestToken());
  } else {
    event.respondWith(new Response('Send a POST request to trigger a test run or GET /generate-test-token to start a test session', { status: 200 }));
  }
});

function generateTestToken() {
  if (testAuthToken) {
    return new Response('A test session is already in progress. Please wait for it to complete.', { status: 400 });
  }
  testAuthToken = crypto.randomUUID();
  testEnvironment = { testDataFolder: `test_${Date.now()}` };
  return new Response(JSON.stringify({ testAuthToken, expiresIn: '5 minutes' }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}

async function handleTestRequest(request) {
  if (!testAuthToken) {
    return new Response('No active test session. Please generate a test token first.', { status: 400 });
  }
  if (request.headers.get('X-Test-Auth') !== testAuthToken) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    await testRun();
    return new Response('Test run completed successfully', { status: 200 });
  } catch (error) {
    return new Response(`Test run failed: ${error.message}`, { status: 500 });
  } finally {
    await cleanupTestEnvironment();
  }
}

async function testRun() {
  const today = new Date();
  const date = today.toISOString().split('T')[0];

  try {
    // Test with SFO Airport data
    await get_api_json_data(`${testEnvironment.testDataFolder}/sfo_flight_status`, `https://www.flysfo.com/flysfo/api/flight-status?date=${date}`);
    console.log('Test run completed successfully');
  } catch (error) {
    console.error('Error during test run:', error);
    throw error;
  }
}

async function cleanupTestEnvironment() {
  try {
    // Delete test data from GitHub
    await deleteTestDataFromGitHub();
  } catch (error) {
    console.error('Error cleaning up test environment:', error);
  } finally {
    // Always clear the test token and environment, even if cleanup fails
    testAuthToken = null;
    testEnvironment = null;
  }
}

async function deleteTestDataFromGitHub() {
  // Implementation to delete the test folder from GitHub
  // This will depend on your GitHub API usage and authentication method
  // You may need to use the GitHub API to delete the folder
  const owner = GITHUB_USERNAME;
  const repo = GITHUB_REPO;
  const path = `data/${testEnvironment.testDataFolder}`;
  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;

  const response = await fetch(apiUrl, {
    method: 'DELETE',
    headers: {
      'Authorization': `token ${GITHUB_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: `Delete test data folder ${testEnvironment.testDataFolder}`,
      branch: 'main'
    })
  });

  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.statusText}`);
  }
}