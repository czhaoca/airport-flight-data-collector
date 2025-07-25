# TICKET-002: Oracle Cloud Infrastructure Database Implementation

## Overview
Implement Oracle Autonomous JSON Database adapter for the data collection interface to store flight data in OCI's Always Free tier service.

## Background
Based on the database selection analysis, Oracle Autonomous JSON Database provides the best combination of features for our flight data storage needs: native JSON support, 20GB free storage, and robust querying capabilities.

## Requirements

### Database Setup
1. **OCI Account Configuration**
   - Create Autonomous JSON Database instance (Always Free tier)
   - Configure network access (allow GitHub Actions IPs)
   - Create application user with appropriate permissions
   - Generate wallet for secure connections

2. **Schema Design**
   ```sql
   -- Main flights collection
   CREATE TABLE flights (
     id VARCHAR2(50) PRIMARY KEY,
     airport_code VARCHAR2(10) NOT NULL,
     flight_type VARCHAR2(10) NOT NULL, -- 'departure' or 'arrival'
     collection_date DATE NOT NULL,
     flight_date DATE NOT NULL,
     flight_data JSON NOT NULL,
     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
     updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
     CONSTRAINT flight_data_check CHECK (flight_data IS JSON)
   );

   -- Indexes for common queries
   CREATE INDEX idx_airport_date ON flights(airport_code, flight_date);
   CREATE INDEX idx_collection_date ON flights(collection_date);
   CREATE SEARCH INDEX idx_flight_json ON flights(flight_data) FOR JSON;
   ```

3. **Connection Management**
   - Implement connection pooling
   - Handle wallet-based authentication
   - Support both REST API and native connections

### Implementation Requirements

1. **OCI Adapter Class**
   ```javascript
   // lib/database/adapters/oci-adapter.js
   class OCIAdapter {
     constructor(config) {
       this.config = config;
       this.pool = null;
     }

     async connect() {
       // Initialize connection pool with wallet
     }

     async saveFlightData(params) {
       // Insert or update flight data
     }

     async getFlightData(params) {
       // Query flight data with filters
     }

     async bulkInsert(records) {
       // Efficient bulk insertion for migration
     }
   }
   ```

2. **REST API Integration**
   - Use OCI's built-in REST endpoints
   - Implement authentication with OAuth tokens
   - Handle rate limiting and retries

3. **Data Transformation**
   - Convert YYZ format to unified schema
   - Convert SFO format to unified schema
   - Preserve original data in JSON column

### Migration Strategy

1. **Historical Data Migration**
   ```javascript
   // scripts/migrate-to-oci.js
   async function migrateHistoricalData() {
     // 1. Read all JSON files
     // 2. Transform to unified format
     // 3. Bulk insert with progress tracking
     // 4. Verify data integrity
   }
   ```

2. **Verification Process**
   - Count comparison (files vs records)
   - Sample data validation
   - Query performance testing

## Technical Implementation

### Dependencies
```json
{
  "dependencies": {
    "oracledb": "^6.0.0",
    "node-oracledb": "^6.0.0"
  }
}
```

### Environment Variables
```bash
# OCI Database Configuration
OCI_USER=flight_data_user
OCI_PASSWORD=<secure_password>
OCI_CONNECTION_STRING=<autonomous_db_connection_string>
OCI_WALLET_LOCATION=./wallet
OCI_WALLET_PASSWORD=<wallet_password>
```

### Error Handling
- Connection failures: Exponential backoff retry
- Timeout handling: 30-second query timeout
- Data validation: Schema validation before insert
- Duplicate handling: Upsert logic based on flight ID

### Monitoring
- Connection pool metrics
- Query performance tracking
- Storage usage monitoring
- Error rate tracking

## Testing Strategy

1. **Unit Tests**
   - Mock OCI connections
   - Test data transformations
   - Validate error handling

2. **Integration Tests**
   - Test against OCI free tier instance
   - Validate CRUD operations
   - Test bulk operations

3. **Performance Tests**
   - Measure insert performance
   - Query response times
   - Concurrent operation handling

## Security Considerations
- Wallet stored securely (not in repo)
- Credentials in GitHub Secrets
- Network access restricted to GitHub Actions
- Read-only user for query operations

## Acceptance Criteria
- [ ] OCI Autonomous JSON Database provisioned
- [ ] Connection established from Node.js
- [ ] All CRUD operations functional
- [ ] Historical data migrated successfully
- [ ] Performance meets requirements (< 100ms writes)
- [ ] GitHub Actions integration working
- [ ] Documentation complete

## Estimated Effort
- OCI setup and configuration: 1 day
- Adapter implementation: 2-3 days
- Migration script: 1 day
- Testing: 2 days
- Integration with collectors: 1 day
- Total: 7-8 days

## References
- [OCI Autonomous JSON Database Documentation](https://docs.oracle.com/en/cloud/paas/autonomous-json-database/)
- [Node.js Oracle Database Driver](https://oracle.github.io/node-oracledb/)
- [OCI Always Free Tier](https://www.oracle.com/cloud/free/)