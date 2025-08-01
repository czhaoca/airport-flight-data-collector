const client = require('prom-client');

// Create a Registry
const register = new client.Registry();

// Add default metrics (CPU, memory, etc.)
client.collectDefaultMetrics({ register });

// Custom metrics
const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10]
});

const httpRequestTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code']
});

const activeConnections = new client.Gauge({
  name: 'http_active_connections',
  help: 'Number of active HTTP connections'
});

const flightDataRecords = new client.Counter({
  name: 'flight_data_records_total',
  help: 'Total number of flight records processed',
  labelNames: ['airport', 'type']
});

const collectionDuration = new client.Histogram({
  name: 'flight_collection_duration_seconds',
  help: 'Duration of flight data collection in seconds',
  labelNames: ['airport', 'status'],
  buckets: [1, 5, 10, 20, 30, 60, 120]
});

const collectionErrors = new client.Counter({
  name: 'flight_collection_errors_total',
  help: 'Total number of collection errors',
  labelNames: ['airport', 'error_type']
});

const databaseOperationDuration = new client.Histogram({
  name: 'database_operation_duration_seconds',
  help: 'Duration of database operations in seconds',
  labelNames: ['operation', 'table'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1]
});

const apiCacheHits = new client.Counter({
  name: 'api_cache_hits_total',
  help: 'Total number of API cache hits',
  labelNames: ['endpoint']
});

const apiCacheMisses = new client.Counter({
  name: 'api_cache_misses_total',
  help: 'Total number of API cache misses',
  labelNames: ['endpoint']
});

const websocketConnections = new client.Gauge({
  name: 'websocket_active_connections',
  help: 'Number of active WebSocket connections'
});

const predictionAccuracy = new client.Gauge({
  name: 'prediction_accuracy_percentage',
  help: 'Accuracy of delay predictions',
  labelNames: ['model', 'airport']
});

// Register all metrics
register.registerMetric(httpRequestDuration);
register.registerMetric(httpRequestTotal);
register.registerMetric(activeConnections);
register.registerMetric(flightDataRecords);
register.registerMetric(collectionDuration);
register.registerMetric(collectionErrors);
register.registerMetric(databaseOperationDuration);
register.registerMetric(apiCacheHits);
register.registerMetric(apiCacheMisses);
register.registerMetric(websocketConnections);
register.registerMetric(predictionAccuracy);

// Middleware to track HTTP metrics
const metricsMiddleware = (req, res, next) => {
  const start = Date.now();
  
  // Increment active connections
  activeConnections.inc();
  
  // Capture the original end function
  const originalEnd = res.end;
  
  res.end = function(...args) {
    // Call the original end function
    originalEnd.apply(res, args);
    
    // Calculate duration
    const duration = (Date.now() - start) / 1000;
    
    // Get route path (express route pattern)
    const route = req.route ? req.route.path : req.path;
    
    // Record metrics
    httpRequestDuration.labels(req.method, route, res.statusCode).observe(duration);
    httpRequestTotal.labels(req.method, route, res.statusCode).inc();
    
    // Decrement active connections
    activeConnections.dec();
  };
  
  next();
};

// Export metrics and utilities
module.exports = {
  register,
  metricsMiddleware,
  metrics: {
    httpRequestDuration,
    httpRequestTotal,
    activeConnections,
    flightDataRecords,
    collectionDuration,
    collectionErrors,
    databaseOperationDuration,
    apiCacheHits,
    apiCacheMisses,
    websocketConnections,
    predictionAccuracy
  },
  
  // Helper functions
  recordFlightData: (airport, type, count = 1) => {
    flightDataRecords.labels(airport, type).inc(count);
  },
  
  recordCollectionTime: (airport, status, duration) => {
    collectionDuration.labels(airport, status).observe(duration);
  },
  
  recordCollectionError: (airport, errorType) => {
    collectionErrors.labels(airport, errorType).inc();
  },
  
  recordDatabaseOperation: (operation, table, duration) => {
    databaseOperationDuration.labels(operation, table).observe(duration);
  },
  
  recordCacheHit: (endpoint) => {
    apiCacheHits.labels(endpoint).inc();
  },
  
  recordCacheMiss: (endpoint) => {
    apiCacheMisses.labels(endpoint).inc();
  },
  
  setWebSocketConnections: (count) => {
    websocketConnections.set(count);
  },
  
  setPredictionAccuracy: (model, airport, accuracy) => {
    predictionAccuracy.labels(model, airport).set(accuracy);
  }
};