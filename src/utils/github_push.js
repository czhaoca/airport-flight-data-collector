async function pushToGitHub(data, date, folderName, isTestRun = false, timestamp = '') {
  console.log(`Pushing to GitHub. isTestRun: ${isTestRun}`);
  const owner = GITHUB_USERNAME;
  const repo = GITHUB_REPO;
  const token = GITHUB_TOKEN;

  if (!owner || !repo || !token) {
    throw new Error('GitHub environment variables are not set properly');
  }

  const baseFolder = isTestRun ? 'data/test' : 'data';
  const path = `${baseFolder}/${folderName}/${date}${timestamp}.json`;
  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
  
  const content = Buffer.from(JSON.stringify(data, null, 2)).toString('base64');
  
  const payload = {
    message: `Add ${folderName} data for ${date}${isTestRun ? ' (Test)' : ''}`,
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

    console.log(`Successfully pushed ${isTestRun ? 'test ' : ''}data to GitHub: ${path}`);
  } catch (error) {
    console.error('Error pushing to GitHub:', error);
    throw error;
  }
}

module.exports = { pushToGitHub };