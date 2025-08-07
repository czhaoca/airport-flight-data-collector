const express = require('express');
const { apiLogger } = require('../../../../lib/logging');
const { authenticateRequest } = require('../middleware/auth');
const PatternAnalysisService = require('../../../../analytics/services/PatternAnalysisService');

const router = express.Router();
const logger = apiLogger.child('Patterns');

// Initialize pattern analysis service
const patternService = new PatternAnalysisService();

// Initialize service on startup
(async () => {
  try {
    await patternService.initialize();
    logger.info('Pattern analysis service initialized');
  } catch (error) {
    logger.error('Failed to initialize pattern analysis service', error);
  }
})();

/**
 * Get current patterns
 * GET /api/v2/patterns
 */
router.get('/', async (req, res) => {
  try {
    const { refresh = false } = req.query;
    
    const patterns = await patternService.getCurrentPatterns(refresh === 'true');
    
    res.json({
      success: true,
      patterns
    });
  } catch (error) {
    logger.error('Failed to get patterns', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get pattern summary
 * GET /api/v2/patterns/summary
 */
router.get('/summary', async (req, res) => {
  try {
    const summary = await patternService.getPatternSummary();
    
    res.json({
      success: true,
      summary
    });
  } catch (error) {
    logger.error('Failed to get pattern summary', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get patterns by type
 * GET /api/v2/patterns/type/:type
 */
router.get('/type/:type', async (req, res) => {
  try {
    const { type } = req.params;
    const validTypes = ['temporal', 'spatial', 'operational', 'anomalies', 'cascading', 'seasonal'];
    
    if (!validTypes.includes(type.toLowerCase())) {
      return res.status(400).json({
        success: false,
        error: `Invalid pattern type. Valid types: ${validTypes.join(', ')}`
      });
    }
    
    const patterns = await patternService.getPatternsByType(type);
    
    res.json({
      success: true,
      type,
      count: patterns.length,
      patterns
    });
  } catch (error) {
    logger.error('Failed to get patterns by type', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get insights
 * GET /api/v2/patterns/insights
 */
router.get('/insights', async (req, res) => {
  try {
    const insights = await patternService.getInsights();
    
    res.json({
      success: true,
      count: insights.length,
      insights
    });
  } catch (error) {
    logger.error('Failed to get insights', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get real-time alerts
 * GET /api/v2/patterns/alerts
 */
router.get('/alerts', async (req, res) => {
  try {
    const alerts = await patternService.getRealTimeAlerts();
    
    res.json({
      success: true,
      timestamp: new Date(),
      count: alerts.length,
      alerts
    });
  } catch (error) {
    logger.error('Failed to get real-time alerts', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Analyze custom date range
 * POST /api/v2/patterns/analyze
 */
router.post('/analyze', authenticateRequest, async (req, res) => {
  try {
    const { startDate, endDate } = req.body;
    
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'Start date and end date are required'
      });
    }
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Validate date range
    const daysDiff = (end - start) / (1000 * 60 * 60 * 24);
    if (daysDiff < 1) {
      return res.status(400).json({
        success: false,
        error: 'End date must be after start date'
      });
    }
    
    if (daysDiff > 365) {
      return res.status(400).json({
        success: false,
        error: 'Maximum analysis period is 365 days'
      });
    }
    
    const patterns = await patternService.analyzeCustomRange(start, end);
    
    res.json({
      success: true,
      period: { startDate: start, endDate: end },
      patterns
    });
  } catch (error) {
    logger.error('Custom analysis failed', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get pattern trends
 * GET /api/v2/patterns/trends/:patternType
 */
router.get('/trends/:patternType', async (req, res) => {
  try {
    const { patternType } = req.params;
    const { weeks = 8 } = req.query;
    
    const validTypes = ['temporal', 'spatial', 'operational', 'anomalies'];
    if (!validTypes.includes(patternType.toLowerCase())) {
      return res.status(400).json({
        success: false,
        error: `Invalid pattern type. Valid types: ${validTypes.join(', ')}`
      });
    }
    
    const trends = await patternService.getPatternTrends(
      patternType,
      parseInt(weeks)
    );
    
    res.json({
      success: true,
      patternType,
      weeks: parseInt(weeks),
      trends
    });
  } catch (error) {
    logger.error('Failed to get pattern trends', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Export patterns report
 * GET /api/v2/patterns/export
 */
router.get('/export', authenticateRequest, async (req, res) => {
  try {
    const { format = 'json' } = req.query;
    const validFormats = ['json', 'markdown'];
    
    if (!validFormats.includes(format.toLowerCase())) {
      return res.status(400).json({
        success: false,
        error: `Invalid format. Valid formats: ${validFormats.join(', ')}`
      });
    }
    
    const report = await patternService.exportPatternsReport(format);
    
    // Set appropriate content type
    const contentType = format === 'json' ? 'application/json' : 'text/markdown';
    const filename = `pattern-analysis-${new Date().toISOString().split('T')[0]}.${format === 'json' ? 'json' : 'md'}`;
    
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(report);
  } catch (error) {
    logger.error('Failed to export patterns report', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Trigger pattern analysis
 * POST /api/v2/patterns/run
 */
router.post('/run', authenticateRequest, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }
    
    const { days = 30 } = req.body;
    
    const results = await patternService.runAnalysis(parseInt(days));
    
    res.json({
      success: true,
      message: 'Pattern analysis completed',
      results: {
        period: results.period,
        flightsAnalyzed: results.flightsAnalyzed,
        patternsFound: patternService.countPatterns(results.patterns),
        insightsGenerated: results.insights.length
      }
    });
  } catch (error) {
    logger.error('Pattern analysis failed', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;