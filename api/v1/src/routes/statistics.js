const express = require('express');
const router = express.Router();
const Joi = require('joi');
const { ApiError } = require('../middleware/errorHandler');
const { authenticate } = require('../middleware/auth');
const { getDatabase } = require('../../../../lib/database');
const logger = require('../utils/logger');

// Validation schemas
const statsQuerySchema = Joi.object({
  airport: Joi.string().length(3).uppercase(),
  startDate: Joi.date().iso().required(),
  endDate: Joi.date().iso().greater(Joi.ref('startDate')).required(),
  groupBy: Joi.string().valid('day', 'week', 'month').default('day')
});

// GET /api/v2/statistics/overview
router.get('/overview', authenticate, async (req, res, next) => {
  try {
    const { value, error } = statsQuerySchema.validate(req.query);
    if (error) {
      throw ApiError.badRequest('Invalid query parameters', error.details);
    }

    const { airport, startDate, endDate, groupBy } = value;

    const db = await getDatabase();
    
    // Build date grouping
    let dateFormat;
    switch (groupBy) {
      case 'day':
        dateFormat = '%Y-%m-%d';
        break;
      case 'week':
        dateFormat = '%Y-%u';
        break;
      case 'month':
        dateFormat = '%Y-%m';
        break;
    }

    // Base query conditions
    const conditions = ['scheduled_time BETWEEN ? AND ?'];
    const params = [startDate, endDate];

    if (airport) {
      conditions.push('(origin_airport = ? OR destination_airport = ?)');
      params.push(airport, airport);
    }

    const whereClause = conditions.join(' AND ');

    // Get overview statistics
    const overview = await db.query(`
      SELECT
        DATE_FORMAT(scheduled_time, '${dateFormat}') as period,
        COUNT(*) as total_flights,
        COUNT(CASE WHEN flight_type = 'arrival' THEN 1 END) as arrivals,
        COUNT(CASE WHEN flight_type = 'departure' THEN 1 END) as departures,
        COUNT(CASE WHEN status = 'on_time' THEN 1 END) as on_time,
        COUNT(CASE WHEN status = 'delayed' THEN 1 END) as delayed,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled,
        AVG(CASE WHEN delay_minutes > 0 THEN delay_minutes END) as avg_delay_minutes,
        MAX(delay_minutes) as max_delay_minutes
      FROM flights
      WHERE ${whereClause}
      GROUP BY period
      ORDER BY period
    `, params);

    // Calculate performance metrics
    const totals = await db.query(`
      SELECT
        COUNT(*) as total_flights,
        COUNT(CASE WHEN status = 'on_time' THEN 1 END) as on_time_count,
        COUNT(CASE WHEN status = 'delayed' THEN 1 END) as delayed_count,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_count,
        AVG(CASE WHEN delay_minutes > 0 THEN delay_minutes END) as avg_delay
      FROM flights
      WHERE ${whereClause}
    `, params);

    const total = totals[0];
    const onTimePercentage = total.total_flights > 0 
      ? (total.on_time_count / total.total_flights * 100).toFixed(2)
      : 0;

    const response = {
      summary: {
        totalFlights: total.total_flights,
        onTimePercentage: parseFloat(onTimePercentage),
        averageDelay: Math.round(total.avg_delay || 0),
        cancellationRate: total.total_flights > 0
          ? (total.cancelled_count / total.total_flights * 100).toFixed(2)
          : 0
      },
      timeline: overview.map(row => ({
        period: row.period,
        flights: {
          total: row.total_flights,
          arrivals: row.arrivals,
          departures: row.departures
        },
        performance: {
          onTime: row.on_time,
          delayed: row.delayed,
          cancelled: row.cancelled,
          avgDelay: Math.round(row.avg_delay_minutes || 0),
          maxDelay: row.max_delay_minutes || 0
        }
      })),
      period: {
        start: startDate,
        end: endDate,
        groupBy
      }
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});

// GET /api/v2/statistics/airlines
router.get('/airlines', authenticate, async (req, res, next) => {
  try {
    const { airport, startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      throw ApiError.badRequest('Start date and end date are required');
    }

    const db = await getDatabase();
    
    // Base query conditions
    const conditions = ['scheduled_time BETWEEN ? AND ?'];
    const params = [startDate, endDate];

    if (airport) {
      conditions.push('(origin_airport = ? OR destination_airport = ?)');
      params.push(airport, airport);
    }

    const whereClause = conditions.join(' AND ');

    // Get airline statistics
    const airlines = await db.query(`
      SELECT
        airline,
        airline_name,
        COUNT(*) as total_flights,
        COUNT(CASE WHEN status = 'on_time' THEN 1 END) as on_time,
        COUNT(CASE WHEN status = 'delayed' THEN 1 END) as delayed,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled,
        AVG(CASE WHEN delay_minutes > 0 THEN delay_minutes END) as avg_delay,
        COUNT(DISTINCT aircraft_type) as aircraft_types,
        COUNT(DISTINCT CONCAT(origin_airport, '-', destination_airport)) as routes
      FROM flights
      WHERE ${whereClause}
      GROUP BY airline, airline_name
      ORDER BY total_flights DESC
      LIMIT 50
    `, params);

    const response = {
      airlines: airlines.map(airline => ({
        code: airline.airline,
        name: airline.airline_name,
        flights: airline.total_flights,
        performance: {
          onTimePercentage: airline.total_flights > 0
            ? (airline.on_time / airline.total_flights * 100).toFixed(2)
            : 0,
          averageDelay: Math.round(airline.avg_delay || 0),
          cancellationRate: airline.total_flights > 0
            ? (airline.cancelled / airline.total_flights * 100).toFixed(2)
            : 0
        },
        operations: {
          aircraftTypes: airline.aircraft_types,
          routes: airline.routes
        }
      })),
      period: {
        start: startDate,
        end: endDate
      }
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});

// GET /api/v2/statistics/routes
router.get('/routes', authenticate, async (req, res, next) => {
  try {
    const { airport, startDate, endDate, limit = 20 } = req.query;

    if (!startDate || !endDate) {
      throw ApiError.badRequest('Start date and end date are required');
    }

    const db = await getDatabase();
    
    let query;
    let params = [startDate, endDate];

    if (airport) {
      // Routes for specific airport
      query = `
        SELECT
          origin_airport,
          destination_airport,
          COUNT(*) as flight_count,
          COUNT(DISTINCT airline) as airline_count,
          AVG(distance) as avg_distance,
          AVG(duration) as avg_duration,
          COUNT(CASE WHEN status = 'on_time' THEN 1 END) as on_time,
          COUNT(CASE WHEN status = 'delayed' THEN 1 END) as delayed,
          AVG(CASE WHEN delay_minutes > 0 THEN delay_minutes END) as avg_delay
        FROM flights
        WHERE scheduled_time BETWEEN ? AND ?
        AND (origin_airport = ? OR destination_airport = ?)
        GROUP BY origin_airport, destination_airport
        ORDER BY flight_count DESC
        LIMIT ?
      `;
      params.push(airport, airport, parseInt(limit));
    } else {
      // Top routes overall
      query = `
        SELECT
          origin_airport,
          destination_airport,
          COUNT(*) as flight_count,
          COUNT(DISTINCT airline) as airline_count,
          AVG(distance) as avg_distance,
          AVG(duration) as avg_duration,
          COUNT(CASE WHEN status = 'on_time' THEN 1 END) as on_time,
          COUNT(CASE WHEN status = 'delayed' THEN 1 END) as delayed,
          AVG(CASE WHEN delay_minutes > 0 THEN delay_minutes END) as avg_delay
        FROM flights
        WHERE scheduled_time BETWEEN ? AND ?
        GROUP BY origin_airport, destination_airport
        ORDER BY flight_count DESC
        LIMIT ?
      `;
      params.push(parseInt(limit));
    }

    const routes = await db.query(query, params);

    const response = {
      routes: routes.map(route => ({
        origin: route.origin_airport,
        destination: route.destination_airport,
        flights: route.flight_count,
        airlines: route.airline_count,
        distance: Math.round(route.avg_distance || 0),
        duration: Math.round(route.avg_duration || 0),
        performance: {
          onTimePercentage: route.flight_count > 0
            ? (route.on_time / route.flight_count * 100).toFixed(2)
            : 0,
          averageDelay: Math.round(route.avg_delay || 0)
        }
      })),
      period: {
        start: startDate,
        end: endDate
      }
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});

// GET /api/v2/statistics/delays
router.get('/delays', authenticate, async (req, res, next) => {
  try {
    const { airport, startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      throw ApiError.badRequest('Start date and end date are required');
    }

    const db = await getDatabase();
    
    const conditions = ['scheduled_time BETWEEN ? AND ?', 'delay_minutes > 0'];
    const params = [startDate, endDate];

    if (airport) {
      conditions.push('(origin_airport = ? OR destination_airport = ?)');
      params.push(airport, airport);
    }

    const whereClause = conditions.join(' AND ');

    // Get delay statistics by reason
    const delayReasons = await db.query(`
      SELECT
        delay_reason,
        COUNT(*) as count,
        AVG(delay_minutes) as avg_delay,
        MAX(delay_minutes) as max_delay,
        SUM(delay_minutes) as total_delay_minutes
      FROM flights
      WHERE ${whereClause}
      GROUP BY delay_reason
      ORDER BY count DESC
    `, params);

    // Get delay distribution
    const distribution = await db.query(`
      SELECT
        CASE
          WHEN delay_minutes <= 15 THEN '0-15 min'
          WHEN delay_minutes <= 30 THEN '16-30 min'
          WHEN delay_minutes <= 60 THEN '31-60 min'
          WHEN delay_minutes <= 120 THEN '1-2 hours'
          WHEN delay_minutes <= 240 THEN '2-4 hours'
          ELSE '4+ hours'
        END as delay_range,
        COUNT(*) as count
      FROM flights
      WHERE ${whereClause}
      GROUP BY delay_range
      ORDER BY 
        CASE delay_range
          WHEN '0-15 min' THEN 1
          WHEN '16-30 min' THEN 2
          WHEN '31-60 min' THEN 3
          WHEN '1-2 hours' THEN 4
          WHEN '2-4 hours' THEN 5
          ELSE 6
        END
    `, params);

    // Get time of day analysis
    const timeOfDay = await db.query(`
      SELECT
        HOUR(scheduled_time) as hour,
        COUNT(*) as delayed_flights,
        AVG(delay_minutes) as avg_delay
      FROM flights
      WHERE ${whereClause}
      GROUP BY hour
      ORDER BY hour
    `, params);

    const response = {
      reasons: delayReasons.map(reason => ({
        reason: reason.delay_reason || 'Unknown',
        count: reason.count,
        averageDelay: Math.round(reason.avg_delay),
        maxDelay: reason.max_delay,
        totalMinutes: reason.total_delay_minutes
      })),
      distribution: distribution.map(range => ({
        range: range.delay_range,
        count: range.count
      })),
      timeOfDay: timeOfDay.map(hour => ({
        hour: hour.hour,
        delayedFlights: hour.delayed_flights,
        averageDelay: Math.round(hour.avg_delay)
      })),
      period: {
        start: startDate,
        end: endDate
      }
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});

module.exports = router;