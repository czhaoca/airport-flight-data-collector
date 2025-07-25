const FlightModel = require('../../../lib/database/models/flight-model');

describe('FlightModel', () => {
  describe('fromYYZFormat', () => {
    test('should convert YYZ format to flight models', () => {
      const yyzData = {
        lastUpdate: '2024-01-15T12:00:00',
        serverTime: '2024-01-15T12:05:00',
        list: [
          {
            key: 'test-key',
            id: 'AC101',
            id2: 'AC101',
            type: 'DEP',
            schTime: '2024-01-15T10:00:00',
            latestTm: '2024-01-15T10:30:00',
            status: 'DEL',
            gate: 'A10',
            term: 'T1',
            al: 'Air Canada',
            alCode: 'ACA',
            ids: [
              { id: 'UA8000', id2: 'UA8000', alName: 'United Airlines' }
            ],
            routes: [
              { code: 'YVR', name: 'Vancouver International', city: 'Vancouver', cnty: 'CAN' }
            ],
            carousel: null,
            termzone: 'DOM',
            svctype: 'J'
          }
        ]
      };
      
      const models = FlightModel.fromYYZFormat(yyzData);
      
      expect(models).toHaveLength(1);
      expect(models[0].data).toMatchObject({
        flight_id: 'AC101',
        flight_number: 'AC101',
        type: 'DEP',
        status: 'DEL',
        gate: 'A10',
        terminal: 'T1',
        airline: {
          name: 'Air Canada',
          code: 'ACA',
          iata: 'ACA',
          icao: 'AC1'
        }
      });
      expect(models[0].data.codeshares).toHaveLength(1);
      expect(models[0].data.destinations).toHaveLength(1);
    });
  });

  describe('fromSFOFormat', () => {
    test('should convert SFO format to flight models', () => {
      const sfoData = {
        last_update: 'Jan 15 at 12:00 pm',
        data: [
          {
            flight_id: 'UA/123/A/2024-01-15',
            flight_number: '123',
            flight_kind: 'Arrival',
            airline: {
              iata_code: 'UA',
              icao_code: 'UAL',
              airline_id: 1,
              airline_name: 'United',
              airline_display_name: 'United Airlines'
            },
            scheduled_aod_time: '2024-01-15T10:00:00',
            estimated_aod_time: '2024-01-15T10:15:00',
            actual_aod_time: '2024-01-15T10:20:00',
            remark: 'Arrived',
            gate: {
              gate_id: 1,
              gate_number: 'B10'
            },
            airport: {
              iata_code: 'LAX',
              icao_code: 'KLAX',
              airport_id: 2,
              airport_name: 'Los Angeles International',
              airport_city: 'Los Angeles'
            },
            baggage_carousel: {
              baggage_carousel_id: 1,
              carousel_name: '3'
            },
            aircraft_mvmt_id: 12345,
            aircraft_transport_id: 6789,
            callsign: 'UAL123',
            has_code_share: false,
            n_stop: 0
          }
        ]
      };
      
      const models = FlightModel.fromSFOFormat(sfoData);
      
      expect(models).toHaveLength(1);
      expect(models[0].data).toMatchObject({
        flight_id: 'UA/123/A/2024-01-15',
        flight_number: '123',
        type: 'ARR',
        status: 'Arrived',
        airline: {
          name: 'United Airlines',
          code: 'UA',
          iata: 'UA',
          icao: 'UAL'
        }
      });
      expect(models[0].data.gate).toMatchObject({
        id: 1,
        number: 'B10'
      });
    });
  });

  describe('toUnifiedFormat', () => {
    test('should convert model to unified format', () => {
      const model = new FlightModel({
        flight_id: 'TEST123',
        flight_number: 'T123',
        type: 'DEP',
        status: 'ON TIME',
        scheduled_time: '2024-01-15T10:00:00',
        airline: { code: 'TEST', name: 'Test Air' },
        gate: 'A1',
        terminal: 'T1',
        destinations: [{ code: 'ABC', name: 'Test Airport' }]
      });
      
      const unified = model.toUnifiedFormat();
      
      expect(unified).toMatchObject({
        id: 'TEST123',
        number: 'T123',
        type: 'DEP',
        status: 'ON TIME',
        airline: { code: 'TEST', name: 'Test Air' },
        schedule: {
          scheduled: '2024-01-15T10:00:00'
        },
        location: {
          gate: 'A1',
          terminal: 'T1'
        },
        route: [{ code: 'ABC', name: 'Test Airport' }]
      });
    });
  });

  describe('validation', () => {
    test('should validate required fields', () => {
      const validData = {
        flight_id: 'TEST123',
        type: 'DEP',
        airline: { code: 'TST' },
        scheduled_time: '2024-01-15T10:00:00'
      };
      
      const validResult = FlightModel.validateFlightData(validData);
      expect(validResult.valid).toBe(true);
      expect(validResult.errors).toHaveLength(0);
      
      const invalidData = {
        type: 'DEP'
      };
      
      const invalidResult = FlightModel.validateFlightData(invalidData);
      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.errors).toContain('flight_id is required');
    });
  });

  describe('normalizeStatus', () => {
    test('should normalize status codes', () => {
      expect(FlightModel.normalizeStatus('CAN')).toBe('CANCELLED');
      expect(FlightModel.normalizeStatus('DEP')).toBe('DEPARTED');
      expect(FlightModel.normalizeStatus('Arrived')).toBe('ARRIVED');
      expect(FlightModel.normalizeStatus('UNKNOWN')).toBe('UNKNOWN');
    });
  });

  describe('getSearchableText', () => {
    test('should generate searchable text from flight data', () => {
      const model = new FlightModel({
        flight_id: 'AC101',
        flight_number: 'AC101',
        airline: { name: 'Air Canada', code: 'ACA' },
        destinations: [
          { code: 'YVR', name: 'Vancouver International', city: 'Vancouver' }
        ],
        codeshares: [
          { flight_id: 'UA8000', airline: 'United Airlines' }
        ]
      });
      
      const searchText = model.getSearchableText();
      
      expect(searchText).toContain('ac101');
      expect(searchText).toContain('air canada');
      expect(searchText).toContain('yvr');
      expect(searchText).toContain('vancouver');
      expect(searchText).toContain('ua8000');
    });
  });
});