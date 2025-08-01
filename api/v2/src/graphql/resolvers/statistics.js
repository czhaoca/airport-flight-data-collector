const { getDatabase } = require('../../../../../lib/database');
const { apiLogger } = require('../../../../../lib/logging');

const logger = apiLogger.child('GraphQL:Statistics');

module.exports = {
  Query: {
    statistics: async (_, { startDate, endDate }) => {
      try {
        const db = await getDatabase();
        
        // Get overall statistics
        const stats = await db.getSystemStats({
          startDate,
          endDate
        });
        
        return {
          totalAirports: 3, // SFO, YYZ, YVR
          totalFlights: stats.totalFlights || 0,
          totalAirlines: stats.totalAirlines || 0,
          activeFlights: stats.activeFlights || 0,
          delayedFlights: stats.delayedFlights || 0,
          cancelledFlights: stats.cancelledFlights || 0,
          onTimePercentage: stats.onTimePercentage || 0,
          averageDelay: stats.averageDelay || 0,
          lastUpdate: new Date()
        };
      } catch (error) {
        logger.error('Failed to fetch system statistics', error);
        throw new Error('Failed to fetch system statistics');
      }
    },

    airportStatistics: async (_, { airport, startDate, endDate, granularity }) => {
      try {
        const db = await getDatabase();
        const stats = await db.getAirportStats(airport, {
          startDate,
          endDate,
          granularity: granularity?.toLowerCase()
        });
        
        // Get airport details
        const airportData = {
          code: airport,
          name: getAirportName(airport),
          city: getCityName(airport),
          country: 'US',
          timezone: getTimezone(airport),
          coordinates: { latitude: 0, longitude: 0 },
          terminals: []
        };
        
        // Get hourly distribution
        const hourlyDistribution = await getHourlyDistribution(db, airport, startDate, endDate);
        
        // Get daily trend
        const dailyTrend = await getDailyTrend(db, airport, startDate, endDate);
        
        // Get top destinations
        const topDestinations = await getTopDestinations(db, airport, startDate, endDate);
        
        // Get top airlines
        const topAirlines = await getTopAirlines(db, airport, startDate, endDate);
        
        return {
          airport: airportData,
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
          topDestinations,
          topAirlines,
          hourlyDistribution,
          dailyTrend
        };
      } catch (error) {
        logger.error('Failed to fetch airport statistics', error);
        throw new Error('Failed to fetch airport statistics');
      }
    },

    rankings: async (_, { category, metric, startDate, endDate, limit }) => {
      try {
        const db = await getDatabase();
        
        switch (category) {
          case 'AIRPORTS':
            return await getAirportRankings(db, metric, startDate, endDate, limit);
          case 'AIRLINES':
            return await getAirlineRankings(db, metric, startDate, endDate, limit);
          case 'ROUTES':
            return await getRouteRankings(db, metric, startDate, endDate, limit);
          default:
            throw new Error(`Unknown ranking category: ${category}`);
        }
      } catch (error) {
        logger.error('Failed to fetch rankings', error);
        throw new Error('Failed to fetch rankings');
      }
    }
  }
};

// Helper functions
async function getHourlyDistribution(db, airport, startDate, endDate) {
  try {
    const flights = await db.getFlightData({
      filters: {
        airport,
        startDate,
        endDate
      }
    });
    
    const hourlyStats = Array(24).fill(null).map((_, hour) => ({
      hour,
      flights: 0,
      delays: 0
    }));
    
    flights.forEach(flight => {
      const hour = new Date(flight.scheduledTime).getHours();
      hourlyStats[hour].flights++;
      if (flight.status === 'delayed') {
        hourlyStats[hour].delays++;
      }
    });
    
    return hourlyStats;
  } catch (error) {
    logger.error('Failed to get hourly distribution', error);
    return [];
  }
}

async function getDailyTrend(db, airport, startDate, endDate) {
  try {
    const flights = await db.getFlightData({
      filters: {
        airport,
        startDate,
        endDate
      }
    });
    
    const dailyMap = new Map();
    
    flights.forEach(flight => {
      const date = new Date(flight.scheduledTime).toISOString().split('T')[0];
      if (!dailyMap.has(date)) {
        dailyMap.set(date, {
          date: new Date(date),
          flights: 0,
          delays: 0,
          cancellations: 0,
          onTimeFlights: 0
        });
      }
      
      const day = dailyMap.get(date);
      day.flights++;
      
      if (flight.status === 'delayed') {
        day.delays++;
      } else if (flight.status === 'cancelled') {
        day.cancellations++;
      } else {
        day.onTimeFlights++;
      }
    });
    
    return Array.from(dailyMap.values()).map(day => ({
      ...day,
      onTimePercentage: (day.onTimeFlights / day.flights) * 100
    }));
  } catch (error) {
    logger.error('Failed to get daily trend', error);
    return [];
  }
}

async function getTopDestinations(db, airport, startDate, endDate, limit = 10) {
  try {
    const flights = await db.getFlightData({
      filters: {
        origin: airport,
        type: 'departure',
        startDate,
        endDate
      }
    });
    
    const destMap = new Map();
    
    flights.forEach(flight => {
      const dest = flight.destination;
      if (!destMap.has(dest)) {
        destMap.set(dest, 0);
      }
      destMap.set(dest, destMap.get(dest) + 1);
    });
    
    const total = flights.length;
    const sorted = Array.from(destMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit);
    
    return sorted.map(([code, count]) => ({
      airport: {
        code,
        name: getAirportName(code),
        city: getCityName(code),
        country: 'US',
        timezone: getTimezone(code),
        coordinates: { latitude: 0, longitude: 0 },
        terminals: []
      },
      flights: count,
      percentage: (count / total) * 100
    }));
  } catch (error) {
    logger.error('Failed to get top destinations', error);
    return [];
  }
}

async function getTopAirlines(db, airport, startDate, endDate, limit = 10) {
  try {
    const flights = await db.getFlightData({
      filters: {
        airport,
        startDate,
        endDate
      }
    });
    
    const airlineMap = new Map();
    
    flights.forEach(flight => {
      const airline = flight.airline;
      if (!airlineMap.has(airline)) {
        airlineMap.set(airline, {
          total: 0,
          onTime: 0
        });
      }
      const stats = airlineMap.get(airline);
      stats.total++;
      if (flight.status !== 'delayed' && flight.status !== 'cancelled') {
        stats.onTime++;
      }
    });
    
    const total = flights.length;
    const sorted = Array.from(airlineMap.entries())
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, limit);
    
    return sorted.map(([code, stats]) => ({
      airline: {
        code,
        name: getAirlineName(code),
        country: 'US',
        alliance: getAlliance(code)
      },
      flights: stats.total,
      percentage: (stats.total / total) * 100,
      onTimePercentage: (stats.onTime / stats.total) * 100
    }));
  } catch (error) {
    logger.error('Failed to get top airlines', error);
    return [];
  }
}

async function getAirportRankings(db, metric, startDate, endDate, limit) {
  const airports = ['SFO', 'YYZ', 'YVR'];
  const rankings = [];
  
  for (const airport of airports) {
    const stats = await db.getAirportStats(airport, {
      startDate,
      endDate
    });
    
    let metricValue;
    switch (metric) {
      case 'ONTIME':
        metricValue = stats.onTimePercentage || 0;
        break;
      case 'DELAYS':
        metricValue = stats.delayedFlights || 0;
        break;
      case 'TRAFFIC':
        metricValue = stats.totalFlights || 0;
        break;
      case 'CANCELLATIONS':
        metricValue = stats.cancelledFlights || 0;
        break;
    }
    
    rankings.push({
      entity: {
        code: airport,
        name: getAirportName(airport),
        city: getCityName(airport),
        country: 'US',
        timezone: getTimezone(airport),
        coordinates: { latitude: 0, longitude: 0 },
        terminals: []
      },
      metric: metricValue
    });
  }
  
  // Sort based on metric (descending for most metrics, but ascending for delays/cancellations)
  rankings.sort((a, b) => {
    if (metric === 'DELAYS' || metric === 'CANCELLATIONS') {
      return a.metric - b.metric;
    }
    return b.metric - a.metric;
  });
  
  // Add rank and limit results
  return rankings.slice(0, limit).map((r, index) => ({
    rank: index + 1,
    entity: r.entity,
    metric: r.metric,
    change: 0 // Would track rank change in production
  }));
}

async function getAirlineRankings(db, metric, startDate, endDate, limit) {
  // Similar implementation for airline rankings
  return [];
}

async function getRouteRankings(db, metric, startDate, endDate, limit) {
  // Similar implementation for route rankings
  return [];
}

// Helper functions (same as in other resolvers)
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

function getAlliance(airline) {
  const alliances = {
    'UA': 'Star Alliance',
    'AA': 'Oneworld',
    'DL': 'SkyTeam',
    'AC': 'Star Alliance'
  };
  return alliances[airline] || null;
}