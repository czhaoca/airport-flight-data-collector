# API Reference

Complete API documentation for the Airport Flight Data Collector interfaces, models, and services.

## Table of Contents
- [Core Interfaces](#core-interfaces)
- [Models](#models)
- [Collectors](#collectors)
- [Storage Services](#storage-services)
- [HTTP Clients](#http-clients)
- [Services](#services)
- [Configuration](#configuration)
- [Events](#events)
- [Error Types](#error-types)

## Core Interfaces

### IDataCollector

Base interface for all data collectors.

```typescript
interface IDataCollector {
  collect(options?: CollectionOptions): Promise<CollectionResult>
  canHandle(options: CollectionOptions): Promise<boolean>
  getName(): string
}
```

#### Methods

##### `collect(options?: CollectionOptions): Promise<CollectionResult>`
Collects data from the source.

**Parameters:**
- `options` (optional): Collection options
  - `date` (string): Target date in YYYY-MM-DD format
  - `type` (string): Collection type ('arrival', 'departure', 'all')
  - `isTest` (boolean): Test mode flag
  - `filterByDate` (boolean): Filter results by date

**Returns:** Promise resolving to CollectionResult

**Example:**
```javascript
const result = await collector.collect({
  date: '2025-07-26',
  type: 'departure',
  isTest: false
});
```

##### `canHandle(options: CollectionOptions): Promise<boolean>`
Validates if the collector can handle the request.

**Parameters:**
- `options`: Collection options to validate

**Returns:** Promise resolving to boolean

##### `getName(): string`
Gets the collector name.

**Returns:** Collector name (e.g., 'SFO', 'YYZ')

---

### IHttpClient

Interface for HTTP client implementations.

```typescript
interface IHttpClient {
  get(url: string, headers?: object): Promise<any>
  post(url: string, data: any, headers?: object): Promise<any>
  setDefaultHeaders(headers: object): void
}
```

#### Methods

##### `get(url: string, headers?: object): Promise<any>`
Performs HTTP GET request.

**Parameters:**
- `url`: Target URL
- `headers` (optional): Request headers

**Returns:** Promise resolving to response data

**Example:**
```javascript
const data = await httpClient.get(
  'https://api.example.com/flights',
  { 'Accept': 'application/json' }
);
```

##### `post(url: string, data: any, headers?: object): Promise<any>`
Performs HTTP POST request.

**Parameters:**
- `url`: Target URL
- `data`: Request body
- `headers` (optional): Request headers

**Returns:** Promise resolving to response data

##### `setDefaultHeaders(headers: object): void`
Sets default headers for all requests.

**Parameters:**
- `headers`: Headers to set as defaults

---

### IStorageService

Interface for storage service implementations.

```typescript
interface IStorageService {
  save(data: any, airport: string, options?: SaveOptions): Promise<string>
  load(airport: string, date: string): Promise<any>
  exists(airport: string, date: string): Promise<boolean>
  list(airport: string, options?: ListOptions): Promise<string[]>
  delete(airport: string, date: string): Promise<boolean>
  healthCheck(): Promise<HealthCheckResult>
}
```

#### Methods

##### `save(data: any, airport: string, options?: SaveOptions): Promise<string>`
Saves data to storage.

**Parameters:**
- `data`: Data to save
- `airport`: Airport code
- `options` (optional):
  - `date` (string): Date for the data
  - `type` (string): Data type ('flights', 'arrivals', 'departures')
  - `isTest` (boolean): Test data flag

**Returns:** Promise resolving to storage key/filename

**Example:**
```javascript
const key = await storage.save(flightData, 'SFO', {
  date: '2025-07-26',
  type: 'flights'
});
```

##### `load(airport: string, date: string): Promise<any>`
Loads data from storage.

**Parameters:**
- `airport`: Airport code
- `date`: Date in YYYY-MM-DD format

**Returns:** Promise resolving to data or null if not found

##### `exists(airport: string, date: string): Promise<boolean>`
Checks if data exists.

**Parameters:**
- `airport`: Airport code
- `date`: Date in YYYY-MM-DD format

**Returns:** Promise resolving to boolean

##### `list(airport: string, options?: ListOptions): Promise<string[]>`
Lists available data files.

**Parameters:**
- `airport`: Airport code
- `options` (optional):
  - `startDate` (string): Start date for range
  - `endDate` (string): End date for range
  - `limit` (number): Maximum results

**Returns:** Promise resolving to array of filenames

---

### IRetryStrategy

Interface for retry strategy implementations.

```typescript
interface IRetryStrategy {
  execute<T>(fn: () => Promise<T>, context?: any): Promise<T>
  shouldRetry(error: Error, attempt: number): boolean
  getDelay(attempt: number): number
}
```

#### Methods

##### `execute<T>(fn: () => Promise<T>, context?: any): Promise<T>`
Executes function with retry logic.

**Parameters:**
- `fn`: Function to execute
- `context` (optional): Additional context

**Returns:** Promise resolving to function result

**Example:**
```javascript
const result = await retryStrategy.execute(
  () => httpClient.get(url),
  { maxAttempts: 3 }
);
```

## Models

### Flight

Represents a single flight.

```javascript
class Flight {
  id: string
  flightNumber: string
  airline: {
    code: string
    name: string
  }
  origin: string
  destination: string
  scheduledTime: string      // ISO 8601
  actualTime?: string        // ISO 8601
  estimatedTime?: string     // ISO 8601
  status: FlightStatus
  gate?: string
  terminal?: string
  type: 'arrival' | 'departure'
  aircraft?: string
  baggage?: string
  metadata?: object
}
```

#### Properties

- `id`: Unique identifier
- `flightNumber`: Full flight number (e.g., 'AA100')
- `airline`: Airline information
  - `code`: IATA code (e.g., 'AA')
  - `name`: Full name (e.g., 'American Airlines')
- `origin`: Origin airport code
- `destination`: Destination airport code
- `scheduledTime`: Scheduled time (ISO 8601)
- `actualTime`: Actual time (ISO 8601)
- `estimatedTime`: Estimated time (ISO 8601)
- `status`: Flight status (see FlightStatus enum)
- `gate`: Gate assignment
- `terminal`: Terminal
- `type`: Flight type
- `aircraft`: Aircraft type
- `baggage`: Baggage claim
- `metadata`: Additional metadata

#### Methods

##### `isDelayed(): boolean`
Checks if flight is delayed.

```javascript
if (flight.isDelayed()) {
  console.log('Flight is delayed');
}
```

##### `isCancelled(): boolean`
Checks if flight is cancelled.

##### `getDelay(): number`
Gets delay in minutes.

```javascript
const delayMinutes = flight.getDelay();
console.log(`Flight delayed by ${delayMinutes} minutes`);
```

---

### CollectionResult

Represents the result of a collection operation.

```javascript
class CollectionResult {
  success: boolean
  data?: any
  error?: Error
  metadata?: {
    airport: string
    date: string
    duration: number
    recordCount: number
    timestamp: string
  }
}
```

#### Static Methods

##### `success(data: any, metadata?: object): CollectionResult`
Creates successful result.

```javascript
return CollectionResult.success(flightData, {
  airport: 'SFO',
  recordCount: 125
});
```

##### `failure(error: Error, metadata?: object): CollectionResult`
Creates failure result.

```javascript
return CollectionResult.failure(
  new Error('API unavailable'),
  { airport: 'SFO', attemptCount: 3 }
);
```

#### Instance Methods

##### `isSuccess(): boolean`
Checks if operation succeeded.

##### `isFailure(): boolean`
Checks if operation failed.

## Collectors

### BaseAirportCollector

Abstract base class for airport collectors.

```javascript
abstract class BaseAirportCollector implements IDataCollector {
  constructor(
    httpClient: IHttpClient,
    retryStrategy: IRetryStrategy,
    config: IConfiguration
  )
  
  // Template method
  async collect(options?: CollectionOptions): Promise<CollectionResult>
  
  // Abstract methods to implement
  abstract getAirportCode(): string
  abstract prepareRequest(options: CollectionOptions): Promise<RequestConfig>
  abstract transformData(rawData: any, options: CollectionOptions): Promise<any>
  
  // Optional overrides
  getDefaultDate(): string
  validateData(data: any): Promise<void>
  handleError(error: Error): Error
}
```

#### Usage Example

```javascript
class JFKCollector extends BaseAirportCollector {
  getAirportCode() {
    return 'JFK';
  }
  
  async prepareRequest(options) {
    return {
      url: 'https://api.jfk.com/flights',
      headers: { 'Accept': 'application/json' }
    };
  }
  
  async transformData(rawData, options) {
    return {
      airport: 'JFK',
      flights: rawData.flights.map(f => this.transformFlight(f))
    };
  }
}
```

### Airport-Specific Collectors

#### SFOCollector

Collects data from San Francisco International Airport.

```javascript
const collector = new SFOCollector(httpClient, retryStrategy, config);

const result = await collector.collect({
  date: '2025-07-24',  // Defaults to yesterday
  filterByDate: true   // Filter by collection date
});
```

**Configuration:**
```javascript
{
  url: 'https://www.flysfo.com/api/flights',
  defaultOffset: -1,  // Previous day
  dataFormat: 'combined'  // Arrivals and departures together
}
```

#### YYZCollector

Collects data from Toronto Pearson International Airport.

```javascript
const collector = new YYZCollector(httpClient, retryStrategy, config);

const result = await collector.collect({
  date: '2025-07-25',          // Defaults to today
  delayBetweenRequests: 15000, // Anti-bot delay
  types: ['arrivals', 'departures']
});
```

**Configuration:**
```javascript
{
  baseUrl: 'https://www.torontopearson.com/api/flights',
  endpoints: {
    arrivals: '/arrivals',
    departures: '/departures'
  },
  delayBetweenRequests: 15000,
  requiresCurl: true  // Bot protection
}
```

#### YVRCollector

Collects data from Vancouver International Airport.

```javascript
const collector = new YVRCollector(httpClient, retryStrategy, config);

const result = await collector.collect({
  date: '2025-07-25',
  usePuppeteer: true  // Cloudflare bypass
});
```

**Configuration:**
```javascript
{
  baseUrl: 'https://www.yvr.ca/api/flights',
  requiresPuppeteer: true,
  cloudflareProtection: true,
  dataFormat: 'odata'
}
```

## Storage Services

### LocalFileStorage

Stores data as JSON files in the local filesystem.

```javascript
const storage = new LocalFileStorage({
  basePath: './data',
  prettyPrint: true
});

// Save data
const filename = await storage.save(data, 'SFO', {
  date: '2025-07-26',
  isTest: false
});
// Returns: 'sfo_flights_2025-07-26.json'

// Load data
const data = await storage.load('SFO', '2025-07-26');

// List files
const files = await storage.list('SFO', {
  startDate: '2025-07-01',
  endDate: '2025-07-31'
});
```

**File Structure:**
```
data/
├── SFO/
│   ├── sfo_flights_2025-07-24.json
│   └── sfo_flights_2025-07-25.json
├── YYZ/
│   ├── yyz_arrivals_2025-07-24.json
│   └── yyz_departures_2025-07-24.json
└── _metadata/
    └── collection_stats.json
```

### GitHubStorage

Stores data in a GitHub repository.

```javascript
const storage = new GitHubStorage({
  token: process.env.GITHUB_TOKEN,
  owner: 'username',
  repo: 'flight-data',
  branch: 'main',
  basePath: 'data'
});

// Save with commit
const path = await storage.save(data, 'YYZ', {
  message: 'Add YYZ flight data for 2025-07-26',
  author: {
    name: 'Bot',
    email: 'bot@example.com'
  }
});
```

### Database Adapters

#### CloudflareD1Adapter

```javascript
const adapter = new CloudflareD1Adapter({
  accountId: process.env.CF_ACCOUNT_ID,
  databaseId: process.env.CF_DATABASE_ID,
  apiToken: process.env.CF_API_TOKEN
});

// Query flights
const flights = await adapter.query(
  'SELECT * FROM flights WHERE airport = ? AND date = ?',
  ['SFO', '2025-07-26']
);
```

#### OracleAdapter

```javascript
const adapter = new OracleAdapter({
  user: process.env.OCI_USER,
  password: process.env.OCI_PASSWORD,
  connectionString: process.env.OCI_CONNECTION_STRING,
  walletLocation: process.env.OCI_WALLET_LOCATION
});

// Batch insert
await adapter.batchInsert('flights', flights, {
  batchSize: 1000
});
```

## Services

### CollectorService

Orchestrates the collection process.

```javascript
const service = new CollectorService(collectors, storage, logger);

// Collect from single airport
const result = await service.collect('SFO', {
  date: '2025-07-26'
});

// Collect from all airports
const results = await service.collectAll({
  parallel: true,
  continueOnError: true
});

// Get collector by airport
const sfoCollector = service.getCollector('SFO');
```

#### Methods

##### `collect(airport: string, options?: CollectionOptions): Promise<CollectionResult>`
Collects data from specific airport.

##### `collectAll(options?: BatchOptions): Promise<CollectionResult[]>`
Collects data from all registered airports.

**Options:**
- `parallel` (boolean): Run collections in parallel
- `continueOnError` (boolean): Continue if one fails
- `airports` (string[]): Specific airports to collect

### ServiceContainer

Dependency injection container.

```javascript
const container = ServiceContainer.createDefault();

// Get services
const httpClient = container.get('httpClient');
const storage = container.get('storageService');
const collectors = container.get('collectors');

// Register custom service
container.register('customService', (c) => {
  return new CustomService(
    c.get('httpClient'),
    c.get('logger')
  );
});

// Override existing service
container.register('httpClient', () => {
  return new CustomHttpClient();
}, true); // force override
```

#### Methods

##### `register(name: string, factory: Function, singleton?: boolean): void`
Registers a service.

**Parameters:**
- `name`: Service name
- `factory`: Factory function
- `singleton`: Create only one instance

##### `get(name: string): any`
Gets a service instance.

##### `has(name: string): boolean`
Checks if service is registered.

## Configuration

### Configuration Object

```javascript
const config = {
  environment: 'development',
  
  features: {
    verboseLogging: true,
    saveTestData: false,
    retryOnFailure: true
  },
  
  http: {
    clientType: 'fetch',
    timeout: 30000,
    userAgent: 'Mozilla/5.0...',
    maxRedirects: 5
  },
  
  retry: {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 60000,
    factor: 2
  },
  
  storage: {
    type: 'local',
    basePath: './data',
    prettyPrint: true
  },
  
  airports: {
    sfo: {
      url: 'https://www.flysfo.com/api/flights',
      timeout: 30000,
      defaultOffset: -1
    },
    yyz: {
      url: 'https://www.torontopearson.com/api/flights',
      delayBetweenRequests: 15000
    }
  },
  
  database: {
    provider: 'cloudflare',
    tablePrefix: 'flight_data',
    connectionPool: {
      min: 1,
      max: 10
    }
  }
};
```

### Environment Variables

```bash
# Core
NODE_ENV=development
DB_PROVIDER=local|cloudflare|oci

# HTTP
HTTP_CLIENT_TYPE=fetch|curl|puppeteer
HTTP_TIMEOUT=30000
HTTP_USER_AGENT=custom-agent

# Storage
STORAGE_TYPE=local|github
STORAGE_BASE_PATH=./data

# Features
VERBOSE=true
DEBUG=true
SAVE_TEST_DATA=true

# Airport-specific
SFO_API_URL=https://custom-url
YYZ_DELAY=20000
```

### Getting Configuration

```javascript
const { getConfig } = require('./infrastructure/config/Configuration');

const config = getConfig();

// Get specific value
const timeout = config.get('http.timeout');

// Get with default
const delay = config.get('retry.baseDelay', 1000);

// Set value
config.set('features.verboseLogging', true);

// Check existence
if (config.has('airports.lax')) {
  // LAX configuration exists
}
```

## Events

### EventEmitter Integration

Many classes extend EventEmitter for monitoring:

```javascript
// Storage events
storage.on('dataSaved', (info) => {
  console.log(`Saved ${info.size} bytes for ${info.airport}`);
});

storage.on('error', (error) => {
  console.error('Storage error:', error);
});

// Collector events
collector.on('requestStart', (url) => {
  console.log('Fetching:', url);
});

collector.on('requestComplete', (duration) => {
  console.log(`Request took ${duration}ms`);
});

// Service events
service.on('collectionStart', (airport) => {
  console.log(`Starting collection for ${airport}`);
});

service.on('collectionComplete', (result) => {
  console.log(`Collected ${result.recordCount} records`);
});
```

### Available Events

#### Storage Events
- `dataSaved`: Data successfully saved
- `dataLoaded`: Data loaded from storage
- `error`: Storage error occurred

#### Collector Events
- `requestStart`: HTTP request starting
- `requestComplete`: HTTP request completed
- `retryAttempt`: Retry attempt made
- `transformStart`: Data transformation starting
- `transformComplete`: Data transformation completed

#### Service Events
- `collectionStart`: Collection starting
- `collectionComplete`: Collection completed
- `collectionError`: Collection failed
- `batchStart`: Batch collection starting
- `batchComplete`: Batch collection completed

## Error Types

### CollectionError

Base error class for all collection-related errors.

```javascript
class CollectionError extends Error {
  constructor(message: string, details?: object)
  
  details: object
  timestamp: string
}
```

**Usage:**
```javascript
throw new CollectionError('Failed to collect data', {
  airport: 'SFO',
  statusCode: 500,
  response: errorResponse
});
```

### NetworkError

Network-related errors.

```javascript
class NetworkError extends CollectionError {
  statusCode?: number
  response?: any
  timeout?: boolean
}
```

**Common Cases:**
- Connection timeout
- DNS resolution failure
- HTTP error responses
- SSL/TLS errors

### ValidationError

Data validation errors.

```javascript
class ValidationError extends CollectionError {
  field?: string
  value?: any
  rules?: object
}
```

**Usage:**
```javascript
throw new ValidationError('Invalid flight data', {
  field: 'flightNumber',
  value: null,
  rules: { required: true, pattern: /^[A-Z]{2}\d+$/ }
});
```

### StorageError

Storage operation errors.

```javascript
class StorageError extends CollectionError {
  operation?: string
  path?: string
}
```

### CaptchaError

Bot protection detected.

```javascript
class CaptchaError extends CollectionError {
  url?: string
  suggestion?: string
}
```

**Usage:**
```javascript
throw new CaptchaError('CAPTCHA detected', {
  url: request.url,
  suggestion: 'Try using curl client or add delays'
});
```

## Usage Examples

### Basic Collection

```javascript
const { ServiceContainer } = require('./application/services/ServiceContainer');

async function collectFlights() {
  // Create container with defaults
  const container = ServiceContainer.createDefault();
  
  // Get collector service
  const collectorService = container.get('collectorService');
  
  try {
    // Collect from single airport
    const result = await collectorService.collect('SFO', {
      date: '2025-07-26'
    });
    
    if (result.isSuccess()) {
      console.log(`Collected ${result.data.flights.length} flights`);
    } else {
      console.error('Collection failed:', result.error);
    }
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}
```

### Custom Configuration

```javascript
// Override HTTP client
process.env.HTTP_CLIENT_TYPE = 'curl';

// Override storage
process.env.STORAGE_TYPE = 'github';
process.env.GITHUB_TOKEN = 'your-token';

const container = ServiceContainer.createDefault();
const service = container.get('collectorService');

// Will use curl and GitHub storage
await service.collectAll();
```

### Event Monitoring

```javascript
const container = ServiceContainer.createDefault();
const service = container.get('collectorService');

// Monitor all events
service.on('collectionStart', (airport) => {
  console.log(`[${new Date().toISOString()}] Starting ${airport}`);
});

service.on('collectionComplete', (result) => {
  const { airport, recordCount, duration } = result.metadata;
  console.log(`[${airport}] ${recordCount} records in ${duration}ms`);
});

service.on('collectionError', (error) => {
  console.error(`[${error.airport}] Failed:`, error.message);
});

// Collect with monitoring
await service.collectAll();
```

### Error Handling

```javascript
async function robustCollection() {
  const container = ServiceContainer.createDefault();
  const service = container.get('collectorService');
  
  try {
    const result = await service.collect('YYZ');
    
    if (result.isFailure()) {
      const error = result.error;
      
      if (error instanceof CaptchaError) {
        console.log('Bot protection detected, switching to curl...');
        process.env.HTTP_CLIENT_TYPE = 'curl';
        
        // Retry with different client
        const retryResult = await service.collect('YYZ');
        return retryResult;
      }
      
      if (error instanceof NetworkError && error.timeout) {
        console.log('Timeout occurred, increasing timeout...');
        process.env.HTTP_TIMEOUT = '60000';
        
        // Retry with longer timeout
        const retryResult = await service.collect('YYZ');
        return retryResult;
      }
      
      // Other errors
      throw error;
    }
    
    return result;
  } catch (error) {
    console.error('Failed after retries:', error);
    throw error;
  }
}
```

## Best Practices

### 1. Always Handle Errors
```javascript
// Good
try {
  const result = await collector.collect();
  if (result.isFailure()) {
    // Handle failure
  }
} catch (error) {
  // Handle unexpected errors
}
```

### 2. Use Type Checking
```javascript
// Good
if (error instanceof NetworkError) {
  // Network-specific handling
}
```

### 3. Provide Context
```javascript
// Good
throw new CollectionError('Parse failed', {
  airport,
  date,
  rawData: data.substring(0, 100)
});
```

### 4. Clean Up Resources
```javascript
// Good
try {
  const data = await collect();
} finally {
  await httpClient.close();
  await storage.disconnect();
}
```

### 5. Monitor Performance
```javascript
// Good
const start = Date.now();
const result = await collect();
const duration = Date.now() - start;

logger.info('Collection metrics', {
  airport,
  duration,
  recordCount: result.data?.length
});
```