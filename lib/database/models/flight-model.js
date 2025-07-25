class FlightModel {
  constructor(data = {}) {
    this.data = data;
  }

  static fromYYZFormat(yyzData, metadata = {}) {
    const flights = yyzData.list || [];
    
    return flights.map(flight => {
      const model = new FlightModel({
        flight_id: flight.id,
        flight_number: flight.id2,
        type: flight.type,
        scheduled_time: flight.schTime,
        latest_time: flight.latestTm,
        status: flight.status,
        gate: flight.gate,
        terminal: flight.term,
        airline: {
          name: flight.al,
          code: flight.alCode,
          iata: flight.alCode,
          icao: flight.id.substring(0, 3)
        },
        codeshares: (flight.ids || []).map(cs => ({
          flight_id: cs.id,
          flight_number: cs.id2,
          airline: cs.alName
        })),
        destinations: (flight.routes || []).map(route => ({
          code: route.code,
          name: route.name,
          city: route.city,
          country: route.cnty,
          region: route.region
        })),
        carousel: flight.carousel,
        terminal_zone: flight.termzone,
        service_type: flight.svctype,
        metadata: {
          source: 'YYZ',
          last_update: yyzData.lastUpdate,
          server_time: yyzData.serverTime,
          ...metadata
        }
      });
      
      return model;
    });
  }

  static fromSFOFormat(sfoData, metadata = {}) {
    const flights = sfoData.data || [];
    
    return flights.map(flight => {
      const model = new FlightModel({
        flight_id: flight.flight_id,
        flight_number: flight.flight_number,
        type: flight.flight_kind === 'Arrival' ? 'ARR' : 'DEP',
        scheduled_time: flight.scheduled_aod_time,
        estimated_time: flight.estimated_aod_time,
        actual_time: flight.actual_aod_time,
        status: flight.remark,
        gate: flight.gate ? {
          id: flight.gate.gate_id,
          number: flight.gate.gate_number
        } : null,
        terminal: flight.gate ? flight.gate.gate_number.charAt(0) : null,
        airline: {
          name: flight.airline.airline_display_name,
          code: flight.airline.iata_code,
          iata: flight.airline.iata_code,
          icao: flight.airline.icao_code,
          id: flight.airline.airline_id
        },
        codeshares: [],
        destinations: flight.airport ? [{
          code: flight.airport.iata_code,
          icao: flight.airport.icao_code,
          name: flight.airport.airport_name,
          city: flight.airport.airport_city,
          id: flight.airport.airport_id
        }] : [],
        carousel: flight.baggage_carousel ? {
          id: flight.baggage_carousel.baggage_carousel_id,
          name: flight.baggage_carousel.carousel_name
        } : null,
        aircraft: {
          movement_id: flight.aircraft_mvmt_id,
          transport_id: flight.aircraft_transport_id,
          callsign: flight.callsign
        },
        times: {
          scheduled_runway: flight.scheduled_runway_time,
          scheduled_block: flight.scheduled_in_off_block_time,
          estimated_runway: flight.estimated_runway_time,
          estimated_block: flight.estimated_in_off_block_time,
          actual_runway: flight.actual_runway_time,
          actual_block: flight.actual_in_off_block_time,
          first_bag: flight.first_bag_time,
          last_bag: flight.last_bag_time
        },
        linked_flight: flight.linked_flight_id,
        has_codeshare: flight.has_code_share,
        route_type: flight.route_type_id,
        stops: flight.n_stop,
        metadata: {
          source: 'SFO',
          last_update: sfoData.last_update,
          ...metadata
        }
      });
      
      return model;
    });
  }

  toUnifiedFormat() {
    return {
      id: this.data.flight_id,
      number: this.data.flight_number,
      type: this.data.type,
      status: this.data.status,
      airline: this.data.airline,
      schedule: {
        scheduled: this.data.scheduled_time,
        estimated: this.data.estimated_time || this.data.latest_time,
        actual: this.data.actual_time
      },
      location: {
        gate: this.data.gate,
        terminal: this.data.terminal,
        carousel: this.data.carousel
      },
      route: this.data.destinations,
      codeshares: this.data.codeshares,
      aircraft: this.data.aircraft,
      additional: {
        service_type: this.data.service_type,
        terminal_zone: this.data.terminal_zone,
        times: this.data.times,
        linked_flight: this.data.linked_flight,
        stops: this.data.stops
      },
      metadata: this.data.metadata
    };
  }

  static validateFlightData(data) {
    const errors = [];
    
    if (!data.flight_id) errors.push('flight_id is required');
    if (!data.type) errors.push('type is required');
    if (!data.airline || !data.airline.code) errors.push('airline code is required');
    if (!data.scheduled_time) errors.push('scheduled_time is required');
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  static normalizeStatus(status) {
    const statusMap = {
      'CAN': 'CANCELLED',
      'DEP': 'DEPARTED',
      'ARR': 'ARRIVED',
      'SCH': 'SCHEDULED',
      'DEL': 'DELAYED',
      'ON TIME': 'ON_TIME',
      'Arrived': 'ARRIVED',
      'Departed': 'DEPARTED',
      'Cancelled': 'CANCELLED',
      'Delayed': 'DELAYED'
    };
    
    return statusMap[status] || status.toUpperCase();
  }

  getSearchableText() {
    const parts = [
      this.data.flight_id,
      this.data.flight_number,
      this.data.airline?.name,
      this.data.airline?.code,
      ...(this.data.destinations || []).map(d => `${d.code} ${d.name} ${d.city}`),
      ...(this.data.codeshares || []).map(cs => `${cs.flight_id} ${cs.airline}`)
    ];
    
    return parts.filter(Boolean).join(' ').toLowerCase();
  }
}

module.exports = FlightModel;