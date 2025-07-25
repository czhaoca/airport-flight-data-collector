/**
 * Flight domain model
 * Follows Single Responsibility Principle - represents a flight entity
 */
class Flight {
  constructor({
    id,
    flightNumber,
    airline,
    origin,
    destination,
    scheduledTime,
    actualTime,
    status,
    gate,
    terminal,
    type, // arrival or departure
    aircraft,
    metadata = {}
  }) {
    this.id = id;
    this.flightNumber = flightNumber;
    this.airline = airline;
    this.origin = origin;
    this.destination = destination;
    this.scheduledTime = scheduledTime;
    this.actualTime = actualTime;
    this.status = status;
    this.gate = gate;
    this.terminal = terminal;
    this.type = type;
    this.aircraft = aircraft;
    this.metadata = metadata;
  }

  /**
   * Creates a Flight from raw API data
   * @param {Object} data - Raw flight data
   * @param {string} format - The data format (e.g., 'sfo', 'yyz')
   * @returns {Flight} A new Flight instance
   */
  static fromApiData(data, format) {
    const parsers = {
      sfo: Flight.parseSFOData,
      yyz: Flight.parseYYZData,
      yvr: Flight.parseYVRData
    };

    const parser = parsers[format];
    if (!parser) {
      throw new Error(`Unknown format: ${format}`);
    }

    return parser(data);
  }

  static parseSFOData(data) {
    return new Flight({
      id: data.flight_id,
      flightNumber: `${data.airline?.iata_code}${data.flight_number}`,
      airline: {
        code: data.airline?.iata_code,
        name: data.airline?.airline_name
      },
      origin: data.airport?.iata_code,
      destination: data.flight_kind === 'Arrival' ? 'SFO' : data.airport?.iata_code,
      scheduledTime: data.scheduled_aod_time,
      actualTime: data.actual_aod_time,
      status: data.remark,
      gate: data.gate?.gate_number,
      terminal: data.terminal?.terminal_code,
      type: data.flight_kind.toLowerCase(),
      aircraft: data.aircraft_transport_type?.iata_code,
      metadata: {
        hasCodeShare: data.has_code_share,
        baggage: data.baggage_carousel?.carousel_name
      }
    });
  }

  static parseYYZData(data) {
    return new Flight({
      id: data.key,
      flightNumber: data.id,
      airline: {
        code: data.alCode,
        name: data.al
      },
      origin: data.type === 'DEP' ? 'YYZ' : data.routes?.[0]?.code,
      destination: data.type === 'DEP' ? data.routes?.[0]?.code : 'YYZ',
      scheduledTime: data.schTime,
      actualTime: data.latestTm,
      status: data.status,
      gate: data.gate,
      terminal: data.term,
      type: data.type === 'DEP' ? 'departure' : 'arrival',
      aircraft: null,
      metadata: {
        carousel: data.carousel,
        zone: data.zone
      }
    });
  }

  static parseYVRData(data) {
    return new Flight({
      id: `${data.flight_number}_${data.scheduled_time}`,
      flightNumber: data.flight_number,
      airline: {
        code: data.airline_code,
        name: data.airline
      },
      origin: data.type === 'departure' ? 'YVR' : data.origin_code || data.origin,
      destination: data.type === 'departure' ? data.destination_code || data.destination : 'YVR',
      scheduledTime: data.scheduled_time,
      actualTime: data.actual_time,
      status: data.status,
      gate: data.gate,
      terminal: data.terminal,
      type: data.type,
      aircraft: null,
      metadata: {
        estimatedTime: data.estimated_time,
        remarks: data.remarks,
        carousel: data.carousel
      }
    });
  }

  /**
   * Converts the flight to a plain object
   * @returns {Object} Plain object representation
   */
  toJSON() {
    return {
      id: this.id,
      flightNumber: this.flightNumber,
      airline: this.airline,
      origin: this.origin,
      destination: this.destination,
      scheduledTime: this.scheduledTime,
      actualTime: this.actualTime,
      status: this.status,
      gate: this.gate,
      terminal: this.terminal,
      type: this.type,
      aircraft: this.aircraft,
      metadata: this.metadata
    };
  }

  /**
   * Validates the flight data
   * @returns {boolean} True if valid
   */
  isValid() {
    return !!(
      this.id &&
      this.flightNumber &&
      this.airline &&
      this.scheduledTime &&
      this.type
    );
  }
}

module.exports = Flight;