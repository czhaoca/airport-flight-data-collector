const PredictionService = require('../../../../../analytics/services/PredictionService');
const { apiLogger } = require('../../../../../lib/logging');

const logger = apiLogger.child('GraphQL:Predictions');

// Initialize prediction service
const predictionService = new PredictionService();

// Initialize service
(async () => {
  try {
    await predictionService.initialize();
    logger.info('Prediction service initialized for GraphQL');
  } catch (error) {
    logger.error('Failed to initialize prediction service', error);
  }
})();

module.exports = {
  Query: {
    delayPrediction: async (_, { flightData }, context) => {
      try {
        // Check authentication
        if (!context.user) {
          throw new Error('Authentication required');
        }
        
        const prediction = await predictionService.predictDelay(flightData);
        return prediction;
      } catch (error) {
        logger.error('Delay prediction failed', error);
        throw new Error('Failed to generate delay prediction');
      }
    },

    upcomingPredictions: async (_, { airport, hours = 24 }) => {
      try {
        const predictions = await predictionService.getUpcomingFlightPredictions(
          airport,
          hours
        );
        
        return {
          airport,
          timeRange: `${hours} hours`,
          totalFlights: predictions.length,
          predictions
        };
      } catch (error) {
        logger.error('Failed to get upcoming predictions', error);
        throw new Error('Failed to get upcoming predictions');
      }
    },

    highRiskFlights: async (_, { airport, hours = 12 }) => {
      try {
        const predictions = await predictionService.getUpcomingFlightPredictions(
          airport,
          hours
        );
        
        // Filter for high-risk flights only
        return predictions.filter(
          p => p.prediction && p.prediction.riskLevel === 'HIGH'
        );
      } catch (error) {
        logger.error('Failed to get high-risk flights', error);
        throw new Error('Failed to get high-risk flights');
      }
    },

    predictionMetrics: async (_, __, context) => {
      try {
        // Check authentication
        if (!context.user) {
          throw new Error('Authentication required');
        }
        
        const metrics = await predictionService.getModelMetrics();
        return metrics;
      } catch (error) {
        logger.error('Failed to get prediction metrics', error);
        throw new Error('Failed to get prediction metrics');
      }
    }
  },

  Subscription: {
    delayPredictionUpdate: {
      subscribe: (_, { airports, minProbability = 0.5 }) => {
        // In a real implementation, this would subscribe to prediction updates
        const { pubsub } = require('./index');
        return pubsub.asyncIterator(['DELAY_PREDICTION_UPDATE']);
      },
      resolve: (payload, { airports, minProbability }) => {
        // Filter by airports if specified
        if (airports && airports.length > 0) {
          const flightAirports = [
            payload.flight.origin.code,
            payload.flight.destination.code
          ];
          if (!airports.some(airport => flightAirports.includes(airport))) {
            return null;
          }
        }
        
        // Filter by minimum probability
        if (payload.prediction.delayProbability < minProbability) {
          return null;
        }
        
        return payload;
      }
    }
  }
};

// Export function to publish prediction updates
module.exports.publishPredictionUpdate = (flight, prediction, previousPrediction) => {
  const { pubsub } = require('./index');
  
  pubsub.publish('DELAY_PREDICTION_UPDATE', {
    flight,
    prediction,
    previousPrediction,
    timestamp: new Date()
  });
};