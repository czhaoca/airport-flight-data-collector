const { execSync } = require('child_process');
const crypto = require('crypto');

// Load environment variables from .env file
require('dotenv').config();

const { GITHUB_USERNAME, GITHUB_REPO, GITHUB_TOKEN } = process.env;

if (!GITHUB_USERNAME || !GITHUB_REPO || !GITHUB_TOKEN) {
  console.error('Missing required environment variables. Please check your .env file.');
  process.exit(1);
}

// Generate a random TEST_AUTH_TOKEN
const TEST_AUTH_TOKEN = crypto.randomBytes(32).toString('hex');

// Set secrets
const setSecret = (name, value) => {
  try {
    execSync(`echo ${value} | wrangler secret put ${name}`, { stdio: 'inherit' });
    console.log(`Secret ${name} set successfully.`);
  } catch (error) {
    console.error(`Failed to set secret ${name}:`, error);
  }
};

setSecret('GITHUB_USERNAME', GITHUB_USERNAME);
setSecret('GITHUB_REPO', GITHUB_REPO);
setSecret('GITHUB_TOKEN', GITHUB_TOKEN);
setSecret('TEST_AUTH_TOKEN', TEST_AUTH_TOKEN);

// Deploy the worker
try {
  execSync('wrangler deploy src/index.js', { stdio: 'inherit' });
  console.log('Worker deployed successfully.');
  console.log(`Your TEST_AUTH_TOKEN is: ${TEST_AUTH_TOKEN}`);
  console.log('Keep this token secure and use it for running test deployments.');
} catch (error) {
  console.error('Failed to deploy worker:', error);
}