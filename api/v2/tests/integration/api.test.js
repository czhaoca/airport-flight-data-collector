const request = require('supertest');
const app = require('../../src/server');
const jwt = require('jsonwebtoken');

describe('Airport Flight Data API v2 Integration Tests', () => {
  let authToken;
  let server;

  beforeAll(async () => {
    // Generate test auth token
    authToken = jwt.sign(
      { id: 'test-user', username: 'test@example.com' },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );

    // Start server
    server = app.listen(0);
  });

  afterAll(async () => {
    if (server) {
      await new Promise(resolve => server.close(resolve));
    }
  });

  describe('Health Check', () => {
    test('GET /api/v2/health should return 200', async () => {
      const response = await request(server)
        .get('/api/v2/health')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        status: 'healthy',
        timestamp: expect.any(String)
      });
    });
  });

  describe('Authentication', () => {
    test('POST /api/v2/auth/login should return token', async () => {
      const response = await request(server)
        .post('/api/v2/auth/login')
        .send({
          username: 'test@example.com',
          password: 'password123'
        })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        token: expect.any(String),
        refreshToken: expect.any(String)
      });
    });

    test('Protected endpoints should require auth', async () => {
      await request(server)
        .get('/api/v2/flights')
        .expect(401);
    });
  });

  describe('Flight Endpoints', () => {
    test('GET /api/v2/flights should return flight list', async () => {
      const response = await request(server)
        .get('/api/v2/flights')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ airport: 'SFO', limit: 10 })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: expect.any(Array),
        pagination: {
          page: 1,
          limit: 10,
          total: expect.any(Number)
        }
      });
    });

    test('GET /api/v2/flights/:id should return flight details', async () => {
      const response = await request(server)
        .get('/api/v2/flights/UA123-20250802')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: expect.objectContaining({
          id: 'UA123-20250802',
          flightNumber: expect.any(String),
          status: expect.any(String)
        })
      });
    });
  });

  describe('Airport Endpoints', () => {
    test('GET /api/v2/airports should return airport list', async () => {
      const response = await request(server)
        .get('/api/v2/airports')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: 'SFO',
            name: 'San Francisco International Airport'
          }),
          expect.objectContaining({
            code: 'YYZ',
            name: 'Toronto Pearson International Airport'
          }),
          expect.objectContaining({
            code: 'YVR',
            name: 'Vancouver International Airport'
          })
        ])
      );
    });

    test('GET /api/v2/airports/:code should return airport details', async () => {
      const response = await request(server)
        .get('/api/v2/airports/SFO')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data).toMatchObject({
        code: 'SFO',
        name: 'San Francisco International Airport',
        timezone: 'America/Los_Angeles',
        location: {
          latitude: expect.any(Number),
          longitude: expect.any(Number)
        }
      });
    });
  });

  describe('Statistics Endpoints', () => {
    test('GET /api/v2/statistics should return system stats', async () => {
      const response = await request(server)
        .get('/api/v2/statistics')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data).toMatchObject({
        totalFlights: expect.any(Number),
        totalAirports: 3,
        delayRate: expect.any(Number),
        cancellationRate: expect.any(Number)
      });
    });

    test('GET /api/v2/statistics/airport/:code should return airport stats', async () => {
      const response = await request(server)
        .get('/api/v2/statistics/airport/SFO')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ period: 'day' })
        .expect(200);

      expect(response.body.data).toMatchObject({
        airport: 'SFO',
        period: 'day',
        flights: expect.objectContaining({
          total: expect.any(Number),
          delayed: expect.any(Number),
          cancelled: expect.any(Number),
          onTime: expect.any(Number)
        })
      });
    });
  });

  describe('Prediction Endpoints', () => {
    test('POST /api/v2/predictions/delay should return prediction', async () => {
      const response = await request(server)
        .post('/api/v2/predictions/delay')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          flightNumber: 'UA123',
          airline: 'UA',
          origin: 'SFO',
          destination: 'LAX',
          scheduledTime: '2025-08-02T08:00:00Z'
        })
        .expect(200);

      expect(response.body.data).toMatchObject({
        delayProbability: expect.any(Number),
        expectedDelayMinutes: expect.any(Number),
        riskLevel: expect.stringMatching(/^(low|medium|high)$/),
        confidence: expect.any(Number),
        factors: expect.arrayContaining([
          expect.objectContaining({
            factor: expect.any(String),
            impact: expect.any(Number)
          })
        ])
      });
    });

    test('POST /api/v2/predictions/batch should handle multiple predictions', async () => {
      const response = await request(server)
        .post('/api/v2/predictions/batch')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          flights: [
            {
              flightNumber: 'UA123',
              airline: 'UA',
              origin: 'SFO',
              destination: 'LAX',
              scheduledTime: '2025-08-02T08:00:00Z'
            },
            {
              flightNumber: 'AC456',
              airline: 'AC',
              origin: 'YYZ',
              destination: 'YVR',
              scheduledTime: '2025-08-02T10:00:00Z'
            }
          ]
        })
        .expect(200);

      expect(response.body.data.predictions).toHaveLength(2);
    });
  });

  describe('Pattern Analysis Endpoints', () => {
    test('GET /api/v2/patterns should return detected patterns', async () => {
      const response = await request(server)
        .get('/api/v2/patterns')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ limit: 5 })
        .expect(200);

      expect(response.body.data).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: expect.any(String),
            type: expect.stringMatching(/^(temporal|spatial|operational|anomaly|cascading|seasonal)$/),
            severity: expect.stringMatching(/^(low|medium|high|critical)$/),
            detectedAt: expect.any(String)
          })
        ])
      );
    });

    test('GET /api/v2/patterns/insights should return actionable insights', async () => {
      const response = await request(server)
        .get('/api/v2/patterns/insights')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            insight: expect.any(String),
            category: expect.any(String),
            priority: expect.stringMatching(/^(low|medium|high)$/),
            recommendations: expect.any(Array)
          })
        ])
      );
    });
  });

  describe('Export Endpoints', () => {
    test('GET /api/v2/export/flights should export flight data', async () => {
      const response = await request(server)
        .get('/api/v2/export/flights')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          airport: 'SFO',
          startDate: '2025-08-01',
          endDate: '2025-08-02',
          format: 'json'
        })
        .expect(200);

      expect(response.headers['content-type']).toContain('application/json');
      expect(response.body).toMatchObject({
        success: true,
        data: expect.any(Array),
        metadata: {
          exportDate: expect.any(String),
          recordCount: expect.any(Number),
          format: 'json'
        }
      });
    });

    test('GET /api/v2/export/flights?format=csv should return CSV', async () => {
      const response = await request(server)
        .get('/api/v2/export/flights')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          airport: 'SFO',
          startDate: '2025-08-01',
          endDate: '2025-08-02',
          format: 'csv'
        })
        .expect(200);

      expect(response.headers['content-type']).toContain('text/csv');
      expect(response.headers['content-disposition']).toContain('attachment');
    });
  });

  describe('Webhook Endpoints', () => {
    let webhookId;

    test('POST /api/v2/webhooks should create webhook', async () => {
      const response = await request(server)
        .post('/api/v2/webhooks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          url: 'https://example.com/webhook',
          events: ['flight.delayed', 'flight.cancelled'],
          filters: {
            airport: 'SFO',
            minDelay: 30
          }
        })
        .expect(201);

      expect(response.body.data).toMatchObject({
        id: expect.any(String),
        url: 'https://example.com/webhook',
        events: ['flight.delayed', 'flight.cancelled'],
        active: true
      });

      webhookId = response.body.data.id;
    });

    test('GET /api/v2/webhooks should list webhooks', async () => {
      const response = await request(server)
        .get('/api/v2/webhooks')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: webhookId,
            url: 'https://example.com/webhook'
          })
        ])
      );
    });

    test('DELETE /api/v2/webhooks/:id should delete webhook', async () => {
      await request(server)
        .delete(`/api/v2/webhooks/${webhookId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(204);
    });
  });

  describe('Batch Operations', () => {
    test('POST /api/v2/batch should process batch operations', async () => {
      const response = await request(server)
        .post('/api/v2/batch')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          operations: [
            {
              method: 'GET',
              path: '/flights/UA123-20250802'
            },
            {
              method: 'GET',
              path: '/airports/SFO'
            }
          ]
        })
        .expect(200);

      expect(response.body.data.results).toHaveLength(2);
      expect(response.body.data.results[0]).toMatchObject({
        status: 200,
        body: expect.any(Object)
      });
    });
  });

  describe('Monitoring Endpoints', () => {
    test('GET /api/v2/metrics should return Prometheus metrics', async () => {
      const response = await request(server)
        .get('/api/v2/metrics')
        .expect(200);

      expect(response.headers['content-type']).toContain('text/plain');
      expect(response.text).toContain('# HELP');
      expect(response.text).toContain('# TYPE');
    });

    test('GET /api/v2/websocket/stats should return WebSocket stats', async () => {
      const response = await request(server)
        .get('/api/v2/websocket/stats')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data).toMatchObject({
        connectedClients: expect.any(Number),
        totalRooms: expect.any(Number),
        subscriptions: expect.objectContaining({
          airports: expect.any(Number),
          flights: expect.any(Number),
          routes: expect.any(Number)
        })
      });
    });
  });

  describe('Error Handling', () => {
    test('Should return 404 for non-existent endpoints', async () => {
      const response = await request(server)
        .get('/api/v2/nonexistent')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Endpoint not found'
      });
    });

    test('Should validate request parameters', async () => {
      const response = await request(server)
        .get('/api/v2/flights')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ limit: 'invalid' })
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: expect.stringContaining('validation')
      });
    });

    test('Should handle server errors gracefully', async () => {
      // This would test error handling by forcing an error
      // Implementation depends on ability to mock services
    });
  });

  describe('Rate Limiting', () => {
    test('Should enforce rate limits', async () => {
      // Make multiple rapid requests
      const requests = Array(10).fill(null).map(() =>
        request(server)
          .get('/api/v2/flights')
          .set('Authorization', `Bearer ${authToken}`)
      );

      const responses = await Promise.all(requests);
      const rateLimited = responses.some(r => r.status === 429);

      // Should eventually hit rate limit
      expect(rateLimited).toBe(true);
    });
  });
});