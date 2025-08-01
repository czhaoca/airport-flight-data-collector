const { getDatabase } = require('../../../../../lib/database');
const { apiLogger } = require('../../../../../lib/logging');

const logger = apiLogger.child('GraphQL:Flights');

module.exports = {
  Query: {
    flights: async (_, args) => {
      try {
        const db = await getDatabase();
        const { 
          airport, type, startDate, endDate, 
          airline, status, limit = 100, offset = 0 
        } = args;

        // Build filters
        const filters = {};
        if (airport) filters.airport = airport;
        if (type) filters.type = type.toLowerCase();
        if (startDate) filters.startDate = startDate;
        if (endDate) filters.endDate = endDate;
        if (airline) filters.airline = airline;
        if (status) filters.status = status.toLowerCase();

        // Get flights with pagination
        const result = await db.getFlightData({
          filters,
          limit: limit + 1, // Get one extra to check hasNextPage
          offset
        });

        const flights = result.slice(0, limit);
        const hasNextPage = result.length > limit;

        // Create edges with cursors
        const edges = flights.map((flight, index) => ({
          node: flight,
          cursor: Buffer.from(`flight:${offset + index}`).toString('base64')
        }));

        // Get total count
        const totalCount = await db.getFlightCount(filters);

        return {
          edges,
          pageInfo: {
            hasNextPage,
            hasPreviousPage: offset > 0,
            startCursor: edges[0]?.cursor,
            endCursor: edges[edges.length - 1]?.cursor
          },
          totalCount
        };
      } catch (error) {
        logger.error('Failed to fetch flights', error);
        throw new Error('Failed to fetch flights');
      }
    },

    flight: async (_, { id }) => {
      try {
        const db = await getDatabase();
        const flights = await db.getFlightData({
          filters: { id }
        });
        return flights[0] || null;
      } catch (error) {
        logger.error('Failed to fetch flight', error);
        throw new Error('Failed to fetch flight');
      }
    },

    searchFlights: async (_, { flightNumber, date, airport }) => {
      try {
        const db = await getDatabase();
        const filters = { flightNumber };
        
        if (date) {
          filters.date = date;
        }
        if (airport) {
          filters.airport = airport;
        }

        const flights = await db.getFlightData({ filters });
        return flights;
      } catch (error) {
        logger.error('Failed to search flights', error);
        throw new Error('Failed to search flights');
      }
    },

    delays: async (_, { airport, minDelay = 15, startDate, endDate }) => {
      try {
        const db = await getDatabase();
        const filters = {
          minDelay,
          status: 'delayed'
        };

        if (airport) filters.airport = airport;
        if (startDate) filters.startDate = startDate;
        if (endDate) filters.endDate = endDate;

        const flights = await db.getFlightData({ filters });
        
        return flights.map(flight => ({
          flight,
          delay: flight.delay || {
            minutes: flight.delayMinutes || 0,
            reason: flight.delayReason || 'Unknown',
            type: 'OTHER',
            severity: flight.delayMinutes > 120 ? 'SEVERE' : 
                     flight.delayMinutes > 30 ? 'MODERATE' : 'MINOR'
          },
          newTime: flight.estimatedTime || flight.actualTime,
          impact: flight.delayMinutes > 60 ? 'Significant' : 'Minor'
        }));
      } catch (error) {
        logger.error('Failed to fetch delays', error);
        throw new Error('Failed to fetch delays');
      }
    }
  },

  Flight: {
    airline: async (flight) => {
      // In a real implementation, fetch airline details
      return {
        code: flight.airline,
        name: getAirlineName(flight.airline),
        country: 'US', // Would be fetched from database
        alliance: getAlliance(flight.airline)
      };
    },

    origin: async (flight) => {
      // In a real implementation, fetch airport details
      return {
        code: flight.origin,
        name: getAirportName(flight.origin),
        city: getCityName(flight.origin),
        country: 'US',
        timezone: getTimezone(flight.origin),
        coordinates: {
          latitude: 0, // Would be fetched from database
          longitude: 0
        },
        terminals: []
      };
    },

    destination: async (flight) => {
      // In a real implementation, fetch airport details
      return {
        code: flight.destination,
        name: getAirportName(flight.destination),
        city: getCityName(flight.destination),
        country: 'US',
        timezone: getTimezone(flight.destination),
        coordinates: {
          latitude: 0, // Would be fetched from database
          longitude: 0
        },
        terminals: []
      };
    },

    aircraft: (flight) => {
      if (!flight.aircraft) return null;
      
      // Handle both string and object aircraft data
      if (typeof flight.aircraft === 'string') {
        return {
          model: flight.aircraft,
          registration: null,
          type: 'Unknown',
          capacity: null
        };
      }
      
      return flight.aircraft;
    },

    delay: (flight) => {
      if (!flight.delayMinutes || flight.delayMinutes <= 0) return null;
      
      return {
        minutes: flight.delayMinutes,
        reason: flight.delayReason || 'Unknown',
        type: getDelayType(flight.delayReason),
        severity: flight.delayMinutes > 120 ? 'SEVERE' : 
                 flight.delayMinutes > 30 ? 'MODERATE' : 'MINOR'
      };
    },

    cancellation: (flight) => {
      if (flight.status !== 'cancelled') return null;
      
      return {
        reason: flight.cancellationReason || 'Unknown',
        code: flight.cancellationCode,
        timestamp: flight.cancelledAt || flight.updatedAt
      };
    },

    baggage: (flight) => {
      if (!flight.baggageClaim) return null;
      
      return {
        claim: flight.baggageClaim,
        estimatedTime: flight.baggageTime
      };
    }
  }
};

// Helper functions (in production, these would fetch from database)
function getAirlineName(code) {
  const airlines = {
    'UA': 'United Airlines',
    'AA': 'American Airlines',
    'DL': 'Delta Air Lines',
    'WN': 'Southwest Airlines',
    'AC': 'Air Canada',
    'WS': 'WestJet'
  };
  return airlines[code] || code;
}

function getAirportName(code) {
  const airports = {
    'SFO': 'San Francisco International Airport',
    'LAX': 'Los Angeles International Airport',
    'ORD': "Chicago O'Hare International Airport",
    'YYZ': 'Toronto Pearson International Airport',
    'YVR': 'Vancouver International Airport'
  };
  return airports[code] || code;
}

function getCityName(code) {
  const cities = {
    'SFO': 'San Francisco',
    'LAX': 'Los Angeles',
    'ORD': 'Chicago',
    'YYZ': 'Toronto',
    'YVR': 'Vancouver'
  };
  return cities[code] || code;
}

function getTimezone(code) {
  const timezones = {
    'SFO': 'America/Los_Angeles',
    'LAX': 'America/Los_Angeles',
    'ORD': 'America/Chicago',
    'YYZ': 'America/Toronto',
    'YVR': 'America/Vancouver'
  };
  return timezones[code] || 'UTC';
}

function getAlliance(airline) {
  const alliances = {
    'UA': 'Star Alliance',
    'AA': 'Oneworld',
    'DL': 'SkyTeam',
    'AC': 'Star Alliance'
  };
  return alliances[airline] || null;
}

function getDelayType(reason) {
  if (!reason) return 'OTHER';
  
  const lowerReason = reason.toLowerCase();
  if (lowerReason.includes('weather')) return 'WEATHER';
  if (lowerReason.includes('technical') || lowerReason.includes('maintenance')) return 'TECHNICAL';
  if (lowerReason.includes('security')) return 'SECURITY';
  if (lowerReason.includes('atc') || lowerReason.includes('traffic')) return 'ATC';
  if (lowerReason.includes('crew') || lowerReason.includes('staff')) return 'OPERATIONAL';
  
  return 'OTHER';
}