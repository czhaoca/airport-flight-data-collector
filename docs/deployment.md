# Deployment Guide

This guide will walk you through deploying the Airport Flight Data Collector to Cloudflare Workers.

## Prerequisites

Ensure you have completed all steps in the [Setup Guide](setup.md) before proceeding with deployment.

## Deployment Steps

1. Authenticate with Cloudflare:
   If you haven't already, authenticate your local environment with Cloudflare:
   ```
   npx wrangler login
   ```

2. Verify your `wrangler.toml` file:
   Ensure your `wrangler.toml` file has the correct configuration, including your account ID and Worker name.

3. Run tests:
   Before deploying, run the tests to ensure everything is working correctly:
   ```
   npm test
   ```

4. Deploy the Worker:
   If all tests pass, deploy your Worker using:
   ```
   npm run deploy
   ```

5. Verify deployment:
   After deployment, you should see a success message with your Worker's URL. You can test it by sending a POST request to the `/test` endpoint:
   ```
   curl -X POST https://your-worker.your-subdomain.workers.dev/test
   ```

## Scheduled Runs

The Worker is configured to run on a schedule defined in your `wrangler.toml` file. By default, it runs daily. You can adjust this schedule in the `wrangler.toml` file:

```toml
[triggers]
crons = ["0 0 * * *"]  # Runs daily at midnight UTC
```

## Monitoring

After deployment:

1. Check the Cloudflare Workers dashboard to ensure your Worker is listed and active.
2. Monitor the Worker's logs in the Cloudflare dashboard for any errors or issues.
3. Verify that data is being pushed to your GitHub repository as expected.

## Updating the Worker

To update your Worker after making changes:

1. Make your changes to the code
2. Run tests: `npm test`
3. Deploy again: `npm run deploy`

## Troubleshooting Deployment

If you encounter issues during deployment, refer to the [Troubleshooting Guide](troubleshooting.md).