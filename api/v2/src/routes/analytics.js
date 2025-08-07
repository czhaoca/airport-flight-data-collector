const express = require('express');
const AdvancedAnalyticsEngine = require('../../../../analytics/engines/AdvancedAnalyticsEngine');
const { apiLogger } = require('../../../../lib/logging');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
const logger = apiLogger.child('AnalyticsRoute');

// Initialize analytics engine
let analyticsEngine;

(async () => {
  try {
    analyticsEngine = new AdvancedAnalyticsEngine();
    await analyticsEngine.initialize();
    logger.info('Analytics engine initialized');
  } catch (error) {
    logger.error('Failed to initialize analytics engine', error);
  }
})();

/**
 * Get comprehensive analytics
 * GET /api/v2/analytics/comprehensive
 */
router.get('/comprehensive', authenticate, async (req, res) => {
  try {
    const {
      startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      endDate = new Date().toISOString(),
      airports = 'SFO,YYZ,YVR'
    } = req.query;

    const airportList = airports.split(',');
    
    const analytics = await analyticsEngine.getComprehensiveAnalytics(
      startDate,
      endDate,
      airportList
    );

    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    logger.error('Comprehensive analytics failed', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get trend analysis
 * GET /api/v2/analytics/trends
 */
router.get('/trends', authenticate, async (req, res) => {
  try {
    const {
      startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      endDate = new Date().toISOString(),
      airports = 'SFO,YYZ,YVR'
    } = req.query;

    const airportList = airports.split(',');
    
    const trends = await analyticsEngine.analyzeTrends(
      startDate,
      endDate,
      airportList
    );

    res.json({
      success: true,
      data: trends
    });
  } catch (error) {
    logger.error('Trend analysis failed', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get anomaly detection results
 * GET /api/v2/analytics/anomalies
 */
router.get('/anomalies', authenticate, async (req, res) => {
  try {
    const {
      startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      endDate = new Date().toISOString(),
      airports = 'SFO,YYZ,YVR',
      severity = 'all'
    } = req.query;

    const airportList = airports.split(',');
    
    let anomalies = await analyticsEngine.detectAnomalies(
      startDate,
      endDate,
      airportList
    );

    // Filter by severity if specified
    if (severity !== 'all') {
      anomalies = anomalies.filter(a => a.severity === severity);
    }

    res.json({
      success: true,
      data: anomalies,
      count: anomalies.length
    });
  } catch (error) {
    logger.error('Anomaly detection failed', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get forecasts
 * GET /api/v2/analytics/forecasts
 */
router.get('/forecasts', authenticate, async (req, res) => {
  try {
    const {
      startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
      endDate = new Date().toISOString(),
      airports = 'SFO,YYZ,YVR',
      daysAhead = 7
    } = req.query;

    const airportList = airports.split(',');
    
    const forecasts = await analyticsEngine.generateForecasts(
      startDate,
      endDate,
      airportList,
      parseInt(daysAhead)
    );

    res.json({
      success: true,
      data: forecasts
    });
  } catch (error) {
    logger.error('Forecast generation failed', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get correlation analysis
 * GET /api/v2/analytics/correlations
 */
router.get('/correlations', authenticate, async (req, res) => {
  try {
    const {
      startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      endDate = new Date().toISOString(),
      airports = 'SFO,YYZ,YVR'
    } = req.query;

    const airportList = airports.split(',');
    
    const correlations = await analyticsEngine.analyzeCorrelations(
      startDate,
      endDate,
      airportList
    );

    res.json({
      success: true,
      data: correlations
    });
  } catch (error) {
    logger.error('Correlation analysis failed', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get seasonality analysis
 * GET /api/v2/analytics/seasonality
 */
router.get('/seasonality', authenticate, async (req, res) => {
  try {
    const {
      startDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
      endDate = new Date().toISOString(),
      airports = 'SFO,YYZ,YVR'
    } = req.query;

    const airportList = airports.split(',');
    
    const seasonality = await analyticsEngine.analyzeSeasonality(
      startDate,
      endDate,
      airportList
    );

    res.json({
      success: true,
      data: seasonality
    });
  } catch (error) {
    logger.error('Seasonality analysis failed', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get performance analysis
 * GET /api/v2/analytics/performance
 */
router.get('/performance', authenticate, async (req, res) => {
  try {
    const {
      startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      endDate = new Date().toISOString(),
      airports = 'SFO,YYZ,YVR'
    } = req.query;

    const airportList = airports.split(',');
    
    const performance = await analyticsEngine.analyzePerformance(
      startDate,
      endDate,
      airportList
    );

    res.json({
      success: true,
      data: performance
    });
  } catch (error) {
    logger.error('Performance analysis failed', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get custom analytics query
 * POST /api/v2/analytics/custom
 */
router.post('/custom', authenticate, async (req, res) => {
  try {
    const {
      query,
      parameters = {}
    } = req.body;

    // Validate query type
    const validQueries = [
      'trends', 'anomalies', 'forecasts', 
      'correlations', 'seasonality', 'performance'
    ];

    if (!validQueries.includes(query)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid query type'
      });
    }

    // Execute custom query
    let result;
    switch (query) {
      case 'trends':
        result = await analyticsEngine.analyzeTrends(
          parameters.startDate,
          parameters.endDate,
          parameters.airports
        );
        break;
      case 'anomalies':
        result = await analyticsEngine.detectAnomalies(
          parameters.startDate,
          parameters.endDate,
          parameters.airports
        );
        break;
      case 'forecasts':
        result = await analyticsEngine.generateForecasts(
          parameters.startDate,
          parameters.endDate,
          parameters.airports,
          parameters.daysAhead
        );
        break;
      case 'correlations':
        result = await analyticsEngine.analyzeCorrelations(
          parameters.startDate,
          parameters.endDate,
          parameters.airports
        );
        break;
      case 'seasonality':
        result = await analyticsEngine.analyzeSeasonality(
          parameters.startDate,
          parameters.endDate,
          parameters.airports
        );
        break;
      case 'performance':
        result = await analyticsEngine.analyzePerformance(
          parameters.startDate,
          parameters.endDate,
          parameters.airports
        );
        break;
    }

    res.json({
      success: true,
      query,
      parameters,
      data: result
    });
  } catch (error) {
    logger.error('Custom analytics query failed', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;