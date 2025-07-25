const NodeFetchClient = require('../../infrastructure/http/NodeFetchClient');
const CurlClient = require('../../infrastructure/http/CurlClient');
const PuppeteerClient = require('../../infrastructure/http/PuppeteerClient');
const LocalFileStorage = require('../../infrastructure/storage/LocalFileStorage');
const GitHubStorage = require('../../infrastructure/storage/GitHubStorage');
const ExponentialBackoffRetry = require('../../infrastructure/retry/ExponentialBackoffRetry');
const SFOCollector = require('../../domain/collectors/SFOCollector');
const YYZCollector = require('../../domain/collectors/YYZCollector');
const YVRCollector = require('../../domain/collectors/YVRCollector');
const CollectorService = require('./CollectorService');
const { getConfig } = require('../../infrastructure/config/Configuration');

/**
 * Service container for dependency injection
 * Follows Dependency Injection pattern and Single Responsibility Principle
 */
class ServiceContainer {
  constructor() {
    this.services = new Map();
    this.singletons = new Map();
  }

  /**
   * Registers a service factory
   * @param {string} name - Service name
   * @param {Function} factory - Factory function
   * @param {boolean} singleton - Whether to create as singleton
   */
  register(name, factory, singleton = false) {
    this.services.set(name, { factory, singleton });
  }

  /**
   * Gets a service instance
   * @param {string} name - Service name
   * @returns {any} Service instance
   */
  get(name) {
    const service = this.services.get(name);
    if (!service) {
      throw new Error(`Service not found: ${name}`);
    }

    if (service.singleton) {
      if (!this.singletons.has(name)) {
        this.singletons.set(name, service.factory(this));
      }
      return this.singletons.get(name);
    }

    return service.factory(this);
  }

  /**
   * Creates a configured container
   * @returns {ServiceContainer} Configured container
   */
  static createDefault() {
    const container = new ServiceContainer();
    const config = getConfig();

    // Register configuration
    container.register('config', () => config, true);

    // Register HTTP clients
    container.register('httpClient', (c) => {
      const clientType = c.get('config').get('http.clientType');
      if (clientType === 'curl') {
        return new CurlClient();
      } else if (clientType === 'puppeteer') {
        return new PuppeteerClient({
          headless: c.get('config').get('http.puppeteer.headless', true),
          timeout: c.get('config').get('http.timeout')
        });
      }
      return new NodeFetchClient();
    }, true);

    // Register storage service
    container.register('storageService', (c) => {
      const storageType = c.get('config').get('storage.type');
      if (storageType === 'github') {
        return new GitHubStorage(
          c.get('config').get('storage.github.token'),
          c.get('config').get('storage.github.repository'),
          c.get('config').get('storage.basePath')
        );
      }
      return new LocalFileStorage(c.get('config').get('storage.basePath'));
    }, true);

    // Register retry strategy
    container.register('retryStrategy', (c) => {
      return new ExponentialBackoffRetry({
        maxRetries: c.get('config').get('retry.maxRetries'),
        baseDelay: c.get('config').get('retry.baseDelay'),
        maxDelay: c.get('config').get('retry.maxDelay')
      });
    });

    // Register collectors
    container.register('sfoCollector', (c) => {
      return new SFOCollector(
        c.get('httpClient'),
        c.get('retryStrategy'),
        c.get('config')
      );
    });

    container.register('yyzCollector', (c) => {
      return new YYZCollector(
        c.get('httpClient'),
        c.get('retryStrategy'),
        c.get('config')
      );
    });

    container.register('yvrCollector', (c) => {
      // YVR always uses Puppeteer due to Cloudflare protection
      return new YVRCollector(
        c.get('httpClient'),
        c.get('retryStrategy'),
        c.get('config')
      );
    });

    // Register main collector service
    container.register('collectorService', (c) => {
      return new CollectorService(
        [
          c.get('sfoCollector'),
          c.get('yyzCollector'),
          c.get('yvrCollector')
        ],
        c.get('storageService'),
        c.get('config')
      );
    }, true);

    return container;
  }
}

module.exports = ServiceContainer;