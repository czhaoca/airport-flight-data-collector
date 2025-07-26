const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const Redis = require('ioredis');
const { ApiError } = require('./errorHandler');
const logger = require('../utils/logger');

// Create Redis client
const redisClient = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD,
  enableOfflineQueue: false,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  }
});

redisClient.on('error', (err) => {
  logger.error('Redis connection error:', err);
});

redisClient.on('connect', () => {
  logger.info('Connected to Redis for rate limiting');
});

// Create different rate limiters for different endpoints
const createRateLimiter = (options = {}) => {
  const defaults = {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    handler: (req, res) => {
      throw ApiError.tooManyRequests(
        'Too many requests from this IP, please try again later.'
      );
    },
    skip: (req) => {
      // Skip rate limiting for health checks
      return req.path === '/api/v2/health';
    }
  };

  const config = { ...defaults, ...options };

  // Use Redis store if available
  if (redisClient.status === 'ready') {
    config.store = new RedisStore({
      client: redisClient,
      prefix: 'rl:',
    });
  } else {
    logger.warn('Redis not available, using memory store for rate limiting');
  }

  return rateLimit(config);
};

// Different rate limiters for different operations
const rateLimiters = {
  // General API rate limit
  general: createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per 15 minutes
  }),

  // Stricter limit for auth endpoints
  auth: createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 requests per 15 minutes
    skipSuccessfulRequests: true, // Don't count successful requests
  }),

  // More lenient for read operations
  read: createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 300, // 300 requests per 15 minutes
  }),

  // Very strict for expensive operations
  expensive: createRateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // 10 requests per hour
  }),

  // Custom rate limiter based on user role
  createUserBasedLimiter: (role) => {
    const limits = {
      admin: { windowMs: 15 * 60 * 1000, max: 1000 },
      premium: { windowMs: 15 * 60 * 1000, max: 500 },
      standard: { windowMs: 15 * 60 * 1000, max: 100 },
      guest: { windowMs: 15 * 60 * 1000, max: 50 }
    };

    const limit = limits[role] || limits.guest;
    
    return createRateLimiter({
      ...limit,
      keyGenerator: (req) => {
        // Use user ID if authenticated, otherwise use IP
        return req.user?.userId || req.ip;
      },
      skip: (req) => {
        // Skip rate limiting for certain roles
        return req.user?.role === 'admin' && process.env.SKIP_ADMIN_RATE_LIMIT === 'true';
      }
    });
  }
};

// Middleware to apply rate limiting based on user
const dynamicRateLimiter = (req, res, next) => {
  const role = req.user?.role || 'guest';
  const limiter = rateLimiters.createUserBasedLimiter(role);
  limiter(req, res, next);
};

// IP-based rate limiting with whitelist/blacklist
const ipRateLimiter = createRateLimiter({
  keyGenerator: (req) => req.ip,
  skip: (req) => {
    const whitelist = (process.env.IP_WHITELIST || '').split(',').filter(Boolean);
    const blacklist = (process.env.IP_BLACKLIST || '').split(',').filter(Boolean);
    
    // Always block blacklisted IPs
    if (blacklist.includes(req.ip)) {
      throw ApiError.forbidden('Access denied');
    }
    
    // Skip rate limiting for whitelisted IPs
    return whitelist.includes(req.ip);
  }
});

// API key rate limiting
const apiKeyRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 1000, // 1000 requests per hour for API keys
  keyGenerator: (req) => {
    return req.headers['x-api-key'] || req.ip;
  }
});

module.exports = {
  rateLimiters,
  dynamicRateLimiter,
  ipRateLimiter,
  apiKeyRateLimiter,
  createRateLimiter
};