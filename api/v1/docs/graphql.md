# GraphQL API Documentation

The Airport Flight Data Collector provides a GraphQL API for flexible queries and real-time subscriptions.

## Endpoint

- **GraphQL Endpoint**: `POST http://localhost:3001/api/v1/graphql`
- **GraphQL Subscriptions**: `ws://localhost:3001/graphql`
- **GraphQL Playground**: `http://localhost:3001/api/v1/graphql` (in development mode)

## Authentication

Include your API token in the Authorization header:

```
Authorization: Bearer YOUR_API_TOKEN
```

## Example Queries

### Get Flights with Pagination

```graphql
query GetFlights($airport: String!, $limit: Int, $offset: Int) {
  flights(airport: $airport, limit: $limit, offset: $offset) {
    edges {
      node {
        id
        flightNumber
        airline {
          code
          name
          alliance
        }
        origin {
          code
          name
          city
        }
        destination {
          code
          name
          city
        }
        scheduledTime
        actualTime
        status
        gate
        terminal
        delay {
          minutes
          reason
          severity
        }
      }
      cursor
    }
    pageInfo {
      hasNextPage
      hasPreviousPage
      startCursor
      endCursor
    }
    totalCount
  }
}
```

### Search for a Specific Flight

```graphql
query SearchFlight($flightNumber: String!, $date: DateTime) {
  searchFlights(flightNumber: $flightNumber, date: $date) {
    id
    flightNumber
    status
    scheduledTime
    actualTime
    gate
    terminal
    aircraft {
      model
      registration
    }
  }
}
```

### Get Airport Statistics

```graphql
query AirportStats($airport: String!, $startDate: DateTime, $endDate: DateTime) {
  airportStatistics(
    airport: $airport
    startDate: $startDate
    endDate: $endDate
    granularity: DAILY
  ) {
    airport {
      code
      name
      city
      timezone
    }
    period {
      start
      end
    }
    totalFlights
    departures
    arrivals
    delayedFlights
    cancelledFlights
    onTimePercentage
    averageDelay
    topDestinations(limit: 5) {
      airport {
        code
        name
      }
      flights
      percentage
    }
    topAirlines(limit: 5) {
      airline {
        code
        name
      }
      flights
      onTimePercentage
    }
    hourlyDistribution {
      hour
      flights
      delays
    }
  }
}
```

### Get System Overview

```graphql
query SystemOverview {
  statistics {
    totalAirports
    totalFlights
    totalAirlines
    activeFlights
    delayedFlights
    cancelledFlights
    onTimePercentage
    averageDelay
    lastUpdate
  }
}
```

### Get Rankings

```graphql
query GetRankings($startDate: DateTime, $endDate: DateTime) {
  rankings(
    category: AIRPORTS
    metric: ONTIME
    startDate: $startDate
    endDate: $endDate
    limit: 10
  ) {
    rank
    entity {
      ... on Airport {
        code
        name
        city
      }
      ... on Airline {
        code
        name
        alliance
      }
    }
    metric
    change
  }
}
```

## Example Mutations

### Login

```graphql
mutation Login($email: String!, $password: String!) {
  login(email: $email, password: $password) {
    token
    refreshToken
    user {
      id
      email
      name
      role
    }
    expiresIn
  }
}
```

### Create Webhook

```graphql
mutation CreateWebhook($input: CreateWebhookInput!) {
  createWebhook(input: $input) {
    id
    url
    events
    secret
    active
    createdAt
  }
}
```

Variables:
```json
{
  "input": {
    "url": "https://example.com/webhook",
    "events": ["FLIGHT_DELAYED", "FLIGHT_CANCELLED"],
    "filters": {
      "airport": "SFO",
      "minDelay": 30
    }
  }
}
```

### Create Batch Job

```graphql
mutation CreateBatch($operations: [BatchOperationInput!]!) {
  createBatchJob(operations: $operations) {
    id
    status
    totalOperations
    progress
  }
}
```

Variables:
```json
{
  "operations": [
    {
      "method": "GET",
      "endpoint": "/flights/FL123"
    },
    {
      "method": "GET",
      "endpoint": "/flights/FL456"
    }
  ]
}
```

## Example Subscriptions

### Subscribe to Flight Updates

```graphql
subscription FlightUpdates($airports: [String!]) {
  flightUpdated(airports: $airports) {
    flight {
      id
      flightNumber
      status
      gate
      actualTime
    }
    previousStatus
    changes
    timestamp
  }
}
```

### Subscribe to Delay Notifications

```graphql
subscription DelayNotifications($airports: [String!], $minDelay: Int) {
  flightDelayed(airports: $airports, minDelay: $minDelay) {
    flight {
      flightNumber
      airline {
        name
      }
      origin {
        code
      }
      destination {
        code
      }
    }
    delay {
      minutes
      reason
      severity
    }
    impact
    timestamp
  }
}
```

### Subscribe to Gate Changes

```graphql
subscription GateChanges($airports: [String!]) {
  gateChanged(airports: $airports) {
    flight {
      flightNumber
      scheduledTime
    }
    previousGate
    newGate
    terminal
    timestamp
  }
}
```

### Subscribe to Airport Statistics Updates

```graphql
subscription AirportStats($airports: [String!]!) {
  airportStatsUpdated(airports: $airports) {
    airport {
      code
      name
    }
    stats {
      totalFlights
      delayedFlights
      onTimePercentage
    }
    changes
    timestamp
  }
}
```

## Schema Types

### Core Types

- **Flight**: Complete flight information including status, delays, gates
- **Airport**: Airport details with coordinates, terminals, and statistics
- **Airline**: Airline information with alliance and statistics
- **Aircraft**: Aircraft model and registration details
- **Delay**: Delay information with minutes, reason, type, and severity
- **Cancellation**: Cancellation details with reason and timestamp

### Connection Types

- **FlightConnection**: Paginated flight results with edges and pageInfo
- **PageInfo**: Pagination information with cursors

### Statistics Types

- **SystemStatistics**: Overall system metrics
- **AirportStatistics**: Detailed airport performance metrics
- **AirlineStatistics**: Airline performance data

### Real-time Types

- **FlightUpdate**: Real-time flight status changes
- **DelayNotification**: Delay alerts with impact assessment
- **CancellationNotification**: Cancellation alerts with alternatives
- **GateChangeNotification**: Gate change alerts
- **AirportStatsUpdate**: Real-time statistics updates
- **SystemAlert**: System-wide alerts and notifications

## Error Handling

GraphQL errors follow this format:

```json
{
  "errors": [
    {
      "message": "Error message",
      "extensions": {
        "code": "ERROR_CODE"
      },
      "path": ["query", "field"]
    }
  ]
}
```

Common error codes:
- `UNAUTHENTICATED`: Missing or invalid authentication
- `FORBIDDEN`: Insufficient permissions
- `NOT_FOUND`: Resource not found
- `BAD_USER_INPUT`: Invalid input parameters
- `INTERNAL_SERVER_ERROR`: Server error

## Rate Limiting

GraphQL queries are subject to the same rate limits as REST API endpoints:
- 100 requests per minute for authenticated users
- 20 requests per minute for unauthenticated users

Complex queries that fetch large amounts of data may count as multiple requests.

## Best Practices

1. **Use Fragments** for reusable field selections:
   ```graphql
   fragment FlightBasics on Flight {
     id
     flightNumber
     status
     scheduledTime
   }
   ```

2. **Request Only Needed Fields** to minimize response size and improve performance

3. **Use Variables** for dynamic values instead of string interpolation

4. **Batch Related Queries** in a single request when possible

5. **Use Subscriptions Wisely** - unsubscribe when no longer needed

6. **Implement Proper Error Handling** for network and GraphQL errors

7. **Use Cursor-based Pagination** for large result sets