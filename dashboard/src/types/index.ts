export interface Flight {
  id: string;
  flightNumber: string;
  airline: string;
  origin: {
    airport: string;
    terminal?: string;
    gate?: string;
  };
  destination: {
    airport: string;
    terminal?: string;
    gate?: string;
  };
  scheduledTime: string;
  actualTime?: string;
  status: 'scheduled' | 'delayed' | 'cancelled' | 'landed' | 'departed' | 'boarding' | 'in_flight';
  aircraft?: string | {
    type: string;
    registration?: string;
  };
  duration?: number;
  distance?: number;
}

export interface FlightDetails extends Flight {
  origin: {
    airport: string;
    city: string;
    terminal?: string;
    gate?: string;
  };
  destination: {
    airport: string;
    city: string;
    terminal?: string;
    gate?: string;
  };
  aircraft?: {
    type: string;
    registration?: string;
  };
  updates: FlightUpdate[];
  lastUpdated: string;
}

export interface FlightUpdate {
  timestamp: string;
  type: string;
  oldValue?: string;
  newValue?: string;
  message?: string;
}

export interface Airport {
  code: string;
  name: string;
  city: string;
  country: string;
  location: {
    latitude: number;
    longitude: number;
  };
  timezone: string;
  terminals?: string[];
}

export interface AirportDetails extends Airport {
  location: {
    latitude: number;
    longitude: number;
    elevation?: number;
  };
  runways?: Array<{
    id: string;
    length: number;
    width: number;
    surface: string;
  }>;
  statistics: {
    today: {
      arrivals: number;
      departures: number;
      delays: number;
      cancellations: number;
    };
  };
  popularRoutes: Array<{
    airport: string;
    flights: number;
    distance: number;
  }>;
  services?: string[];
  contactInfo?: {
    website?: string;
    phone?: string;
    email?: string;
  };
}

export interface WeatherData {
  airport: string;
  timestamp: string;
  isRecent: boolean;
  conditions: {
    temperature: {
      celsius: number;
      fahrenheit: number;
    };
    feelsLike: {
      celsius: number;
      fahrenheit: number;
    };
    humidity: number;
    pressure: {
      mb: number;
      inHg: number;
    };
    visibility: {
      km: number;
      miles: number;
    };
    wind: {
      speed: {
        kph: number;
        mph: number;
      };
      direction: string;
      gust?: {
        kph: number;
        mph: number;
      };
    };
    clouds: string;
    condition: string;
    icon: string;
  };
  flightCategory: 'VFR' | 'MVFR' | 'IFR' | 'LIFR';
  metar?: string;
}

export interface Statistics {
  summary: {
    totalFlights: number;
    onTimePercentage: number;
    averageDelay: number;
    cancellationRate: string;
  };
  timeline: Array<{
    period: string;
    flights: {
      total: number;
      arrivals: number;
      departures: number;
    };
    performance: {
      onTime: number;
      delayed: number;
      cancelled: number;
      avgDelay: number;
      maxDelay: number;
    };
  }>;
  period: {
    start: string;
    end: string;
    groupBy: 'day' | 'week' | 'month';
  };
}

export interface LiveFlights {
  airport: string;
  timestamp: string;
  flights: {
    boarding: Flight[];
    inFlight: Flight[];
    landed: Flight[];
    departed: Flight[];
    delayed: Flight[];
    cancelled: Flight[];
  };
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}