# Migration Guide

## Migrating to the New SOLID Architecture

This guide helps you migrate from the old implementation to the new SOLID-based architecture.

## What's Changed

### Old Structure
```
src/
├── collect_sfo_data.js
├── collect_yyz_data.js
└── utils.js
```

### New Structure
```
src/
├── core/           # Interfaces and models
├── infrastructure/ # External dependencies
├── domain/         # Business logic
└── application/    # Application services
```

## Using the New Commands

### Old Way
```bash
# Collect from specific airport
node src/collect_sfo_data.js
node src/collect_yyz_data.js

# Test mode
node src/collect_sfo_data.js --test
```

### New Way
```bash
# Collect from specific airport
node src/application/commands/collect.js SFO
node src/application/commands/collect.js YYZ

# Collect all airports
node src/application/commands/collect.js

# Test mode
node src/application/commands/collect.js SFO --test

# Using npm scripts (updated)
npm run collect:sfo
npm run collect:yyz
npm run collect
```

## Configuration

### Old Way
Configuration was hardcoded in the collectors.

### New Way
Use environment variables:

```bash
# Choose HTTP client (fetch or curl)
HTTP_CLIENT_TYPE=curl node src/application/commands/collect.js

# Use GitHub storage
STORAGE_TYPE=github \
GITHUB_TOKEN=your-token \
GITHUB_REPOSITORY=owner/repo \
node src/application/commands/collect.js

# Enable verbose logging
VERBOSE=true node src/application/commands/collect.js
```

## Backward Compatibility

The old collectors are still available:

```bash
# Legacy commands
npm run collect:legacy:sfo
npm run collect:legacy:yyz
```

## Benefits of Migration

1. **Better Error Handling**: Custom error types with detailed information
2. **Retry Logic**: Automatic retry with exponential backoff
3. **Flexible Storage**: Easy to switch between local and GitHub storage
4. **HTTP Client Options**: Choose between fetch and curl
5. **Better Testing**: Mock dependencies for unit tests
6. **Extensibility**: Easy to add new airports or features

## Code Changes

### If You Have Custom Scripts

Old way:
```javascript
const { collectSFOData } = require('./src/collect_sfo_data');
collectSFOData(true); // test mode
```

New way:
```javascript
const ServiceContainer = require('./src/application/services/ServiceContainer');

async function collect() {
  const container = ServiceContainer.createDefault();
  const collectorService = container.get('collectorService');
  
  const result = await collectorService.collect('SFO', { isTest: true });
  if (!result.isSuccess()) {
    console.error('Collection failed:', result.error);
  }
}
```

### Adding Custom Collectors

Old way: Copy and modify existing collector files.

New way: Extend `BaseAirportCollector`:

```javascript
const BaseAirportCollector = require('./src/domain/collectors/BaseAirportCollector');

class CustomAirportCollector extends BaseAirportCollector {
  getAirportCode() {
    return 'CUSTOM';
  }
  
  async prepareRequest(options) {
    return {
      url: 'https://api.example.com/flights',
      headers: { 'Accept': 'application/json' }
    };
  }
  
  async transformData(rawData, options) {
    // Transform to standard format
    return {
      airport: 'CUSTOM',
      flights: rawData.flights
    };
  }
}
```

## Environment Variables Reference

| Variable | Description | Default |
|----------|-------------|---------|
| `STORAGE_TYPE` | Storage backend (local, github) | local |
| `STORAGE_BASE_PATH` | Base path for storage | data |
| `GITHUB_TOKEN` | GitHub personal access token | - |
| `GITHUB_REPOSITORY` | GitHub repository (owner/repo) | - |
| `HTTP_CLIENT_TYPE` | HTTP client (fetch, curl) | fetch |
| `HTTP_TIMEOUT` | Request timeout in ms | 30000 |
| `HTTP_USER_AGENT` | User agent string | Chrome |
| `RETRY_MAX_ATTEMPTS` | Max retry attempts | 3 |
| `RETRY_BASE_DELAY` | Base retry delay in ms | 1000 |
| `VERBOSE` | Enable verbose logging | false |
| `DEBUG` | Show stack traces | false |

## Troubleshooting

### Error: "Service not found"
Make sure you're using the correct service names when accessing the container.

### Error: "Missing required environment variables"
Check that all required environment variables are set for your configuration.

### Captcha Issues
The new architecture includes better captcha detection and retry logic. If you're still having issues:
1. Try using the curl HTTP client: `HTTP_CLIENT_TYPE=curl`
2. Increase retry delays
3. Consider implementing a browser-based collector

## Getting Help

- Check the [Architecture Documentation](./ARCHITECTURE.md)
- Review the example collectors in `src/domain/collectors/`
- File an issue if you encounter problems