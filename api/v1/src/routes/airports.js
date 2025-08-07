const express = require('express');
const router = express.Router();
const Joi = require('joi');
const { ApiError } = require('../middleware/errorHandler');
const { optionalAuth } = require('../middleware/auth');
const { getDatabase } = require('../../../../lib/database');
const logger = require('../utils/logger');

// Validation schemas
const airportQuerySchema = Joi.object({
  search: Joi.string().min(2),
  country: Joi.string().length(2).uppercase(),
  city: Joi.string(),
  limit: Joi.number().integer().min(1).max(100).default(20),
  offset: Joi.number().integer().min(0).default(0)
});

// GET /api/v2/airports
router.get('/', optionalAuth, async (req, res, next) => {
  try {
    // Validate query parameters
    const { value, error } = airportQuerySchema.validate(req.query);
    if (error) {
      throw ApiError.badRequest('Invalid query parameters', error.details);
    }

    const { search, country, city, limit, offset } = value;

    // Build query
    let query = 'SELECT * FROM airports WHERE active = true';
    const params = [];

    if (search) {
      query += ' AND (code LIKE ? OR name LIKE ? OR city LIKE ?)';
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern);
    }

    if (country) {
      query += ' AND country_code = ?';
      params.push(country);
    }

    if (city) {
      query += ' AND city LIKE ?';
      params.push(`%${city}%`);
    }

    // Count total results
    const db = await getDatabase();
    const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as total');
    const countResult = await db.query(countQuery, params);
    const total = countResult[0].total;

    // Add pagination
    query += ' ORDER BY code ASC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    // Execute query
    const airports = await db.query(query, params);

    // Format response
    const response = {
      data: airports.map(airport => ({
        code: airport.code,
        name: airport.name,
        city: airport.city,
        country: airport.country_code,
        location: {
          latitude: airport.latitude,
          longitude: airport.longitude
        },
        timezone: airport.timezone,
        terminals: airport.terminals ? JSON.parse(airport.terminals) : []
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

// GET /api/v2/airports/:code
router.get('/:code', optionalAuth, async (req, res, next) => {
  try {
    const airportCode = req.params.code.toUpperCase();

    if (airportCode.length !== 3) {
      throw ApiError.badRequest('Airport code must be 3 characters');
    }

    const db = await getDatabase();
    const airport = await db.query(
      'SELECT * FROM airports WHERE code = ?',
      [airportCode]
    );

    if (!airport || airport.length === 0) {
      throw ApiError.notFound('Airport not found');
    }

    const airportData = airport[0];

    // Get current statistics
    const stats = await db.query(`
      SELECT 
        COUNT(CASE WHEN flight_type = 'arrival' THEN 1 END) as arrivals_today,
        COUNT(CASE WHEN flight_type = 'departure' THEN 1 END) as departures_today,
        COUNT(CASE WHEN status = 'delayed' THEN 1 END) as delays_today,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancellations_today
      FROM flights
      WHERE (origin_airport = ? OR destination_airport = ?)
      AND DATE(scheduled_time) = CURDATE()
    `, [airportCode, airportCode]);

    // Get popular routes
    const routes = await db.query(`
      SELECT 
        CASE 
          WHEN origin_airport = ? THEN destination_airport
          ELSE origin_airport
        END as connected_airport,
        COUNT(*) as flight_count,
        AVG(distance) as avg_distance
      FROM flights
      WHERE origin_airport = ? OR destination_airport = ?
      GROUP BY connected_airport
      ORDER BY flight_count DESC
      LIMIT 10
    `, [airportCode, airportCode, airportCode]);

    // Format response
    const response = {
      code: airportData.code,
      name: airportData.name,
      city: airportData.city,
      country: airportData.country_code,
      location: {
        latitude: airportData.latitude,
        longitude: airportData.longitude,
        elevation: airportData.elevation
      },
      timezone: airportData.timezone,
      terminals: airportData.terminals ? JSON.parse(airportData.terminals) : [],
      runways: airportData.runways ? JSON.parse(airportData.runways) : [],
      statistics: {
        today: {
          arrivals: stats[0].arrivals_today,
          departures: stats[0].departures_today,
          delays: stats[0].delays_today,
          cancellations: stats[0].cancellations_today
        }
      },
      popularRoutes: routes.map(route => ({
        airport: route.connected_airport,
        flights: route.flight_count,
        distance: route.avg_distance
      })),
      services: airportData.services ? JSON.parse(airportData.services) : [],
      contactInfo: {
        website: airportData.website,
        phone: airportData.phone,
        email: airportData.email
      }
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});

// GET /api/v2/airports/:code/weather
router.get('/:code/weather', optionalAuth, async (req, res, next) => {
  try {
    const airportCode = req.params.code.toUpperCase();

    const db = await getDatabase();
    
    // Get latest weather data
    const weather = await db.query(`
      SELECT * FROM airport_weather 
      WHERE airport_code = ? 
      ORDER BY timestamp DESC 
      LIMIT 1
    `, [airportCode]);

    if (!weather || weather.length === 0) {
      throw ApiError.notFound('Weather data not available for this airport');
    }

    const weatherData = weather[0];

    // Check if data is recent (within last hour)
    const dataAge = Date.now() - new Date(weatherData.timestamp).getTime();
    const isRecent = dataAge < 60 * 60 * 1000; // 1 hour

    const response = {
      airport: airportCode,
      timestamp: weatherData.timestamp,
      isRecent,
      conditions: {
        temperature: {
          celsius: weatherData.temperature_c,
          fahrenheit: weatherData.temperature_f
        },
        feelsLike: {
          celsius: weatherData.feels_like_c,
          fahrenheit: weatherData.feels_like_f
        },
        humidity: weatherData.humidity,
        pressure: {
          mb: weatherData.pressure_mb,
          inHg: weatherData.pressure_inhg
        },
        visibility: {
          km: weatherData.visibility_km,
          miles: weatherData.visibility_miles
        },
        wind: {
          speed: {
            kph: weatherData.wind_speed_kph,
            mph: weatherData.wind_speed_mph
          },
          direction: weatherData.wind_direction,
          gust: {
            kph: weatherData.wind_gust_kph,
            mph: weatherData.wind_gust_mph
          }
        },
        clouds: weatherData.cloud_coverage,
        condition: weatherData.condition_text,
        icon: weatherData.condition_icon
      },
      flightCategory: weatherData.flight_category, // VFR, MVFR, IFR, LIFR
      metar: weatherData.metar_raw
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});

module.exports = router;