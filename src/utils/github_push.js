async function pushToGitHub(data, date, folderName) {
  // Use global variables if available (Cloudflare Workers), otherwise use process.env (Node.js)
  const owner = typeof GITHUB_USERNAME !== 'undefined' ? GITHUB_USERNAME : process.env.GITHUB_USERNAME;
  const repo = typeof GITHUB_REPO !== 'undefined' ? GITHUB_REPO : process.env.GITHUB_REPO;
  const token = typeof GITHUB_TOKEN !== 'undefined' ? GITHUB_TOKEN : process.env.GITHUB_TOKEN;
  const isTestEnvironment = typeof IS_TEST_ENVIRONMENT !== 'undefined' ? IS_TEST_ENVIRONMENT : process.env.IS_TEST_ENVIRONMENT === 'true';

  if (!owner || !repo || !token) {
    throw new Error('GitHub environment variables are not set properly');
  }

  const path = isTestEnvironment ? `data/test/${folderName}/${date}.json` : `data/${folderName}/${date}.json`;
  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
  
  const content = Buffer.from(JSON.stringify(data, null, 2)).toString('base64');
  
  const payload = {
    message: `Add ${folderName} data for ${date}${isTestEnvironment ? ' (Test)' : ''}`,
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

    console.log(`Successfully pushed ${isTestEnvironment ? 'test ' : ''}data to GitHub: ${path}`);
  } catch (error) {
    console.error('Error pushing to GitHub:', error);
    throw error;
  }
}

module.exports = { pushToGitHub };