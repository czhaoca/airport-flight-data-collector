# Airport Flight Data Collector

This project uses a Cloudflare Worker to automatically collect daily flight data from multiple airports and store it in a GitHub repository. The data is collected from public APIs provided by airports and stored in JSON format.

## Features

- Automatically collects flight data daily at a specified time
- Currently supports San Francisco International Airport (SFO) and Toronto Pearson International Airport (YYZ)
- Easily extensible to add more airports
- Stores data in separate folders for each airport
- Uses Cloudflare Workers for serverless execution
- Pushes collected data directly to a GitHub repository
- Includes a secure testing mechanism

## Prerequisites

- Node.js version 16.13 or higher (LTS version recommended)
- npm version 8.0 or higher (comes with Node.js)
- A Cloudflare account
- A GitHub account and personal access token with repo scope

### Updating Node.js and npm

If you don't have the required versions of Node.js and npm, follow these steps to update:

1. Check your current versions:
   ```
   node --version
   npm --version
   ```

2. If you need to update, we recommend using a version manager like nvm (Node Version Manager):

   For Linux and macOS:
   ```
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.3/install.sh | bash
   ```
   
   For Windows, you can use [nvm-windows](https://github.com/coreybutler/nvm-windows)

3. After installing nvm, restart your terminal and install the latest LTS version of Node.js:
   ```
   nvm install --lts
   nvm use --lts
   ```

4. Verify the new versions:
   ```
   node --version
   npm --version
   ```

## Setup and Deployment

1. Clone this repository:
   ```
   git clone https://github.com/YOUR_USERNAME/airport-flight-data-collector.git
   cd airport-flight-data-collector
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Install Wrangler CLI globally:
   ```
   npm install -g wrangler
   ```

4. Authenticate Wrangler with your Cloudflare account:
   ```
   wrangler login
   ```

5. Set up environment variables:
   
   Create a `.env` file in the root of your project with the following content:
   ```
   GITHUB_USERNAME=your_github_username
   GITHUB_REPO=airport-flight-data-collector
   GITHUB_TOKEN=your_github_personal_access_token
   ```

   Replace the values with your actual GitHub username, repository name, and GitHub personal access token.

6. Update `wrangler.toml`:
   
   Ensure your `wrangler.toml` file in the root of your project has the following content:

   ```toml
   name = "airport-flight-data-collector"
   main = "src/index.js"
   compatibility_date = "2023-05-18"

   [triggers]
   crons = ["0 14 * * *"]  # Runs daily at 14:00 UTC (adjust as needed)
   ```

   Note: The `compatibility_date` should be set to the current date when you're setting up the project.

7. Deploy the worker:
   ```
   npm run deploy
   ```

   This script will automatically set the required secrets in your Cloudflare Worker environment, deploy the worker, and generate a secure TEST_AUTH_TOKEN for testing. Make sure to save this token securely.

Your Cloudflare Worker is now deployed and will run daily according to the schedule specified in `wrangler.toml`.

## Testing the Deployment

To test the deployment immediately without waiting for the cron job:

1. Find your Worker's URL in the Cloudflare Dashboard or by running:
   ```
   wrangler dev
   ```
   This will show you the Worker's URL.

2. Use the generated token to trigger a test run by sending a POST request:
   ```
   curl -X POST -H "Authorization: Bearer YOUR_TEST_AUTH_TOKEN" https://your-worker-url.workers.dev/test
   ```
   Replace `YOUR_TEST_AUTH_TOKEN` with the token generated during deployment, and `your-worker-url` with your actual Worker URL.

3. The Worker will run a test data collection for SFO airport and store it in a temporary test folder in your GitHub repository.

Note: The TEST_AUTH_TOKEN is regenerated each time you deploy. Always use the most recent token for testing.

## Security Notes

- The TEST_AUTH_TOKEN is generated securely during deployment and is not exposed via any public endpoints.
- Always keep your TEST_AUTH_TOKEN secure and do not share it publicly.
- The test endpoint is protected and can only be accessed with a valid TEST_AUTH_TOKEN.

## GitHub Actions (Optional)

If you want to use GitHub Actions to deploy your Worker, you can create a `.github/workflows/deploy.yml` file with the following content:

```yaml
name: Deploy

on:
  push:
    branches:
      - main

jobs:
  deploy:
    runs-on: ubuntu-latest
    name: Deploy
    steps:
      - uses: actions/checkout@v3
      - name: Deploy
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          GITHUB_USERNAME: ${{ secrets.GITHUB_USERNAME }}
          GITHUB_REPO: ${{ secrets.GITHUB_REPO }}
```

Make sure to add `CLOUDFLARE_API_TOKEN`, `GITHUB_TOKEN`, `GITHUB_USERNAME`, and `GITHUB_REPO` to your GitHub repository secrets.

## Troubleshooting

- If you're having issues with environment variables, make sure they are correctly set in your `.env` file and in your Wrangler secrets.
- For GitHub Actions deployment, ensure all necessary secrets are added to your GitHub repository settings.
- If you're unable to find your Cloudflare account ID, you can find it in the Cloudflare dashboard. Go to the Workers page, and your account ID should be visible in the right sidebar. However, if you've successfully logged in with `wrangler login`, you shouldn't need to manually specify your account ID.
- If you encounter a "Missing entry-point" error, ensure that your `wrangler.toml` file includes the `main = "src/index.js"` line and that the path to your main script is correct.
- If deployment fails, you can try running the deployment command manually to see more detailed error messages:
  ```
  wrangler deploy src/index.js
  ```
- If you receive an "Unauthorized" error when trying to run a test, ensure you're using the correct TEST_AUTH_TOKEN. This token is regenerated each time you deploy the worker.
- If you've lost your TEST_AUTH_TOKEN, you can redeploy the worker to generate a new one.
- Ensure you're sending a POST request to the /test endpoint when running a test. GET requests will not work.
- If you're not seeing data in your GitHub repository after a test run or scheduled run, check the Worker logs in the Cloudflare dashboard for any error messages.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is open source and available under the [MIT License](LICENSE).

## Disclaimer

This project is for educational and research purposes only. Ensure you have permission to use the data from each airport's API and comply with their terms of service.