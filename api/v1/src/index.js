require('dotenv').config({ path: '../../.env' });
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const path = require('path');

const { errorHandler } = require('./middleware/errorHandler');
const { requestLogger } = require('./middleware/requestLogger');
const { rateLimiters, dynamicRateLimiter } = require('./middleware/rateLimiter');
const authRoutes = require('./routes/auth');
const flightRoutes = require('./routes/flights');
const airportRoutes = require('./routes/airports');
const statisticsRoutes = require('./routes/statistics');
const healthRoutes = require('./routes/health');
const logger = require('./utils/logger');

const app = express();
const PORT = process.env.API_PORT || 3001;

// Load OpenAPI specification
const swaggerDocument = YAML.load(path.join(__dirname, '../openapi.yaml'));

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));

// Compression
app.use(compression());

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use(requestLogger);

// Apply general rate limiting to all API routes
app.use('/api/v1', rateLimiters.general);

// API Documentation
app.use('/api/v1/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Flight Data API v1 Documentation'
}));

// API Routes with specific rate limiting
app.use('/api/v1/auth', rateLimiters.auth, authRoutes);
app.use('/api/v1/flights', rateLimiters.read, flightRoutes);
app.use('/api/v1/airports', rateLimiters.read, airportRoutes);
app.use('/api/v1/statistics', rateLimiters.expensive, statisticsRoutes);
app.use('/api/v1/health', healthRoutes);

// Root endpoint
app.get('/api/v1', (req, res) => {
  res.json({
    name: 'Airport Flight Data API',
    version: '1.0.0',
    documentation: `${req.protocol}://${req.get('host')}/api/v1/docs`,
    endpoints: {
      auth: {
        login: 'POST /api/v1/auth/login',
        refresh: 'POST /api/v1/auth/refresh'
      },
      flights: {
        list: 'GET /api/v1/flights',
        get: 'GET /api/v1/flights/:id',
        search: 'POST /api/v1/flights/search'
      },
      airports: {
        list: 'GET /api/v1/airports',
        get: 'GET /api/v1/airports/:code'
      },
      statistics: {
        summary: 'GET /api/v1/statistics/summary',
        delays: 'GET /api/v1/statistics/delays'
      },
      health: 'GET /api/v1/health'
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'NOT_FOUND',
    message: `Cannot ${req.method} ${req.path}`,
    timestamp: new Date().toISOString()
  });
});

// Error handler (must be last)
app.use(errorHandler);

// Start server
if (require.main === module) {
  app.listen(PORT, () => {
    logger.info(`API v1 server started on port ${PORT}`);
    logger.info(`Documentation available at http://localhost:${PORT}/api/v1/docs`);
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    logger.info('SIGTERM signal received: closing HTTP server');
    app.close(() => {
      logger.info('HTTP server closed');
      process.exit(0);
    });
  });
}

module.exports = app;