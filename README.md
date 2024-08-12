# Airport Data Collector

This project collects daily flight data from San Francisco International Airport (SFO) and Toronto Pearson International Airport (YYZ) using GitHub Actions.

## Features

- Automatically collects YYZ data daily at 6:00 AM EST
- Automatically collects SFO data daily at 6:00 AM PST
- Collects data for the previous day
- Stores data in JSON format in the GitHub repository when run via GitHub Actions
- Supports manual triggering of data collection
- Allows local testing and data collection without GitHub interaction

## Setup

1. Fork this repository to your GitHub account.

2. Set up GitHub Actions:
   - Go to your forked repository on GitHub
   - Click on the "Actions" tab
   - You should see the "Collect Flight Data" workflow. If asked, enable GitHub Actions for this repository.

3. The workflow will now run automatically every day at the specified times. You can also trigger it manually:
   - Go to the "Actions" tab
   - Click on "Collect Flight Data" in the left sidebar
   - Click the "Run workflow" button

## Data Storage

When running via GitHub Actions, collected data is stored in the `data` folder of the repository:
- SFO data: `data/sfo/flights_YYYY-MM-DD.json`
- YYZ departures: `data/yyz/departures_YYYY-MM-DD.json`
- YYZ arrivals: `data/yyz/arrivals_YYYY-MM-DD.json`

The date in the filename represents the date of the collected data, which is always the previous day from when the script runs.

## Local Development and Testing

To run the data collection scripts locally:

1. Clone the repository:
   ```
   git clone https://github.com/YOUR_USERNAME/airport-data.git
   cd airport-data
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Run the collection scripts:
   - For production mode (saves in `data/` directory):
     ```
     npm run collect
     ```
   - For test mode (saves in `data/test/` directory with timestamp):
     ```
     npm test
     ```

When running locally, the data will be saved in the local `data/` directory. In test mode, files will be saved in `data/test/` with a `-test-timestamp` suffix.

Note: Local runs do not require any GitHub authentication. The scripts will save data to your local filesystem without attempting to push to GitHub. GitHub interactions only occur when the scripts are run via GitHub Actions.

## GitHub Actions

The GitHub Actions workflow automatically handles authentication and pushes the collected data to the repository. No additional setup is required for this functionality.

## Project Structure

```
airport-data/
├── .github/
│   └── workflows/
│       └── collect-flight-data.yml
├── src/
│   ├── collect_sfo_data.js
│   ├── collect_yyz_data.js
│   └── utils.js
├── .gitignore
├── package.json
└── README.md
```

- `.github/workflows/collect-flight-data.yml`: Defines the GitHub Actions workflow for data collection.
- `src/collect_sfo_data.js`: Script for collecting SFO airport data.
- `src/collect_yyz_data.js`: Script for collecting YYZ airport data.
- `src/utils.js`: Utility functions for fetching and saving data.
- `package.json`: Defines project dependencies and scripts.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

Here are some ways you can contribute:
- Add support for more airports
- Improve error handling and logging
- Enhance data processing or analysis
- Update documentation

Please ensure that your code adheres to the existing style and passes all tests before submitting a pull request.

## License

This project is open source and available under the [MIT License](LICENSE).

## Troubleshooting

If you encounter any issues:

1. Ensure all dependencies are installed by running `npm install`.
2. Check that you have the latest version of Node.js installed.
3. For local runs, make sure you have write permissions in the project directory.
4. If running via GitHub Actions, check the Action logs for any error messages.
5. Ensure the airport APIs are accessible and haven't changed their data format.

If you continue to experience problems, please open an issue on the GitHub repository with a detailed description of the problem, including any error messages and steps to reproduce the issue.