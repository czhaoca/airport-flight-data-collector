require('dotenv').config();
const { execSync } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const toml = require('toml');

async function simulateCron() {
  const scheduledTime = new Date();
  const cron = '*/5 * * * *'; // Simulating the test cron schedule

  // Generate CRON_TRIGGER_TOKEN
  const CRON_TRIGGER_TOKEN = crypto.randomBytes(16).toString('hex');

  // Read worker name from wrangler.toml
  const wranglerConfig = toml.parse(fs.readFileSync('wrangler.toml', 'utf8'));
  const workerName = wranglerConfig.name;

  // Deploy to Cloudflare Workers
  try {
    console.log('Setting CRON_TRIGGER_TOKEN as a secret...');
    execSync(`echo ${CRON_TRIGGER_TOKEN} | npx wrangler secret put CRON_TRIGGER_TOKEN`, { stdio: 'inherit' });

    console.log('Deploying to Cloudflare Workers...');
    execSync(`npx wrangler deploy src/index.js`, { stdio: 'inherit' });
    
    console.log('\nDeployment successful!');
    console.log(`CRON_TRIGGER_TOKEN: ${CRON_TRIGGER_TOKEN}`);
    console.log(`Worker Name: ${workerName}`);

    // Generate curl command
    const subdomain = process.env.CLOUDFLARE_SUBDOMAIN;
    const curlCommand = `curl -X POST -H "Authorization: Bearer ${CRON_TRIGGER_TOKEN}" https://${workerName}.${subdomain}.workers.dev/trigger-cron`;
    
    console.log('\nTo trigger the cron job manually, run the following command:');
    console.log(curlCommand);

  } catch (error) {
    console.error('Deployment failed:', error);
    process.exit(1);
  }
}

simulateCron();