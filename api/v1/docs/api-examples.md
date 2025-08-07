# API v1 Usage Examples

This guide provides practical examples of using the Airport Flight Data API v1.

## Authentication

### Getting an Access Token

```bash
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "user@example.com",
    "password": "yourpassword"
  }'
```

Response:
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "refresh_token_here",
  "expiresIn": 3600
}
```

### Using the Token

Include the token in all subsequent requests:

```bash
curl http://localhost:3001/api/v1/flights \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Flight Data Queries

### Get Current Flights at an Airport

```bash
curl "http://localhost:3001/api/v1/flights?airport=SFO&status=active" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Search for a Specific Flight

```bash
curl "http://localhost:3001/api/v1/flights?flightNumber=UA123&date=2025-08-02" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Get Flight History

```bash
curl "http://localhost:3001/api/v1/flights?airport=YYZ&startDate=2025-08-01&endDate=2025-08-07" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Delay Predictions

### Predict Single Flight Delay

```bash
curl -X POST http://localhost:3001/api/v1/predictions/delay \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "flightNumber": "UA123",
    "airline": "UA",
    "origin": "SFO",
    "destination": "LAX",
    "scheduledTime": "2025-08-02T14:30:00Z"
  }'
```

Response:
```json
{
  "success": true,
  "data": {
    "delayProbability": 0.72,
    "expectedDelayMinutes": 25,
    "riskLevel": "high",
    "confidence": 0.89,
    "factors": [
      {
        "factor": "weather_impact",
        "impact": 0.35,
        "description": "Poor weather conditions at destination"
      },
      {
        "factor": "airport_congestion",
        "impact": 0.28,
        "description": "High traffic volume at SFO"
      }
    ]
  }
}
```

### Batch Predictions

```bash
curl -X POST http://localhost:3001/api/v1/predictions/batch \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "flights": [
      {
        "flightNumber": "UA123",
        "airline": "UA",
        "origin": "SFO",
        "destination": "LAX",
        "scheduledTime": "2025-08-02T14:30:00Z"
      },
      {
        "flightNumber": "AC456",
        "airline": "AC",
        "origin": "YYZ",
        "destination": "YVR",
        "scheduledTime": "2025-08-02T16:00:00Z"
      }
    ]
  }'
```

## Pattern Analysis

### Get Recent Patterns

```bash
curl "http://localhost:3001/api/v1/patterns?type=temporal&severity=high" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Get Actionable Insights

```bash
curl "http://localhost:3001/api/v1/patterns/insights?priority=high" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Response:
```json
{
  "success": true,
  "data": [
    {
      "insight": "Consistent delays on Friday afternoons at SFO",
      "category": "temporal",
      "priority": "high",
      "affectedFlights": 45,
      "recommendations": [
        "Schedule buffer time for Friday PM departures",
        "Consider alternate routing during peak hours",
        "Pre-position aircraft Thursday evening"
      ],
      "estimatedImpact": {
        "delayReduction": "20-30 minutes",
        "affectedPassengers": 2500
      }
    }
  ]
}
```

### Custom Pattern Analysis

```bash
curl -X POST http://localhost:3001/api/v1/patterns/analyze \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "startDate": "2025-07-01",
    "endDate": "2025-07-31",
    "airports": ["SFO", "LAX"],
    "airlines": ["UA", "AA"],
    "patternTypes": ["temporal", "cascading"]
  }'
```

## Data Export

### Export Flight Data as CSV

```bash
curl "http://localhost:3001/api/v1/export/flights?airport=SFO&startDate=2025-08-01&endDate=2025-08-02&format=csv" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -o flights-sfo-august.csv
```

### Export Statistics

```bash
curl "http://localhost:3001/api/v1/export/statistics?period=monthly&year=2025&format=json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  > statistics-2025.json
```

## Real-time Updates

### WebSocket Connection

```javascript
const io = require('socket.io-client');

const socket = io('http://localhost:3001', {
  auth: {
    token: 'YOUR_TOKEN'
  }
});

// Subscribe to airport updates
socket.emit('subscribe:airport', { airports: ['SFO', 'YYZ'] });

// Listen for flight updates
socket.on('flight:update', (data) => {
  console.log('Flight updated:', data);
});

// Listen for delay notifications
socket.on('flight:delay', (data) => {
  console.log('Flight delayed:', data);
  // data = { flight, oldDelay, newDelay, reason }
});

// Listen for pattern alerts
socket.on('pattern:detected', (data) => {
  console.log('New pattern detected:', data);
});
```

### Server-Sent Events (SSE)

```javascript
const EventSource = require('eventsource');

const sse = new EventSource('http://localhost:3001/api/v1/sse/flights?airport=SFO', {
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN'
  }
});

sse.on('flight-update', (event) => {
  const data = JSON.parse(event.data);
  console.log('Flight update:', data);
});

sse.on('delay-alert', (event) => {
  const data = JSON.parse(event.data);
  console.log('Delay alert:', data);
});
```

## GraphQL Queries

### Basic Flight Query

```graphql
query GetFlights($airport: String!, $date: Date!) {
  flights(airport: $airport, date: $date) {
    edges {
      node {
        id
        flightNumber
        airline {
          code
          name
        }
        origin {
          code
          name
        }
        destination {
          code
          name
        }
        scheduledDeparture
        actualDeparture
        status
        gate
        terminal
      }
    }
    pageInfo {
      hasNextPage
      endCursor
    }
  }
}
```

### Query with Predictions

```graphql
query FlightWithPrediction($flightId: ID!) {
  flight(id: $flightId) {
    flightNumber
    status
    scheduledDeparture
    prediction {
      delayProbability
      expectedDelayMinutes
      riskLevel
      lastUpdated
    }
  }
}
```

### Real-time Subscription

```graphql
subscription AirportUpdates($airports: [String!]!) {
  airportFlightUpdates(airports: $airports) {
    airport
    flight {
      flightNumber
      status
      gate
    }
    updateType
    timestamp
  }
}
```

## Webhook Integration

### Register a Webhook

```bash
curl -X POST http://localhost:3001/api/v1/webhooks \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://your-app.com/webhook",
    "events": ["flight.delayed", "flight.cancelled", "pattern.detected"],
    "filters": {
      "airports": ["SFO", "LAX"],
      "minDelay": 30,
      "severity": "high"
    },
    "headers": {
      "X-Custom-Secret": "your-webhook-secret"
    }
  }'
```

### Webhook Payload Examples

Flight Delayed:
```json
{
  "event": "flight.delayed",
  "timestamp": "2025-08-02T14:45:00Z",
  "data": {
    "flight": {
      "id": "UA123-20250802",
      "flightNumber": "UA123",
      "airline": "UA",
      "origin": "SFO",
      "destination": "LAX"
    },
    "delay": {
      "minutes": 45,
      "reason": "Weather",
      "previousDelay": 15
    }
  }
}
```

Pattern Detected:
```json
{
  "event": "pattern.detected",
  "timestamp": "2025-08-02T15:00:00Z",
  "data": {
    "pattern": {
      "id": "pat_123456",
      "type": "cascading",
      "severity": "high",
      "description": "Cascading delays detected from weather system"
    },
    "affectedAirports": ["SFO", "LAX", "SEA"],
    "estimatedImpact": {
      "flights": 125,
      "passengers": 15000
    }
  }
}
```

## Batch Operations

### Multiple Operations in One Request

```bash
curl -X POST http://localhost:3001/api/v1/batch \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "operations": [
      {
        "method": "GET",
        "path": "/flights/UA123-20250802"
      },
      {
        "method": "POST",
        "path": "/predictions/delay",
        "body": {
          "flightNumber": "UA123",
          "airline": "UA",
          "origin": "SFO",
          "destination": "LAX",
          "scheduledTime": "2025-08-02T14:30:00Z"
        }
      },
      {
        "method": "GET",
        "path": "/patterns/summary?airport=SFO"
      }
    ]
  }'
```

## Error Handling

### Rate Limit Error
```json
{
  "success": false,
  "error": "Rate limit exceeded",
  "code": "RATE_LIMITED",
  "details": {
    "limit": 1000,
    "remaining": 0,
    "reset": "2025-08-02T15:00:00Z"
  }
}
```

### Validation Error
```json
{
  "success": false,
  "error": "Validation failed",
  "code": "VALIDATION_ERROR",
  "details": {
    "fields": {
      "scheduledTime": "Invalid date format",
      "airline": "Airline code must be 2 characters"
    }
  }
}
```

## SDK Usage Examples

### Python

```python
from airport_flight_data import AirportFlightDataClient
import asyncio

# Initialize client
client = AirportFlightDataClient(
    api_key="YOUR_API_KEY",
    base_url="http://localhost:3001/api/v2"
)

# Async context manager for automatic cleanup
async def main():
    async with client:
        # Get flights
        flights = await client.flights.list(
            airport="SFO",
            status="active",
            limit=10
        )
        
        # Predict delays for multiple flights
        predictions = await client.predictions.batch([
            {
                "flightNumber": flight.flight_number,
                "airline": flight.airline,
                "origin": flight.origin,
                "destination": flight.destination,
                "scheduledTime": flight.scheduled_time
            }
            for flight in flights.data
        ])
        
        # Subscribe to real-time updates
        async for update in client.websocket.subscribe_airport("SFO"):
            print(f"Update: {update}")

asyncio.run(main())
```

### JavaScript/TypeScript

```typescript
import { AirportFlightDataClient } from '@airport-flight-data/sdk';

const client = new AirportFlightDataClient({
  apiKey: 'YOUR_API_KEY',
  baseUrl: 'http://localhost:3001/api/v2'
});

// Get flights with predictions
async function getFlightsWithPredictions() {
  const flights = await client.flights.list({
    airport: 'SFO',
    date: '2025-08-02'
  });
  
  const predictions = await Promise.all(
    flights.data.map(flight => 
      client.predictions.delay({
        flightNumber: flight.flightNumber,
        airline: flight.airline,
        origin: flight.origin,
        destination: flight.destination,
        scheduledTime: flight.scheduledTime
      })
    )
  );
  
  return flights.data.map((flight, i) => ({
    ...flight,
    prediction: predictions[i]
  }));
}

// Subscribe to updates
client.websocket.on('flight:delay', (data) => {
  console.log(`Flight ${data.flight.flightNumber} delayed by ${data.delay.minutes} minutes`);
});

client.websocket.subscribeAirport(['SFO', 'LAX']);
```

## Performance Tips

1. **Use GraphQL for Complex Queries**: Reduce API calls by fetching related data in one request
2. **Enable Compression**: Add `Accept-Encoding: gzip` header
3. **Cache Predictions**: Predictions are valid for 5-15 minutes
4. **Use Batch Endpoints**: Process multiple operations in one request
5. **Subscribe to Updates**: Use WebSocket/SSE instead of polling
6. **Filter Exports**: Use date ranges and filters to reduce export size
7. **Paginate Large Results**: Use cursor-based pagination for large datasets

## Common Use Cases

### Dashboard Display
```javascript
// Fetch initial data
const [flights, stats, patterns] = await Promise.all([
  client.flights.list({ airport: 'SFO', limit: 50 }),
  client.statistics.airport('SFO'),
  client.patterns.insights({ priority: 'high' })
]);

// Subscribe to updates
client.websocket.subscribeAirport(['SFO']);
```

### Delay Alert System
```javascript
// Monitor high-risk flights
const highRisk = await client.predictions.highRisk({ 
  threshold: 0.7,
  airports: ['SFO', 'LAX', 'ORD'] 
});

// Set up alerts
highRisk.data.forEach(flight => {
  if (flight.riskLevel === 'critical') {
    sendAlert(flight);
  }
});
```

### Historical Analysis
```python
# Export data for analysis
data = await client.export.flights(
    start_date="2025-01-01",
    end_date="2025-07-31",
    format="parquet",
    filters={
        "airports": ["SFO", "LAX"],
        "airlines": ["UA", "AA", "DL"]
    }
)

# Analyze patterns
patterns = await client.patterns.analyze(
    start_date="2025-01-01",
    end_date="2025-07-31",
    pattern_types=["temporal", "cascading", "seasonal"]
)
```