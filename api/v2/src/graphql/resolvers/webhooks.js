const { apiLogger } = require('../../../../../lib/logging');

const logger = apiLogger.child('GraphQL:Webhooks');

// Mock webhook store (in production, use database)
const webhooks = new Map();

module.exports = {
  Query: {
    // Webhook queries would be handled through REST API
  },

  Mutation: {
    createWebhook: async (_, { input }, context) => {
      try {
        // Check authentication
        if (!context.user) {
          throw new Error('Authentication required');
        }
        
        const webhookId = `wh_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const webhook = {
          id: webhookId,
          userId: context.user.id,
          url: input.url,
          events: input.events,
          filters: input.filters || {},
          secret: input.secret || generateSecret(),
          active: true,
          createdAt: new Date(),
          lastDelivery: null,
          deliveryAttempts: 0,
          failureCount: 0
        };
        
        webhooks.set(webhookId, webhook);
        
        // Test webhook
        await testWebhookEndpoint(webhook);
        
        return webhook;
      } catch (error) {
        logger.error('Failed to create webhook', error);
        throw new Error('Failed to create webhook');
      }
    },

    updateWebhook: async (_, { id, input }, context) => {
      try {
        // Check authentication
        if (!context.user) {
          throw new Error('Authentication required');
        }
        
        const webhook = webhooks.get(id);
        
        if (!webhook) {
          throw new Error('Webhook not found');
        }
        
        if (webhook.userId !== context.user.id) {
          throw new Error('Unauthorized');
        }
        
        // Update webhook
        if (input.url !== undefined) webhook.url = input.url;
        if (input.events !== undefined) webhook.events = input.events;
        if (input.filters !== undefined) webhook.filters = input.filters;
        if (input.active !== undefined) webhook.active = input.active;
        
        return webhook;
      } catch (error) {
        logger.error('Failed to update webhook', error);
        throw new Error('Failed to update webhook');
      }
    },

    deleteWebhook: async (_, { id }, context) => {
      try {
        // Check authentication
        if (!context.user) {
          throw new Error('Authentication required');
        }
        
        const webhook = webhooks.get(id);
        
        if (!webhook) {
          throw new Error('Webhook not found');
        }
        
        if (webhook.userId !== context.user.id) {
          throw new Error('Unauthorized');
        }
        
        webhooks.delete(id);
        
        return {
          success: true,
          message: 'Webhook deleted successfully'
        };
      } catch (error) {
        logger.error('Failed to delete webhook', error);
        throw new Error('Failed to delete webhook');
      }
    },

    testWebhook: async (_, { id }, context) => {
      try {
        // Check authentication
        if (!context.user) {
          throw new Error('Authentication required');
        }
        
        const webhook = webhooks.get(id);
        
        if (!webhook) {
          throw new Error('Webhook not found');
        }
        
        if (webhook.userId !== context.user.id) {
          throw new Error('Unauthorized');
        }
        
        const startTime = Date.now();
        await testWebhookEndpoint(webhook);
        const responseTime = Date.now() - startTime;
        
        return {
          success: true,
          message: 'Test webhook sent successfully',
          responseTime
        };
      } catch (error) {
        logger.error('Failed to test webhook', error);
        return {
          success: false,
          message: error.message,
          responseTime: 0
        };
      }
    }
  },

  Webhook: {
    // Type resolvers if needed
  }
};

// Helper functions
function generateSecret() {
  return require('crypto').randomBytes(32).toString('hex');
}

async function testWebhookEndpoint(webhook) {
  const testPayload = {
    type: 'webhook.test',
    timestamp: new Date().toISOString(),
    data: {
      message: 'This is a test webhook delivery',
      webhookId: webhook.id
    }
  };
  
  // In production, actually send HTTP request
  logger.info('Testing webhook', { url: webhook.url, webhookId: webhook.id });
  
  // Simulate successful test
  return true;
}