const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { apiLogger } = require('../../../../../lib/logging');

const logger = apiLogger.child('GraphQL:Auth');

// Mock user store (in production, use database)
const users = new Map();

module.exports = {
  Query: {
    // Auth queries would go here if needed
  },

  Mutation: {
    login: async (_, { email, password }) => {
      try {
        // In production, verify against database
        const user = users.get(email);
        
        if (!user || !verifyPassword(password, user.passwordHash)) {
          throw new Error('Invalid credentials');
        }
        
        // Generate tokens
        const token = generateToken(user);
        const refreshToken = generateRefreshToken(user);
        
        return {
          token,
          refreshToken,
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            createdAt: user.createdAt
          },
          expiresIn: 3600 // 1 hour
        };
      } catch (error) {
        logger.error('Login failed', error);
        throw new Error('Authentication failed');
      }
    },

    refreshToken: async (_, { token }) => {
      try {
        // Verify refresh token
        const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET || 'refresh-secret');
        
        // Get user
        const user = Array.from(users.values()).find(u => u.id === decoded.userId);
        
        if (!user) {
          throw new Error('User not found');
        }
        
        // Generate new tokens
        const newToken = generateToken(user);
        const newRefreshToken = generateRefreshToken(user);
        
        return {
          token: newToken,
          refreshToken: newRefreshToken,
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            createdAt: user.createdAt
          },
          expiresIn: 3600
        };
      } catch (error) {
        logger.error('Token refresh failed', error);
        throw new Error('Invalid refresh token');
      }
    }
  }
};

// Helper functions
function generateToken(user) {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      role: user.role
    },
    process.env.JWT_SECRET || 'secret',
    { expiresIn: '1h' }
  );
}

function generateRefreshToken(user) {
  return jwt.sign(
    {
      userId: user.id,
      type: 'refresh'
    },
    process.env.JWT_REFRESH_SECRET || 'refresh-secret',
    { expiresIn: '7d' }
  );
}

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

function verifyPassword(password, hash) {
  return hashPassword(password) === hash;
}

// Initialize with a test user
users.set('admin@example.com', {
  id: '1',
  email: 'admin@example.com',
  name: 'Admin User',
  passwordHash: hashPassword('admin123'),
  role: 'ADMIN',
  createdAt: new Date()
});