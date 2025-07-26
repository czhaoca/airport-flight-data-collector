# Development Guide

This guide covers development practices, adding new features, testing strategies, and contributing to the Airport Flight Data Collector project.

## Table of Contents
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Adding New Airports](#adding-new-airports)
- [Creating New Storage Backends](#creating-new-storage-backends)
- [Implementing HTTP Clients](#implementing-http-clients)
- [Testing Strategies](#testing-strategies)
- [Code Style Guide](#code-style-guide)
- [Debugging Tips](#debugging-tips)
- [Contributing Guidelines](#contributing-guidelines)

## Development Setup

### Prerequisites
- Node.js 18+ (use nvm for version management)
- Git
- Your favorite code editor (VS Code recommended)
- Optional: Docker for testing different environments

### Initial Setup

```bash
# Clone the repository
git clone https://github.com/czhaoca/airport-flight-data-collector.git
cd airport-flight-data-collector

# Install dependencies
npm install

# Copy environment template
cp .env.template .env.development

# Set up git hooks (optional)
npm run setup-hooks
```

### Development Environment

```bash
# .env.development
NODE_ENV=development
DB_PROVIDER=local
VERBOSE=true
LOG_LEVEL=debug
SAVE_TEST_DATA=true
```

### VS Code Setup

Recommended extensions:
```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "eamodio.gitlens",
    "streetsidesoftware.code-spell-checker",
    "wayou.vscode-todo-highlight"
  ]
}
```

Settings:
```json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "files.autoSave": "onFocusChange"
}
```

## Project Structure

### Directory Overview

```
airport-flight-data-collector/
├── src/                    # Source code
│   ├── application/       # Application layer (commands, services)
│   ├── core/             # Core domain (interfaces, models, errors)
│   ├── domain/           # Domain logic (collectors)
│   ├── infrastructure/   # External services (http, storage, config)
│   └── legacy/           # Original implementation (preserved)
├── tests/                 # Test files
│   ├── unit/            # Unit tests
│   ├── integration/     # Integration tests
│   └── fixtures/        # Test data
├── scripts/              # Utility scripts
├── docs/                 # Documentation
├── data/                 # Local data storage (git-ignored)
└── logs/                 # Application logs (git-ignored)
```

### Key Files

- `src/application/commands/collect.js` - Main CLI entry point
- `src/application/services/ServiceContainer.js` - Dependency injection
- `src/domain/collectors/BaseAirportCollector.js` - Base collector class
- `src/infrastructure/config/Configuration.js` - Configuration management

## Adding New Airports

### Step 1: Research the Airport API

```javascript
// research/lax-api-research.js
const fetch = require('node-fetch');

async function researchLAXAPI() {
  // Find the API endpoint
  const response = await fetch('https://www.flylax.com/api/flights');
  const data = await response.json();
  
  // Analyze the data structure
  console.log('Sample flight:', JSON.stringify(data.flights[0], null, 2));
  console.log('Total flights:', data.flights.length);
  console.log('Fields:', Object.keys(data.flights[0]));
}
```

### Step 2: Create the Collector

```javascript
// src/domain/collectors/LAXCollector.js
const BaseAirportCollector = require('./BaseAirportCollector');
const { ValidationError } = require('../../core/errors/CollectionError');

class LAXCollector extends BaseAirportCollector {
  getAirportCode() {
    return 'LAX';
  }
  
  getDefaultDate() {
    // LAX provides current day data
    return new Date().toISOString().split('T')[0];
  }
  
  async prepareRequest(options) {
    const date = options.date || this.getDefaultDate();
    
    return {
      url: `https://www.flylax.com/api/flights?date=${date}`,
      headers: {
        'Accept': 'application/json',
        'User-Agent': this.config.get('http.userAgent'),
        'X-API-Key': this.config.get('airports.lax.apiKey') // if needed
      }
    };
  }
  
  async transformData(rawData, options) {
    if (!rawData || !rawData.flights) {
      throw new ValidationError('Invalid LAX data structure');
    }
    
    const flights = rawData.flights.map(flight => this.transformFlight(flight));
    
    return {
      airport: 'LAX',
      date: options.date || this.getDefaultDate(),
      flights: flights,
      metadata: {
        source: 'LAX API',
        collectedAt: new Date().toISOString(),
        totalFlights: flights.length
      }
    };
  }
  
  transformFlight(rawFlight) {
    return {
      id: rawFlight.flightId || `${rawFlight.airline}${rawFlight.flightNumber}`,
      flightNumber: `${rawFlight.airline}${rawFlight.flightNumber}`,
      airline: {
        code: rawFlight.airline,
        name: rawFlight.airlineName || rawFlight.airline
      },
      origin: rawFlight.origin || 'LAX',
      destination: rawFlight.destination || 'LAX',
      scheduledTime: this.parseTime(rawFlight.scheduledTime),
      actualTime: this.parseTime(rawFlight.actualTime),
      estimatedTime: this.parseTime(rawFlight.estimatedTime),
      status: this.normalizeStatus(rawFlight.status),
      gate: rawFlight.gate || 'TBD',
      terminal: rawFlight.terminal || '',
      type: rawFlight.type || this.inferType(rawFlight),
      aircraft: rawFlight.aircraft || '',
      baggage: rawFlight.baggageClaim || '',
      metadata: {
        raw: rawFlight
      }
    };
  }
  
  parseTime(timeString) {
    if (!timeString) return null;
    // Parse airport-specific time format
    // Example: "14:30" -> "2025-07-26T14:30:00"
    return new Date(timeString).toISOString();
  }
  
  normalizeStatus(status) {
    const statusMap = {
      'ON TIME': 'ON_TIME',
      'DELAYED': 'DELAYED',
      'CANCELLED': 'CANCELLED',
      'DEPARTED': 'DEPARTED',
      'ARRIVED': 'ARRIVED',
      'BOARDING': 'BOARDING'
    };
    
    return statusMap[status?.toUpperCase()] || status;
  }
  
  inferType(flight) {
    // If origin is LAX, it's a departure
    return flight.origin === 'LAX' ? 'departure' : 'arrival';
  }
  
  async validateData(data) {
    if (!data.flights || data.flights.length === 0) {
      this.logger.warn('No flights found for LAX');
    }
    
    // Check for required fields
    const requiredFields = ['id', 'flightNumber', 'airline'];
    for (const flight of data.flights) {
      for (const field of requiredFields) {
        if (!flight[field]) {
          throw new ValidationError(`Missing required field: ${field}`);
        }
      }
    }
  }
}

module.exports = LAXCollector;
```

### Step 3: Write Tests

```javascript
// tests/unit/collectors/LAXCollector.test.js
const LAXCollector = require('../../../src/domain/collectors/LAXCollector');
const mockData = require('../../fixtures/lax-sample.json');

describe('LAXCollector', () => {
  let collector;
  let mockHttpClient;
  let mockRetryStrategy;
  let mockConfig;
  
  beforeEach(() => {
    mockHttpClient = {
      get: jest.fn().mockResolvedValue(mockData)
    };
    
    mockRetryStrategy = {
      execute: jest.fn(fn => fn())
    };
    
    mockConfig = {
      get: jest.fn().mockReturnValue('test-value')
    };
    
    collector = new LAXCollector(
      mockHttpClient,
      mockRetryStrategy,
      mockConfig
    );
  });
  
  describe('getAirportCode', () => {
    it('should return LAX', () => {
      expect(collector.getAirportCode()).toBe('LAX');
    });
  });
  
  describe('prepareRequest', () => {
    it('should prepare request with default date', async () => {
      const request = await collector.prepareRequest({});
      
      expect(request.url).toContain('https://www.flylax.com/api/flights');
      expect(request.headers).toHaveProperty('Accept', 'application/json');
    });
    
    it('should use provided date', async () => {
      const request = await collector.prepareRequest({ date: '2025-07-26' });
      
      expect(request.url).toContain('date=2025-07-26');
    });
  });
  
  describe('transformData', () => {
    it('should transform raw data correctly', async () => {
      const result = await collector.transformData(mockData, {});
      
      expect(result.airport).toBe('LAX');
      expect(result.flights).toHaveLength(mockData.flights.length);
      expect(result.flights[0]).toHaveProperty('flightNumber');
      expect(result.flights[0]).toHaveProperty('airline');
    });
    
    it('should handle missing data gracefully', async () => {
      await expect(
        collector.transformData({}, {})
      ).rejects.toThrow('Invalid LAX data structure');
    });
  });
  
  describe('transformFlight', () => {
    it('should normalize flight data', () => {
      const rawFlight = {
        flightId: '12345',
        airline: 'AA',
        flightNumber: '100',
        status: 'ON TIME',
        scheduledTime: '14:30',
        gate: 'A1',
        terminal: '4'
      };
      
      const transformed = collector.transformFlight(rawFlight);
      
      expect(transformed.id).toBe('12345');
      expect(transformed.flightNumber).toBe('AA100');
      expect(transformed.status).toBe('ON_TIME');
      expect(transformed.gate).toBe('A1');
    });
  });
});
```

### Step 4: Register the Collector

```javascript
// src/application/services/ServiceContainer.js
const LAXCollector = require('../../domain/collectors/LAXCollector');

// In createDefault method:
container.register('laxCollector', (c) => {
  return new LAXCollector(
    c.get('httpClient'),
    c.get('retryStrategy'),
    c.get('config')
  );
});

// Update collectors array
container.register('collectors', (c) => {
  return [
    c.get('sfoCollector'),
    c.get('yyzCollector'),
    c.get('yvrCollector'),
    c.get('laxCollector')  // Add new collector
  ];
}, true);
```

### Step 5: Add Configuration

```javascript
// src/infrastructure/config/Configuration.js
airports: {
  lax: {
    url: process.env.LAX_API_URL || 'https://www.flylax.com/api/flights',
    apiKey: process.env.LAX_API_KEY,
    timeout: parseInt(process.env.LAX_TIMEOUT || '30000')
  }
}
```

### Step 6: Create NPM Script

```json
// package.json
"scripts": {
  "collect:lax": "node src/application/commands/collect.js LAX",
  "test:lax": "node src/application/commands/collect.js LAX --test"
}
```

### Step 7: Update Documentation

```markdown
// docs/airports/LAX.md
# Los Angeles International Airport (LAX)

## API Details
- Endpoint: https://www.flylax.com/api/flights
- Authentication: API key required
- Rate limit: 100 requests/hour
- Data availability: Current day only

## Configuration
\`\`\`bash
LAX_API_KEY=your_api_key_here
LAX_TIMEOUT=30000
\`\`\`

## Testing
\`\`\`bash
npm run test:lax
\`\`\`
```

## Creating New Storage Backends

### Step 1: Implement the Interface

```javascript
// src/infrastructure/storage/S3Storage.js
const IStorageService = require('../../core/interfaces/IStorageService');
const AWS = require('aws-sdk');
const { StorageError } = require('../../core/errors/CollectionError');

class S3Storage extends IStorageService {
  constructor(config) {
    super();
    this.s3 = new AWS.S3({
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
      region: config.region
    });
    this.bucket = config.bucket;
    this.prefix = config.prefix || 'flight-data';
  }
  
  async save(data, airport, options = {}) {
    const key = this.generateKey(airport, options);
    
    try {
      const params = {
        Bucket: this.bucket,
        Key: key,
        Body: JSON.stringify(data, null, 2),
        ContentType: 'application/json',
        Metadata: {
          airport: airport,
          date: options.date || new Date().toISOString().split('T')[0],
          type: options.type || 'flights'
        }
      };
      
      if (options.storageClass) {
        params.StorageClass = options.storageClass;
      }
      
      await this.s3.putObject(params).promise();
      
      this.emit('dataSaved', {
        airport,
        key,
        size: JSON.stringify(data).length
      });
      
      return key;
    } catch (error) {
      throw new StorageError(`S3 save failed: ${error.message}`, {
        key,
        error
      });
    }
  }
  
  async load(airport, date) {
    const key = `${this.prefix}/${airport}/${airport}_flights_${date}.json`;
    
    try {
      const params = {
        Bucket: this.bucket,
        Key: key
      };
      
      const result = await this.s3.getObject(params).promise();
      return JSON.parse(result.Body.toString());
    } catch (error) {
      if (error.code === 'NoSuchKey') {
        return null;
      }
      throw new StorageError(`S3 load failed: ${error.message}`, {
        key,
        error
      });
    }
  }
  
  async exists(airport, date) {
    const key = `${this.prefix}/${airport}/${airport}_flights_${date}.json`;
    
    try {
      await this.s3.headObject({
        Bucket: this.bucket,
        Key: key
      }).promise();
      
      return true;
    } catch (error) {
      if (error.code === 'NotFound') {
        return false;
      }
      throw error;
    }
  }
  
  async list(airport, options = {}) {
    const prefix = `${this.prefix}/${airport}/`;
    const files = [];
    
    const params = {
      Bucket: this.bucket,
      Prefix: prefix,
      MaxKeys: options.limit || 1000
    };
    
    if (options.startAfter) {
      params.StartAfter = options.startAfter;
    }
    
    try {
      let isTruncated = true;
      
      while (isTruncated) {
        const result = await this.s3.listObjectsV2(params).promise();
        
        for (const object of result.Contents || []) {
          const filename = object.Key.split('/').pop();
          
          if (this.matchesDateRange(filename, options)) {
            files.push(filename);
          }
        }
        
        isTruncated = result.IsTruncated;
        if (isTruncated) {
          params.ContinuationToken = result.NextContinuationToken;
        }
      }
      
      return files.sort();
    } catch (error) {
      throw new StorageError(`S3 list failed: ${error.message}`, {
        prefix,
        error
      });
    }
  }
  
  generateKey(airport, options) {
    const date = options.date || new Date().toISOString().split('T')[0];
    const type = options.type || 'flights';
    const isTest = options.isTest ? '_test' : '';
    
    return `${this.prefix}/${airport}/${airport}_${type}_${date}${isTest}.json`;
  }
  
  matchesDateRange(filename, options) {
    if (!options.startDate && !options.endDate) {
      return true;
    }
    
    const match = filename.match(/(\d{4}-\d{2}-\d{2})/);
    if (!match) return false;
    
    const fileDate = match[1];
    
    if (options.startDate && fileDate < options.startDate) {
      return false;
    }
    
    if (options.endDate && fileDate > options.endDate) {
      return false;
    }
    
    return true;
  }
  
  async healthCheck() {
    try {
      await this.s3.headBucket({ Bucket: this.bucket }).promise();
      
      return {
        status: 'healthy',
        provider: 's3',
        bucket: this.bucket,
        region: this.s3.config.region
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        provider: 's3',
        error: error.message
      };
    }
  }
}

module.exports = S3Storage;
```

### Step 2: Add Tests

```javascript
// tests/unit/storage/S3Storage.test.js
const S3Storage = require('../../../src/infrastructure/storage/S3Storage');
const AWS = require('aws-sdk-mock');

describe('S3Storage', () => {
  let storage;
  
  beforeEach(() => {
    storage = new S3Storage({
      accessKeyId: 'test-key',
      secretAccessKey: 'test-secret',
      region: 'us-east-1',
      bucket: 'test-bucket'
    });
  });
  
  afterEach(() => {
    AWS.restore();
  });
  
  describe('save', () => {
    it('should save data to S3', async () => {
      AWS.mock('S3', 'putObject', (params, callback) => {
        expect(params.Bucket).toBe('test-bucket');
        expect(params.ContentType).toBe('application/json');
        callback(null, { ETag: '"test-etag"' });
      });
      
      const data = { flights: [] };
      const key = await storage.save(data, 'LAX', { date: '2025-07-26' });
      
      expect(key).toContain('LAX');
      expect(key).toContain('2025-07-26');
    });
  });
  
  describe('load', () => {
    it('should load data from S3', async () => {
      const mockData = { flights: [{ id: '123' }] };
      
      AWS.mock('S3', 'getObject', (params, callback) => {
        callback(null, {
          Body: Buffer.from(JSON.stringify(mockData))
        });
      });
      
      const data = await storage.load('LAX', '2025-07-26');
      expect(data).toEqual(mockData);
    });
    
    it('should return null for missing data', async () => {
      AWS.mock('S3', 'getObject', (params, callback) => {
        const error = new Error('The specified key does not exist.');
        error.code = 'NoSuchKey';
        callback(error);
      });
      
      const data = await storage.load('LAX', '2025-07-26');
      expect(data).toBeNull();
    });
  });
});
```

### Step 3: Register in Container

```javascript
// src/application/services/ServiceContainer.js
const S3Storage = require('../../infrastructure/storage/S3Storage');

container.register('storageService', (c) => {
  const type = process.env.STORAGE_TYPE || 'local';
  
  switch (type) {
    case 's3':
      return new S3Storage({
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        region: process.env.AWS_REGION || 'us-east-1',
        bucket: process.env.S3_BUCKET,
        prefix: process.env.S3_PREFIX || 'flight-data'
      });
    // ... other cases
  }
});
```

## Implementing HTTP Clients

### Example: Axios Client

```javascript
// src/infrastructure/http/AxiosClient.js
const IHttpClient = require('../../core/interfaces/IHttpClient');
const axios = require('axios');
const { NetworkError } = require('../../core/errors/CollectionError');

class AxiosClient extends IHttpClient {
  constructor(config = {}) {
    super();
    this.client = axios.create({
      timeout: config.timeout || 30000,
      headers: {
        'User-Agent': config.userAgent || 'Mozilla/5.0...'
      }
    });
    
    // Add interceptors
    this.setupInterceptors();
  }
  
  setupInterceptors() {
    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        console.log(`[HTTP] ${config.method.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );
    
    // Response interceptor
    this.client.interceptors.response.use(
      (response) => {
        console.log(`[HTTP] ${response.status} ${response.config.url}`);
        return response;
      },
      (error) => {
        if (error.response) {
          console.error(`[HTTP] ${error.response.status} ${error.config.url}`);
        }
        return Promise.reject(error);
      }
    );
  }
  
  async get(url, headers = {}) {
    try {
      const response = await this.client.get(url, { headers });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }
  
  async post(url, data, headers = {}) {
    try {
      const response = await this.client.post(url, data, { headers });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }
  
  setDefaultHeaders(headers) {
    Object.assign(this.client.defaults.headers.common, headers);
  }
  
  handleError(error) {
    if (error.code === 'ECONNABORTED') {
      return new NetworkError('Request timeout', {
        code: 'TIMEOUT',
        url: error.config?.url
      });
    }
    
    if (error.response) {
      return new NetworkError(`HTTP ${error.response.status}`, {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data,
        url: error.config?.url
      });
    }
    
    if (error.request) {
      return new NetworkError('No response received', {
        code: error.code,
        url: error.config?.url
      });
    }
    
    return new NetworkError(error.message, { originalError: error });
  }
}

module.exports = AxiosClient;
```

## Testing Strategies

### Unit Testing

```javascript
// Example unit test structure
describe('Component', () => {
  let component;
  let mockDependency;
  
  beforeEach(() => {
    // Setup mocks
    mockDependency = {
      method: jest.fn()
    };
    
    // Create component
    component = new Component(mockDependency);
  });
  
  afterEach(() => {
    // Cleanup
    jest.clearAllMocks();
  });
  
  describe('method', () => {
    it('should do something', async () => {
      // Arrange
      mockDependency.method.mockResolvedValue('result');
      
      // Act
      const result = await component.method();
      
      // Assert
      expect(result).toBe('expected');
      expect(mockDependency.method).toHaveBeenCalledWith('args');
    });
    
    it('should handle errors', async () => {
      // Arrange
      mockDependency.method.mockRejectedValue(new Error('Test error'));
      
      // Act & Assert
      await expect(component.method()).rejects.toThrow('Test error');
    });
  });
});
```

### Integration Testing

```javascript
// tests/integration/collection.test.js
describe('Collection Integration', () => {
  let container;
  
  beforeAll(() => {
    // Use test configuration
    process.env.NODE_ENV = 'test';
    process.env.DB_PROVIDER = 'local';
    process.env.STORAGE_BASE_PATH = './test-data';
    
    container = ServiceContainer.createDefault();
  });
  
  afterAll(async () => {
    // Cleanup test data
    await fs.rm('./test-data', { recursive: true, force: true });
  });
  
  it('should collect and save flight data', async () => {
    const collectorService = container.get('collectorService');
    
    const result = await collectorService.collect('SFO', {
      date: '2025-07-26',
      isTest: true
    });
    
    expect(result.isSuccess()).toBe(true);
    expect(result.data).toHaveProperty('flights');
    
    // Verify data was saved
    const storage = container.get('storageService');
    const exists = await storage.exists('SFO', '2025-07-26');
    expect(exists).toBe(true);
  });
});
```

### Test Fixtures

```javascript
// tests/fixtures/generate-fixtures.js
const fs = require('fs').promises;
const path = require('path');

async function generateFixtures() {
  const airports = ['SFO', 'YYZ', 'LAX'];
  
  for (const airport of airports) {
    const fixture = {
      airport,
      date: '2025-07-26',
      flights: Array.from({ length: 10 }, (_, i) => ({
        id: `${airport}${i}`,
        flightNumber: `AA${100 + i}`,
        airline: { code: 'AA', name: 'American Airlines' },
        scheduledTime: `2025-07-26T${10 + i}:00:00`,
        status: i % 3 === 0 ? 'DELAYED' : 'ON_TIME',
        gate: `A${i + 1}`,
        terminal: '1'
      }))
    };
    
    await fs.writeFile(
      path.join(__dirname, `${airport.toLowerCase()}-sample.json`),
      JSON.stringify(fixture, null, 2)
    );
  }
}

generateFixtures();
```

### Test Coverage

```bash
# Run tests with coverage
npm run test:coverage

# Generate HTML report
npm run test:coverage -- --coverageReporters=html

# Open coverage report
open coverage/index.html
```

Coverage goals:
- Statements: > 80%
- Branches: > 75%
- Functions: > 80%
- Lines: > 80%

## Code Style Guide

### JavaScript Style

We follow the Airbnb JavaScript Style Guide with some modifications:

```javascript
// ✅ Good: Use const/let, not var
const airport = 'SFO';
let flightCount = 0;

// ✅ Good: Use arrow functions for callbacks
flights.map(flight => flight.id);

// ✅ Good: Use async/await over promises
async function collectData() {
  const data = await fetchFlights();
  return transformData(data);
}

// ✅ Good: Use descriptive names
const flightsByAirline = groupBy(flights, 'airline');

// ❌ Bad: Single letter variables (except loop indices)
const d = await getData();  // Bad
const data = await getData();  // Good

// ✅ Good: Use object destructuring
const { airport, date, flights } = collectionResult;

// ✅ Good: Use template literals
const message = `Collected ${flights.length} flights from ${airport}`;
```

### File Naming

- Use PascalCase for classes: `SFOCollector.js`
- Use camelCase for everything else: `collectFlights.js`
- Test files: `ComponentName.test.js`
- Use descriptive names: `ExponentialBackoffRetry.js` not `Retry.js`

### Comments

```javascript
/**
 * Collects flight data from the specified airport
 * @param {string} airport - Airport code (e.g., 'SFO')
 * @param {Object} options - Collection options
 * @param {string} [options.date] - Date to collect (YYYY-MM-DD)
 * @param {boolean} [options.isTest] - Test mode flag
 * @returns {Promise<CollectionResult>} Collection result
 * @throws {CollectionError} If collection fails
 */
async function collect(airport, options = {}) {
  // Implementation
}

// Use single-line comments for clarification
const delay = 15000; // 15 seconds between requests

// TODO: Implement retry logic
// FIXME: Handle rate limiting
// NOTE: API returns previous day data
```

### Error Handling

```javascript
// ✅ Good: Specific error types
class RateLimitError extends CollectionError {
  constructor(retryAfter) {
    super(`Rate limit exceeded. Retry after ${retryAfter}s`);
    this.retryAfter = retryAfter;
  }
}

// ✅ Good: Error context
throw new CollectionError('Failed to parse flight data', {
  airport,
  date,
  responseStatus: response.status
});

// ✅ Good: Handle specific errors
try {
  const data = await fetchData();
} catch (error) {
  if (error instanceof RateLimitError) {
    await sleep(error.retryAfter * 1000);
    return retry();
  }
  
  if (error instanceof NetworkError) {
    logger.error('Network error:', error);
    return CollectionResult.failure(error);
  }
  
  // Re-throw unexpected errors
  throw error;
}
```

## Debugging Tips

### Debug Mode

```javascript
// Enable debug logging
const debug = require('debug')('app:collector');

debug('Starting collection for %s', airport);
debug('Request options: %O', requestOptions);
```

Run with debug:
```bash
DEBUG=app:* npm run collect:sfo
DEBUG=app:collector,app:http npm run collect:all
```

### Interactive Debugging

```javascript
// Add debugger statements
async function problemFunction() {
  const data = await fetchData();
  debugger; // Execution will pause here
  return processData(data);
}

// Run with inspector
node --inspect-brk src/collect.js
```

### Memory Debugging

```javascript
// Log memory usage
function logMemory(label) {
  const usage = process.memoryUsage();
  console.log(`[${label}] Memory:`, {
    rss: `${Math.round(usage.rss / 1024 / 1024)}MB`,
    heap: `${Math.round(usage.heapUsed / 1024 / 1024)}MB`,
    external: `${Math.round(usage.external / 1024 / 1024)}MB`
  });
}

// Use in code
logMemory('Before collection');
await collect();
logMemory('After collection');
```

### Performance Profiling

```javascript
// Simple timing
console.time('Collection');
await collect();
console.timeEnd('Collection');

// Detailed timing
const { performance } = require('perf_hooks');

const start = performance.now();
await collect();
const duration = performance.now() - start;
console.log(`Collection took ${duration.toFixed(2)}ms`);
```

## Contributing Guidelines

### Getting Started

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Write/update tests
5. Update documentation
6. Submit a pull request

### Branch Naming

- Feature: `feature/add-lax-airport`
- Bug fix: `fix/handle-timeout-error`
- Docs: `docs/update-setup-guide`
- Refactor: `refactor/improve-error-handling`

### Commit Messages

Follow conventional commits:

```bash
feat: add LAX airport collector
fix: handle timeout in YYZ collector
docs: update setup instructions
test: add integration tests for S3 storage
refactor: extract common validation logic
chore: update dependencies
```

### Pull Request Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed

## Checklist
- [ ] Code follows style guide
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] Tests added/updated
```

### Code Review Guidelines

**For Authors:**
- Keep PRs focused and small
- Respond to feedback constructively
- Update based on suggestions
- Re-request review after changes

**For Reviewers:**
- Be constructive and specific
- Suggest improvements
- Approve when satisfied
- Consider functionality, maintainability, and style

### Release Process

1. Update version in package.json
2. Update CHANGELOG.md
3. Create release PR
4. Merge after approval
5. Tag release
6. GitHub Actions publishes

## Resources

### Documentation
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)
- [Clean Code JavaScript](https://github.com/ryanmcdermott/clean-code-javascript)
- [SOLID Principles](https://en.wikipedia.org/wiki/SOLID)

### Tools
- [VS Code](https://code.visualstudio.com/)
- [Postman](https://www.postman.com/) - API testing
- [Jest](https://jestjs.io/) - Testing framework
- [ESLint](https://eslint.org/) - Linting

### Learning Resources
- [JavaScript Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)
- [Node.js Design Patterns](https://www.nodejsdesignpatterns.com/)
- [Refactoring Guru](https://refactoring.guru/design-patterns)

Happy coding! 🚀