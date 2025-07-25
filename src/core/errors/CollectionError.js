/**
 * Custom error classes for the application
 * Follows Single Responsibility Principle - each error has one reason to exist
 */

class CollectionError extends Error {
  constructor(message, code = 'COLLECTION_ERROR', details = {}) {
    super(message);
    this.name = 'CollectionError';
    this.code = code;
    this.details = details;
    this.timestamp = new Date();
  }
}

class NetworkError extends CollectionError {
  constructor(message, details = {}) {
    super(message, 'NETWORK_ERROR', details);
    this.name = 'NetworkError';
  }
}

class ValidationError extends CollectionError {
  constructor(message, details = {}) {
    super(message, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
  }
}

class RateLimitError extends CollectionError {
  constructor(message, retryAfter = null, details = {}) {
    super(message, 'RATE_LIMIT_ERROR', { ...details, retryAfter });
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
  }
}

class CaptchaError extends CollectionError {
  constructor(message, details = {}) {
    super(message, 'CAPTCHA_ERROR', details);
    this.name = 'CaptchaError';
  }
}

class StorageError extends CollectionError {
  constructor(message, details = {}) {
    super(message, 'STORAGE_ERROR', details);
    this.name = 'StorageError';
  }
}

module.exports = {
  CollectionError,
  NetworkError,
  ValidationError,
  RateLimitError,
  CaptchaError,
  StorageError
};