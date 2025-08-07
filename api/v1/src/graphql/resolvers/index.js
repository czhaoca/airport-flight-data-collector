const { GraphQLDateTime, GraphQLJSON } = require('graphql-scalars');
const { PubSub, withFilter } = require('graphql-subscriptions');
const flightResolvers = require('./flights');
const airportResolvers = require('./airports');
const statisticsResolvers = require('./statistics');
const webhookResolvers = require('./webhooks');
const batchResolvers = require('./batch');
const authResolvers = require('./auth');
const subscriptionResolvers = require('./subscriptions');
const predictionResolvers = require('./predictions');

// Create PubSub instance for subscriptions
const pubsub = new PubSub();

// Export pubsub for use in other modules
module.exports.pubsub = pubsub;

// Combine all resolvers
const resolvers = {
  // Scalar types
  DateTime: GraphQLDateTime,
  JSON: GraphQLJSON,

  // Query resolvers
  Query: {
    ...flightResolvers.Query,
    ...airportResolvers.Query,
    ...statisticsResolvers.Query,
    ...webhookResolvers.Query,
    ...batchResolvers.Query,
    ...authResolvers.Query,
    ...predictionResolvers.Query
  },

  // Mutation resolvers
  Mutation: {
    ...authResolvers.Mutation,
    ...webhookResolvers.Mutation,
    ...batchResolvers.Mutation
  },

  // Subscription resolvers
  Subscription: {
    ...subscriptionResolvers.Subscription,
    ...predictionResolvers.Subscription
  },

  // Type resolvers
  Flight: flightResolvers.Flight,
  Airport: airportResolvers.Airport,
  Airline: airportResolvers.Airline,
  Webhook: webhookResolvers.Webhook,
  BatchJob: batchResolvers.BatchJob,
  
  // Union type resolvers
  RankingEntity: {
    __resolveType(obj) {
      if (obj.code && obj.terminals) return 'Airport';
      if (obj.code && obj.alliance !== undefined) return 'Airline';
      if (obj.origin && obj.destination) return 'Route';
      return null;
    }
  },

  // Connection resolvers
  FlightConnection: {
    totalCount: (parent) => parent.totalCount,
    edges: (parent) => parent.edges,
    pageInfo: (parent) => parent.pageInfo
  }
};

module.exports.resolvers = resolvers;