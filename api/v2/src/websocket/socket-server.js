const socketIO = require('socket.io');
const { createAdapter } = require('socket.io-redis');
const redis = require('redis');
const { apiLogger } = require('../../../../lib/logging');
const { authenticateSocket } = require('../middleware/auth');

class SocketServer {
  constructor(httpServer, config = {}) {
    this.io = socketIO(httpServer, {
      cors: {
        origin: config.corsOrigin || process.env.CORS_ORIGIN || '*',
        methods: ['GET', 'POST']
      },
      transports: ['websocket', 'polling']
    });

    this.config = config;
    this.logger = apiLogger.child('WebSocket');
    this.subscriptions = new Map();
    this.rooms = {
      airports: new Map(),
      flights: new Map(),
      routes: new Map()
    };

    // Setup Redis adapter for scaling
    if (config.useRedis !== false) {
      this.setupRedisAdapter();
    }

    // Setup middleware and handlers
    this.setupMiddleware();
    this.setupEventHandlers();
    this.setupRoomManagement();
  }

  setupRedisAdapter() {
    try {
      const pubClient = redis.createClient({
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379
      });
      const subClient = pubClient.duplicate();

      this.io.adapter(createAdapter(pubClient, subClient));
      this.logger.info('Redis adapter configured for Socket.IO');
    } catch (error) {
      this.logger.error('Failed to setup Redis adapter', error);
    }
  }

  setupMiddleware() {
    // Authentication middleware
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token;
        if (this.config.requireAuth && !token) {
          return next(new Error('Authentication required'));
        }

        if (token) {
          const user = await authenticateSocket(token);
          socket.userId = user.id;
          socket.userRole = user.role;
        }

        next();
      } catch (error) {
        next(new Error('Authentication failed'));
      }
    });

    // Logging middleware
    this.io.use((socket, next) => {
      this.logger.info('New connection attempt', {
        id: socket.id,
        address: socket.handshake.address,
        headers: socket.handshake.headers
      });
      next();
    });
  }

  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      this.logger.info('Client connected', { 
        socketId: socket.id,
        userId: socket.userId 
      });

      // Subscribe to airport updates
      socket.on('subscribe:airport', async (data) => {
        const { airport, types = ['all'] } = data;
        
        if (!airport || airport.length !== 3) {
          socket.emit('error', { message: 'Invalid airport code' });
          return;
        }

        const roomName = `airport:${airport.toUpperCase()}`;
        socket.join(roomName);
        
        // Track subscription
        this.trackSubscription(socket.id, 'airport', airport, types);

        socket.emit('subscribed', { 
          type: 'airport', 
          airport, 
          types,
          message: `Subscribed to ${airport} updates` 
        });

        // Send current status
        await this.sendCurrentAirportStatus(socket, airport);
      });

      // Subscribe to specific flight updates
      socket.on('subscribe:flight', (data) => {
        const { flightNumber, date } = data;
        
        if (!flightNumber) {
          socket.emit('error', { message: 'Flight number required' });
          return;
        }

        const roomName = `flight:${flightNumber}:${date || 'today'}`;
        socket.join(roomName);
        
        this.trackSubscription(socket.id, 'flight', flightNumber, { date });

        socket.emit('subscribed', { 
          type: 'flight', 
          flightNumber,
          date,
          message: `Subscribed to flight ${flightNumber} updates` 
        });
      });

      // Subscribe to route updates
      socket.on('subscribe:route', (data) => {
        const { origin, destination } = data;
        
        if (!origin || !destination) {
          socket.emit('error', { message: 'Origin and destination required' });
          return;
        }

        const roomName = `route:${origin}-${destination}`;
        socket.join(roomName);
        
        this.trackSubscription(socket.id, 'route', `${origin}-${destination}`);

        socket.emit('subscribed', { 
          type: 'route', 
          origin,
          destination,
          message: `Subscribed to route ${origin}-${destination} updates` 
        });
      });

      // Unsubscribe handlers
      socket.on('unsubscribe:airport', (data) => {
        const { airport } = data;
        const roomName = `airport:${airport.toUpperCase()}`;
        socket.leave(roomName);
        this.removeSubscription(socket.id, 'airport', airport);
      });

      socket.on('unsubscribe:flight', (data) => {
        const { flightNumber, date } = data;
        const roomName = `flight:${flightNumber}:${date || 'today'}`;
        socket.leave(roomName);
        this.removeSubscription(socket.id, 'flight', flightNumber);
      });

      socket.on('unsubscribe:route', (data) => {
        const { origin, destination } = data;
        const roomName = `route:${origin}-${destination}`;
        socket.leave(roomName);
        this.removeSubscription(socket.id, 'route', `${origin}-${destination}`);
      });

      // Handle disconnection
      socket.on('disconnect', (reason) => {
        this.logger.info('Client disconnected', { 
          socketId: socket.id, 
          reason 
        });
        this.removeAllSubscriptions(socket.id);
      });

      // Error handling
      socket.on('error', (error) => {
        this.logger.error('Socket error', { 
          socketId: socket.id, 
          error: error.message 
        });
      });
    });
  }

  setupRoomManagement() {
    // Periodically clean up empty rooms
    setInterval(() => {
      const rooms = this.io.sockets.adapter.rooms;
      let cleaned = 0;

      rooms.forEach((sockets, room) => {
        if (sockets.size === 0 && room.includes(':')) {
          // This is a custom room with no subscribers
          delete rooms[room];
          cleaned++;
        }
      });

      if (cleaned > 0) {
        this.logger.debug(`Cleaned up ${cleaned} empty rooms`);
      }
    }, 60000); // Every minute
  }

  trackSubscription(socketId, type, identifier, metadata = {}) {
    if (!this.subscriptions.has(socketId)) {
      this.subscriptions.set(socketId, new Map());
    }

    const socketSubs = this.subscriptions.get(socketId);
    socketSubs.set(`${type}:${identifier}`, {
      type,
      identifier,
      metadata,
      subscribedAt: new Date()
    });
  }

  removeSubscription(socketId, type, identifier) {
    const socketSubs = this.subscriptions.get(socketId);
    if (socketSubs) {
      socketSubs.delete(`${type}:${identifier}`);
    }
  }

  removeAllSubscriptions(socketId) {
    this.subscriptions.delete(socketId);
  }

  async sendCurrentAirportStatus(socket, airport) {
    try {
      // This would fetch current status from database
      // For now, sending mock data
      const status = {
        airport,
        timestamp: new Date(),
        stats: {
          activeFlights: 42,
          delays: 5,
          cancellations: 1,
          onTime: 36
        }
      };

      socket.emit('airport:status', status);
    } catch (error) {
      this.logger.error('Failed to send airport status', error);
    }
  }

  // Public methods for emitting updates

  emitFlightUpdate(flight) {
    const rooms = [
      `flight:${flight.flightNumber}:${flight.date}`,
      `airport:${flight.origin}`,
      `airport:${flight.destination}`,
      `route:${flight.origin}-${flight.destination}`
    ];

    rooms.forEach(room => {
      this.io.to(room).emit('flight:update', {
        type: 'flight_update',
        timestamp: new Date(),
        flight
      });
    });

    this.logger.debug('Emitted flight update', { 
      flightNumber: flight.flightNumber,
      rooms 
    });
  }

  emitDelayNotification(notification) {
    const { flight, previousDelay, currentDelay, reason } = notification;
    
    const rooms = [
      `flight:${flight.flightNumber}:${flight.date}`,
      `airport:${flight.origin}`,
      `airport:${flight.destination}`
    ];

    const event = {
      type: 'delay_notification',
      timestamp: new Date(),
      flight: {
        flightNumber: flight.flightNumber,
        origin: flight.origin,
        destination: flight.destination
      },
      delay: {
        previous: previousDelay,
        current: currentDelay,
        increase: currentDelay - previousDelay
      },
      reason
    };

    rooms.forEach(room => {
      this.io.to(room).emit('flight:delay', event);
    });

    this.logger.info('Emitted delay notification', event);
  }

  emitAirportStats(airport, stats) {
    this.io.to(`airport:${airport}`).emit('airport:stats', {
      type: 'airport_stats',
      timestamp: new Date(),
      airport,
      stats
    });
  }

  emitSystemAlert(alert) {
    // Emit to all connected clients
    this.io.emit('system:alert', {
      type: 'system_alert',
      timestamp: new Date(),
      alert
    });
  }

  // Get connection statistics
  getStats() {
    const rooms = this.io.sockets.adapter.rooms;
    const stats = {
      connectedClients: this.io.engine.clientsCount,
      totalRooms: rooms.size,
      subscriptions: {
        airports: 0,
        flights: 0,
        routes: 0
      }
    };

    rooms.forEach((sockets, room) => {
      if (room.startsWith('airport:')) stats.subscriptions.airports++;
      else if (room.startsWith('flight:')) stats.subscriptions.flights++;
      else if (room.startsWith('route:')) stats.subscriptions.routes++;
    });

    return stats;
  }

  // Graceful shutdown
  async close() {
    return new Promise((resolve) => {
      this.io.close(() => {
        this.logger.info('WebSocket server closed');
        resolve();
      });
    });
  }
}

module.exports = SocketServer;