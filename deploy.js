const { execSync } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const toml = require('toml');

// Load environment variables from .env file
require('dotenv').config();

const { GITHUB_USERNAME, GITHUB_REPO, GITHUB_TOKEN, CLOUDFLARE_SUBDOMAIN } = process.env;

if (!GITHUB_USERNAME || !GITHUB_REPO || !GITHUB_TOKEN || !CLOUDFLARE_SUBDOMAIN) {
  console.error('Missing required environment variables. Please check your .env file.');
  process.exit(1);
}

// Generate a random TEST_AUTH_TOKEN
const TEST_AUTH_TOKEN = crypto.randomBytes(16).toString('hex');

// Set secrets
const setSecret = (name, value) => {
  try {
    execSync(`echo "${value}" | wrangler secret put ${name}`, { stdio: 'inherit' });
    console.log(`Secret ${name} set successfully.`);
  } catch (error) {
    console.error(`Failed to set secret ${name}:`, error);
  }
};

setSecret('GITHUB_USERNAME', GITHUB_USERNAME);
setSecret('GITHUB_REPO', GITHUB_REPO);
setSecret('GITHUB_TOKEN', GITHUB_TOKEN);
setSecret('TEST_AUTH_TOKEN', TEST_AUTH_TOKEN);

// Deploy the worker and get the worker name
try {
  console.log('Deploying worker...');
  execSync('wrangler deploy src/index.js', { stdio: 'inherit' });
  console.log('Worker deployed successfully.');
  
  // Get the worker name from wrangler.toml
  const wranglerConfig = toml.parse(fs.readFileSync('wrangler.toml', 'utf-8'));
  const workerName = wranglerConfig.name;
  
  if (!workerName) {
    throw new Error('Worker name not found in wrangler.toml');
  }
  
  const workerUrl = `https://${workerName}.${CLOUDFLARE_SUBDOMAIN}.workers.dev`;
  
  console.log('=================================================');
  console.log('To test your deployment, run the following command:');
  console.log(`curl -X POST -H "Authorization: Bearer ${TEST_AUTH_TOKEN}" ${workerUrl}/test`);
  console.log('=================================================');
  console.log('Keep this token secure and use it only for testing.');
} catch (error) {
  console.error('Deployment failed:', error.message);
}