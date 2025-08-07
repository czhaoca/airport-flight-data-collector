const logger = require('../utils/logger');
const crypto = require('crypto');

const requestLogger = (req, res, next) => {
  // Generate request ID
  req.id = crypto.randomBytes(16).toString('hex');
  
  // Log request
  const startTime = Date.now();
  
  logger.info('Incoming request', {
    requestId: req.id,
    method: req.method,
    path: req.path,
    query: req.query,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('user-agent')
  });

  // Log response
  const originalSend = res.send;
  res.send = function(data) {
    res.send = originalSend;
    const duration = Date.now() - startTime;
    
    logger.info('Outgoing response', {
      requestId: req.id,
      statusCode: res.statusCode,
      duration: `${duration}ms`
    });
    
    return res.send(data);
  };

  next();
};

module.exports = { requestLogger };