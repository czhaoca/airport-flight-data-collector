#!/usr/bin/env node

const http = require('http');
const { getDatabase } = require('../lib/database');

// Configuration
const PORT = process.env.HEALTH_CHECK_PORT || 3000;
const HOST = process.env.HEALTH_CHECK_HOST || '0.0.0.0';

// Cache health check results for 60 seconds
let healthCache = null;
let cacheTime = 0;
const CACHE_DURATION = 60000; // 60 seconds

async function getHealthStatus() {
  const now = Date.now();
  
  // Return cached result if still valid
  if (healthCache && (now - cacheTime) < CACHE_DURATION) {
    return healthCache;
  }
  
  try {
    const db = await getDatabase();
    const health = await db.healthCheck();
    
    // Get additional statistics
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    let stats = {
      last7Days: { count: 0, airports: [] },
      last24Hours: { count: 0 },
      storage: {}
    };
    
    try {
      // Get last 7 days data
      const recentData = await db.getFlightData({
        startDate,
        endDate,
        filters: { limit: 1000 }
      });
      
      stats.last7Days.count = recentData.length;
      stats.last7Days.airports = [...new Set(recentData.map(r => r.airport_code))];
      
      // Count last 24 hours
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      stats.last24Hours.count = recentData.filter(r => 
        new Date(r.collection_date) > new Date(yesterday)
      ).length;
      
      // Get storage info if available
      if (health.adapterStatus && health.adapterStatus.storage) {
        stats.storage = health.adapterStatus.storage;
      }
    } catch (error) {
      console.error('Error getting stats:', error);
    }
    
    const result = {
      status: health.status,
      provider: health.provider,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      database: {
        connected: health.connected,
        ...health.adapterStatus
      },
      statistics: stats,
      uptime: process.uptime(),
      memory: process.memoryUsage()
    };
    
    // Cache the result
    healthCache = result;
    cacheTime = now;
    
    // Don't keep connection open
    await db.disconnect();
    
    return result;
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString(),
      provider: process.env.DB_PROVIDER || 'unknown'
    };
  }
}

// Create HTTP server
const server = http.createServer(async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Content-Type', 'application/json');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  if (req.url === '/health' || req.url === '/') {
    try {
      const health = await getHealthStatus();
      const statusCode = health.status === 'healthy' ? 200 : 503;
      
      res.writeHead(statusCode);
      res.end(JSON.stringify(health, null, 2));
    } catch (error) {
      res.writeHead(500);
      res.end(JSON.stringify({
        status: 'error',
        message: error.message,
        timestamp: new Date().toISOString()
      }));
    }
  } else if (req.url === '/metrics') {
    // Prometheus-style metrics endpoint
    try {
      const health = await getHealthStatus();
      const metrics = [];
      
      // Database status (1 = healthy, 0 = unhealthy)
      metrics.push(`airport_data_db_healthy ${health.status === 'healthy' ? 1 : 0}`);
      
      // Record counts
      if (health.statistics) {
        metrics.push(`airport_data_records_7d ${health.statistics.last7Days.count}`);
        metrics.push(`airport_data_records_24h ${health.statistics.last24Hours.count}`);
        metrics.push(`airport_data_airports_active ${health.statistics.last7Days.airports.length}`);
      }
      
      // Memory usage
      if (health.memory) {
        metrics.push(`airport_data_memory_heap_used ${health.memory.heapUsed}`);
        metrics.push(`airport_data_memory_heap_total ${health.memory.heapTotal}`);
      }
      
      // Uptime
      metrics.push(`airport_data_uptime_seconds ${health.uptime || 0}`);
      
      res.setHeader('Content-Type', 'text/plain');
      res.writeHead(200);
      res.end(metrics.join('\n'));
    } catch (error) {
      res.writeHead(500);
      res.end(`# Error: ${error.message}`);
    }
  } else {
    res.writeHead(404);
    res.end(JSON.stringify({
      error: 'Not found',
      endpoints: ['/health', '/metrics']
    }));
  }
});

// Start server
if (require.main === module) {
  server.listen(PORT, HOST, () => {
    console.log(`Health check server running at http://${HOST}:${PORT}`);
    console.log('Endpoints:');
    console.log(`  - http://${HOST}:${PORT}/health (JSON health status)`);
    console.log(`  - http://${HOST}:${PORT}/metrics (Prometheus metrics)`);
  });
  
  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('SIGTERM received, closing server...');
    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  });
}

// Export for testing
module.exports = { getHealthStatus, server };