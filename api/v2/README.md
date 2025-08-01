# Airport Flight Data API v2

Comprehensive REST and GraphQL API for accessing flight data, predictions, and analytics.

## Overview

The Airport Flight Data API v2 provides:

- **RESTful endpoints** for all operations
- **GraphQL API** with real-time subscriptions
- **WebSocket support** for live updates
- **Machine Learning** predictions and pattern detection
- **Data export** in multiple formats
- **Webhook integrations** for event notifications
- **Batch operations** for efficient bulk processing

## Base URL

```
Production: https://api.airportflightdata.com
Development: http://localhost:3001
```

## Authentication

All API requests require authentication using Bearer tokens:

```
Authorization: Bearer YOUR_API_TOKEN
```

## Features

### 1. Flight Data Access
- Real-time flight status
- Historical flight data
- Flight search and filtering
- Delay and cancellation tracking

### 2. Airport Information
- Airport statistics
- Terminal and gate information
- Traffic patterns
- Performance metrics

### 3. Predictive Analytics
- **Delay Predictions**: ML-based delay probability and duration estimates
- **Pattern Detection**: Automated discovery of operational patterns
- **Risk Assessment**: Flight and route risk scoring

### 4. Real-time Updates
- WebSocket connections for live data
- Server-sent events (SSE) for status changes
- GraphQL subscriptions for selective updates

### 5. Data Export & Integration
- Export data in JSON, CSV, and Parquet formats
- Webhook notifications for events
- Batch API operations
- Python SDK for easy integration

## REST API Endpoints

### Core Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v2/flights` | GET | List flights with filtering |
| `/api/v2/flights/:id` | GET | Get specific flight details |
| `/api/v2/airports` | GET | List all airports |
| `/api/v2/airports/:code` | GET | Get airport details |
| `/api/v2/statistics` | GET | System-wide statistics |

### Prediction Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v2/predictions/delay` | POST | Predict delay for a flight |
| `/api/v2/predictions/batch` | POST | Batch delay predictions |
| `/api/v2/predictions/upcoming` | GET | Predictions for upcoming flights |
| `/api/v2/predictions/high-risk` | GET | High-risk flight alerts |
| `/api/v2/predictions/metrics` | GET | Model performance metrics |

### Pattern Analysis Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v2/patterns` | GET | Get detected patterns |
| `/api/v2/patterns/summary` | GET | Pattern analysis summary |
| `/api/v2/patterns/type/:type` | GET | Patterns by type |
| `/api/v2/patterns/insights` | GET | Actionable insights |
| `/api/v2/patterns/alerts` | GET | Real-time pattern alerts |
| `/api/v2/patterns/analyze` | POST | Custom date range analysis |

### Export & Integration

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v2/export/flights` | GET | Export flight data |
| `/api/v2/export/statistics` | GET | Export statistics |
| `/api/v2/webhooks` | POST | Create webhook |
| `/api/v2/batch` | POST | Batch operations |

## GraphQL API

### Endpoint

```
POST /api/v2/graphql
WS   ws://localhost:3001/graphql (subscriptions)
```

### Example Query

```graphql
query GetFlightWithPrediction($flightNumber: String!) {
  searchFlights(flightNumber: $flightNumber) {
    id
    flightNumber
    status
    scheduledTime
    delay {
      minutes
      reason
    }
  }
  
  delayPrediction(flightData: {
    flightNumber: $flightNumber
    airline: "UA"
    origin: "SFO"
    destination: "LAX"
    scheduledTime: "2025-08-02T08:00:00Z"
  }) {
    delayProbability
    expectedDelayMinutes
    riskLevel
    factors {
      factor
      impact
    }
  }
}
```

### Subscriptions

```graphql
subscription FlightUpdates($airports: [String!]) {
  flightUpdated(airports: $airports) {
    flight {
      flightNumber
      status
      gate
    }
    changes
    timestamp
  }
  
  delayPredictionUpdate(airports: $airports) {
    flight {
      flightNumber
    }
    prediction {
      delayProbability
      riskLevel
    }
  }
}
```

## WebSocket Events

Connect to `ws://localhost:3001/socket.io` for real-time updates.

### Available Events

- `flight:update` - Flight status changes
- `flight:delay` - Delay notifications
- `flight:cancelled` - Cancellation alerts
- `airport:stats` - Airport statistics updates
- `pattern:detected` - New pattern discoveries
- `prediction:update` - Prediction changes

## Machine Learning Features

### Delay Prediction Model

The system uses gradient boosting to analyze 11 key features:

1. Hour of day
2. Day of week
3. Month
4. Airline delay rate
5. Airport delay rate
6. Route delay rate
7. Weather impact
8. Previous flight delay
9. Aircraft turnaround time
10. Terminal congestion
11. Seasonal factors

**Model Performance:**
- Accuracy: ~85%
- Precision: ~82%
- Recall: ~78%
- F1 Score: ~0.80

### Pattern Detection

Six categories of automated pattern analysis:

1. **Temporal Patterns**: Time-based trends and recurring delays
2. **Spatial Patterns**: Route and airport-specific issues
3. **Operational Patterns**: Aircraft utilization and turnaround problems
4. **Anomalies**: Statistical outliers and unusual events
5. **Cascading Delays**: Delay propagation analysis
6. **Seasonal Patterns**: Monthly and seasonal variations

## Data Export Formats

### JSON
Standard JSON format for programmatic access.

### CSV
Comma-separated values for spreadsheet applications.

### Parquet
Columnar storage format for big data processing.

## Rate Limits

- **Authenticated**: 1000 requests per hour
- **Unauthenticated**: 100 requests per hour
- **WebSocket**: 10 concurrent connections
- **Batch Operations**: 100 operations per request

## Error Responses

```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {}
}
```

Common error codes:
- `UNAUTHORIZED` - Invalid or missing token
- `RATE_LIMITED` - Rate limit exceeded
- `NOT_FOUND` - Resource not found
- `VALIDATION_ERROR` - Invalid request parameters
- `INTERNAL_ERROR` - Server error

## SDKs and Libraries

### Python SDK

```python
from airport_flight_data import AirportFlightDataClient

client = AirportFlightDataClient(api_key="YOUR_KEY")

# Get flights
flights = client.flights.list(airport="SFO")

# Predict delays
prediction = client.predictions.delay({
    "flightNumber": "UA123",
    "airline": "UA",
    "origin": "SFO",
    "destination": "LAX",
    "scheduledTime": "2025-08-02T08:00:00Z"
})

# Subscribe to updates
def on_update(data):
    print(f"Flight {data['flightNumber']} updated")

client.websocket.subscribe_airport("SFO", on_update)
```

### JavaScript/Node.js

```javascript
const { GraphQLClient } = require('graphql-request');

const client = new GraphQLClient('http://localhost:3001/api/v2/graphql', {
  headers: {
    authorization: 'Bearer YOUR_KEY',
  },
});

// Query flights with predictions
const query = `
  query GetFlights($airport: String!) {
    flights(airport: $airport, limit: 10) {
      edges {
        node {
          flightNumber
          status
        }
      }
    }
  }
`;

const data = await client.request(query, { airport: 'SFO' });
```

## Webhook Integration

Register webhooks to receive real-time notifications:

```json
POST /api/v2/webhooks
{
  "url": "https://your-app.com/webhook",
  "events": ["flight.delayed", "flight.cancelled"],
  "filters": {
    "airport": "SFO",
    "minDelay": 30
  }
}
```

## Best Practices

1. **Use GraphQL** for complex queries to reduce API calls
2. **Subscribe to specific events** rather than polling
3. **Cache prediction results** for 5-15 minutes
4. **Use batch operations** for bulk updates
5. **Export large datasets** in Parquet format
6. **Monitor pattern insights** weekly
7. **Set up webhooks** for critical alerts

## Support

- Documentation: https://docs.airportflightdata.com
- API Status: https://status.airportflightdata.com
- Support: support@airportflightdata.com
- GitHub: https://github.com/czhaoca/airport-flight-data-collector