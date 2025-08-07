const express = require('express');
const router = express.Router();
const Joi = require('joi');
const { ApiError } = require('../middleware/errorHandler');
const { authenticate, optionalAuth } = require('../middleware/auth');
const { getDatabase } = require('../../../../lib/database');
const logger = require('../utils/logger');

// Validation schemas
const flightQuerySchema = Joi.object({
  airport: Joi.string().length(3).uppercase(),
  airline: Joi.string(),
  flightNumber: Joi.string(),
  startDate: Joi.date().iso(),
  endDate: Joi.date().iso().greater(Joi.ref('startDate')),
  type: Joi.string().valid('arrival', 'departure'),
  status: Joi.string().valid('scheduled', 'delayed', 'cancelled', 'landed', 'departed'),
  limit: Joi.number().integer().min(1).max(1000).default(100),
  offset: Joi.number().integer().min(0).default(0),
  sort: Joi.string().valid('time', 'flight_number', 'airline').default('time'),
  order: Joi.string().valid('asc', 'desc').default('desc')
});

// GET /api/v2/flights
router.get('/', optionalAuth, async (req, res, next) => {
  try {
    // Validate query parameters
    const { value, error } = flightQuerySchema.validate(req.query);
    if (error) {
      throw ApiError.badRequest('Invalid query parameters', error.details);
    }

    const {
      airport, airline, flightNumber, startDate, endDate,
      type, status, limit, offset, sort, order
    } = value;

    // Build query
    let query = 'SELECT * FROM flights WHERE 1=1';
    const params = [];

    if (airport) {
      query += ' AND (origin_airport = ? OR destination_airport = ?)';
      params.push(airport, airport);
    }

    if (airline) {
      query += ' AND airline LIKE ?';
      params.push(`%${airline}%`);
    }

    if (flightNumber) {
      query += ' AND flight_number = ?';
      params.push(flightNumber);
    }

    if (startDate) {
      query += ' AND scheduled_time >= ?';
      params.push(startDate);
    }

    if (endDate) {
      query += ' AND scheduled_time <= ?';
      params.push(endDate);
    }

    if (type) {
      query += ' AND flight_type = ?';
      params.push(type);
    }

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    // Count total results
    const db = await getDatabase();
    const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as total');
    const countResult = await db.query(countQuery, params);
    const total = countResult[0].total;

    // Add sorting and pagination
    const sortColumn = {
      'time': 'scheduled_time',
      'flight_number': 'flight_number',
      'airline': 'airline'
    }[sort];

    query += ` ORDER BY ${sortColumn} ${order.toUpperCase()}`;
    query += ' LIMIT ? OFFSET ?';
    params.push(limit, offset);

    // Execute query
    const flights = await db.query(query, params);

    // Format response
    const response = {
      data: flights.map(flight => ({
        id: flight.id,
        flightNumber: flight.flight_number,
        airline: flight.airline,
        origin: {
          airport: flight.origin_airport,
          terminal: flight.origin_terminal,
          gate: flight.origin_gate
        },
        destination: {
          airport: flight.destination_airport,
          terminal: flight.destination_terminal,
          gate: flight.destination_gate
        },
        scheduledTime: flight.scheduled_time,
        actualTime: flight.actual_time,
        status: flight.status,
        aircraft: flight.aircraft_type,
        duration: flight.duration,
        distance: flight.distance
      })),
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      }
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});

// GET /api/v2/flights/:id
router.get('/:id', optionalAuth, async (req, res, next) => {
  try {
    const flightId = req.params.id;

    const db = await getDatabase();
    const flight = await db.query(
      'SELECT * FROM flights WHERE id = ?',
      [flightId]
    );

    if (!flight || flight.length === 0) {
      throw ApiError.notFound('Flight not found');
    }

    const flightData = flight[0];

    // Get additional details (delays, gate changes, etc.)
    const updates = await db.query(
      'SELECT * FROM flight_updates WHERE flight_id = ? ORDER BY timestamp DESC',
      [flightId]
    );

    // Format response
    const response = {
      id: flightData.id,
      flightNumber: flightData.flight_number,
      airline: flightData.airline,
      origin: {
        airport: flightData.origin_airport,
        city: flightData.origin_city,
        terminal: flightData.origin_terminal,
        gate: flightData.origin_gate
      },
      destination: {
        airport: flightData.destination_airport,
        city: flightData.destination_city,
        terminal: flightData.destination_terminal,
        gate: flightData.destination_gate
      },
      scheduledTime: flightData.scheduled_time,
      actualTime: flightData.actual_time,
      status: flightData.status,
      aircraft: {
        type: flightData.aircraft_type,
        registration: flightData.aircraft_registration
      },
      duration: flightData.duration,
      distance: flightData.distance,
      updates: updates.map(update => ({
        timestamp: update.timestamp,
        type: update.update_type,
        oldValue: update.old_value,
        newValue: update.new_value,
        message: update.message
      })),
      lastUpdated: flightData.updated_at
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});

// GET /api/v2/flights/live
router.get('/live', optionalAuth, async (req, res, next) => {
  try {
    const { airport, type } = req.query;

    if (!airport) {
      throw ApiError.badRequest('Airport parameter is required');
    }

    const db = await getDatabase();
    
    // Get flights in the next 2 hours or just landed/departed
    const now = new Date();
    const twoHoursLater = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    let query = `
      SELECT * FROM flights 
      WHERE (origin_airport = ? OR destination_airport = ?)
      AND (
        (scheduled_time BETWEEN ? AND ?)
        OR (actual_time BETWEEN ? AND ?)
      )
    `;
    const params = [airport, airport, oneHourAgo, twoHoursLater, oneHourAgo, now];

    if (type) {
      query += ' AND flight_type = ?';
      params.push(type);
    }

    query += ' ORDER BY COALESCE(actual_time, scheduled_time) ASC';

    const flights = await db.query(query, params);

    // Group by status
    const grouped = {
      boarding: [],
      inFlight: [],
      landed: [],
      departed: [],
      delayed: [],
      cancelled: []
    };

    flights.forEach(flight => {
      const flightData = {
        id: flight.id,
        flightNumber: flight.flight_number,
        airline: flight.airline,
        origin: flight.origin_airport,
        destination: flight.destination_airport,
        scheduledTime: flight.scheduled_time,
        actualTime: flight.actual_time,
        status: flight.status,
        gate: flight.flight_type === 'departure' ? flight.origin_gate : flight.destination_gate,
        terminal: flight.flight_type === 'departure' ? flight.origin_terminal : flight.destination_terminal
      };

      switch (flight.status) {
        case 'boarding':
          grouped.boarding.push(flightData);
          break;
        case 'in_flight':
          grouped.inFlight.push(flightData);
          break;
        case 'landed':
          grouped.landed.push(flightData);
          break;
        case 'departed':
          grouped.departed.push(flightData);
          break;
        case 'delayed':
          grouped.delayed.push(flightData);
          break;
        case 'cancelled':
          grouped.cancelled.push(flightData);
          break;
      }
    });

    res.json({
      airport,
      timestamp: new Date().toISOString(),
      flights: grouped
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;