const express = require('express');
const router = express.Router();
const { register } = require('../middleware/metrics');

/**
 * @swagger
 * /api/v2/metrics:
 *   get:
 *     summary: Get Prometheus metrics
 *     description: Returns metrics in Prometheus format for monitoring
 *     tags:
 *       - Monitoring
 *     responses:
 *       200:
 *         description: Metrics in Prometheus format
 *         content:
 *           text/plain:
 *             schema:
 *               type: string
 *             example: |
 *               # HELP http_request_duration_seconds Duration of HTTP requests in seconds
 *               # TYPE http_request_duration_seconds histogram
 *               http_request_duration_seconds_bucket{le="0.1",method="GET",route="/api/v2/flights",status_code="200"} 45
 */
router.get('/', async (req, res) => {
  try {
    res.set('Content-Type', register.contentType);
    const metrics = await register.metrics();
    res.end(metrics);
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate metrics' });
  }
});

module.exports = router;