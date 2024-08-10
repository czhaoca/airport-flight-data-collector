# Airport Flight Data Collector

This project uses a Cloudflare Worker to automatically collect daily flight data from multiple airports and store it in a GitHub repository. The data is collected from public APIs provided by airports and stored in JSON format.

## Features

- Automatically collects flight data daily at a specified time
- Currently supports San Francisco International Airport (SFO) and Toronto Pearson International Airport (YYZ)
- Easily extensible to add more airports
- Stores data in separate folders for each airport
- Uses Cloudflare Workers for serverless execution
- Pushes collected data directly to a GitHub repository

## Project Structure

```
airport-flight-data-collector/
├── src/
│   └── index.js
├── wrangler.toml
├── package.json
├── README.md
├── LICENSE
└── .gitignore
```

- `src/index.js`: Contains the main Cloudflare Worker code
- `wrangler.toml`: Configuration file for the Cloudflare Worker
- `package.json`: Defines project metadata and dependencies
- `README.md`: This file, containing project documentation
- `LICENSE`: The license file for the project
- `.gitignore`: Specifies files that Git should ignore

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

Now you should have the required versions to proceed with the setup.

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

5. Set up environment variables:
   
   Create a `.env` file in the root of your project with the following content:
   ```
   CLOUDFLARE_ACCOUNT_ID=your_account_id
   GITHUB_USERNAME=your_github_username
   GITHUB_REPO=airport-flight-data-collector
   GITHUB_TOKEN=your_github_personal_access_token
   ```

   Replace the values with your actual Cloudflare account ID, GitHub username, repository name, and GitHub personal access token.

6. Update `wrangler.toml`:
   
   Open `wrangler.toml` and update the `name` field if you want to use a different name for your Worker.

7. Set up secrets and environment variables in Wrangler:
   ```
   wrangler secret put GITHUB_TOKEN
   ```
   When prompted, enter your GitHub personal access token.

   ```
   wrangler secret put GITHUB_USERNAME
   wrangler secret put GITHUB_REPO
   ```
   Enter your GitHub username and repository name when prompted.

8. Deploy the worker:
   ```
   npm run deploy
   ```

Your Cloudflare Worker is now deployed and will run daily according to the schedule specified in `wrangler.toml`.

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

[... keep the rest of the content the same, but add the following to the Troubleshooting section ...]

- If you're having issues with environment variables, make sure they are correctly set in your `.env` file and in your Wrangler secrets.
- For GitHub Actions deployment, ensure all necessary secrets are added to your GitHub repository settings.

## Adding New Airports

To add a new airport, modify the `handleScheduled` function in `src/index.js`:

```javascript
async function handleScheduled(scheduledTime) {
  // ... existing code ...

  // Add new airport
  await get_api_json_data('new_airport_code', 'https://api.new-airport.com/flights?date=' + date);

  // ... existing code ...
}
```

## Data Structure

Collected data is stored in the `data` folder of your GitHub repository, with subfolders for each airport:

```
data/
├── sfo_flight_status/
│   ├── 2023-05-19.json
│   ├── 2023-05-20.json
│   └── ...
├── yyz_flight_status_dep/
│   ├── 2023-05-19.json
│   ├── 2023-05-20.json
│   └── ...
├── yyz_flight_status_arr/
│   ├── 2023-05-19.json
│   ├── 2023-05-20.json
│   └── ...
└── ...
```

## Troubleshooting

- If you encounter issues related to Node.js or npm versions, make sure you've updated to the versions specified in the Prerequisites section.
- If you're using nvm, ensure you're using the correct Node.js version for this project by running `nvm use --lts` in the project directory.
- If you encounter any issues with Wrangler installation or usage, ensure you're using the latest version. You can update Wrangler with `npm install -g wrangler@latest`.
- If you prefer not to use global installations, you can use `npx wrangler` instead of `wrangler` for all commands.
- If you encounter any issues with deployment, ensure that your `wrangler.toml` file is correctly configured with your account details.
- Check that your GitHub token has the necessary permissions (repo scope) and is correctly stored in the KV namespace.
- Review the Cloudflare Worker logs for any error messages if data collection fails.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is open source and available under the [MIT License](LICENSE).

## Disclaimer

This project is for educational and research purposes only. Ensure you have permission to use the data from each airport's API and comply with their terms of service.