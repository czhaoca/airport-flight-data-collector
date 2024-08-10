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

5. Update `wrangler.toml` with your Cloudflare account details:
   - Replace `your_account_id` with your Cloudflare account ID
   - Update the `compatibility_date` if needed

6. Create a KV namespace for storing the GitHub token:
   ```
   wrangler kv:namespace create "GITHUB_KV"
   ```
   Copy the returned id and replace `your_kv_namespace_id` in `wrangler.toml`.

7. Add your GitHub Personal Access Token to the KV namespace:
   ```
   wrangler kv:key put --binding=GITHUB_KV "TOKEN" "your_github_token"
   ```

8. Update `src/index.js`:
   - Replace `YOUR_GITHUB_USERNAME` with your GitHub username
   - If you've used a different repository name, update `airport-flight-data-collector` accordingly

9. Deploy the worker:
   ```
   npm run deploy
   ```

Your Cloudflare Worker is now deployed and will run daily according to the schedule specified in `wrangler.toml`.

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