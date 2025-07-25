const Flight = require('../../../../src/core/models/Flight');

describe('Flight Model', () => {
  describe('fromApiData', () => {
    it('should parse SFO data correctly', () => {
      const sfoData = {
        flight_id: 'UA/123/A/2025-07-25',
        flight_number: '123',
        airline: {
          iata_code: 'UA',
          airline_name: 'United Airlines'
        },
        airport: {
          iata_code: 'LAX'
        },
        flight_kind: 'Arrival',
        scheduled_aod_time: '2025-07-25T10:00:00',
        actual_aod_time: '2025-07-25T10:15:00',
        remark: 'On Time',
        gate: {
          gate_number: 'A1'
        },
        terminal: {
          terminal_code: 'T1'
        },
        aircraft_transport_type: {
          iata_code: '737'
        },
        has_code_share: false,
        baggage_carousel: {
          carousel_name: '5'
        }
      };

      const flight = Flight.fromApiData(sfoData, 'sfo');

      expect(flight.id).toBe('UA/123/A/2025-07-25');
      expect(flight.flightNumber).toBe('UA123');
      expect(flight.airline.code).toBe('UA');
      expect(flight.airline.name).toBe('United Airlines');
      expect(flight.origin).toBe('LAX');
      expect(flight.destination).toBe('SFO');
      expect(flight.type).toBe('arrival');
      expect(flight.gate).toBe('A1');
      expect(flight.terminal).toBe('T1');
      expect(flight.aircraft).toBe('737');
    });

    it('should parse YYZ data correctly', () => {
      const yyzData = {
        key: 'z0725ACA100YYZLAX',
        id: 'ACA100',
        alCode: 'ACA',
        al: 'Air Canada',
        type: 'DEP',
        routes: [{
          code: 'LAX',
          name: 'Los Angeles International Airport'
        }],
        schTime: '2025-07-25T08:00:00',
        latestTm: '2025-07-25T08:10:00',
        status: 'On Time',
        gate: 'F50',
        term: 'T1'
      };

      const flight = Flight.fromApiData(yyzData, 'yyz');

      expect(flight.id).toBe('z0725ACA100YYZLAX');
      expect(flight.flightNumber).toBe('ACA100');
      expect(flight.airline.code).toBe('ACA');
      expect(flight.airline.name).toBe('Air Canada');
      expect(flight.origin).toBe('YYZ');
      expect(flight.destination).toBe('LAX');
      expect(flight.type).toBe('departure');
      expect(flight.gate).toBe('F50');
      expect(flight.terminal).toBe('T1');
    });

    it('should throw error for unknown format', () => {
      expect(() => {
        Flight.fromApiData({}, 'unknown');
      }).toThrow('Unknown format: unknown');
    });
  });

  describe('isValid', () => {
    it('should return true for valid flight', () => {
      const flight = new Flight({
        id: '123',
        flightNumber: 'UA123',
        airline: { code: 'UA' },
        scheduledTime: new Date(),
        type: 'arrival'
      });

      expect(flight.isValid()).toBe(true);
    });

    it('should return false for invalid flight', () => {
      const flight = new Flight({
        id: '123'
      });

      expect(flight.isValid()).toBe(false);
    });
  });

  describe('toJSON', () => {
    it('should return plain object representation', () => {
      const flight = new Flight({
        id: '123',
        flightNumber: 'UA123',
        airline: { code: 'UA', name: 'United' },
        origin: 'LAX',
        destination: 'SFO',
        type: 'arrival'
      });

      const json = flight.toJSON();
      
      expect(json).toEqual({
        id: '123',
        flightNumber: 'UA123',
        airline: { code: 'UA', name: 'United' },
        origin: 'LAX',
        destination: 'SFO',
        scheduledTime: undefined,
        actualTime: undefined,
        status: undefined,
        gate: undefined,
        terminal: undefined,
        type: 'arrival',
        aircraft: undefined,
        metadata: undefined
      });
    });
  });
});