#!/usr/bin/env node

const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const { requestLogger, apiLogger } = require('../../../lib/logging');
const SocketServer = require('./websocket/socket-server');
const { getInstance: getEventEmitter } = require('./websocket/event-emitter');
const errorHandler = require('./middleware/errorHandler');
const rateLimiter = require('./middleware/rateLimiter');
const { createApolloServer, createWebSocketServer, setupEventIntegration } = require('./graphql/server');

// Import routers
const healthRouter = require('./routes/health');
const flightsRouter = require('./routes/flights');
const airportsRouter = require('./routes/airports');
const statisticsRouter = require('./routes/statistics');
const authRouter = require('./routes/auth');
const sseRouter = require('./routes/sse');
const exportRouter = require('./routes/export');
const batchRouter = require('./routes/batch');
const webhooksRouter = require('./routes/webhooks');
const predictionsRouter = require('./routes/predictions');
const patternsRouter = require('./routes/patterns');

// Check dependencies
try {
  require.resolve('express');
  require.resolve('socket.io');
  require.resolve('cors');
  require.resolve('helmet');
  require.resolve('compression');
} catch (e) {
  console.error('Missing dependencies. Please run: npm install');
  process.exit(1);
}

// Create Express app
const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3001;

// Initialize WebSocket server
const socketServer = new SocketServer(server, {
  corsOrigin: process.env.CORS_ORIGIN,
  useRedis: process.env.NODE_ENV === 'production',
  requireAuth: process.env.REQUIRE_WS_AUTH === 'true'
});

// Initialize event emitter
const eventEmitter = getEventEmitter();

// Connect event emitter to WebSocket server
eventEmitter.on('flight:statusChange', (event) => {
  socketServer.emitFlightUpdate(event);
});

eventEmitter.on('flight:delay', (event) => {
  socketServer.emitDelayNotification(event);
});

eventEmitter.on('flight:cancelled', (event) => {
  socketServer.emitFlightUpdate({
    ...event.flight,
    status: 'cancelled',
    cancellationReason: event.reason
  });
});

eventEmitter.on('airport:statsUpdate', (event) => {
  socketServer.emitAirportStats(event.airport, event.stats);
});

eventEmitter.on('system:alert', (event) => {
  socketServer.emitSystemAlert(event);
});

// Middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disable for API
}));
app.use(compression());
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use(requestLogger);

// Rate limiting (skip for health checks)
app.use((req, res, next) => {
  if (req.path === '/api/v2/health') {
    return next();
  }
  rateLimiter(req, res, next);
});

// API Routes
app.use('/api/v2/health', healthRouter);
app.use('/api/v2/auth', authRouter);
app.use('/api/v2/flights', flightsRouter);
app.use('/api/v2/airports', airportsRouter);
app.use('/api/v2/statistics', statisticsRouter);
app.use('/api/v2/sse', sseRouter);
app.use('/api/v2/export', exportRouter);
app.use('/api/v2/batch', batchRouter);
app.use('/api/v2/webhooks', webhooksRouter);
app.use('/api/v2/predictions', predictionsRouter);
app.use('/api/v2/patterns', patternsRouter);

// WebSocket statistics endpoint
app.get('/api/v2/websocket/stats', (req, res) => {
  const stats = socketServer.getStats();
  res.json({
    success: true,
    data: stats
  });
});

// Metrics endpoint for Prometheus
app.get('/api/v2/metrics', async (req, res) => {
  try {
    const metrics = await generateMetrics();
    res.set('Content-Type', 'text/plain');
    res.send(metrics);
  } catch (error) {
    res.status(500).send('Error generating metrics');
  }
});

// Root endpoint
app.get('/api/v2', (req, res) => {
  res.json({
    name: 'Airport Flight Data API',
    version: '2.0.0',
    features: {
      rest: 'RESTful API endpoints',
      websocket: 'Real-time updates via WebSocket',
      sse: 'Server-sent events for flight status'
    },
    documentation: {
      openapi: '/api/v2/openapi.yaml',
      websocket: '/api/v2/websocket/docs'
    },
    endpoints: {
      health: '/api/v2/health',
      flights: '/api/v2/flights',
      airports: '/api/v2/airports',
      statistics: '/api/v2/statistics',
      auth: '/api/v2/auth',
      websocket: 'ws://localhost:3001/socket.io'
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.path
  });
});

// Error handling middleware
app.use(errorHandler);

// Helper function to generate Prometheus metrics
async function generateMetrics() {
  const wsStats = socketServer.getStats();
  
  return `
# HELP api_websocket_connections_total Total number of WebSocket connections
# TYPE api_websocket_connections_total gauge
api_websocket_connections_total ${wsStats.connectedClients}

# HELP api_websocket_rooms_total Total number of WebSocket rooms
# TYPE api_websocket_rooms_total gauge
api_websocket_rooms_total ${wsStats.totalRooms}

# HELP api_websocket_subscriptions_total Total subscriptions by type
# TYPE api_websocket_subscriptions_total gauge
api_websocket_subscriptions_total{type="airports"} ${wsStats.subscriptions.airports}
api_websocket_subscriptions_total{type="flights"} ${wsStats.subscriptions.flights}
api_websocket_subscriptions_total{type="routes"} ${wsStats.subscriptions.routes}

# HELP api_uptime_seconds API server uptime in seconds
# TYPE api_uptime_seconds gauge
api_uptime_seconds ${process.uptime()}

# HELP api_memory_usage_bytes Memory usage in bytes
# TYPE api_memory_usage_bytes gauge
api_memory_usage_bytes ${process.memoryUsage().heapUsed}
`;
}

// Start server
if (require.main === module) {
  server.listen(PORT, async () => {
    // Initialize GraphQL
    try {
      const apolloServer = await createApolloServer(server);
      apolloServer.applyMiddleware({ app, path: '/api/v2/graphql' });
      
      // Create WebSocket server for GraphQL subscriptions
      const wsServer = createWebSocketServer(server);
      
      // Setup event integration for GraphQL subscriptions
      setupEventIntegration();
      
      apiLogger.info('GraphQL server initialized');
    } catch (error) {
      apiLogger.error('Failed to initialize GraphQL server', error);
    }
    
    apiLogger.info(`API server with WebSocket support running at http://localhost:${PORT}`);
    console.log(`\nAPI server running at http://localhost:${PORT}`);
    console.log('\nREST Endpoints:');
    console.log(`  GET  http://localhost:${PORT}/api/v2/health`);
    console.log(`  GET  http://localhost:${PORT}/api/v2/flights`);
    console.log(`  GET  http://localhost:${PORT}/api/v2/airports`);
    console.log(`  GET  http://localhost:${PORT}/api/v2/statistics`);
    console.log('\nGraphQL Endpoint:');
    console.log(`  POST http://localhost:${PORT}/api/v2/graphql`);
    console.log(`  WS   ws://localhost:${PORT}/graphql (subscriptions)`);
    console.log('\nWebSocket endpoint:');
    console.log(`  ws://localhost:${PORT}/socket.io`);
    console.log('\nWebSocket events:');
    console.log('  - subscribe:airport');
    console.log('  - subscribe:flight');
    console.log('  - subscribe:route');
    console.log('  - flight:update');
    console.log('  - flight:delay');
    console.log('  - airport:stats');
  });

  // Graceful shutdown
  const gracefulShutdown = async (signal) => {
    apiLogger.info(`${signal} received, shutting down gracefully...`);
    
    // Stop accepting new connections
    server.close(async () => {
      apiLogger.info('HTTP server closed');
      
      // Close WebSocket connections
      await socketServer.close();
      
      // Close database connections
      // await db.disconnect();
      
      process.exit(0);
    });

    // Force shutdown after 10 seconds
    setTimeout(() => {
      apiLogger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
}

module.exports = { app, server, socketServer, eventEmitter };