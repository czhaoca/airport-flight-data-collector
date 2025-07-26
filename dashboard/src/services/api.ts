import axios, { AxiosInstance, AxiosError } from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v2';

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
}

export const apiClient = new ApiClient();
export default apiClient;