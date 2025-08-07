const logger = require('../utils/logger');

class ApiError extends Error {
  constructor(statusCode, error, message, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.error = error;
    this.details = details;
  }

  static badRequest(message, details) {
    return new ApiError(400, 'BAD_REQUEST', message, details);
  }

  static unauthorized(message = 'Unauthorized') {
    return new ApiError(401, 'UNAUTHORIZED', message);
  }

  static forbidden(message = 'Forbidden') {
    return new ApiError(403, 'FORBIDDEN', message);
  }

  static notFound(message = 'Resource not found') {
    return new ApiError(404, 'NOT_FOUND', message);
  }

  static conflict(message, details) {
    return new ApiError(409, 'CONFLICT', message, details);
  }

  static tooManyRequests(message = 'Too many requests') {
    return new ApiError(429, 'RATE_LIMIT_EXCEEDED', message);
  }

  static internal(message = 'Internal server error') {
    return new ApiError(500, 'INTERNAL_ERROR', message);
  }
}

const errorHandler = (err, req, res, next) => {
  let error = err;

  // Handle Joi validation errors
  if (err.isJoi) {
    error = ApiError.badRequest(
      'Validation error',
      err.details.map(d => ({
        field: d.path.join('.'),
        message: d.message
      }))
    );
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    error = ApiError.unauthorized('Invalid token');
  } else if (err.name === 'TokenExpiredError') {
    error = ApiError.unauthorized('Token expired');
  }

  // Default to 500 if no status code
  const statusCode = error.statusCode || 500;
  const errorResponse = {
    error: error.error || 'INTERNAL_ERROR',
    message: error.message || 'An unexpected error occurred',
    ...(error.details && { details: error.details }),
    timestamp: new Date().toISOString(),
    path: req.path,
    requestId: req.id
  };

  // Log error
  if (statusCode >= 500) {
    logger.error('Server error:', {
      error: err,
      request: {
        method: req.method,
        path: req.path,
        body: req.body,
        query: req.query,
        headers: req.headers
      }
    });
  } else {
    logger.warn('Client error:', errorResponse);
  }

  // Send error response
  res.status(statusCode).json(errorResponse);
};

module.exports = {
  ApiError,
  errorHandler
};