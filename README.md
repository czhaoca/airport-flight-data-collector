# Airport Flight Data Collector

This project uses a Cloudflare Worker to automatically collect daily flight data from multiple airports and store it in a GitHub repository. The data is collected from public APIs provided by airports and stored in JSON format.

## Features

- Automatically collects flight data daily at a specified time
- Currently supports San Francisco International Airport (SFO) and Toronto Pearson International Airport (YYZ)
- Easily extensible to add more airports
- Stores data in separate folders for each airport
- Uses Cloudflare Workers for serverless execution
- Pushes collected data directly to a GitHub repository

## Setup

1. Clone this repository:
   ```
   git clone https://github.com/YOUR_USERNAME/airport-flight-data-collector.git
   cd airport-flight-data-collector
   ```

2. Install Wrangler CLI:
   ```
   npm install -g @cloudflare/wrangler
   ```

3. Set up your Cloudflare account and authenticate Wrangler.

4. Create a KV namespace for storing the GitHub token:
   ```
   wrangler kv:namespace create "GITHUB_KV"
   ```
   Add the returned id to your `wrangler.toml` file.

5. Add your GitHub Personal Access Token to the KV namespace:
   ```
   wrangler kv:key put --binding=GITHUB_KV "TOKEN" "your_github_token"
   ```

6. Update the `wrangler.toml` file with your account details and add the cron trigger:
   ```toml
   [triggers]
   crons = ["0 14 * * *"]  # Runs daily at 14:00 UTC (adjust as needed)
   ```

7. Deploy the worker:
   ```
   wrangler publish
   ```

## Adding New Airports

To add a new airport, modify the `handleScheduled` function in the worker script:

```javascript
async function handleScheduled(scheduledTime) {
  // ... existing code ...

  // Add new airport
  await get_api_json_data('new_airport_code', 'https://api.new-airport.com/flights?date=' + date);

  // ... existing code ...
}
```

## Data Structure

Collected data is stored in the `data` folder of this repository, with subfolders for each airport:

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

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is open source and available under the [MIT License](LICENSE).

## Disclaimer

This project is for educational and research purposes only. Ensure you have permission to use the data from each airport's API and comply with their terms of service.
