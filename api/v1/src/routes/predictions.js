const express = require('express');
const { apiLogger } = require('../../../../lib/logging');
const { authenticateRequest } = require('../middleware/auth');
const PredictionService = require('../../../../analytics/services/PredictionService');

const router = express.Router();
const logger = apiLogger.child('Predictions');

// Initialize prediction service
const predictionService = new PredictionService();

// Initialize service on startup
(async () => {
  try {
    await predictionService.initialize();
    logger.info('Prediction service initialized');
  } catch (error) {
    logger.error('Failed to initialize prediction service', error);
  }
})();

/**
 * Get delay prediction for a flight
 * POST /api/v2/predictions/delay
 */
router.post('/delay', authenticateRequest, async (req, res) => {
  try {
    const flightData = req.body;
    
    // Validate required fields
    if (!flightData.scheduledTime || !flightData.airline || !flightData.origin) {
      return res.status(400).json({
        success: false,
        error: 'Missing required flight data'
      });
    }
    
    const prediction = await predictionService.predictDelay(flightData);
    
    res.json({
      success: true,
      prediction
    });
  } catch (error) {
    logger.error('Delay prediction failed', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get batch predictions
 * POST /api/v2/predictions/batch
 */
router.post('/batch', authenticateRequest, async (req, res) => {
  try {
    const { flights } = req.body;
    
    if (!Array.isArray(flights) || flights.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Flights array is required'
      });
    }
    
    if (flights.length > 100) {
      return res.status(400).json({
        success: false,
        error: 'Maximum 100 flights allowed per batch'
      });
    }
    
    const predictions = await predictionService.batchPredict(flights);
    
    res.json({
      success: true,
      predictions
    });
  } catch (error) {
    logger.error('Batch prediction failed', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get predictions for upcoming flights
 * GET /api/v2/predictions/upcoming
 */
router.get('/upcoming', async (req, res) => {
  try {
    const { airport, hours = 24 } = req.query;
    
    if (!airport) {
      return res.status(400).json({
        success: false,
        error: 'Airport parameter is required'
      });
    }
    
    const predictions = await predictionService.getUpcomingFlightPredictions(
      airport,
      parseInt(hours)
    );
    
    res.json({
      success: true,
      airport,
      timeRange: `${hours} hours`,
      totalFlights: predictions.length,
      predictions
    });
  } catch (error) {
    logger.error('Failed to get upcoming predictions', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get real-time prediction for a specific flight
 * GET /api/v2/predictions/realtime/:flightId
 */
router.get('/realtime/:flightId', async (req, res) => {
  try {
    const { flightId } = req.params;
    
    const prediction = await predictionService.getRealTimePrediction(flightId);
    
    res.json({
      success: true,
      prediction
    });
  } catch (error) {
    logger.error('Real-time prediction failed', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get model performance metrics
 * GET /api/v2/predictions/metrics
 */
router.get('/metrics', authenticateRequest, async (req, res) => {
  try {
    const metrics = await predictionService.getModelMetrics();
    
    res.json({
      success: true,
      metrics
    });
  } catch (error) {
    logger.error('Failed to get model metrics', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Analyze prediction accuracy
 * GET /api/v2/predictions/accuracy
 */
router.get('/accuracy', authenticateRequest, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'Start date and end date are required'
      });
    }
    
    const accuracy = await predictionService.analyzePredictionAccuracy(
      new Date(startDate),
      new Date(endDate)
    );
    
    res.json({
      success: true,
      period: { startDate, endDate },
      accuracy
    });
  } catch (error) {
    logger.error('Failed to analyze accuracy', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Retrain the model
 * POST /api/v2/predictions/train
 */
router.post('/train', authenticateRequest, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }
    
    const result = await predictionService.trainModel();
    
    res.json({
      success: true,
      message: 'Model training completed',
      result
    });
  } catch (error) {
    logger.error('Model training failed', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get high-risk flights
 * GET /api/v2/predictions/high-risk
 */
router.get('/high-risk', async (req, res) => {
  try {
    const { airport, hours = 12 } = req.query;
    
    if (!airport) {
      return res.status(400).json({
        success: false,
        error: 'Airport parameter is required'
      });
    }
    
    const predictions = await predictionService.getUpcomingFlightPredictions(
      airport,
      parseInt(hours)
    );
    
    // Filter for high-risk flights only
    const highRiskFlights = predictions.filter(
      p => p.prediction && p.prediction.riskLevel === 'HIGH'
    );
    
    res.json({
      success: true,
      airport,
      timeRange: `${hours} hours`,
      totalHighRisk: highRiskFlights.length,
      flights: highRiskFlights
    });
  } catch (error) {
    logger.error('Failed to get high-risk flights', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;