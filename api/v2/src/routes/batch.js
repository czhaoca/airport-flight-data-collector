const express = require('express');
const { apiLogger } = require('../../../../lib/logging');
const { getDatabase } = require('../../../../lib/database');
const { authenticateRequest } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();
const logger = apiLogger.child('Batch');

// Store batch job status
const batchJobs = new Map();

// Maximum operations per batch
const MAX_BATCH_SIZE = 100;
const MAX_PARALLEL_OPERATIONS = 10;

/**
 * Create a new batch job
 * POST /api/v2/batch
 * Body: {
 *   operations: [
 *     { method: 'GET|POST|PUT|DELETE', endpoint: '/flights/123', body: {} },
 *     ...
 *   ]
 * }
 */
router.post('/', authenticateRequest, async (req, res) => {
  try {
    const { operations } = req.body;

    // Validate operations
    if (!Array.isArray(operations) || operations.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Operations array is required'
      });
    }

    if (operations.length > MAX_BATCH_SIZE) {
      return res.status(400).json({
        success: false,
        error: `Maximum ${MAX_BATCH_SIZE} operations allowed per batch`
      });
    }

    // Validate each operation
    const validMethods = ['GET', 'POST', 'PUT', 'DELETE'];
    for (const op of operations) {
      if (!op.method || !validMethods.includes(op.method)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid operation method'
        });
      }
      if (!op.endpoint) {
        return res.status(400).json({
          success: false,
          error: 'Operation endpoint is required'
        });
      }
    }

    // Create batch job
    const jobId = uuidv4();
    const job = {
      id: jobId,
      status: 'processing',
      createdAt: new Date(),
      totalOperations: operations.length,
      completedOperations: 0,
      results: [],
      errors: []
    };

    batchJobs.set(jobId, job);

    // Process operations asynchronously
    processBatchOperations(jobId, operations, req.user);

    res.status(202).json({
      success: true,
      jobId,
      status: 'processing',
      statusUrl: `/api/v2/batch/${jobId}`
    });

  } catch (error) {
    logger.error('Batch creation failed', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get batch job status
 * GET /api/v2/batch/:jobId
 */
router.get('/:jobId', async (req, res) => {
  const job = batchJobs.get(req.params.jobId);

  if (!job) {
    return res.status(404).json({
      success: false,
      error: 'Batch job not found'
    });
  }

  res.json({
    success: true,
    job: {
      id: job.id,
      status: job.status,
      createdAt: job.createdAt,
      completedAt: job.completedAt,
      progress: {
        total: job.totalOperations,
        completed: job.completedOperations,
        percentage: Math.round((job.completedOperations / job.totalOperations) * 100)
      },
      results: job.status === 'completed' ? job.results : undefined,
      errors: job.errors.length > 0 ? job.errors : undefined
    }
  });
});

/**
 * Get all batch jobs for user
 * GET /api/v2/batch
 */
router.get('/', authenticateRequest, async (req, res) => {
  const userJobs = Array.from(batchJobs.values())
    .filter(job => job.userId === req.user.id)
    .map(job => ({
      id: job.id,
      status: job.status,
      createdAt: job.createdAt,
      totalOperations: job.totalOperations,
      completedOperations: job.completedOperations
    }));

  res.json({
    success: true,
    jobs: userJobs
  });
});

/**
 * Cancel a batch job
 * DELETE /api/v2/batch/:jobId
 */
router.delete('/:jobId', authenticateRequest, async (req, res) => {
  const job = batchJobs.get(req.params.jobId);

  if (!job) {
    return res.status(404).json({
      success: false,
      error: 'Batch job not found'
    });
  }

  if (job.userId !== req.user.id) {
    return res.status(403).json({
      success: false,
      error: 'Unauthorized'
    });
  }

  if (job.status !== 'processing') {
    return res.status(400).json({
      success: false,
      error: 'Can only cancel processing jobs'
    });
  }

  job.status = 'cancelled';
  job.completedAt = new Date();

  res.json({
    success: true,
    message: 'Batch job cancelled'
  });
});

/**
 * Batch update flights
 * POST /api/v2/batch/flights/update
 * Specialized endpoint for bulk flight updates
 */
router.post('/flights/update', authenticateRequest, async (req, res) => {
  try {
    const { updates } = req.body;

    if (!Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Updates array is required'
      });
    }

    const db = await getDatabase();
    const results = {
      success: 0,
      failed: 0,
      errors: []
    };

    // Process updates in chunks
    const chunkSize = 10;
    for (let i = 0; i < updates.length; i += chunkSize) {
      const chunk = updates.slice(i, i + chunkSize);
      
      await Promise.all(chunk.map(async (update) => {
        try {
          // Validate update
          if (!update.id || !update.data) {
            throw new Error('Invalid update format');
          }

          // Update flight in database
          await db.updateFlight(update.id, update.data);
          results.success++;
        } catch (error) {
          results.failed++;
          results.errors.push({
            id: update.id,
            error: error.message
          });
        }
      }));
    }

    res.json({
      success: true,
      results
    });

  } catch (error) {
    logger.error('Batch flight update failed', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Batch data collection trigger
 * POST /api/v2/batch/collect
 * Trigger collection for multiple airports
 */
router.post('/collect', authenticateRequest, async (req, res) => {
  try {
    const { airports, options = {} } = req.body;

    if (!Array.isArray(airports) || airports.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Airports array is required'
      });
    }

    const jobId = uuidv4();
    const job = {
      id: jobId,
      type: 'collection',
      status: 'processing',
      createdAt: new Date(),
      airports,
      options,
      results: []
    };

    batchJobs.set(jobId, job);

    // Trigger collection asynchronously
    triggerBatchCollection(jobId, airports, options);

    res.status(202).json({
      success: true,
      jobId,
      message: `Collection triggered for ${airports.length} airports`,
      statusUrl: `/api/v2/batch/${jobId}`
    });

  } catch (error) {
    logger.error('Batch collection failed', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Helper functions

async function processBatchOperations(jobId, operations, user) {
  const job = batchJobs.get(jobId);
  if (!job) return;

  job.userId = user.id;

  try {
    // Process operations in parallel chunks
    for (let i = 0; i < operations.length; i += MAX_PARALLEL_OPERATIONS) {
      if (job.status === 'cancelled') break;

      const chunk = operations.slice(i, i + MAX_PARALLEL_OPERATIONS);
      
      const chunkResults = await Promise.allSettled(
        chunk.map(op => executeOperation(op, user))
      );

      chunkResults.forEach((result, index) => {
        const operation = chunk[index];
        
        if (result.status === 'fulfilled') {
          job.results.push({
            operation,
            result: result.value
          });
        } else {
          job.errors.push({
            operation,
            error: result.reason.message
          });
        }
        
        job.completedOperations++;
      });
    }

    job.status = job.status === 'cancelled' ? 'cancelled' : 'completed';
    job.completedAt = new Date();

  } catch (error) {
    logger.error('Batch processing error', { jobId, error });
    job.status = 'failed';
    job.error = error.message;
    job.completedAt = new Date();
  }

  // Clean up old jobs after 1 hour
  setTimeout(() => {
    batchJobs.delete(jobId);
  }, 3600000);
}

async function executeOperation(operation, user) {
  const { method, endpoint, body } = operation;
  
  // This is a simplified implementation
  // In production, you would properly route to actual endpoints
  
  const db = await getDatabase();
  
  switch (endpoint) {
    case '/flights':
      if (method === 'GET') {
        return await db.getFlightData(body || {});
      }
      break;
      
    case endpoint.match(/^\/flights\/\w+$/)?.input:
      const flightId = endpoint.split('/').pop();
      if (method === 'GET') {
        const flights = await db.getFlightData({ filters: { id: flightId } });
        return flights[0];
      }
      if (method === 'DELETE') {
        return await db.deleteFlight(flightId);
      }
      break;
      
    default:
      throw new Error(`Unsupported endpoint: ${endpoint}`);
  }
}

async function triggerBatchCollection(jobId, airports, options) {
  const job = batchJobs.get(jobId);
  if (!job) return;

  try {
    const { CollectorService } = require('../../application/services/CollectorService');
    const collectorService = new CollectorService();

    for (const airport of airports) {
      if (job.status === 'cancelled') break;

      try {
        const result = await collectorService.collectAirportData(airport, options);
        job.results.push({
          airport,
          success: result.success,
          flightCount: result.flightCount,
          message: result.message
        });
      } catch (error) {
        job.results.push({
          airport,
          success: false,
          error: error.message
        });
      }
    }

    job.status = job.status === 'cancelled' ? 'cancelled' : 'completed';
    job.completedAt = new Date();

  } catch (error) {
    logger.error('Batch collection error', { jobId, error });
    job.status = 'failed';
    job.error = error.message;
    job.completedAt = new Date();
  }

  // Clean up after 1 hour
  setTimeout(() => {
    batchJobs.delete(jobId);
  }, 3600000);
}

module.exports = router;