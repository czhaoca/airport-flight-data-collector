const express = require('express');
const crypto = require('crypto');
const { apiLogger } = require('../../../../lib/logging');
const { authenticateRequest } = require('../middleware/auth');
const { getInstance: getEventEmitter } = require('../websocket/event-emitter');

const router = express.Router();
const logger = apiLogger.child('Webhooks');
const eventEmitter = getEventEmitter();

// Store webhook subscriptions (in production, use database)
const webhookSubscriptions = new Map();

// Webhook delivery queue
const deliveryQueue = [];
let isProcessingQueue = false;

/**
 * Register a new webhook
 * POST /api/v2/webhooks
 * Body: {
 *   url: 'https://example.com/webhook',
 *   events: ['flight.delayed', 'flight.cancelled', 'airport.stats'],
 *   filters: { airport: 'SFO', minDelay: 30 },
 *   secret: 'optional-secret-for-signing'
 * }
 */
router.post('/', authenticateRequest, async (req, res) => {
  try {
    const { url, events, filters = {}, secret } = req.body;

    // Validate URL
    if (!url || !isValidUrl(url)) {
      return res.status(400).json({
        success: false,
        error: 'Valid webhook URL is required'
      });
    }

    // Validate events
    const validEvents = [
      'flight.delayed',
      'flight.cancelled',
      'flight.statusChange',
      'flight.gateChange',
      'airport.stats',
      'collection.completed',
      'system.alert'
    ];

    if (!Array.isArray(events) || events.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Events array is required'
      });
    }

    const invalidEvents = events.filter(e => !validEvents.includes(e));
    if (invalidEvents.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Invalid events: ${invalidEvents.join(', ')}`
      });
    }

    // Create webhook subscription
    const webhookId = generateWebhookId();
    const webhook = {
      id: webhookId,
      userId: req.user.id,
      url,
      events,
      filters,
      secret: secret || generateSecret(),
      createdAt: new Date(),
      active: true,
      deliveryAttempts: 0,
      lastDelivery: null,
      failureCount: 0
    };

    webhookSubscriptions.set(webhookId, webhook);

    // Test webhook with ping
    await testWebhook(webhook);

    res.json({
      success: true,
      webhook: {
        id: webhook.id,
        url: webhook.url,
        events: webhook.events,
        filters: webhook.filters,
        secret: webhook.secret,
        active: webhook.active
      }
    });

  } catch (error) {
    logger.error('Webhook registration failed', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * List user's webhooks
 * GET /api/v2/webhooks
 */
router.get('/', authenticateRequest, async (req, res) => {
  const userWebhooks = Array.from(webhookSubscriptions.values())
    .filter(w => w.userId === req.user.id)
    .map(w => ({
      id: w.id,
      url: w.url,
      events: w.events,
      filters: w.filters,
      active: w.active,
      createdAt: w.createdAt,
      lastDelivery: w.lastDelivery,
      failureCount: w.failureCount
    }));

  res.json({
    success: true,
    webhooks: userWebhooks
  });
});

/**
 * Get webhook details
 * GET /api/v2/webhooks/:id
 */
router.get('/:id', authenticateRequest, async (req, res) => {
  const webhook = webhookSubscriptions.get(req.params.id);

  if (!webhook) {
    return res.status(404).json({
      success: false,
      error: 'Webhook not found'
    });
  }

  if (webhook.userId !== req.user.id) {
    return res.status(403).json({
      success: false,
      error: 'Unauthorized'
    });
  }

  res.json({
    success: true,
    webhook: {
      id: webhook.id,
      url: webhook.url,
      events: webhook.events,
      filters: webhook.filters,
      secret: webhook.secret,
      active: webhook.active,
      createdAt: webhook.createdAt,
      lastDelivery: webhook.lastDelivery,
      deliveryAttempts: webhook.deliveryAttempts,
      failureCount: webhook.failureCount
    }
  });
});

/**
 * Update webhook
 * PUT /api/v2/webhooks/:id
 */
router.put('/:id', authenticateRequest, async (req, res) => {
  const webhook = webhookSubscriptions.get(req.params.id);

  if (!webhook) {
    return res.status(404).json({
      success: false,
      error: 'Webhook not found'
    });
  }

  if (webhook.userId !== req.user.id) {
    return res.status(403).json({
      success: false,
      error: 'Unauthorized'
    });
  }

  const { url, events, filters, active } = req.body;

  // Update webhook
  if (url && isValidUrl(url)) webhook.url = url;
  if (Array.isArray(events)) webhook.events = events;
  if (filters) webhook.filters = filters;
  if (typeof active === 'boolean') webhook.active = active;

  res.json({
    success: true,
    webhook: {
      id: webhook.id,
      url: webhook.url,
      events: webhook.events,
      filters: webhook.filters,
      active: webhook.active
    }
  });
});

/**
 * Delete webhook
 * DELETE /api/v2/webhooks/:id
 */
router.delete('/:id', authenticateRequest, async (req, res) => {
  const webhook = webhookSubscriptions.get(req.params.id);

  if (!webhook) {
    return res.status(404).json({
      success: false,
      error: 'Webhook not found'
    });
  }

  if (webhook.userId !== req.user.id) {
    return res.status(403).json({
      success: false,
      error: 'Unauthorized'
    });
  }

  webhookSubscriptions.delete(req.params.id);

  res.json({
    success: true,
    message: 'Webhook deleted'
  });
});

/**
 * Test webhook
 * POST /api/v2/webhooks/:id/test
 */
router.post('/:id/test', authenticateRequest, async (req, res) => {
  const webhook = webhookSubscriptions.get(req.params.id);

  if (!webhook) {
    return res.status(404).json({
      success: false,
      error: 'Webhook not found'
    });
  }

  if (webhook.userId !== req.user.id) {
    return res.status(403).json({
      success: false,
      error: 'Unauthorized'
    });
  }

  try {
    await testWebhook(webhook);
    res.json({
      success: true,
      message: 'Test webhook sent'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Setup event listeners for webhook delivery
function setupWebhookListeners() {
  // Flight events
  eventEmitter.on('flight:delay', (event) => {
    queueWebhookDelivery('flight.delayed', event);
  });

  eventEmitter.on('flight:cancelled', (event) => {
    queueWebhookDelivery('flight.cancelled', event);
  });

  eventEmitter.on('flight:statusChange', (event) => {
    queueWebhookDelivery('flight.statusChange', event);
  });

  eventEmitter.on('flight:gateChange', (event) => {
    queueWebhookDelivery('flight.gateChange', event);
  });

  // Airport events
  eventEmitter.on('airport:statsUpdate', (event) => {
    queueWebhookDelivery('airport.stats', event);
  });

  // Collection events
  eventEmitter.on('collection:stats', (event) => {
    queueWebhookDelivery('collection.completed', event);
  });

  // System events
  eventEmitter.on('system:alert', (event) => {
    queueWebhookDelivery('system.alert', event);
  });
}

// Helper functions

function isValidUrl(url) {
  try {
    new URL(url);
    return url.startsWith('http://') || url.startsWith('https://');
  } catch {
    return false;
  }
}

function generateWebhookId() {
  return `wh_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function generateSecret() {
  return crypto.randomBytes(32).toString('hex');
}

async function testWebhook(webhook) {
  const payload = {
    type: 'webhook.test',
    timestamp: new Date().toISOString(),
    data: {
      message: 'This is a test webhook delivery',
      webhookId: webhook.id
    }
  };

  await deliverWebhook(webhook, payload);
}

function queueWebhookDelivery(eventType, eventData) {
  // Find matching webhooks
  const matchingWebhooks = Array.from(webhookSubscriptions.values())
    .filter(w => w.active && w.events.includes(eventType))
    .filter(w => matchesFilters(w.filters, eventData));

  // Queue deliveries
  matchingWebhooks.forEach(webhook => {
    deliveryQueue.push({
      webhook,
      payload: {
        type: eventType,
        timestamp: new Date().toISOString(),
        data: eventData
      }
    });
  });

  // Process queue
  if (!isProcessingQueue) {
    processDeliveryQueue();
  }
}

function matchesFilters(filters, eventData) {
  if (!filters || Object.keys(filters).length === 0) return true;

  // Check airport filter
  if (filters.airport) {
    const eventAirports = [
      eventData.airport,
      eventData.flight?.origin,
      eventData.flight?.destination
    ].filter(Boolean);

    if (!eventAirports.includes(filters.airport)) return false;
  }

  // Check minimum delay filter
  if (filters.minDelay && eventData.delay) {
    if (eventData.delay.minutes < filters.minDelay) return false;
  }

  // Check airline filter
  if (filters.airline && eventData.flight?.airline) {
    if (eventData.flight.airline !== filters.airline) return false;
  }

  return true;
}

async function processDeliveryQueue() {
  if (isProcessingQueue || deliveryQueue.length === 0) return;

  isProcessingQueue = true;

  while (deliveryQueue.length > 0) {
    const delivery = deliveryQueue.shift();
    
    try {
      await deliverWebhook(delivery.webhook, delivery.payload);
      
      // Update webhook stats
      delivery.webhook.lastDelivery = new Date();
      delivery.webhook.deliveryAttempts++;
      
    } catch (error) {
      logger.error('Webhook delivery failed', {
        webhookId: delivery.webhook.id,
        error: error.message
      });
      
      delivery.webhook.failureCount++;
      
      // Disable webhook after 5 consecutive failures
      if (delivery.webhook.failureCount >= 5) {
        delivery.webhook.active = false;
        logger.warn('Webhook disabled due to failures', {
          webhookId: delivery.webhook.id
        });
      }
    }
  }

  isProcessingQueue = false;
}

async function deliverWebhook(webhook, payload) {
  const signature = generateSignature(webhook.secret, payload);
  
  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Webhook-Id': webhook.id,
      'X-Webhook-Signature': signature,
      'X-Webhook-Timestamp': payload.timestamp
    },
    body: JSON.stringify(payload),
    timeout: 5000
  };

  const response = await fetch(webhook.url, options);
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return response;
}

function generateSignature(secret, payload) {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(JSON.stringify(payload));
  return hmac.digest('hex');
}

// Initialize webhook listeners
setupWebhookListeners();

module.exports = router;