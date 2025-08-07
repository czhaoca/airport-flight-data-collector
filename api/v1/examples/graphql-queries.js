/**
 * Example GraphQL queries for the Airport Flight Data API
 * These can be used in GraphQL Playground or any GraphQL client
 */

// Basic flight query
const GET_FLIGHTS = `
  query GetFlights($airport: String!, $type: FlightType, $limit: Int) {
    flights(airport: $airport, type: $type, limit: $limit) {
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
          scheduledTime
          status
          gate
        }
      }
      totalCount
    }
  }
`;

// Flight search with full details
const SEARCH_FLIGHT = `
  query SearchFlight($flightNumber: String!, $date: DateTime) {
    searchFlights(flightNumber: $flightNumber, date: $date) {
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
        timezone
      }
      destination {
        code
        name
        city
        timezone
      }
      scheduledTime
      actualTime
      estimatedTime
      status
      gate
      terminal
      aircraft {
        model
        registration
        type
      }
      delay {
        minutes
        reason
        type
        severity
      }
      baggage {
        claim
        estimatedTime
      }
    }
  }
`;

// Airport statistics
const AIRPORT_STATS = `
  query AirportStatistics($airport: String!, $days: Int = 30) {
    airportStatistics(
      airport: $airport
      startDate: $startDate
      endDate: $endDate
    ) {
      airport {
        code
        name
        city
        country
        timezone
        coordinates {
          latitude
          longitude
        }
      }
      totalFlights
      departures
      arrivals
      delayedFlights
      cancelledFlights
      onTimePercentage
      averageDelay
      topDestinations {
        airport {
          code
          name
        }
        flights
        percentage
      }
      topAirlines {
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
`;

// System overview
const SYSTEM_OVERVIEW = `
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
    
    airports {
      code
      name
      city
      country
    }
  }
`;

// Delayed flights
const DELAYED_FLIGHTS = `
  query DelayedFlights($airport: String, $minDelay: Int = 30) {
    delays(airport: $airport, minDelay: $minDelay) {
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
        scheduledTime
      }
      delay {
        minutes
        reason
        type
        severity
      }
      newTime
      impact
    }
  }
`;

// Rankings
const AIRPORT_RANKINGS = `
  query AirportRankings($metric: RankingMetric!) {
    rankings(
      category: AIRPORTS
      metric: $metric
      limit: 10
    ) {
      rank
      entity {
        ... on Airport {
          code
          name
          city
        }
      }
      metric
      change
    }
  }
`;

// Login mutation
const LOGIN = `
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
`;

// Create webhook
const CREATE_WEBHOOK = `
  mutation CreateWebhook($input: CreateWebhookInput!) {
    createWebhook(input: $input) {
      id
      url
      events
      filters
      secret
      active
      createdAt
    }
  }
`;

// Batch job
const CREATE_BATCH_JOB = `
  mutation CreateBatchJob($operations: [BatchOperationInput!]!) {
    createBatchJob(operations: $operations) {
      id
      status
      totalOperations
      progress
      createdAt
    }
  }
`;

// Flight updates subscription
const FLIGHT_UPDATES_SUBSCRIPTION = `
  subscription FlightUpdates($airports: [String!], $airlines: [String!]) {
    flightUpdated(airports: $airports, airlines: $airlines) {
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
`;

// Delay notifications subscription
const DELAY_NOTIFICATIONS_SUBSCRIPTION = `
  subscription DelayNotifications($airports: [String!], $minDelay: Int = 15) {
    flightDelayed(airports: $airports, minDelay: $minDelay) {
      flight {
        flightNumber
        airline {
          code
          name
        }
        origin {
          code
        }
        destination {
          code
        }
        scheduledTime
      }
      delay {
        minutes
        reason
        type
        severity
      }
      previousDelay
      impact
      timestamp
    }
  }
`;

// Gate changes subscription
const GATE_CHANGES_SUBSCRIPTION = `
  subscription GateChanges($airports: [String!]) {
    gateChanged(airports: $airports) {
      flight {
        flightNumber
        airline {
          name
        }
        scheduledTime
      }
      previousGate
      newGate
      terminal
      timestamp
    }
  }
`;

// Airport stats updates subscription
const AIRPORT_STATS_SUBSCRIPTION = `
  subscription AirportStatsUpdates($airports: [String!]!) {
    airportStatsUpdated(airports: $airports) {
      airport {
        code
        name
      }
      stats {
        totalFlights
        delayedFlights
        cancelledFlights
        onTimePercentage
        averageDelay
      }
      changes
      timestamp
    }
  }
`;

// System alerts subscription
const SYSTEM_ALERTS_SUBSCRIPTION = `
  subscription SystemAlerts($severity: [AlertSeverity!]) {
    systemAlert(severity: $severity) {
      id
      severity
      type
      title
      message
      affectedAirports
      timestamp
    }
  }
`;

// Example usage with a GraphQL client
const exampleUsage = async () => {
  const { GraphQLClient } = require('graphql-request');
  
  const client = new GraphQLClient('http://localhost:3001/api/v2/graphql', {
    headers: {
      authorization: 'Bearer YOUR_API_TOKEN',
    },
  });

  // Get flights
  const flights = await client.request(GET_FLIGHTS, {
    airport: 'SFO',
    type: 'DEPARTURE',
    limit: 10
  });

  // Search for a specific flight
  const searchResult = await client.request(SEARCH_FLIGHT, {
    flightNumber: 'UA123',
    date: '2025-08-01T00:00:00Z'
  });

  // Get airport statistics
  const stats = await client.request(AIRPORT_STATS, {
    airport: 'SFO',
    startDate: '2025-07-01T00:00:00Z',
    endDate: '2025-07-31T23:59:59Z'
  });

  return { flights, searchResult, stats };
};

// Example WebSocket subscription
const exampleSubscription = () => {
  const { createClient } = require('graphql-ws');
  
  const client = createClient({
    url: 'ws://localhost:3001/graphql',
    connectionParams: {
      authorization: 'Bearer YOUR_API_TOKEN'
    }
  });

  // Subscribe to flight updates
  const unsubscribe = client.subscribe(
    {
      query: FLIGHT_UPDATES_SUBSCRIPTION,
      variables: {
        airports: ['SFO', 'LAX']
      }
    },
    {
      next: (data) => console.log('Flight update:', data),
      error: (err) => console.error('Subscription error:', err),
      complete: () => console.log('Subscription complete')
    }
  );

  // Unsubscribe after 1 hour
  setTimeout(() => {
    unsubscribe();
  }, 3600000);
};

module.exports = {
  queries: {
    GET_FLIGHTS,
    SEARCH_FLIGHT,
    AIRPORT_STATS,
    SYSTEM_OVERVIEW,
    DELAYED_FLIGHTS,
    AIRPORT_RANKINGS
  },
  mutations: {
    LOGIN,
    CREATE_WEBHOOK,
    CREATE_BATCH_JOB
  },
  subscriptions: {
    FLIGHT_UPDATES_SUBSCRIPTION,
    DELAY_NOTIFICATIONS_SUBSCRIPTION,
    GATE_CHANGES_SUBSCRIPTION,
    AIRPORT_STATS_SUBSCRIPTION,
    SYSTEM_ALERTS_SUBSCRIPTION
  },
  examples: {
    exampleUsage,
    exampleSubscription
  }
};