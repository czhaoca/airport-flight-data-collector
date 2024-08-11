# Setup Guide

This guide will walk you through setting up the Airport Flight Data Collector project.

## Prerequisites

- Node.js (version 14 or later)
- npm (usually comes with Node.js)
- A Cloudflare account
- A GitHub account and personal access token

## Installation

1. Clone the repository:
   ```
   git clone https://github.com/your-username/airport-flight-data-collector.git
   cd airport-flight-data-collector
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Set up environment variables:
   Create a `.env` file in the root of your project with the following content:
   ```
   GITHUB_USERNAME=your_github_username
   GITHUB_REPO=airport-flight-data-collector
   GITHUB_TOKEN=your_github_personal_access_token
   CLOUDFLARE_ACCOUNT_ID=your_cloudflare_account_id
   CLOUDFLARE_SUBDOMAIN=your_cloudflare_subdomain
   ```
   Replace the values with your actual information.

4. Configure Cloudflare:
   - Log in to your Cloudflare account
   - Navigate to the Workers section
   - Create a new Worker or use an existing one
   - Identify your Cloudflare Subdomain:
     - Look at the URL of any of your existing workers
     - It will be in the format: `https://worker-name.your-subdomain.workers.dev`
     - The part between `worker-name` and `workers.dev` is your subdomain
   - Add your Cloudflare Subdomain to the `.env` file

5. Update `wrangler.toml`:
   Ensure your `wrangler.toml` file has the correct configuration:
   ```toml
   name = "airport-flight-data-collector"
   main = "src/index.js"
   compatibility_date = "2023-05-18"

   [triggers]
   crons = ["0 14 * * *"]  # Runs daily at 14:00 UTC (adjust as needed)
   ```

6. Update `wrangler.toml`:
   Ensure your `wrangler.toml` file has the correct configuration, including your account ID and Worker name.

After completing these steps, you're ready to [test](testing.md) and [deploy](deployment.md) your worker.