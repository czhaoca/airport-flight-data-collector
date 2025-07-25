# TICKET-003: Cloudflare D1 Database Implementation

## Overview
Implement Cloudflare D1 (SQLite) adapter for the data collection interface to store flight data using Cloudflare's edge database service.

## Background
Cloudflare D1 offers a serverless SQLite database with global edge deployment, making it an excellent alternative for projects prioritizing low latency and serverless architecture. While it has a smaller storage limit (5GB), it provides excellent performance and integration with Cloudflare Workers.

## Requirements

### Database Setup
1. **Cloudflare Account Configuration**
   - Create D1 database instance
   - Configure Cloudflare Workers for API access
   - Set up Wrangler CLI for deployment
   - Configure API tokens for programmatic access

2. **Schema Design**
   ```sql
   -- Main flights table
   CREATE TABLE flights (
     id TEXT PRIMARY KEY,
     airport_code TEXT NOT NULL,
     flight_type TEXT NOT NULL,
     collection_date TEXT NOT NULL,
     flight_date TEXT NOT NULL,
     flight_data TEXT NOT NULL, -- JSON stored as TEXT
     created_at TEXT DEFAULT CURRENT_TIMESTAMP,
     updated_at TEXT DEFAULT CURRENT_TIMESTAMP
   );

   -- Indexes for performance
   CREATE INDEX idx_airport_date ON flights(airport_code, flight_date);
   CREATE INDEX idx_collection_date ON flights(collection_date);
   CREATE INDEX idx_flight_type ON flights(flight_type);

   -- Separate table for flight status tracking
   CREATE TABLE flight_status_history (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     flight_id TEXT NOT NULL,
     status TEXT NOT NULL,
     status_time TEXT NOT NULL,
     created_at TEXT DEFAULT CURRENT_TIMESTAMP,
     FOREIGN KEY (flight_id) REFERENCES flights(id)
   );
   ```

3. **Worker Functions**
   ```javascript
   // workers/flight-data-api.js
   export default {
     async fetch(request, env) {
       const url = new URL(request.url);
       
       switch (url.pathname) {
         case '/flights':
           return handleFlightOperations(request, env.DB);
         case '/migrate':
           return handleMigration(request, env.DB);
         case '/health':
           return handleHealthCheck(env.DB);
       }
     }
   };
   ```

### Implementation Requirements

1. **Cloudflare Adapter Class**
   ```javascript
   // lib/database/adapters/cloudflare-adapter.js
   class CloudflareAdapter {
     constructor(config) {
       this.accountId = config.accountId;
       this.databaseId = config.databaseId;
       this.apiToken = config.apiToken;
       this.workerUrl = config.workerUrl;
     }

     async saveFlightData(params) {
       // Save via Worker API or REST API
     }

     async getFlightData(params) {
       // Query via Worker API
     }

     async executeSql(query, params) {
       // Direct SQL execution via REST API
     }
   }
   ```

2. **REST API Integration**
   ```javascript
   // Use Cloudflare's D1 REST API
   const baseUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}/query`;
   
   async function executeQuery(sql, params) {
     const response = await fetch(baseUrl, {
       method: 'POST',
       headers: {
         'Authorization': `Bearer ${apiToken}`,
         'Content-Type': 'application/json'
       },
       body: JSON.stringify({ sql, params })
     });
     return response.json();
   }
   ```

3. **Data Storage Optimization**
   - Compress JSON data before storage
   - Implement data archival for old records
   - Monitor storage usage (5GB limit)

### Migration Strategy

1. **Historical Data Migration**
   ```javascript
   // scripts/migrate-to-cloudflare.js
   async function migrateToCloudflare() {
     // 1. Batch process JSON files
     // 2. Compress data if needed
     // 3. Insert via bulk operations
     // 4. Track progress and handle failures
   }
   ```

2. **Storage Management**
   - Implement data retention policy
   - Archive old data to R2 (object storage)
   - Monitor usage and alert at 80% capacity

## Technical Implementation

### Dependencies
```json
{
  "dependencies": {
    "@cloudflare/workers-types": "^4.0.0",
    "wrangler": "^3.0.0"
  }
}
```

### Environment Variables
```bash
# Cloudflare Configuration
CF_ACCOUNT_ID=<account_id>
CF_DATABASE_ID=<database_id>
CF_API_TOKEN=<api_token>
CF_WORKER_URL=https://flight-data-api.workers.dev
```

### Wrangler Configuration
```toml
# wrangler.toml
name = "flight-data-api"
main = "workers/flight-data-api.js"
compatibility_date = "2024-01-01"

[[d1_databases]]
binding = "DB"
database_name = "flight-data"
database_id = "<database_id>"

[env.production]
vars = { ENVIRONMENT = "production" }
```

### Error Handling
- Rate limit handling (1000 requests/minute)
- Retry logic for transient failures
- Fallback to local storage on failures
- Query timeout handling (30 seconds max)

### Performance Optimization
- Batch inserts (max 1000 rows)
- Connection reuse via Workers
- Query result caching
- JSON data compression

## Testing Strategy

1. **Unit Tests**
   - Mock Cloudflare API responses
   - Test data compression/decompression
   - Validate SQL generation

2. **Integration Tests**
   - Test against D1 local development
   - Validate Worker functions
   - Test rate limiting behavior

3. **Load Tests**
   - Measure write throughput
   - Test concurrent operations
   - Validate storage efficiency

## Security Considerations
- API tokens stored in GitHub Secrets
- Worker authentication via API keys
- Input sanitization for SQL queries
- HTTPS only communication

## Monitoring
- Storage usage tracking
- Query performance metrics
- Worker invocation counts
- Error rate monitoring via Cloudflare Analytics

## Acceptance Criteria
- [ ] D1 database created and configured
- [ ] Worker functions deployed
- [ ] All CRUD operations functional
- [ ] Historical data migrated (within 5GB limit)
- [ ] Performance meets requirements
- [ ] GitHub Actions integration working
- [ ] Storage monitoring implemented
- [ ] Documentation complete

## Estimated Effort
- Cloudflare setup: 1 day
- Adapter implementation: 2-3 days
- Worker development: 2 days
- Migration script: 1 day
- Testing: 2 days
- Integration: 1 day
- Total: 9-10 days

## Notes
- Consider implementing data archival to R2 for long-term storage
- Monitor the 5GB limit closely and plan for data rotation
- Leverage Workers for complex queries to reduce latency

## References
- [Cloudflare D1 Documentation](https://developers.cloudflare.com/d1/)
- [Workers Documentation](https://developers.cloudflare.com/workers/)
- [D1 REST API](https://developers.cloudflare.com/api/operations/cloudflare-d1-query-database)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/)