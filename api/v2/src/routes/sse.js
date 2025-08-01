const express = require('express');
const { apiLogger } = require('../../../../lib/logging');
const { getInstance: getEventEmitter } = require('../websocket/event-emitter');

const router = express.Router();
const logger = apiLogger.child('SSE');
const eventEmitter = getEventEmitter();

// Active SSE connections
const clients = new Map();

/**
 * SSE endpoint for real-time flight updates
 * GET /api/v2/sse/flights
 */
router.get('/flights', (req, res) => {
  const { airport, flight, route } = req.query;
  const clientId = Date.now().toString();

  // Set up SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
  });

  // Send initial connection message
  res.write(`data: ${JSON.stringify({ 
    type: 'connected', 
    clientId,
    timestamp: new Date() 
  })}\n\n`);

  // Store client connection
  const client = {
    id: clientId,
    response: res,
    subscriptions: {
      airport: airport ? airport.split(',') : [],
      flight: flight ? flight.split(',') : [],
      route: route ? route.split(',').map(r => {
        const [origin, destination] = r.split('-');
        return { origin, destination };
      }) : []
    }
  };
  clients.set(clientId, client);

  logger.info('SSE client connected', { 
    clientId, 
    subscriptions: client.subscriptions 
  });

  // Set up event listeners
  const flightUpdateHandler = (event) => {
    if (shouldSendToClient(client, event)) {
      sendSSE(res, 'flight:update', event);
    }
  };

  const flightDelayHandler = (event) => {
    if (shouldSendToClient(client, event)) {
      sendSSE(res, 'flight:delay', event);
    }
  };

  const flightCancelledHandler = (event) => {
    if (shouldSendToClient(client, event)) {
      sendSSE(res, 'flight:cancelled', event);
    }
  };

  const airportStatsHandler = (event) => {
    if (client.subscriptions.airport.includes(event.airport)) {
      sendSSE(res, 'airport:stats', event);
    }
  };

  const systemAlertHandler = (event) => {
    sendSSE(res, 'system:alert', event);
  };

  // Register event listeners
  eventEmitter.on('flight:statusChange', flightUpdateHandler);
  eventEmitter.on('flight:delay', flightDelayHandler);
  eventEmitter.on('flight:cancelled', flightCancelledHandler);
  eventEmitter.on('airport:statsUpdate', airportStatsHandler);
  eventEmitter.on('system:alert', systemAlertHandler);

  // Heartbeat to keep connection alive
  const heartbeat = setInterval(() => {
    res.write(':heartbeat\n\n');
  }, 30000);

  // Handle client disconnect
  req.on('close', () => {
    logger.info('SSE client disconnected', { clientId });
    
    // Clean up
    clearInterval(heartbeat);
    clients.delete(clientId);
    
    // Remove event listeners
    eventEmitter.off('flight:statusChange', flightUpdateHandler);
    eventEmitter.off('flight:delay', flightDelayHandler);
    eventEmitter.off('flight:cancelled', flightCancelledHandler);
    eventEmitter.off('airport:statsUpdate', airportStatsHandler);
    eventEmitter.off('system:alert', systemAlertHandler);
  });
});

/**
 * SSE endpoint for system metrics
 * GET /api/v2/sse/metrics
 */
router.get('/metrics', (req, res) => {
  const clientId = Date.now().toString();

  // Set up SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
  });

  // Send metrics every 5 seconds
  const metricsInterval = setInterval(async () => {
    try {
      const metrics = await getSystemMetrics();
      sendSSE(res, 'metrics:update', metrics);
    } catch (error) {
      logger.error('Failed to send metrics', error);
    }
  }, 5000);

  // Send initial metrics
  getSystemMetrics().then(metrics => {
    sendSSE(res, 'metrics:update', metrics);
  });

  // Handle disconnect
  req.on('close', () => {
    clearInterval(metricsInterval);
    logger.info('SSE metrics client disconnected', { clientId });
  });
});

/**
 * Get information about active SSE connections
 * GET /api/v2/sse/status
 */
router.get('/status', (req, res) => {
  const clientsInfo = Array.from(clients.values()).map(client => ({
    id: client.id,
    subscriptions: client.subscriptions
  }));

  res.json({
    activeConnections: clients.size,
    clients: clientsInfo
  });
});

// Helper functions

function sendSSE(res, event, data) {
  const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  res.write(message);
}

function shouldSendToClient(client, event) {
  // Check if client is subscribed to this event
  const { flight } = event;
  
  if (!flight) return false;

  // Check airport subscription
  if (client.subscriptions.airport.length > 0) {
    if (client.subscriptions.airport.includes(flight.origin) ||
        client.subscriptions.airport.includes(flight.destination)) {
      return true;
    }
  }

  // Check flight subscription
  if (client.subscriptions.flight.length > 0) {
    if (client.subscriptions.flight.includes(flight.flightNumber)) {
      return true;
    }
  }

  // Check route subscription
  if (client.subscriptions.route.length > 0) {
    const matchingRoute = client.subscriptions.route.find(
      r => r.origin === flight.origin && r.destination === flight.destination
    );
    if (matchingRoute) return true;
  }

  return false;
}

async function getSystemMetrics() {
  // This would fetch actual metrics from your monitoring system
  return {
    timestamp: new Date(),
    api: {
      requestsPerMinute: Math.floor(Math.random() * 1000),
      avgResponseTime: Math.floor(Math.random() * 100),
      activeConnections: clients.size
    },
    collection: {
      successRate: 95 + Math.random() * 5,
      lastCollection: new Date(Date.now() - Math.random() * 3600000)
    },
    system: {
      cpuUsage: Math.random() * 100,
      memoryUsage: Math.random() * 100,
      uptime: process.uptime()
    }
  };
}

module.exports = router;