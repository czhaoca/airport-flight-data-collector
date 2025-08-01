const { withFilter } = require('graphql-subscriptions');
const { pubsub } = require('./index');

// Subscription event names
const FLIGHT_UPDATED = 'FLIGHT_UPDATED';
const FLIGHT_DELAYED = 'FLIGHT_DELAYED';
const FLIGHT_CANCELLED = 'FLIGHT_CANCELLED';
const GATE_CHANGED = 'GATE_CHANGED';
const AIRPORT_STATS_UPDATED = 'AIRPORT_STATS_UPDATED';
const SYSTEM_ALERT = 'SYSTEM_ALERT';

module.exports = {
  Subscription: {
    flightUpdated: {
      subscribe: withFilter(
        () => pubsub.asyncIterator([FLIGHT_UPDATED]),
        (payload, variables) => {
          // Filter by airports
          if (variables.airports && variables.airports.length > 0) {
            const flightAirports = [
              payload.flightUpdated.flight.origin.code,
              payload.flightUpdated.flight.destination.code
            ];
            if (!variables.airports.some(airport => flightAirports.includes(airport))) {
              return false;
            }
          }
          
          // Filter by flights
          if (variables.flights && variables.flights.length > 0) {
            if (!variables.flights.includes(payload.flightUpdated.flight.flightNumber)) {
              return false;
            }
          }
          
          // Filter by airlines
          if (variables.airlines && variables.airlines.length > 0) {
            if (!variables.airlines.includes(payload.flightUpdated.flight.airline.code)) {
              return false;
            }
          }
          
          return true;
        }
      )
    },

    flightDelayed: {
      subscribe: withFilter(
        () => pubsub.asyncIterator([FLIGHT_DELAYED]),
        (payload, variables) => {
          // Filter by airports
          if (variables.airports && variables.airports.length > 0) {
            const flightAirports = [
              payload.flightDelayed.flight.origin.code,
              payload.flightDelayed.flight.destination.code
            ];
            if (!variables.airports.some(airport => flightAirports.includes(airport))) {
              return false;
            }
          }
          
          // Filter by minimum delay
          if (variables.minDelay) {
            if (payload.flightDelayed.delay.minutes < variables.minDelay) {
              return false;
            }
          }
          
          return true;
        }
      )
    },

    flightCancelled: {
      subscribe: withFilter(
        () => pubsub.asyncIterator([FLIGHT_CANCELLED]),
        (payload, variables) => {
          // Filter by airports
          if (variables.airports && variables.airports.length > 0) {
            const flightAirports = [
              payload.flightCancelled.flight.origin.code,
              payload.flightCancelled.flight.destination.code
            ];
            if (!variables.airports.some(airport => flightAirports.includes(airport))) {
              return false;
            }
          }
          
          return true;
        }
      )
    },

    gateChanged: {
      subscribe: withFilter(
        () => pubsub.asyncIterator([GATE_CHANGED]),
        (payload, variables) => {
          // Filter by airports
          if (variables.airports && variables.airports.length > 0) {
            const flightAirports = [
              payload.gateChanged.flight.origin.code,
              payload.gateChanged.flight.destination.code
            ];
            if (!variables.airports.some(airport => flightAirports.includes(airport))) {
              return false;
            }
          }
          
          return true;
        }
      )
    },

    airportStatsUpdated: {
      subscribe: withFilter(
        () => pubsub.asyncIterator([AIRPORT_STATS_UPDATED]),
        (payload, variables) => {
          // Filter by airports
          if (variables.airports && variables.airports.length > 0) {
            if (!variables.airports.includes(payload.airportStatsUpdated.airport.code)) {
              return false;
            }
          }
          
          return true;
        }
      )
    },

    systemAlert: {
      subscribe: withFilter(
        () => pubsub.asyncIterator([SYSTEM_ALERT]),
        (payload, variables) => {
          // Filter by severity
          if (variables.severity && variables.severity.length > 0) {
            if (!variables.severity.includes(payload.systemAlert.severity)) {
              return false;
            }
          }
          
          return true;
        }
      )
    }
  },

  // Helper functions to publish events
  publishFlightUpdate: (flight, previousStatus, changes) => {
    pubsub.publish(FLIGHT_UPDATED, {
      flightUpdated: {
        flight,
        previousStatus,
        changes,
        timestamp: new Date()
      }
    });
  },

  publishFlightDelay: (flight, delay, previousDelay) => {
    pubsub.publish(FLIGHT_DELAYED, {
      flightDelayed: {
        flight,
        delay,
        previousDelay,
        impact: delay.minutes > 60 ? 'Significant' : 'Minor',
        timestamp: new Date()
      }
    });
  },

  publishFlightCancellation: (flight, cancellation, alternativeFlights = []) => {
    pubsub.publish(FLIGHT_CANCELLED, {
      flightCancelled: {
        flight,
        cancellation,
        alternativeFlights,
        timestamp: new Date()
      }
    });
  },

  publishGateChange: (flight, previousGate, newGate, terminal) => {
    pubsub.publish(GATE_CHANGED, {
      gateChanged: {
        flight,
        previousGate,
        newGate,
        terminal,
        timestamp: new Date()
      }
    });
  },

  publishAirportStatsUpdate: (airport, stats, changes) => {
    pubsub.publish(AIRPORT_STATS_UPDATED, {
      airportStatsUpdated: {
        airport,
        stats,
        changes,
        timestamp: new Date()
      }
    });
  },

  publishSystemAlert: (alert) => {
    pubsub.publish(SYSTEM_ALERT, {
      systemAlert: {
        ...alert,
        timestamp: new Date()
      }
    });
  }
};

// Export event names for use in other modules
module.exports.events = {
  FLIGHT_UPDATED,
  FLIGHT_DELAYED,
  FLIGHT_CANCELLED,
  GATE_CHANGED,
  AIRPORT_STATS_UPDATED,
  SYSTEM_ALERT
};