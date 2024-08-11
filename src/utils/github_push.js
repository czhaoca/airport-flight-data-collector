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
      'User-Agent': `CloudflareWorker-${owner}`,
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`GitHub API error: ${response.status} ${response.statusText}\n${errorText}`);
  }
}

module.exports = { pushToGitHub };