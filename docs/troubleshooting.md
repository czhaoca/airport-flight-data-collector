# Troubleshooting Guide

This guide will help you troubleshoot common issues with the Airport Flight Data Collector.

## Common Issues and Solutions

### 1. Worker Deployment Fails

**Symptoms:**
- Error message when running `npm run deploy`
- Worker doesn't appear in Cloudflare dashboard

**Possible Solutions:**
- Verify your Cloudflare account ID in `wrangler.toml`
- Ensure you're logged in with `wrangler login`
- Check for any syntax errors in your JavaScript files

### 2. API Requests Fail

**Symptoms:**
- Error messages in Worker logs about failed fetch requests
- No data being pushed to GitHub

**Possible Solutions:**
- Verify the API endpoints are still valid
- Check your internet connection
- Ensure your Worker has permission to make external requests

### 3. GitHub Pushes Fail

**Symptoms:**
- Error messages about GitHub API in Worker logs
- No new files appearing in your GitHub repository

**Possible Solutions:**
- Verify your GitHub token has the correct permissions
- Ensure the GITHUB_USERNAME, GITHUB_REPO, and GITHUB_TOKEN environment variables are set correctly
- Check if you've hit GitHub's API rate limits

### 4. Scheduled Tasks Not Running

**Symptoms:**
- No new data appearing in GitHub at scheduled times
- No logs showing scheduled task execution

**Possible Solutions:**
- Verify the cron schedule in your `wrangler.toml` file
- Check the Cloudflare Workers dashboard for any errors
- Ensure your Worker hasn't exceeded its CPU limits

## Debugging Steps

1. **Check Logs:**
   Always start by checking the Cloudflare Workers logs in the dashboard.

2. **Verify Environment Variables:**
   Ensure all required environment variables are set correctly.

3. **Test API Endpoints:**
   Use tools like Postman or curl to test API endpoints directly.

4. **Run Local Tests:**
   Use `npm test` to run local tests and identify issues.

5. **Isolate the Problem:**
   Test each component (API fetch, GitHub push) separately to isolate the issue.

## Getting Help

If you're still stuck after trying these troubleshooting steps:

1. Check the [Cloudflare Workers documentation](https://developers.cloudflare.com/workers/)
2. Search for similar issues in the project's GitHub repository
3. Reach out to the project maintainers with a detailed description of your issue, including:
   - Error messages
   - Steps to reproduce
   - Your environment details (Node.js version, npm version, etc.)

Remember to never share sensitive information like API keys or tokens when seeking help.