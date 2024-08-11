# Environment Setup

This document explains how to set up your environment for the Airport Flight Data Collector.

## Prerequisites

- Node.js (version 14 or later)
- npm (usually comes with Node.js)
- A Cloudflare account
- A GitHub account and personal access token

## Environment Variables

Create a `.env` file in the root of your project with the following content:

```
GITHUB_USERNAME=your_github_username
GITHUB_REPO=airport-flight-data-collector
GITHUB_TOKEN=your_github_personal_access_token
CLOUDFLARE_ACCOUNT_ID=your_cloudflare_account_id
```

Replace the values with your actual information.

## Cloudflare Setup

1. Log in to your Cloudflare account
2. Navigate to the Workers section
3. Create a new Worker or use an existing one
4. Note down your Cloudflare Account ID

## GitHub Setup

1. Log in to your GitHub account
2. Go to Settings > Developer settings > Personal access tokens
3. Generate a new token with 'repo' scope
4. Copy the token and add it to your `.env` file

After setting up your environment, you're ready to [deploy](deployment.md) your worker.