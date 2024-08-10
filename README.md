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

   Note: If you prefer not to install Wrangler globally, you can use `npx wrangler` instead of `wrangler` in the following commands.

4. Authenticate Wrangler with your Cloudflare account:
   ```
   wrangler login
   ```

   This step will automatically set up your Cloudflare account ID, so you don't need to manually specify it.

5. Set up environment variables:
   
   Create a `.env` file in the root of your project with the following content:
   ```
   GITHUB_USERNAME=your_github_username
   GITHUB_REPO=airport-flight-data-collector
   GITHUB_TOKEN=your_github_personal_access_token
   ```

   Replace the values with your actual GitHub username, repository name, and GitHub personal access token.

6. Update `wrangler.toml`:
   
   Open `wrangler.toml` and update the `name` field if you want to use a different name for your Worker.

7. Set up secrets and environment variables in Wrangler:
   ```
   wrangler secret put GITHUB_TOKEN
   wrangler secret put GITHUB_USERNAME
   wrangler secret put GITHUB_REPO
   ```
   Enter the corresponding values when prompted.

8. Deploy the worker:
   ```
   npm run deploy
   ```

Your Cloudflare Worker is now deployed and will run daily according to the schedule specified in `wrangler.toml`.

## Testing the Deployment

To test the deployment immediately without waiting for the cron job:

1. Find your Worker's URL in the Cloudflare Dashboard or by running:
   ```
   wrangler dev
   ```
   This will show you the Worker's URL.

2. Generate a test token by sending a GET request to the `/generate-test-token` endpoint:
   ```
   curl https://your-worker-url.workers.dev/generate-test-token
   ```
   This will return a JSON object with a `testAuthToken` and an expiration time.

3. Use the generated token to trigger a test run by sending a POST request:
   ```
   curl -X POST -H "X-Test-Auth: your_generated_test_token" https://your-worker-url.workers.dev
   ```
   Replace `your_generated_test_token` with the token you received in step 2.

4. The Worker will run a test data collection for SFO airport and store it in a temporary test folder in your GitHub repository.

5. Once the test is complete, the Worker will automatically clean up the test environment, deleting the test data from GitHub and invalidating the test token.

Note: Each test token is valid for a single use and expires after 5 minutes. If you need to run another test, repeat the process from step 2.

## Security Notes

- The test token is generated securely on the server and is never stored persistently.
- Each test token is valid for only one test run and is automatically invalidated after use.
- The test environment, including any data created during the test, is automatically cleaned up after each test run.
- There's no need to manage or store test tokens manually, enhancing security.

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
- If you receive a "No active test session" error, it means you need to generate a new test token before running a test.
- If you get an "Unauthorized" response when trying to run a test, ensure you're using the most recently generated test token. These tokens expire quickly for security reasons.
- If a test token expires before you can use it, simply generate a new one.
- If you encounter issues with test data not being cleaned up, check your GitHub repository and manually remove any leftover test folders if necessary.
- Ensure your GitHub token has the necessary permissions to create and modify files in your repository.
- If you're not seeing data in your GitHub repository after a test run or scheduled run, check the Worker logs in the Cloudflare dashboard for any error messages.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is open source and available under the [MIT License](LICENSE).

## Disclaimer

This project is for educational and research purposes only. Ensure you have permission to use the data from each airport's API and comply with their terms of service.