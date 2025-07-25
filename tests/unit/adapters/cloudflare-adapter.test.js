const CloudflareAdapter = require('../../../lib/database/adapters/cloudflare-adapter');

// Mock fetch for testing
const mockFetch = jest.fn();
jest.mock('node-fetch', () => mockFetch);

describe('CloudflareAdapter', () => {
  let adapter;
  const mockConfig = {
    accountId: 'test-account',
    databaseId: 'test-database',
    apiToken: 'test-token',
    environment: 'development',
    tablePrefix: 'test_repo'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    adapter = new CloudflareAdapter(mockConfig);
  });

  describe('constructor', () => {
    it('should initialize with correct configuration', () => {
      expect(adapter.accountId).toBe('test-account');
      expect(adapter.databaseId).toBe('test-database');
      expect(adapter.apiToken).toBe('test-token');
      expect(adapter.environment).toBe('development');
      expect(adapter.tablePrefix).toBe('test_repo');
    });

    it('should generate correct table names', () => {
      expect(adapter.flightsTable).toBe('test_repo_dev_flights');
      expect(adapter.statusTable).toBe('test_repo_dev_flight_status_history');
    });

    it('should use production prefix when environment is production', () => {
      const prodAdapter = new CloudflareAdapter({
        ...mockConfig,
        environment: 'production'
      });
      expect(prodAdapter.flightsTable).toBe('test_repo_prod_flights');
      expect(prodAdapter.statusTable).toBe('test_repo_prod_flight_status_history');
    });

    it('should handle missing table prefix', () => {
      const noPrefixAdapter = new CloudflareAdapter({
        ...mockConfig,
        tablePrefix: ''
      });
      expect(noPrefixAdapter.flightsTable).toBe('dev_flights');
      expect(noPrefixAdapter.statusTable).toBe('dev_flight_status_history');
    });
  });

  describe('connect', () => {
    it('should initialize schema and connect successfully', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, result: [] })
      });

      const result = await adapter.connect();
      
      expect(result).toBe(true);
      expect(adapter.isConnected).toBe(true);
      expect(mockFetch).toHaveBeenCalled();
    });

    it('should throw error on connection failure', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        text: async () => 'Connection failed'
      });

      await expect(adapter.connect()).rejects.toThrow('Failed to connect to Cloudflare D1');
    });
  });

  describe('saveFlightData', () => {
    const mockFlightRecord = {
      id: 'test-id',
      airport_code: 'YYZ',
      flight_type: 'arrival',
      flight_date: '2024-01-01',
      flight_data: { test: 'data' }
    };

    beforeEach(async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, result: [] })
      });
      await adapter.connect();
    });

    it('should insert new flight record', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, result: [] })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true })
        });

      const result = await adapter.saveFlightData(mockFlightRecord);

      expect(result).toEqual({
        success: true,
        id: 'test-id',
        operation: 'insert'
      });
    });

    it('should update existing flight record', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ 
            success: true, 
            result: [{ id: 'existing-id' }] 
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true })
        });

      const result = await adapter.saveFlightData(mockFlightRecord);

      expect(result).toEqual({
        success: true,
        id: 'existing-id',
        operation: 'update'
      });
    });

    it('should handle save errors', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        text: async () => 'Save failed'
      });

      await expect(adapter.saveFlightData(mockFlightRecord))
        .rejects.toThrow('Failed to save flight data');
    });
  });

  describe('getFlightData', () => {
    beforeEach(async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, result: [] })
      });
      await adapter.connect();
    });

    it('should retrieve flight data with filters', async () => {
      const mockData = [{
        id: '1',
        airport_code: 'YYZ',
        flight_type: 'arrival',
        flight_data: '{"test": "data"}'
      }];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, result: mockData })
      });

      const result = await adapter.getFlightData({
        airport_code: 'YYZ',
        flight_type: 'arrival',
        start_date: '2024-01-01',
        end_date: '2024-01-31',
        limit: 10
      });

      expect(result).toHaveLength(1);
      expect(result[0].flight_data).toEqual({ test: 'data' });
    });

    it('should handle query errors', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        text: async () => 'Query failed'
      });

      await expect(adapter.getFlightData({}))
        .rejects.toThrow('Failed to retrieve flight data');
    });
  });

  describe('healthCheck', () => {
    it('should return healthy status when connected', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, result: [] })
      });
      await adapter.connect();

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, result: [{ health_check: 1 }] })
      });

      const result = await adapter.healthCheck();

      expect(result).toEqual({
        accessible: true,
        status: 'healthy',
        environment: 'development',
        tablePrefix: 'test_repo',
        tables: {
          flights: 'test_repo_dev_flights',
          status: 'test_repo_dev_flight_status_history'
        }
      });
    });

    it('should return disconnected status when not connected', async () => {
      const result = await adapter.healthCheck();

      expect(result).toEqual({
        accessible: false,
        status: 'disconnected'
      });
    });
  });

  describe('bulkInsert', () => {
    beforeEach(async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, result: [] })
      });
      await adapter.connect();
    });

    it('should handle bulk insert in batches', async () => {
      const records = Array(150).fill(null).map((_, i) => ({
        id: `test-${i}`,
        airport_code: 'YYZ',
        flight_type: 'arrival',
        flight_date: '2024-01-01',
        flight_data: { index: i }
      }));

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true })
      });

      const result = await adapter.bulkInsert(records);

      expect(result.success).toBe(true);
      expect(result.rowsInserted).toBe(150);
      expect(result.errors).toHaveLength(0);
      expect(mockFetch).toHaveBeenCalledTimes(2); // 2 batches
    });

    it('should handle batch errors gracefully', async () => {
      const records = Array(10).fill(null).map((_, i) => ({
        id: `test-${i}`,
        airport_code: 'YYZ',
        flight_type: 'arrival',
        flight_date: '2024-01-01',
        flight_data: { index: i }
      }));

      mockFetch.mockRejectedValue(new Error('Batch failed'));

      const result = await adapter.bulkInsert(records);

      expect(result.success).toBe(true);
      expect(result.rowsInserted).toBe(0);
      expect(result.errors).toHaveLength(1);
    });
  });

  describe('executeSql', () => {
    it('should execute via REST API when no worker URL', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, result: [] })
      });

      await adapter.executeSql('SELECT 1', []);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('api.cloudflare.com'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-token'
          })
        })
      );
    });

    it('should execute via Worker when worker URL is provided', async () => {
      adapter.workerUrl = 'https://test-worker.dev';
      
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, result: [] })
      });

      await adapter.executeSql('SELECT 1', []);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://test-worker.dev/query',
        expect.any(Object)
      );
    });
  });
});