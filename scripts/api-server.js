#!/usr/bin/env node

const express = require('express');
const { getDatabase } = require('../lib/database');

// Check if express is installed
try {
  require.resolve('express');
} catch (e) {
  console.error('Express not installed. Please run: npm install express');
  process.exit(1);
}

const app = express();
const PORT = process.env.API_PORT || 3001;

// Middleware
app.use(express.json());
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  
  next();
});

// Simple API key authentication (optional)
const API_KEY = process.env.API_KEY;
if (API_KEY) {
  app.use((req, res, next) => {
    const providedKey = req.headers['x-api-key'] || req.query.api_key;
    if (providedKey !== API_KEY) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
  });
}

// Cache for database connection
let dbInstance = null;
async function getDB() {
  if (!dbInstance) {
    dbInstance = await getDatabase();
  }
  return dbInstance;
}

// Routes

// Health check
app.get('/health', async (req, res) => {
  try {
    const db = await getDB();
    const health = await db.healthCheck();
    
    res.status(health.status === 'healthy' ? 200 : 503).json({
      ...health,
      api: {
        version: '1.0.0',
        uptime: process.uptime(),
        memory: process.memoryUsage()
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error.message
    });
  }
});

// Get flights
app.get('/api/flights', async (req, res) => {
  try {
    const db = await getDB();
    const {
      airport,
      type,
      start_date,
      end_date,
      limit = 100,
      offset = 0
    } = req.query;
    
    const flights = await db.getFlightData({
      airport,
      type,
      startDate: start_date,
      endDate: end_date,
      filters: {
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });
    
    res.json({
      success: true,
      data: flights,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        total: flights.length
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get specific flight
app.get('/api/flights/:id', async (req, res) => {
  try {
    const db = await getDB();
    const flights = await db.getFlightData({
      filters: {
        id: req.params.id
      }
    });
    
    if (flights.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Flight not found'
      });
    }
    
    res.json({
      success: true,
      data: flights[0]
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get statistics
app.get('/api/stats', async (req, res) => {
  try {
    const db = await getDB();
    const { period = '7d' } = req.query;
    
    let days = 7;
    if (period === '24h') days = 1;
    else if (period === '30d') days = 30;
    else if (period === '1y') days = 365;
    
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
      .toISOString().split('T')[0];
    
    const flights = await db.getFlightData({
      startDate,
      endDate,
      filters: { limit: 10000 }
    });
    
    // Calculate statistics
    const stats = {
      period,
      startDate,
      endDate,
      totalFlights: flights.length,
      byAirport: {},
      byType: {
        arrival: 0,
        departure: 0
      },
      byDate: {},
      recentUpdates: []
    };
    
    flights.forEach(flight => {
      // By airport
      if (!stats.byAirport[flight.airport_code]) {
        stats.byAirport[flight.airport_code] = {
          total: 0,
          arrivals: 0,
          departures: 0
        };
      }
      stats.byAirport[flight.airport_code].total++;
      stats.byAirport[flight.airport_code][flight.flight_type + 's']++;
      
      // By type
      stats.byType[flight.flight_type]++;
      
      // By date
      if (!stats.byDate[flight.flight_date]) {
        stats.byDate[flight.flight_date] = 0;
      }
      stats.byDate[flight.flight_date]++;
    });
    
    // Recent updates (last 10)
    stats.recentUpdates = flights
      .sort((a, b) => new Date(b.collection_date) - new Date(a.collection_date))
      .slice(0, 10)
      .map(f => ({
        id: f.id,
        airport: f.airport_code,
        type: f.flight_type,
        date: f.flight_date,
        collected: f.collection_date
      }));
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Search flights
app.post('/api/search', async (req, res) => {
  try {
    const db = await getDB();
    const {
      airports = [],
      types = [],
      dateRange = {},
      flightNumbers = [],
      limit = 100
    } = req.body;
    
    // Build query parameters
    const results = [];
    
    for (const airport of airports.length ? airports : ['']) {
      for (const type of types.length ? types : ['']) {
        const flights = await db.getFlightData({
          airport: airport || undefined,
          type: type || undefined,
          startDate: dateRange.start,
          endDate: dateRange.end,
          filters: { limit }
        });
        
        // Filter by flight numbers if provided
        const filtered = flightNumbers.length
          ? flights.filter(f => {
              const flightData = f.flight_data;
              return Array.isArray(flightData) 
                ? flightData.some(fd => flightNumbers.includes(fd.flight_number))
                : false;
            })
          : flights;
        
        results.push(...filtered);
      }
    }
    
    // Remove duplicates
    const unique = Array.from(new Map(results.map(f => [f.id, f])).values());
    
    res.json({
      success: true,
      data: unique.slice(0, limit),
      total: unique.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'Airport Flight Data API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      flights: {
        list: '/api/flights?airport=YYZ&type=arrival&start_date=2024-01-01&limit=100',
        get: '/api/flights/:id',
        search: 'POST /api/search'
      },
      statistics: '/api/stats?period=7d'
    },
    documentation: 'https://github.com/czhaoca/airport-flight-data-collector'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    path: req.path
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('API Error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message
  });
});

// Start server
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`API server running at http://localhost:${PORT}`);
    console.log('\nEndpoints:');
    console.log(`  GET  http://localhost:${PORT}/health`);
    console.log(`  GET  http://localhost:${PORT}/api/flights`);
    console.log(`  GET  http://localhost:${PORT}/api/flights/:id`);
    console.log(`  GET  http://localhost:${PORT}/api/stats`);
    console.log(`  POST http://localhost:${PORT}/api/search`);
    
    if (API_KEY) {
      console.log('\nAPI Key authentication enabled');
      console.log('Include header: X-API-Key: YOUR_KEY');
    }
  });
  
  // Graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('SIGTERM received, closing server...');
    if (dbInstance) {
      await dbInstance.disconnect();
    }
    process.exit(0);
  });
}

module.exports = app;