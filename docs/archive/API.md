# API Documentation

This document provides detailed API documentation for the Airport Flight Data Collector system.

## Table of Contents

- [Core Interfaces](#core-interfaces)
- [Collectors](#collectors)
- [HTTP Clients](#http-clients)
- [Storage Services](#storage-services)
- [Data Models](#data-models)
- [Configuration](#configuration)
- [Error Handling](#error-handling)

## Core Interfaces

### IDataCollector

The base interface that all data collectors must implement.

```javascript
interface IDataCollector {
  collect(options: CollectionOptions): Promise<CollectionResult>
  canHandle(options: CollectionOptions): Promise<boolean>
  getName(): string
}
```

#### Methods

- **collect(options)** - Collects data from the source
  - `options.date` (string, optional) - Target date in YYYY-MM-DD format
  - `options.type` (string, optional) - Collection type ('arrival' or 'departure')
  - Returns: `Promise<CollectionResult>`

- **canHandle(options)** - Validates if the collector can handle the request
  - Returns: `Promise<boolean>`

- **getName()** - Gets the collector name
  - Returns: `string`

### IHttpClient

Interface for HTTP client implementations.

```javascript
interface IHttpClient {
  get(url: string, headers?: object): Promise<any>
  post(url: string, data: any, headers?: object): Promise<any>
  setDefaultHeaders(headers: object): void
}
```

### IStorageService

Interface for storage service implementations.

```javascript
interface IStorageService {
  save(data: any, airport: string, options?: object): Promise<string>
  load(airport: string, date: string): Promise<any>
  exists(airport: string, date: string): Promise<boolean>
  list(airport: string, options?: object): Promise<string[]>
}
```

## Collectors

### SFOCollector

Collects flight data from San Francisco International Airport.

```javascript
const collector = new SFOCollector(httpClient, retryStrategy, config);
const result = await collector.collect({
  date: '2025-07-24',  // Optional, defaults to yesterday
  filterByDate: true   // Optional, defaults to true
});
```

#### Configuration
- **URL**: `https://www.flysfo.com/flysfo/api/flight-status`
- **Default Date**: Yesterday (SFO provides previous day data)
- **Data Format**: Combined arrivals and departures

### YYZCollector

Collects flight data from Toronto Pearson International Airport.

```javascript
const collector = new YYZCollector(httpClient, retryStrategy, config);
const result = await collector.collect({
  date: '2025-07-25',          // Optional, defaults to today
  delayBetweenRequests: 15000  // Optional, defaults to 15 seconds
});
```

#### Configuration
- **Base URL**: `https://www.torontopearson.com/api/flightsapidata/getflightlist`
- **Data Format**: Separate files for arrivals and departures
- **Bot Protection**: Includes delays between requests

### YVRCollector

Collects flight data from Vancouver International Airport using browser automation.

```javascript
const collector = new YVRCollector(httpClient, retryStrategy, config);
const result = await collector.collect({
  date: '2025-07-25'  // Optional, defaults to today
});
```

#### Configuration
- **Base URL**: `https://www.yvr.ca/en/_api/Flights`
- **Special Requirements**: Uses Puppeteer for Cloudflare bypass
- **Data Format**: Combined arrivals and departures with OData filtering

## HTTP Clients

### NodeFetchClient

Default HTTP client using Node.js fetch API.

```javascript
const client = new NodeFetchClient();
const data = await client.get(url, headers);
```

### CurlClient

HTTP client using curl command for better bot protection handling.

```javascript
const client = new CurlClient();
const data = await client.get(url, headers);
```

### PuppeteerClient

Browser-based HTTP client for advanced bot protection bypass.

```javascript
const client = new PuppeteerClient({
  headless: true,
  timeout: 30000
});
const data = await client.get(url, headers);
```

## Storage Services

### LocalFileStorage

Stores data as JSON files in the local filesystem.

```javascript
const storage = new LocalFileStorage('data');
const filename = await storage.save(data, 'SFO', { isTest: false });
```

### GitHubStorage

Stores data in a GitHub repository using the GitHub API.

```javascript
const storage = new GitHubStorage(token, repository, basePath);
const filename = await storage.save(data, 'YYZ', { 
  isTest: false,
  type: 'arrivals' 
});
```

## Data Models

### Flight

Represents a single flight with all its details.

```javascript
class Flight {
  id: string
  flightNumber: string
  airline: { code: string, name: string }
  origin: string
  destination: string
  scheduledTime: string
  actualTime: string
  status: string
  gate: string
  terminal: string
  type: 'arrival' | 'departure'
  aircraft: string
  metadata: object
}
```

### CollectionResult

Represents the result of a data collection operation.

```javascript
class CollectionResult {
  success: boolean
  data?: any
  error?: Error
  metadata?: object
  
  isSuccess(): boolean
  isFailure(): boolean
  static success(data: any, metadata?: object): CollectionResult
  static failure(error: Error, metadata?: object): CollectionResult
}
```

## Configuration

### Environment Variables

```bash
# Storage Configuration
STORAGE_TYPE=local|github
STORAGE_BASE_PATH=data
GITHUB_TOKEN=your-token
GITHUB_REPOSITORY=owner/repo

# HTTP Client Configuration
HTTP_CLIENT_TYPE=fetch|curl|puppeteer
HTTP_TIMEOUT=30000
HTTP_USER_AGENT=custom-user-agent

# Retry Configuration
RETRY_MAX_ATTEMPTS=3
RETRY_BASE_DELAY=1000
RETRY_MAX_DELAY=60000

# Logging Configuration
VERBOSE=true|false
LOG_LEVEL=error|warn|info|debug

# Airport-specific Configuration
SFO_API_URL=https://custom-url.com
YVR_API_URL=https://custom-url.com
```

### Programmatic Configuration

```javascript
const { getConfig } = require('./infrastructure/config/Configuration');

const config = getConfig();
const airportUrl = config.get('airports.sfo.url');
const isVerbose = config.get('features.verboseLogging');
```

## Error Handling

### Error Types

```javascript
// Base collection error
class CollectionError extends Error {
  constructor(message, details = {})
}

// Network-related errors
class NetworkError extends CollectionError {
  constructor(message, details = {})
}

// Data validation errors
class ValidationError extends CollectionError {
  constructor(message, details = {})
}

// CAPTCHA/bot protection errors
class CaptchaError extends CollectionError {
  constructor(message, details = {})
}
```

### Error Handling Example

```javascript
try {
  const result = await collector.collect(options);
  if (result.isSuccess()) {
    console.log('Data collected:', result.data);
  } else {
    console.error('Collection failed:', result.error);
  }
} catch (error) {
  if (error instanceof CaptchaError) {
    console.error('Bot protection detected');
  } else if (error instanceof NetworkError) {
    console.error('Network error:', error.message);
  } else {
    console.error('Unknown error:', error);
  }
}
```

## Usage Examples

### Basic Collection

```javascript
const ServiceContainer = require('./application/services/ServiceContainer');

async function collectFlights() {
  const container = ServiceContainer.createDefault();
  const collectorService = container.get('collectorService');
  
  // Collect from all airports
  const results = await collectorService.collectAll();
  
  // Collect from specific airport
  const sfoResult = await collectorService.collect('SFO', {
    date: '2025-07-24'
  });
}
```

### Custom Storage Backend

```javascript
const container = ServiceContainer.createDefault();

// Configure for GitHub storage
process.env.STORAGE_TYPE = 'github';
process.env.GITHUB_TOKEN = 'your-token';
process.env.GITHUB_REPOSITORY = 'owner/repo';

const storage = container.get('storageService');
await storage.save(data, 'YVR');
```

### Advanced Bot Protection

```javascript
// Use Puppeteer for YVR
process.env.HTTP_CLIENT_TYPE = 'puppeteer';

const container = ServiceContainer.createDefault();
const yvrCollector = container.get('yvrCollector');
const result = await yvrCollector.collect();
```

## Testing

### Unit Testing

```javascript
const { SFOCollector } = require('./domain/collectors/SFOCollector');
const mockHttpClient = {
  get: jest.fn().mockResolvedValue(mockData)
};

const collector = new SFOCollector(
  mockHttpClient,
  mockRetryStrategy,
  mockConfig
);

const result = await collector.collect();
expect(result.isSuccess()).toBe(true);
```

### Integration Testing

```javascript
// Test with real HTTP client but mock storage
const container = ServiceContainer.createDefault();
container.register('storageService', () => mockStorage, true);

const collectorService = container.get('collectorService');
const result = await collectorService.collect('SFO');
```