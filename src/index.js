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