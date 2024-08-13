const fs = require('fs').promises;
const path = require('path');
const fetch = require('node-fetch');

async function fetchData(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`Error fetching data from ${url}:`, error);
    throw error;
  }
}

async function saveData(data, filePath, isTest = false) {
  if (process.env.GITHUB_ACTIONS) {
    await saveToGitHub(data, filePath);
  } else {
    await saveLocally(data, filePath, isTest);
  }
}

async function saveToGitHub(data, filePath) {
  const { Octokit } = await import('@octokit/rest');
  const octokit = new Octokit({
    auth: process.env.GITHUB_TOKEN,
  });

  const content = Buffer.from(JSON.stringify(data, null, 2)).toString('base64');

  try {
    const [owner, repo] = process.env.GITHUB_REPOSITORY.split('/');
    await octokit.repos.createOrUpdateFileContents({
      owner,
      repo,
      path: filePath,
      message: `Add flight data for ${filePath}`,
      content: content,
      committer: {
        name: 'Chao Zhao',
        email: '68087157+czhaoca@users.noreply.github.com'
      },
      author: {
        name: 'Chao Zhao',
        email: '68087157+czhaoca@users.noreply.github.com'
      }
    });
    console.log(`Data saved to GitHub: ${filePath}`);
  } catch (error) {
    console.error('Error saving to GitHub:', error);
    throw error;
  }
}

async function saveLocally(data, filePath, isTest = false) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const directory = isTest ? 'data/test' : 'data';
  const fileName = isTest ? `${path.basename(filePath, '.json')}-test-${timestamp}.json` : filePath;
  const fullPath = path.join(directory, fileName);

  try {
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, JSON.stringify(data, null, 2));
    console.log(`Data saved locally: ${fullPath}`);
  } catch (error) {
    console.error('Error saving locally:', error);
    throw error;
  }
}

module.exports = { fetchData, saveData };