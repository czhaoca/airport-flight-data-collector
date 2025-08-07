const express = require('express');
const router = express.Router();
const { getDatabase } = require('../../../../lib/database');
const logger = require('../utils/logger');

let dbInstance = null;

// GET /api/v2/health
router.get('/', async (req, res, next) => {
  try {
    const health = {
      status: 'healthy',
      version: '2.0.0',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      services: {}
    };

    // Check database connection
    try {
      if (!dbInstance) {
        dbInstance = await getDatabase();
      }
      const dbHealth = await dbInstance.healthCheck();
      
      health.database = {
        connected: true,
        provider: dbHealth.provider,
        status: dbHealth.status
      };
      health.services.database = {
        status: 'operational',
        lastCheck: new Date().toISOString()
      };
    } catch (dbError) {
      logger.error('Database health check failed:', dbError);
      health.status = 'unhealthy';
      health.database = {
        connected: false,
        error: dbError.message
      };
      health.services.database = {
        status: 'down',
        lastCheck: new Date().toISOString(),
        error: dbError.message
      };
    }

    // Check other services
    health.services.api = {
      status: 'operational',
      lastCheck: new Date().toISOString()
    };

    // Memory usage
    const memUsage = process.memoryUsage();
    health.memory = {
      rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
      heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`
    };

    // Environment info
    health.environment = {
      nodeVersion: process.version,
      platform: process.platform,
      env: process.env.NODE_ENV || 'development'
    };

    const statusCode = health.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(health);
  } catch (error) {
    next(error);
  }
});

module.exports = router;