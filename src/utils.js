const fs = require('fs').promises;
const path = require('path');
const fetch = require('node-fetch');

/**
 * Fetches data from a URL with optional headers
 * @param {string} url - The URL to fetch data from
 * @param {Object} headers - Optional headers to include in the request
 * @returns {Promise<Object>} The JSON response data
 * @throws {Error} If the request fails or returns non-OK status
 */
async function fetchData(url, headers = {}) {
  try {
    const response = await fetch(url, { 
      headers,
      timeout: 30000,
      follow: 20,
      compress: true
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`Error fetching data from ${url}:`, error);
    throw error;
  }
}

/**
 * Saves data to either GitHub or local filesystem based on environment
 * @param {Object} data - The data to save
 * @param {string} filePath - The relative path where to save the file
 * @param {boolean} isTest - Whether this is a test run
 * @returns {Promise<void>}
 */
async function saveData(data, filePath, isTest = false) {
  if (process.env.GITHUB_ACTIONS) {
    await saveToGitHub(data, filePath);
  } else {
    await saveLocally(data, filePath, isTest);
  }
}

/**
 * Saves data to GitHub repository using the Octokit API
 * @param {Object} data - The data to save
 * @param {string} filePath - The relative path where to save the file
 * @returns {Promise<void>}
 * @throws {Error} If GitHub API call fails
 */
async function saveToGitHub(data, filePath) {
  const { Octokit } = require('@octokit/rest');
  const octokit = new Octokit({
    auth: process.env.GITHUB_TOKEN,
  });

  const content = Buffer.from(JSON.stringify(data, null, 2)).toString('base64');

  try {
    const [owner, repo] = process.env.GITHUB_REPOSITORY.split('/');
    const fullPath = `data/${filePath}`;
    
    // Try to get existing file SHA for updates
    let sha;
    try {
      const existingFile = await octokit.repos.getContent({
        owner,
        repo,
        path: fullPath,
      });
      sha = existingFile.data.sha;
      console.log(`File exists, updating with SHA: ${sha}`);
    } catch (getError) {
      if (getError.status === 404) {
        console.log('File does not exist, creating new file');
      } else {
        console.error('Error checking file existence:', getError);
        throw getError;
      }
    }
    
    const params = {
      owner,
      repo,
      path: fullPath,
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
    };
    
    // Only add SHA if we found an existing file
    if (sha) {
      params.sha = sha;
    }
    
    await octokit.repos.createOrUpdateFileContents(params);
    console.log(`Data saved to GitHub: ${fullPath}`);
  } catch (error) {
    console.error('Error saving to GitHub:', error);
    throw error;
  }
}

/**
 * Saves data to local filesystem
 * @param {Object} data - The data to save
 * @param {string} filePath - The relative path where to save the file
 * @param {boolean} isTest - Whether this is a test run (affects directory and filename)
 * @returns {Promise<void>}
 * @throws {Error} If file operations fail
 */
async function saveLocally(data, filePath, isTest = false) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const directory = isTest ? 'test/data' : 'data';
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