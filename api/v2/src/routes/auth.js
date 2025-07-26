const express = require('express');
const router = express.Router();
const Joi = require('joi');
const bcrypt = require('bcrypt');
const { ApiError } = require('../middleware/errorHandler');
const { generateTokens, verifyRefreshToken } = require('../middleware/auth');
const { getDatabase } = require('../../../../lib/database');
const logger = require('../utils/logger');

// Validation schemas
const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string().required()
});

// POST /api/v2/auth/login
router.post('/login', async (req, res, next) => {
  try {
    // Validate request body
    const { value, error } = loginSchema.validate(req.body);
    if (error) {
      throw ApiError.badRequest('Invalid request body', error.details);
    }

    const { email, password } = value;
    
    // Get database instance
    const db = await getDatabase();
    
    // Find user by email
    const user = await db.query(
      'SELECT id, email, password_hash, role FROM users WHERE email = ? AND active = true',
      [email]
    );
    
    if (!user || user.length === 0) {
      throw ApiError.unauthorized('Invalid email or password');
    }
    
    // Verify password
    const validPassword = await bcrypt.compare(password, user[0].password_hash);
    if (!validPassword) {
      throw ApiError.unauthorized('Invalid email or password');
    }
    
    // Generate tokens
    const tokens = generateTokens({
      userId: user[0].id,
      email: user[0].email,
      role: user[0].role
    });
    
    // Store refresh token in database
    await db.query(
      'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?, ?, ?)',
      [
        user[0].id, 
        tokens.refreshToken,
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
      ]
    );
    
    // Log successful login
    logger.info('User login successful', {
      userId: user[0].id,
      email: user[0].email
    });
    
    res.json({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      tokenType: 'Bearer',
      expiresIn: tokens.expiresIn
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/v2/auth/refresh
router.post('/refresh', async (req, res, next) => {
  try {
    // Validate request body
    const { value, error } = refreshTokenSchema.validate(req.body);
    if (error) {
      throw ApiError.badRequest('Invalid request body', error.details);
    }

    const { refreshToken } = value;
    
    // Verify refresh token
    let decoded;
    try {
      decoded = verifyRefreshToken(refreshToken);
    } catch (err) {
      throw ApiError.unauthorized('Invalid refresh token');
    }
    
    // Get database instance
    const db = await getDatabase();
    
    // Check if refresh token exists in database
    const storedToken = await db.query(
      'SELECT id, user_id FROM refresh_tokens WHERE token = ? AND expires_at > NOW() AND revoked = false',
      [refreshToken]
    );
    
    if (!storedToken || storedToken.length === 0) {
      throw ApiError.unauthorized('Invalid or expired refresh token');
    }
    
    // Get user details
    const user = await db.query(
      'SELECT id, email, role FROM users WHERE id = ? AND active = true',
      [storedToken[0].user_id]
    );
    
    if (!user || user.length === 0) {
      throw ApiError.unauthorized('User not found or inactive');
    }
    
    // Revoke old refresh token
    await db.query(
      'UPDATE refresh_tokens SET revoked = true WHERE id = ?',
      [storedToken[0].id]
    );
    
    // Generate new tokens
    const tokens = generateTokens({
      userId: user[0].id,
      email: user[0].email,
      role: user[0].role
    });
    
    // Store new refresh token
    await db.query(
      'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?, ?, ?)',
      [
        user[0].id,
        tokens.refreshToken,
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      ]
    );
    
    // Log token refresh
    logger.info('Token refresh successful', {
      userId: user[0].id
    });
    
    res.json({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      tokenType: 'Bearer',
      expiresIn: tokens.expiresIn
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/v2/auth/logout (optional endpoint)
router.post('/logout', async (req, res, next) => {
  try {
    const refreshToken = req.body.refreshToken;
    
    if (refreshToken) {
      // Get database instance
      const db = await getDatabase();
      
      // Revoke refresh token
      await db.query(
        'UPDATE refresh_tokens SET revoked = true WHERE token = ?',
        [refreshToken]
      );
      
      logger.info('User logout successful');
    }
    
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

module.exports = router;