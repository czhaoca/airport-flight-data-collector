# Testing Guide

This guide explains how to run and create tests for the Airport Flight Data Collector.

## Running Tests

To run the existing tests, use the following command:

```
npm test
```

This will execute the test script defined in `package.json`, which runs all tests in the `src/test` directory.

## Test Structure

Tests are located in the `src/test` directory. The main test file is `test_endpoints.js`, which tests each airport data fetching function.

## Writing New Tests

To add new tests:

1. Create a new test file in the `src/test` directory.
2. Import the function you want to test.
3. Write your test cases using console.log for output (or integrate a testing framework if desired).
4. Add your new test to the `runTests` function in `test_endpoints.js`.

Example of a new test:

```javascript
const { fetchNewAirportData } = require('../endpoints/new_airport_data');

async function testNewAirport() {
  try {
    const data = await fetchNewAirportData(new Date().toISOString().split('T')[0]);
    console.log('New Airport test passed:', data !== null);
  } catch (error) {
    console.error('New Airport test failed:', error);
  }
}

module.exports = { testNewAirport };
```

## Interpreting Test Results

After running `npm test`, you'll see output in your console. Each test will log its result. A successful test run will end with "All tests passed successfully!". Any errors will be displayed in the console.

## Troubleshooting Tests

If a test fails:

1. Check the error message for clues about what went wrong.
2. Verify that your environment variables are set correctly.
3. Ensure you have an active internet connection for API calls.
4. Check that the API endpoints are still valid and accessible.

For more detailed troubleshooting, refer to the [Troubleshooting Guide](troubleshooting.md).