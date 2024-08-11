const { pushToGitHub } = require('./github_push');

async function fetchAndUpload(url, date, folderName) {
  console.log(`Fetching data from: ${url}`);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`API responded with status: ${response.status}, ${response.statusText}`);
  }
  const data = await response.json();
  console.log(`Successfully fetched data from: ${url}`);
  
  console.log(`Pushing ${folderName} data to GitHub...`);
  await pushToGitHub(data, date, folderName);
  console.log(`Successfully pushed ${folderName} data to GitHub`);
  
  return data;
}

module.exports = { fetchAndUpload };