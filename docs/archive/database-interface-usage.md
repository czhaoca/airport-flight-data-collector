# Database Interface Usage Guide

## Overview
The data collection interface provides a unified way to store and retrieve flight data, supporting multiple database backends while maintaining backward compatibility with local JSON storage.

## Configuration

Set database provider via environment variables:

```bash
# Use local storage (default)
export DB_PROVIDER=local

# Use Oracle Cloud Infrastructure
export DB_PROVIDER=oci
export OCI_USER=your_user
export OCI_PASSWORD=your_password
export OCI_CONNECTION_STRING=your_connection_string

# Use Cloudflare D1
export DB_PROVIDER=cloudflare
export CF_ACCOUNT_ID=your_account_id
export CF_DATABASE_ID=your_database_id
export CF_API_TOKEN=your_api_token
```

## Basic Usage

```javascript
const { getDatabase } = require('./lib/database');

async function saveFlightData() {
  const db = await getDatabase();
  
  // Save flight data
  await db.saveFlightData({
    airport: 'YYZ',
    type: 'departure',
    date: '2024-01-15',
    data: {
      // Your flight data here
    }
  });
  
  // Query flight data
  const flights = await db.getFlightData({
    airport: 'YYZ',
    type: 'departure',
    startDate: '2024-01-01',
    endDate: '2024-01-31'
  });
  
  // Update flight status
  await db.updateFlightStatus('flight_id_123', 'CANCELLED');
  
  // Health check
  const health = await db.healthCheck();
  console.log('Database health:', health);
}
```

## Integration with Collectors

Update your collection scripts to use the interface:

```javascript
const { getDatabase } = require('../lib/database');

async function collectAndSave() {
  const db = await getDatabase();
  
  try {
    // Fetch data from API
    const flightData = await fetchFromAPI();
    
    // Save to database
    await db.saveFlightData({
      airport: 'YYZ',
      type: 'departure',
      date: new Date().toISOString().split('T')[0],
      data: flightData
    });
    
    console.log('Data saved successfully');
  } catch (error) {
    console.error('Error saving data:', error);
  }
}
```

## Event Handling

The interface emits events for monitoring:

```javascript
const db = await getDatabase();

db.on('connected', (info) => {
  console.log('Connected to', info.provider);
});

db.on('dataSaved', (info) => {
  console.log('Saved data for', info.airport, info.date);
});

db.on('error', (error) => {
  console.error('Database error:', error);
});

db.on('retryAttempt', (info) => {
  console.log(`Retry ${info.attempt}/${info.maxAttempts}:`, info.error);
});
```

## Testing

Run unit tests:

```bash
npm run test:unit
```

Run tests with coverage:

```bash
npm run test:unit -- --coverage
```

## Local Storage Adapter

When using the local storage adapter:
- Data is saved to `data/{airport}/{airport}_{type}s_{date}.json`
- Metadata is added to track collection time and IDs
- Status updates are saved to `data/_status_updates/`
- Original file format is preserved for compatibility

## Migration from Direct File Access

To migrate existing code:

1. Replace direct `fs` operations with database interface calls
2. Update GitHub Actions to include database configuration
3. Test with local storage first before switching to cloud databases
4. Enable dual-write mode during transition if needed

## Error Handling

The interface includes automatic retry logic:
- Default: 3 retry attempts with exponential backoff
- Configure via `DB_RETRY_ATTEMPTS` and `DB_RETRY_DELAY`
- Failed operations throw descriptive errors

## Next Steps

1. Implement OCI adapter (see TICKET-002)
2. Implement Cloudflare adapter (see TICKET-003)
3. Add data migration scripts
4. Update GitHub Actions workflow