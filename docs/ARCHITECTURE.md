# Architecture Documentation

## Overview

The Airport Flight Data Collector has been refactored to follow SOLID principles and clean architecture patterns. This document describes the new architecture and design decisions.

## SOLID Principles Applied

### 1. Single Responsibility Principle (SRP)
- Each class has one reason to change
- Examples:
  - `NodeFetchClient` - Only handles HTTP requests using node-fetch
  - `LocalFileStorage` - Only handles local file operations
  - `Flight` - Only represents flight data

### 2. Open/Closed Principle (OCP)
- Classes are open for extension but closed for modification
- New airports can be added by creating new collector classes
- New storage backends can be added without modifying existing code
- Retry strategies can be extended without changing core logic

### 3. Liskov Substitution Principle (LSP)
- Derived classes can replace base classes without altering correctness
- Any `IStorageService` implementation can be used interchangeably
- Any `IHttpClient` implementation works with collectors

### 4. Interface Segregation Principle (ISP)
- Clients don't depend on interfaces they don't use
- Separate interfaces for different concerns:
  - `IDataCollector` for collection logic
  - `IHttpClient` for HTTP operations
  - `IStorageService` for storage operations

### 5. Dependency Inversion Principle (DIP)
- High-level modules don't depend on low-level modules
- Both depend on abstractions (interfaces)
- Collectors depend on `IHttpClient`, not specific implementations

## Directory Structure

```
src/
├── core/                      # Core business logic
│   ├── interfaces/           # Abstract interfaces
│   │   ├── IDataCollector.js
│   │   ├── IHttpClient.js
│   │   ├── IStorageService.js
│   │   └── IRetryStrategy.js
│   ├── models/              # Domain models
│   │   ├── Flight.js
│   │   └── CollectionResult.js
│   └── errors/              # Custom error types
│       └── CollectionError.js
│
├── infrastructure/          # External dependencies
│   ├── http/               # HTTP client implementations
│   │   ├── NodeFetchClient.js
│   │   └── CurlClient.js
│   ├── storage/            # Storage implementations
│   │   ├── LocalFileStorage.js
│   │   └── GitHubStorage.js
│   ├── retry/              # Retry strategies
│   │   └── ExponentialBackoffRetry.js
│   └── config/             # Configuration management
│       └── Configuration.js
│
├── domain/                  # Domain-specific logic
│   └── collectors/         # Airport collectors
│       ├── BaseAirportCollector.js
│       ├── SFOCollector.js
│       └── YYZCollector.js
│
└── application/            # Application layer
    ├── services/          # Application services
    │   ├── CollectorService.js
    │   └── ServiceContainer.js
    └── commands/          # CLI commands
        └── collect.js
```

## Key Components

### Core Layer
- **Interfaces**: Define contracts for different components
- **Models**: Domain entities (Flight, CollectionResult)
- **Errors**: Custom error types for better error handling

### Infrastructure Layer
- **HTTP Clients**: Different implementations (fetch, curl)
- **Storage Services**: Local files, GitHub, etc.
- **Retry Strategies**: Handle transient failures
- **Configuration**: Centralized configuration management

### Domain Layer
- **Base Collector**: Template method pattern for common logic
- **Airport Collectors**: Specific implementations for each airport

### Application Layer
- **Collector Service**: Orchestrates the collection process
- **Service Container**: Dependency injection container
- **Commands**: CLI entry points

## Design Patterns Used

1. **Template Method Pattern**: `BaseAirportCollector` defines the collection algorithm
2. **Strategy Pattern**: Different HTTP clients and retry strategies
3. **Factory Pattern**: Service container creates instances
4. **Dependency Injection**: Services receive dependencies through constructor
5. **Repository Pattern**: Storage services abstract data persistence

## Configuration

Configuration is managed through environment variables:

```bash
# Storage
STORAGE_TYPE=local|github
STORAGE_BASE_PATH=data
GITHUB_TOKEN=your-token
GITHUB_REPOSITORY=owner/repo

# HTTP Client
HTTP_CLIENT_TYPE=fetch|curl
HTTP_TIMEOUT=30000
HTTP_USER_AGENT=Mozilla/5.0...

# Retry
RETRY_MAX_ATTEMPTS=3
RETRY_BASE_DELAY=1000
RETRY_MAX_DELAY=60000

# Features
VERBOSE=true|false
SAVE_TEST_DATA=true|false
```

## Adding New Airports

To add a new airport:

1. Create a new collector class:
```javascript
class JFKCollector extends BaseAirportCollector {
  getAirportCode() {
    return 'JFK';
  }
  
  async prepareRequest(options) {
    // Implementation
  }
  
  async transformData(rawData, options) {
    // Implementation
  }
}
```

2. Register in service container:
```javascript
container.register('jfkCollector', (c) => {
  return new JFKCollector(
    c.get('httpClient'),
    c.get('retryStrategy'),
    c.get('config')
  );
});
```

3. Add to collector service:
```javascript
[
  c.get('sfoCollector'),
  c.get('yyzCollector'),
  c.get('jfkCollector')  // New collector
]
```

## Testing

The architecture supports easy testing through dependency injection:

```javascript
// Mock dependencies
const mockHttpClient = {
  async get() { return mockData; }
};

const mockStorage = {
  async save() { /* no-op */ }
};

// Test collector
const collector = new SFOCollector(
  mockHttpClient,
  mockRetryStrategy,
  mockConfig
);

const result = await collector.collect();
```

## Benefits

1. **Maintainability**: Clear separation of concerns
2. **Testability**: Easy to mock dependencies
3. **Extensibility**: New features without modifying existing code
4. **Flexibility**: Swap implementations easily
5. **Reusability**: Common logic in base classes