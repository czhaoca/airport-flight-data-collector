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
CLOUDFLARE_SUBDOMAIN=your_cloudflare_subdomain
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

To find your Cloudflare Account ID:
- Go to the Cloudflare dashboard
- Click on "Workers & Pages"
- Your Account ID will be visible in the right sidebar

## GitHub Setup

1. Log in to your GitHub account
2. Go to Settings > Developer settings > Personal access tokens
3. Generate a new token with 'repo' scope
4. Copy the token and add it to your `.env` file

## Wrangler Configuration

Ensure your `wrangler.toml` file is correctly configured:

```toml
name = "airport-flight-data-collector"
type = "javascript"
account_id = "your_account_id"
workers_dev = true
compatibility_date = "2023-01-01"

[triggers]
crons = ["0 0 * * *"]  # Runs daily at midnight UTC
```

Replace `your_account_id` with your Cloudflare Account ID.

## Node.js and npm

Ensure you have Node.js version 14 or later installed. You can check your version with:

```
node --version
npm --version
```

If you need to update, download the latest LTS version from the [official Node.js website](https://nodejs.org/).

After setting up your environment, you're ready to [deploy](deployment.md) your worker.

After setting up your environment, you're ready to [deploy](deployment.md) your worker.