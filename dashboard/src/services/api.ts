import axios, { AxiosInstance, AxiosError } from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

class ApiClient {
  private client: AxiosInstance;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor to add auth token
    this.client.interceptors.request.use(
      (config) => {
        if (this.accessToken) {
          config.headers.Authorization = `Bearer ${this.accessToken}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor to handle token refresh
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && originalRequest) {
          try {
            await this.refreshAccessToken();
            // Retry original request with new token
            originalRequest.headers.Authorization = `Bearer ${this.accessToken}`;
            return this.client(originalRequest);
          } catch (refreshError) {
            // Refresh failed, redirect to login
            this.clearTokens();
            window.location.href = '/login';
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(error);
      }
    );

    // Load tokens from localStorage
    this.loadTokens();
  }

  private loadTokens() {
    if (typeof window !== 'undefined') {
      this.accessToken = localStorage.getItem('accessToken');
      this.refreshToken = localStorage.getItem('refreshToken');
    }
  }

  private saveTokens(accessToken: string, refreshToken: string) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    if (typeof window !== 'undefined') {
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
    }
  }

  private clearTokens() {
    this.accessToken = null;
    this.refreshToken = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    }
  }

  async login(email: string, password: string) {
    const response = await this.client.post('/auth/login', { email, password });
    const { accessToken, refreshToken } = response.data;
    this.saveTokens(accessToken, refreshToken);
    return response.data;
  }

  async logout() {
    try {
      await this.client.post('/auth/logout', { refreshToken: this.refreshToken });
    } finally {
      this.clearTokens();
    }
  }

  private async refreshAccessToken() {
    if (!this.refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await this.client.post('/auth/refresh', {
      refreshToken: this.refreshToken,
    });

    const { accessToken, refreshToken } = response.data;
    this.saveTokens(accessToken, refreshToken);
  }

  // Flight endpoints
  async getFlights(params?: {
    airport?: string;
    airline?: string;
    flightNumber?: string;
    startDate?: string;
    endDate?: string;
    type?: 'arrival' | 'departure';
    status?: string;
    limit?: number;
    offset?: number;
  }) {
    const response = await this.client.get('/flights', { params });
    return response.data;
  }

  async getFlightById(id: string) {
    const response = await this.client.get(`/flights/${id}`);
    return response.data;
  }

  async getLiveFlights(airport: string, type?: 'arrival' | 'departure') {
    const response = await this.client.get('/flights/live', {
      params: { airport, type },
    });
    return response.data;
  }

  // Airport endpoints
  async getAirports(params?: {
    search?: string;
    country?: string;
    city?: string;
    limit?: number;
    offset?: number;
  }) {
    const response = await this.client.get('/airports', { params });
    return response.data;
  }

  async getAirportByCode(code: string) {
    const response = await this.client.get(`/airports/${code}`);
    return response.data;
  }

  async getAirportWeather(code: string) {
    const response = await this.client.get(`/airports/${code}/weather`);
    return response.data;
  }

  // Statistics endpoints
  async getStatisticsOverview(params: {
    airport?: string;
    startDate: string;
    endDate: string;
    groupBy?: 'day' | 'week' | 'month';
  }) {
    const response = await this.client.get('/statistics/overview', { params });
    return response.data;
  }

  async getAirlineStatistics(params: {
    airport?: string;
    startDate: string;
    endDate: string;
  }) {
    const response = await this.client.get('/statistics/airlines', { params });
    return response.data;
  }

  async getRouteStatistics(params: {
    airport?: string;
    startDate: string;
    endDate: string;
    limit?: number;
  }) {
    const response = await this.client.get('/statistics/routes', { params });
    return response.data;
  }

  async getDelayStatistics(params: {
    airport?: string;
    startDate: string;
    endDate: string;
  }) {
    const response = await this.client.get('/statistics/delays', { params });
    return response.data;
  }

  // Health check
  async getHealth() {
    const response = await this.client.get('/health');
    return response.data;
  }

  // System metrics
  async getSystemMetrics() {
    const response = await this.client.get('/metrics/system');
    return response.data;
  }

  async getMetricsTimeSeries(timeRange: '1h' | '6h' | '24h' | '7d') {
    const response = await this.client.get('/metrics/timeseries', {
      params: { range: timeRange },
    });
    return response.data;
  }

  // Historical data endpoint
  async getHistoricalData(airport: string, startDate: string, endDate: string) {
    const [overview, airlines, routes, delays] = await Promise.all([
      this.getStatisticsOverview({ airport, startDate, endDate, groupBy: 'day' }),
      this.getAirlineStatistics({ airport, startDate, endDate }),
      this.getRouteStatistics({ airport, startDate, endDate, limit: 10 }),
      this.getDelayStatistics({ airport, startDate, endDate }),
    ]);

    // Transform the data for the charts
    const dailyVolume = overview.data?.map((day: any) => ({
      date: day.date,
      arrivals: day.arrivals,
      departures: day.departures,
    })) || [];

    const dailyDelays = overview.data?.map((day: any) => ({
      date: day.date,
      avgDelayMinutes: day.avgDelay,
      delayedFlights: day.delayedFlights,
      totalFlights: day.totalFlights,
    })) || [];

    const hourlyDistribution = Array.from({ length: 24 }, (_, hour) => {
      const hourData = overview.hourlyData?.find((h: any) => h.hour === hour) || {};
      return {
        hour,
        arrivals: hourData.arrivals || 0,
        departures: hourData.departures || 0,
      };
    });

    const airlinePerformance = airlines.data?.map((airline: any) => ({
      airline: airline.airline,
      onTimePercentage: airline.onTimePercentage,
      flightCount: airline.totalFlights,
    })) || [];

    const topRoutes = routes.data?.map((route: any) => ({
      origin: route.origin,
      destination: route.destination,
      flightCount: route.flightCount,
      onTimePercentage: route.onTimePercentage,
      avgDelay: route.avgDelay,
    })) || [];

    const summary = {
      totalFlights: overview.summary?.totalFlights || 0,
      onTimeRate: overview.summary?.onTimePercentage || 0,
      avgDelay: Math.round(overview.summary?.avgDelay || 0),
      cancellationRate: overview.summary?.cancellationRate || 0,
    };

    return {
      summary,
      dailyVolume,
      dailyDelays,
      hourlyDistribution,
      airlinePerformance,
      topRoutes,
    };
  }
}

export const apiClient = new ApiClient();
export default apiClient;