const { getDatabase } = require('../../../../../lib/database');
const { apiLogger } = require('../../../../../lib/logging');

const logger = apiLogger.child('GraphQL:Airports');

module.exports = {
  Query: {
    airports: async () => {
      try {
        // In production, fetch from database
        const airports = [
          {
            code: 'SFO',
            name: 'San Francisco International Airport',
            city: 'San Francisco',
            country: 'USA',
            timezone: 'America/Los_Angeles',
            coordinates: { latitude: 37.6213, longitude: -122.3790 },
            terminals: ['1', '2', '3', 'International']
          },
          {
            code: 'YYZ',
            name: 'Toronto Pearson International Airport',
            city: 'Toronto',
            country: 'Canada',
            timezone: 'America/Toronto',
            coordinates: { latitude: 43.6777, longitude: -79.6248 },
            terminals: ['1', '3']
          },
          {
            code: 'YVR',
            name: 'Vancouver International Airport',
            city: 'Vancouver',
            country: 'Canada',
            timezone: 'America/Vancouver',
            coordinates: { latitude: 49.1947, longitude: -123.1788 },
            terminals: ['Main', 'South']
          }
        ];
        
        return airports;
      } catch (error) {
        logger.error('Failed to fetch airports', error);
        throw new Error('Failed to fetch airports');
      }
    },

    airport: async (_, { code }) => {
      try {
        const airportData = {
          'SFO': {
            code: 'SFO',
            name: 'San Francisco International Airport',
            city: 'San Francisco',
            country: 'USA',
            timezone: 'America/Los_Angeles',
            coordinates: { latitude: 37.6213, longitude: -122.3790 },
            terminals: ['1', '2', '3', 'International']
          },
          'YYZ': {
            code: 'YYZ',
            name: 'Toronto Pearson International Airport',
            city: 'Toronto',
            country: 'Canada',
            timezone: 'America/Toronto',
            coordinates: { latitude: 43.6777, longitude: -79.6248 },
            terminals: ['1', '3']
          },
          'YVR': {
            code: 'YVR',
            name: 'Vancouver International Airport',
            city: 'Vancouver',
            country: 'Canada',
            timezone: 'America/Vancouver',
            coordinates: { latitude: 49.1947, longitude: -123.1788 },
            terminals: ['Main', 'South']
          }
        };
        
        return airportData[code.toUpperCase()] || null;
      } catch (error) {
        logger.error('Failed to fetch airport', error);
        throw new Error('Failed to fetch airport');
      }
    }
  },

  Airport: {
    airlines: async (airport) => {
      try {
        const db = await getDatabase();
        const flights = await db.getFlightData({
          filters: { airport: airport.code },
          limit: 1000
        });
        
        // Extract unique airlines
        const airlineSet = new Set(flights.map(f => f.airline));
        const airlines = Array.from(airlineSet).map(code => ({
          code,
          name: getAirlineName(code),
          country: 'US', // Would be fetched from database
          alliance: getAlliance(code)
        }));
        
        return airlines;
      } catch (error) {
        logger.error('Failed to fetch airlines', error);
        return [];
      }
    },

    destinations: async (airport) => {
      try {
        const db = await getDatabase();
        const flights = await db.getFlightData({
          filters: { 
            origin: airport.code,
            type: 'departure'
          },
          limit: 1000
        });
        
        // Extract unique destinations
        const destSet = new Set(flights.map(f => f.destination));
        const destinations = Array.from(destSet).map(code => ({
          code,
          name: getAirportName(code),
          city: getCityName(code),
          country: 'US', // Would be fetched from database
          timezone: getTimezone(code),
          coordinates: { latitude: 0, longitude: 0 },
          terminals: []
        }));
        
        return destinations;
      } catch (error) {
        logger.error('Failed to fetch destinations', error);
        return [];
      }
    },

    statistics: async (airport, { startDate, endDate }) => {
      try {
        const db = await getDatabase();
        const stats = await db.getAirportStats(airport.code, {
          startDate,
          endDate
        });
        
        return {
          airport,
          period: {
            start: startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            end: endDate || new Date()
          },
          totalFlights: stats.totalFlights || 0,
          departures: stats.departures || 0,
          arrivals: stats.arrivals || 0,
          delayedFlights: stats.delayedFlights || 0,
          cancelledFlights: stats.cancelledFlights || 0,
          onTimePercentage: stats.onTimePercentage || 0,
          averageDelay: stats.averageDelay || 0,
          busiestHour: stats.busiestHour || 12,
          topDestinations: [],
          topAirlines: [],
          hourlyDistribution: [],
          dailyTrend: []
        };
      } catch (error) {
        logger.error('Failed to fetch airport statistics', error);
        return null;
      }
    }
  },

  Airline: {
    statistics: async (airline, { startDate, endDate }) => {
      try {
        const db = await getDatabase();
        const flights = await db.getFlightData({
          filters: {
            airline: airline.code,
            startDate,
            endDate
          }
        });
        
        const delayedFlights = flights.filter(f => f.status === 'delayed').length;
        const cancelledFlights = flights.filter(f => f.status === 'cancelled').length;
        const totalDelayMinutes = flights.reduce((sum, f) => sum + (f.delayMinutes || 0), 0);
        
        return {
          airline,
          period: {
            start: startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            end: endDate || new Date()
          },
          totalFlights: flights.length,
          delayedFlights,
          cancelledFlights,
          onTimePercentage: ((flights.length - delayedFlights - cancelledFlights) / flights.length) * 100,
          averageDelay: flights.length > 0 ? totalDelayMinutes / flights.length : 0,
          topRoutes: []
        };
      } catch (error) {
        logger.error('Failed to fetch airline statistics', error);
        return null;
      }
    }
  }
};

// Helper functions (same as in flights.js)
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