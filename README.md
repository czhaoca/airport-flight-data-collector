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

- Node.js and npm installed on your local machine
- A Cloudflare account
- A GitHub account and personal access token with repo scope

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
   npm install -g @cloudflare/wrangler
   ```

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

- If you encounter any issues with deployment, ensure that your `wrangler.toml` file is correctly configured with your account details.
- Check that your GitHub token has the necessary permissions (repo scope) and is correctly stored in the KV namespace.
- Review the Cloudflare Worker logs for any error messages if data collection fails.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is open source and available under the [MIT License](LICENSE).

## Disclaimer

This project is for educational and research purposes only. Ensure you have permission to use the data from each airport's API and comply with their terms of service.