require('dotenv').config();
const { execSync } = require('child_process');
const crypto = require('crypto');

async function simulateCron() {
  const scheduledTime = new Date();
  const cron = '*/5 * * * *'; // Simulating the test cron schedule

  // Generate CRON_TRIGGER_TOKEN
  const CRON_TRIGGER_TOKEN = crypto.randomBytes(16).toString('hex');

  // Deploy to Cloudflare Workers
  try {
    console.log('Deploying to Cloudflare Workers...');
    execSync(`CRON_TRIGGER_TOKEN=${CRON_TRIGGER_TOKEN} npx wrangler deploy src/index.js`, { stdio: 'inherit' });
    
    // Get worker name
    const workerInfo = JSON.parse(execSync('npx wrangler whoami --json', { encoding: 'utf8' }));
    const workerName = workerInfo.name;

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