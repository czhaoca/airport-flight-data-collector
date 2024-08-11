# Testing Guide

This guide explains how to run tests for the Airport Flight Data Collector.

## Running Tests

To run the tests, use the following command:

```
npm test
```

This command will execute all tests defined in `src/test/run_tests.js`.

## Test Structure

Tests are located in the `src/test` directory. The main test file is `run_tests.js`, which tests each airport data fetching function.

## Writing New Tests

To add new tests:

1. Open `src/test/run_tests.js`.
2. Import any new functions you want to test.
3. Add new test cases to the `runTests` function.

Example of adding a new test:

```javascript
const { fetchNewAirportData } = require('../endpoints/new_airport_data');

async function runTests() {
  // ... existing tests ...

  console.log('Testing New Airport Data...');
  await fetchNewAirportData(date);

  // ... rest of the function ...
}
```

## Interpreting Test Results

After running `npm test`, you'll see output in your console. Each test will log its progress. A successful test run will end with "All tests passed successfully!". Any errors will be displayed in the console, and the process will exit with a non-zero status code.

## Troubleshooting Tests

If a test fails:

1. Check the error message for clues about what went wrong.
2. Verify that your environment variables are set correctly in your `.env` file.
3. Ensure you have an active internet connection for API calls.
4. Check that the API endpoints are still valid and accessible.

For more detailed troubleshooting, refer to the [Troubleshooting Guide](troubleshooting.md).