# Cloudflare Worker for Flight Data API

This Worker provides optimized access to the D1 database for flight data operations.

## Features

- **REST API** for flight data queries
- **Batch operations** for efficient data insertion
- **Statistics endpoint** for monitoring
- **Health checks** for database status
- **CORS support** for web applications
- **Bearer token authentication**

## Setup

### 1. Install Wrangler

```bash
npm install -g wrangler
```

### 2. Configure Environment

Update `wrangler.toml` with your account and database IDs:

```toml
account_id = "your-account-id"
database_id = "your-database-id"
```

### 3. Set API Token

```bash
# For development
wrangler secret put API_TOKEN --env development

# For production
wrangler secret put API_TOKEN --env production
```

### 4. Deploy

```bash
# Deploy to development
wrangler deploy --env development

# Deploy to production
wrangler deploy --env production
```

## API Endpoints

### Health Check

```bash
GET /health
Authorization: Bearer YOUR_TOKEN

Response:
{
  "status": "healthy",
  "database": "connected",
  "stats": {
    "total_records": 1000,
    "airports": 2,
    "earliest_date": "2024-01-01",
    "latest_date": "2024-12-31"
  }
}
```

### Query Flights

```bash
GET /flights?airport=YYZ&type=arrival&start_date=2024-01-01&limit=100
Authorization: Bearer YOUR_TOKEN

Response:
{
  "success": true,
  "data": [...],
  "pagination": {
    "limit": 100,
    "offset": 0,
    "total": 500
  }
}
```

### Insert Flight Data

```bash
POST /flights
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "id": "yyz_arrival_2024-01-01_123456",
  "airport_code": "YYZ",
  "flight_type": "arrival",
  "flight_date": "2024-01-01",
  "flight_data": {...}
}
```

### Get Statistics

```bash
GET /stats
Authorization: Bearer YOUR_TOKEN

Response:
{
  "success": true,
  "summary": {...},
  "airports": [...],
  "recent_activity": [...],
  "storage": {
    "total_mb": "250.50",
    "usage_percentage": "4.88"
  }
}
```

### Execute Custom Query

```bash
POST /query
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "sql": "SELECT * FROM flights WHERE airport_code = ? LIMIT 10",
  "params": ["YYZ"]
}
```

### Batch Migration

```bash
POST /migrate
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "records": [
    {
      "id": "...",
      "airport_code": "...",
      "flight_type": "...",
      "flight_date": "...",
      "flight_data": {...}
    }
  ]
}
```

## Development

### Local Testing

```bash
# Start local development server
wrangler dev --env development

# Test with local D1 database
wrangler d1 execute airport-flight-data-dev --local --command "SELECT * FROM flights LIMIT 10"
```

### Logs

```bash
# Tail production logs
wrangler tail --env production

# Tail with filtering
wrangler tail --env production --search "error"
```

## Performance Tips

1. **Use pagination** for large queries
2. **Batch inserts** for bulk data (max 50 records per batch)
3. **Cache responses** when possible using Cloudflare Cache API
4. **Monitor CPU usage** - Worker has 50ms CPU limit

## Security

- Always use HTTPS
- Rotate API tokens regularly
- Implement rate limiting for production
- Consider adding IP allowlists for sensitive operations

## Monitoring

Monitor your Worker performance in the Cloudflare dashboard:
1. Workers & Pages → Your Worker
2. Check metrics for requests, errors, and CPU time
3. Set up alerts for error rates

## Troubleshooting

### "Database not found" error
- Verify database ID in wrangler.toml
- Ensure D1 binding is correct

### "CPU limit exceeded" error
- Reduce query complexity
- Implement pagination
- Consider caching frequent queries

### "Authentication failed" error
- Check API token is set correctly
- Verify Bearer token format in requests