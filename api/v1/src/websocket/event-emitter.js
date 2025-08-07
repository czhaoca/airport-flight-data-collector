const EventEmitter = require('events');
const { apiLogger } = require('../../../../lib/logging');

/**
 * Centralized event emitter for flight updates
 * Bridges between data collection and WebSocket broadcasting
 */
class FlightEventEmitter extends EventEmitter {
  constructor() {
    super();
    this.logger = apiLogger.child('EventEmitter');
    this.delayThreshold = 15; // minutes
    this.setupEventHandlers();
  }

  setupEventHandlers() {
    // Log all events for debugging
    this.on('newListener', (event) => {
      this.logger.debug(`New listener added for event: ${event}`);
    });

    this.on('removeListener', (event) => {
      this.logger.debug(`Listener removed for event: ${event}`);
    });
  }

  /**
   * Emit flight status change
   * @param {Object} flight - Updated flight data
   * @param {Object} previousStatus - Previous status data
   */
  emitFlightStatusChange(flight, previousStatus) {
    const event = {
      flightId: flight.id,
      flightNumber: flight.flightNumber,
      timestamp: new Date(),
      changes: this.detectChanges(flight, previousStatus)
    };

    if (event.changes.length > 0) {
      this.emit('flight:statusChange', event);
      this.logger.info('Flight status changed', event);

      // Emit specific events based on change type
      event.changes.forEach(change => {
        if (change.field === 'status') {
          this.emit(`flight:${change.newValue}`, flight);
        }
      });
    }
  }

  /**
   * Detect changes between two flight objects
   */
  detectChanges(current, previous) {
    const changes = [];
    const fieldsToCheck = [
      'status', 'actualTime', 'estimatedTime', 'gate',
      'terminal', 'baggage', 'delay', 'cancellationReason'
    ];

    fieldsToCheck.forEach(field => {
      if (current[field] !== previous[field]) {
        changes.push({
          field,
          oldValue: previous[field],
          newValue: current[field]
        });
      }
    });

    return changes;
  }

  /**
   * Emit new delay event
   * @param {Object} flight - Flight with delay
   * @param {number} delayMinutes - Delay in minutes
   * @param {string} reason - Delay reason if available
   */
  emitDelay(flight, delayMinutes, reason = null) {
    if (delayMinutes >= this.delayThreshold) {
      const event = {
        flight: {
          id: flight.id,
          flightNumber: flight.flightNumber,
          origin: flight.origin,
          destination: flight.destination,
          airline: flight.airline
        },
        delay: {
          minutes: delayMinutes,
          severity: this.getDelaySeverity(delayMinutes),
          reason
        },
        timestamp: new Date()
      };

      this.emit('flight:delay', event);
      this.logger.warn('Flight delayed', event);
    }
  }

  /**
   * Get delay severity level
   */
  getDelaySeverity(minutes) {
    if (minutes >= 120) return 'severe';
    if (minutes >= 60) return 'major';
    if (minutes >= 30) return 'moderate';
    return 'minor';
  }

  /**
   * Emit cancellation event
   * @param {Object} flight - Cancelled flight
   * @param {string} reason - Cancellation reason
   */
  emitCancellation(flight, reason = null) {
    const event = {
      flight: {
        id: flight.id,
        flightNumber: flight.flightNumber,
        origin: flight.origin,
        destination: flight.destination,
        airline: flight.airline,
        scheduledTime: flight.scheduledTime
      },
      reason,
      timestamp: new Date()
    };

    this.emit('flight:cancelled', event);
    this.logger.warn('Flight cancelled', event);
  }

  /**
   * Emit gate change event
   * @param {Object} flight - Flight with gate change
   * @param {string} oldGate - Previous gate
   * @param {string} newGate - New gate
   */
  emitGateChange(flight, oldGate, newGate) {
    const event = {
      flight: {
        id: flight.id,
        flightNumber: flight.flightNumber,
        origin: flight.origin,
        destination: flight.destination
      },
      gate: {
        old: oldGate,
        new: newGate
      },
      timestamp: new Date()
    };

    this.emit('flight:gateChange', event);
    this.logger.info('Gate changed', event);
  }

  /**
   * Emit airport statistics update
   * @param {string} airport - Airport code
   * @param {Object} stats - Updated statistics
   */
  emitAirportStats(airport, stats) {
    const event = {
      airport,
      stats,
      timestamp: new Date()
    };

    this.emit('airport:statsUpdate', event);
  }

  /**
   * Emit collection statistics
   * @param {Object} stats - Collection statistics
   */
  emitCollectionStats(stats) {
    const event = {
      ...stats,
      timestamp: new Date()
    };

    this.emit('collection:stats', event);
  }

  /**
   * Emit system alert
   * @param {string} level - Alert level (info, warning, error)
   * @param {string} message - Alert message
   * @param {Object} data - Additional data
   */
  emitSystemAlert(level, message, data = {}) {
    const event = {
      level,
      message,
      data,
      timestamp: new Date()
    };

    this.emit('system:alert', event);
    this.logger[level](`System alert: ${message}`, data);
  }

  /**
   * Batch emit multiple updates
   * @param {Array} updates - Array of updates
   */
  emitBatch(updates) {
    const event = {
      updates,
      count: updates.length,
      timestamp: new Date()
    };

    this.emit('batch:update', event);
  }
}

// Singleton instance
let instance = null;

module.exports = {
  /**
   * Get the singleton instance
   * @returns {FlightEventEmitter} Event emitter instance
   */
  getInstance() {
    if (!instance) {
      instance = new FlightEventEmitter();
    }
    return instance;
  },

  /**
   * Create a new instance (for testing)
   * @returns {FlightEventEmitter} New event emitter instance
   */
  createInstance() {
    return new FlightEventEmitter();
  }
};