# TICKET-001: Create Data Collection Interface

## Overview
Create a unified data collection interface that can write flight data directly to cloud databases instead of local JSON files, while maintaining backward compatibility.

## Background
Currently, the project collects flight data from YYZ and SFO airports and stores them as JSON files in the repository. This approach has scalability limitations and makes data analysis challenging. We need an interface that can write data to cloud databases while maintaining the existing collection logic.

## Requirements

### Functional Requirements
1. **Database Abstraction Layer**
   - Support multiple database backends (OCI Autonomous JSON DB, Cloudflare D1)
   - Configurable via environment variables
   - Fallback to local JSON storage if database unavailable

2. **Data Models**
   - Unified schema for both YYZ and SFO data formats
   - Preserve all existing fields
   - Add metadata (collection timestamp, source, version)

3. **Interface Methods**
   - `saveFlightData(airport, type, date, data)`
   - `getFlightData(airport, type, dateRange)`
   - `updateFlightStatus(flightId, status)`
   - `healthCheck()`

4. **Error Handling**
   - Retry logic for transient failures
   - Local queue for failed writes
   - Comprehensive logging

### Non-Functional Requirements
1. **Performance**: < 100ms write latency
2. **Reliability**: 99.9% write success rate
3. **Compatibility**: Work with existing Node.js collection scripts
4. **Security**: Encrypted connections, credential management

## Technical Design

### Interface Structure
```javascript
// lib/database/interface.js
class DataCollectionInterface {
  constructor(config) {
    this.provider = config.provider; // 'oci', 'cloudflare', 'local'
    this.connection = this.initializeConnection();
  }

  async saveFlightData(params) {
    // Implementation
  }

  async getFlightData(params) {
    // Implementation
  }
}
```

### Configuration
```javascript
// config/database.js
module.exports = {
  provider: process.env.DB_PROVIDER || 'local',
  oci: {
    connectionString: process.env.OCI_CONNECTION_STRING,
    user: process.env.OCI_USER,
    password: process.env.OCI_PASSWORD
  },
  cloudflare: {
    accountId: process.env.CF_ACCOUNT_ID,
    databaseId: process.env.CF_DATABASE_ID,
    apiToken: process.env.CF_API_TOKEN
  }
};
```

### Integration Points
1. Update `src/collectors/yyz-data-collector.js`
2. Update `src/collectors/sfo-data-collector.js`
3. Modify GitHub Actions workflow to include database credentials

## Implementation Steps

1. **Phase 1: Interface Development**
   - Create base interface class
   - Implement local storage adapter
   - Add comprehensive unit tests

2. **Phase 2: Database Adapters**
   - Implement OCI adapter (see TICKET-002)
   - Implement Cloudflare adapter (see TICKET-003)

3. **Phase 3: Integration**
   - Update collection scripts
   - Add environment configuration
   - Update GitHub Actions secrets

4. **Phase 4: Migration**
   - Create migration scripts for historical data
   - Validate data integrity
   - Enable dual-write mode (JSON + Database)

## Acceptance Criteria
- [ ] Interface supports all three storage backends
- [ ] Existing collection scripts work without modification
- [ ] All tests pass with 100% coverage
- [ ] Performance meets requirements
- [ ] Documentation updated

## Dependencies
- TICKET-002: OCI Database Implementation
- TICKET-003: Cloudflare Database Implementation

## Estimated Effort
- Development: 3-4 days
- Testing: 2 days
- Integration: 2 days
- Total: 7-8 days