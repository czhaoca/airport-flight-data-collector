const EventEmitter = require('events');

class DataCollectionInterface extends EventEmitter {
  constructor(config) {
    super();
    this.config = config;
    this.adapter = null;
    this.isConnected = false;
    this.retryAttempts = config.retryAttempts || 3;
    this.retryDelay = config.retryDelay || 1000;
  }

  async initialize() {
    try {
      const adapterType = this.config.provider || 'local';
      const AdapterClass = require(`./adapters/${adapterType}-adapter`);
      
      // Merge provider-specific config with global settings
      const adapterConfig = {
        ...this.config[adapterType] || {},
        environment: this.config[adapterType]?.environment || this.config.environment,
        tablePrefix: this.config[adapterType]?.tablePrefix || this.config.tablePrefix
      };
      
      this.adapter = new AdapterClass(adapterConfig);
      
      await this.adapter.connect();
      this.isConnected = true;
      this.emit('connected', { provider: adapterType });
      
      return true;
    } catch (error) {
      this.emit('error', { error, phase: 'initialization' });
      throw new Error(`Failed to initialize database interface: ${error.message}`);
    }
  }

  async saveFlightData({ airport, type, date, data }) {
    this._validateConnection();
    this._validateSaveParams({ airport, type, date, data });

    const flightRecord = {
      id: this._generateFlightId(airport, type, date),
      airport_code: airport.toUpperCase(),
      flight_type: type.toLowerCase(),
      collection_date: new Date().toISOString(),
      flight_date: date,
      flight_data: data,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    return this._executeWithRetry(async () => {
      const result = await this.adapter.saveFlightData(flightRecord);
      this.emit('dataSaved', { 
        airport, 
        type, 
        date, 
        recordId: flightRecord.id 
      });
      return result;
    });
  }

  async getFlightData({ airport, type, startDate, endDate, filters = {} }) {
    this._validateConnection();
    
    const queryParams = {
      airport_code: airport?.toUpperCase(),
      flight_type: type?.toLowerCase(),
      start_date: startDate,
      end_date: endDate || startDate,
      ...filters
    };

    return this._executeWithRetry(async () => {
      const results = await this.adapter.getFlightData(queryParams);
      this.emit('dataRetrieved', { 
        count: results.length, 
        queryParams 
      });
      return results;
    });
  }

  async updateFlightStatus(flightId, status, additionalData = {}) {
    this._validateConnection();
    
    if (!flightId || !status) {
      throw new Error('Flight ID and status are required');
    }

    const updateData = {
      flight_id: flightId,
      status: status.toUpperCase(),
      status_time: new Date().toISOString(),
      ...additionalData,
      updated_at: new Date().toISOString()
    };

    return this._executeWithRetry(async () => {
      const result = await this.adapter.updateFlightStatus(updateData);
      this.emit('statusUpdated', { flightId, status });
      return result;
    });
  }

  async healthCheck() {
    try {
      if (!this.isConnected) {
        return {
          status: 'disconnected',
          provider: this.config.provider,
          timestamp: new Date().toISOString()
        };
      }

      const adapterHealth = await this.adapter.healthCheck();
      
      return {
        status: 'healthy',
        provider: this.config.provider,
        connected: this.isConnected,
        adapterStatus: adapterHealth,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        provider: this.config.provider,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  async disconnect() {
    if (this.adapter && this.isConnected) {
      await this.adapter.disconnect();
      this.isConnected = false;
      this.emit('disconnected', { provider: this.config.provider });
    }
  }

  async _executeWithRetry(operation) {
    let lastError;
    
    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        this.emit('retryAttempt', { 
          attempt, 
          maxAttempts: this.retryAttempts,
          error: error.message 
        });
        
        if (attempt < this.retryAttempts) {
          await this._delay(this.retryDelay * attempt);
        }
      }
    }
    
    throw new Error(`Operation failed after ${this.retryAttempts} attempts: ${lastError.message}`);
  }

  _validateConnection() {
    if (!this.isConnected || !this.adapter) {
      throw new Error('Database interface not connected. Call initialize() first.');
    }
  }

  _validateSaveParams({ airport, type, date, data }) {
    if (!airport || !type || !date || !data) {
      throw new Error('Missing required parameters: airport, type, date, and data are required');
    }
    
    if (!['departure', 'arrival'].includes(type.toLowerCase())) {
      throw new Error('Invalid flight type. Must be "departure" or "arrival"');
    }
    
    if (!this._isValidDate(date)) {
      throw new Error('Invalid date format. Use YYYY-MM-DD');
    }
  }

  _generateFlightId(airport, type, date) {
    const timestamp = Date.now();
    return `${airport}_${type}_${date}_${timestamp}`.toLowerCase();
  }

  _isValidDate(dateString) {
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(dateString)) return false;
    
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date);
  }

  _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = DataCollectionInterface;