const { ApolloServer } = require('apollo-server-express');
const { makeExecutableSchema } = require('@graphql-tools/schema');
const { WebSocketServer } = require('ws');
const { useServer } = require('graphql-ws/lib/use/ws');
const { execute, subscribe } = require('graphql');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const { apiLogger } = require('../../../../lib/logging');
const { resolvers } = require('./resolvers');

const logger = apiLogger.child('GraphQL');

// Load schema
const typeDefs = fs.readFileSync(
  path.join(__dirname, 'schema.graphql'),
  'utf-8'
);

// Create executable schema
const schema = makeExecutableSchema({
  typeDefs,
  resolvers
});

// Context function for requests
const context = async ({ req, connection }) => {
  // For subscriptions
  if (connection) {
    return connection.context;
  }
  
  // For queries and mutations
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
      return {
        user: decoded,
        req
      };
    } catch (error) {
      logger.debug('Invalid token', error.message);
    }
  }
  
  return { req };
};

// Create Apollo Server
const createApolloServer = async (httpServer) => {
  const server = new ApolloServer({
    schema,
    context,
    plugins: [
      {
        async serverWillStart() {
          logger.info('GraphQL server starting');
        },
        async requestDidStart() {
          return {
            async willSendResponse(requestContext) {
              // Log GraphQL operations
              const { operationName, query, variables } = requestContext.request;
              logger.debug('GraphQL operation', {
                operationName,
                query: query?.substring(0, 100),
                variables: Object.keys(variables || {})
              });
            }
          };
        }
      }
    ],
    formatError: (error) => {
      logger.error('GraphQL error', {
        message: error.message,
        path: error.path,
        extensions: error.extensions
      });
      
      // Don't expose internal errors in production
      if (process.env.NODE_ENV === 'production' && error.extensions?.code === 'INTERNAL_SERVER_ERROR') {
        return {
          message: 'Internal server error',
          extensions: {
            code: 'INTERNAL_SERVER_ERROR'
          }
        };
      }
      
      return error;
    }
  });

  await server.start();
  return server;
};

// Create WebSocket server for subscriptions
const createWebSocketServer = (httpServer) => {
  const wsServer = new WebSocketServer({
    server: httpServer,
    path: '/graphql'
  });

  return useServer(
    {
      schema,
      context: async (ctx) => {
        // Get auth token from connection params
        const token = ctx.connectionParams?.authorization?.replace('Bearer ', '');
        
        if (token) {
          try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
            return { user: decoded };
          } catch (error) {
            throw new Error('Invalid authentication token');
          }
        }
        
        // Allow anonymous subscriptions for public data
        return {};
      },
      onConnect: async (ctx) => {
        logger.info('GraphQL WebSocket client connected');
      },
      onDisconnect: async (ctx) => {
        logger.info('GraphQL WebSocket client disconnected');
      },
      onSubscribe: async (ctx, msg) => {
        logger.debug('GraphQL subscription', {
          operationName: msg.payload.operationName
        });
      },
      onError: async (ctx, msg, errors) => {
        logger.error('GraphQL WebSocket error', errors);
      }
    },
    wsServer
  );
};

// Integration with event system
const setupEventIntegration = () => {
  const { getInstance: getEventEmitter } = require('../websocket/event-emitter');
  const eventEmitter = getEventEmitter();
  const { 
    publishFlightUpdate,
    publishFlightDelay,
    publishFlightCancellation,
    publishGateChange,
    publishAirportStatsUpdate,
    publishSystemAlert
  } = require('./resolvers/subscriptions');

  // Connect event emitter to GraphQL subscriptions
  eventEmitter.on('flight:statusChange', (event) => {
    publishFlightUpdate(
      event.flight,
      event.previousStatus,
      event.changes || []
    );
  });

  eventEmitter.on('flight:delay', (event) => {
    publishFlightDelay(
      event.flight,
      event.delay,
      event.previousDelay
    );
  });

  eventEmitter.on('flight:cancelled', (event) => {
    publishFlightCancellation(
      event.flight,
      event.cancellation,
      event.alternativeFlights
    );
  });

  eventEmitter.on('flight:gateChange', (event) => {
    publishGateChange(
      event.flight,
      event.previousGate,
      event.newGate,
      event.terminal
    );
  });

  eventEmitter.on('airport:statsUpdate', (event) => {
    publishAirportStatsUpdate(
      event.airport,
      event.stats,
      event.changes
    );
  });

  eventEmitter.on('system:alert', (event) => {
    publishSystemAlert(event);
  });
};

module.exports = {
  createApolloServer,
  createWebSocketServer,
  setupEventIntegration
};