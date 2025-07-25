const DataCollectionInterface = require('../../lib/database/interface');
const LocalStorageAdapter = require('../../lib/database/adapters/local-adapter');
const path = require('path');
const fs = require('fs').promises;

jest.mock('../../lib/database/adapters/local-adapter');

describe('DataCollectionInterface', () => {
  let dbInterface;
  let mockAdapter;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    mockAdapter = {
      connect: jest.fn().mockResolvedValue(true),
      disconnect: jest.fn().mockResolvedValue(true),
      saveFlightData: jest.fn().mockResolvedValue({ success: true, id: 'test-id' }),
      getFlightData: jest.fn().mockResolvedValue([]),
      updateFlightStatus: jest.fn().mockResolvedValue({ success: true }),
      healthCheck: jest.fn().mockResolvedValue({ accessible: true })
    };
    
    LocalStorageAdapter.mockImplementation(() => mockAdapter);
    
    dbInterface = new DataCollectionInterface({
      provider: 'local',
      retryAttempts: 2,
      retryDelay: 100
    });
  });
  
  afterEach(() => {
    if (dbInterface) {
      dbInterface.removeAllListeners();
    }
  });

  describe('initialization', () => {
    test('should initialize with local adapter by default', async () => {
      await dbInterface.initialize();
      
      expect(LocalStorageAdapter).toHaveBeenCalledWith({});
      expect(mockAdapter.connect).toHaveBeenCalled();
      expect(dbInterface.isConnected).toBe(true);
    });
    
    test('should emit connected event on successful initialization', async () => {
      const connectedHandler = jest.fn();
      dbInterface.on('connected', connectedHandler);
      
      await dbInterface.initialize();
      
      expect(connectedHandler).toHaveBeenCalledWith({ provider: 'local' });
    });
    
    test('should throw error on initialization failure', async () => {
      mockAdapter.connect.mockRejectedValue(new Error('Connection failed'));
      
      const errorHandler = jest.fn();
      dbInterface.on('error', errorHandler);
      
      await expect(dbInterface.initialize()).rejects.toThrow('Failed to initialize database interface: Connection failed');
      expect(errorHandler).toHaveBeenCalled();
    });
  });

  describe('saveFlightData', () => {
    beforeEach(async () => {
      await dbInterface.initialize();
    });
    
    test('should save flight data with valid parameters', async () => {
      const testData = {
        airport: 'YYZ',
        type: 'departure',
        date: '2024-01-15',
        data: { flights: [] }
      };
      
      const result = await dbInterface.saveFlightData(testData);
      
      expect(mockAdapter.saveFlightData).toHaveBeenCalledWith(
        expect.objectContaining({
          airport_code: 'YYZ',
          flight_type: 'departure',
          flight_date: '2024-01-15',
          flight_data: testData.data
        })
      );
      expect(result).toEqual({ success: true, id: 'test-id' });
    });
    
    test('should validate required parameters', async () => {
      await expect(dbInterface.saveFlightData({}))
        .rejects.toThrow('Missing required parameters');
    });
    
    test('should validate flight type', async () => {
      await expect(dbInterface.saveFlightData({
        airport: 'YYZ',
        type: 'invalid',
        date: '2024-01-15',
        data: {}
      })).rejects.toThrow('Invalid flight type');
    });
    
    test('should validate date format', async () => {
      await expect(dbInterface.saveFlightData({
        airport: 'YYZ',
        type: 'departure',
        date: '01-15-2024',
        data: {}
      })).rejects.toThrow('Invalid date format');
    });
    
    test('should emit dataSaved event on success', async () => {
      const savedHandler = jest.fn();
      dbInterface.on('dataSaved', savedHandler);
      
      await dbInterface.saveFlightData({
        airport: 'YYZ',
        type: 'departure',
        date: '2024-01-15',
        data: {}
      });
      
      expect(savedHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          airport: 'YYZ',
          type: 'departure',
          date: '2024-01-15'
        })
      );
    });
  });

  describe('getFlightData', () => {
    beforeEach(async () => {
      await dbInterface.initialize();
    });
    
    test('should retrieve flight data with filters', async () => {
      const mockData = [{ id: '1', airport_code: 'YYZ' }];
      mockAdapter.getFlightData.mockResolvedValue(mockData);
      
      const result = await dbInterface.getFlightData({
        airport: 'YYZ',
        type: 'departure',
        startDate: '2024-01-01',
        endDate: '2024-01-31'
      });
      
      expect(mockAdapter.getFlightData).toHaveBeenCalledWith({
        airport_code: 'YYZ',
        flight_type: 'departure',
        start_date: '2024-01-01',
        end_date: '2024-01-31'
      });
      expect(result).toEqual(mockData);
    });
    
    test('should use startDate as endDate if endDate not provided', async () => {
      await dbInterface.getFlightData({
        airport: 'YYZ',
        startDate: '2024-01-15'
      });
      
      expect(mockAdapter.getFlightData).toHaveBeenCalledWith(
        expect.objectContaining({
          start_date: '2024-01-15',
          end_date: '2024-01-15'
        })
      );
    });
  });

  describe('retry logic', () => {
    beforeEach(async () => {
      await dbInterface.initialize();
    });
    
    test('should retry on failure', async () => {
      mockAdapter.saveFlightData
        .mockRejectedValueOnce(new Error('Temporary failure'))
        .mockResolvedValueOnce({ success: true });
      
      const result = await dbInterface.saveFlightData({
        airport: 'YYZ',
        type: 'departure',
        date: '2024-01-15',
        data: {}
      });
      
      expect(mockAdapter.saveFlightData).toHaveBeenCalledTimes(2);
      expect(result).toEqual({ success: true });
    });
    
    test('should fail after max retry attempts', async () => {
      mockAdapter.saveFlightData
        .mockRejectedValue(new Error('Persistent failure'));
      
      await expect(dbInterface.saveFlightData({
        airport: 'YYZ',
        type: 'departure',
        date: '2024-01-15',
        data: {}
      })).rejects.toThrow('Operation failed after 2 attempts');
      
      expect(mockAdapter.saveFlightData).toHaveBeenCalledTimes(2);
    });
  });

  describe('healthCheck', () => {
    test('should return healthy status when connected', async () => {
      await dbInterface.initialize();
      
      const health = await dbInterface.healthCheck();
      
      expect(health).toEqual(expect.objectContaining({
        status: 'healthy',
        provider: 'local',
        connected: true
      }));
    });
    
    test('should return disconnected status when not initialized', async () => {
      const health = await dbInterface.healthCheck();
      
      expect(health).toEqual(expect.objectContaining({
        status: 'disconnected',
        provider: 'local'
      }));
    });
  });

  describe('disconnect', () => {
    test('should disconnect adapter and emit event', async () => {
      await dbInterface.initialize();
      const disconnectHandler = jest.fn();
      dbInterface.on('disconnected', disconnectHandler);
      
      await dbInterface.disconnect();
      
      expect(mockAdapter.disconnect).toHaveBeenCalled();
      expect(dbInterface.isConnected).toBe(false);
      expect(disconnectHandler).toHaveBeenCalledWith({ provider: 'local' });
    });
  });
});