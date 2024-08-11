require('dotenv').config();

async function pushToGitHub(data, date, folderName) {
  const owner = process.env.GITHUB_USERNAME;
  const repo = process.env.GITHUB_REPO;
  const token = process.env.GITHUB_TOKEN;

  if (!owner || !repo || !token) {
    throw new Error('GitHub environment variables are not set properly');
  }

  const path = `data/${folderName}/${date}.json`;
  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
  
  const content = Buffer.from(JSON.stringify(data, null, 2)).toString('base64');
  
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

module.exports = { pushToGitHub };