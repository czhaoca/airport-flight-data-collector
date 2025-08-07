/**
 * Advanced Analytics Engine
 * Comprehensive analytics for flight data including trends, anomalies, and forecasting
 */

const { apiLogger } = require('../../lib/logging');
const { getDatabase } = require('../../lib/database');
const DelayPredictionModel = require('../models/DelayPredictionModel');
const PatternDetector = require('../models/PatternDetector');

class AdvancedAnalyticsEngine {
  constructor() {
    this.logger = apiLogger.child('AdvancedAnalyticsEngine');
    this.db = null;
    this.predictionModel = new DelayPredictionModel();
    this.patternDetector = new PatternDetector();
    this.cache = new Map();
    this.cacheTimeout = 3600000; // 1 hour
  }

  /**
   * Initialize the analytics engine
   */
  async initialize() {
    this.logger.info('Initializing Advanced Analytics Engine');
    try {
      this.db = await getDatabase();
      await this.predictionModel.loadModel();
      this.logger.info('Advanced Analytics Engine initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize analytics engine', error);
      throw error;
    }
  }

  /**
   * Get comprehensive analytics for a date range
   */
  async getComprehensiveAnalytics(startDate, endDate, airports = ['SFO', 'YYZ', 'YVR']) {
    const cacheKey = `comprehensive_${startDate}_${endDate}_${airports.join('_')}`;
    
    // Check cache
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }
    }

    try {
      const [
        trends,
        anomalies,
        forecasts,
        correlations,
        seasonality,
        performance
      ] = await Promise.all([
        this.analyzeTrends(startDate, endDate, airports),
        this.detectAnomalies(startDate, endDate, airports),
        this.generateForecasts(startDate, endDate, airports),
        this.analyzeCorrelations(startDate, endDate, airports),
        this.analyzeSeasonality(startDate, endDate, airports),
        this.analyzePerformance(startDate, endDate, airports)
      ]);

      const analytics = {
        period: { startDate, endDate },
        airports,
        trends,
        anomalies,
        forecasts,
        correlations,
        seasonality,
        performance,
        generatedAt: new Date()
      };

      // Cache results
      this.cache.set(cacheKey, {
        data: analytics,
        timestamp: Date.now()
      });

      return analytics;
    } catch (error) {
      this.logger.error('Comprehensive analytics failed', error);
      throw error;
    }
  }

  /**
   * Analyze trends in flight data
   */
  async analyzeTrends(startDate, endDate, airports) {
    const trends = {
      volume: {},
      delays: {},
      cancellations: {},
      onTimePerformance: {}
    };

    for (const airport of airports) {
      const flights = await this.db.getFlightData({
        airport,
        startDate,
        endDate
      });

      // Volume trend
      const volumeByDay = this.groupByDay(flights);
      trends.volume[airport] = this.calculateTrend(
        volumeByDay.map(d => d.count)
      );

      // Delay trend
      const delaysByDay = volumeByDay.map(d => d.avgDelay);
      trends.delays[airport] = this.calculateTrend(delaysByDay);

      // Cancellation trend
      const cancellationsByDay = volumeByDay.map(d => d.cancellationRate);
      trends.cancellations[airport] = this.calculateTrend(cancellationsByDay);

      // On-time performance trend
      const onTimeByDay = volumeByDay.map(d => d.onTimeRate);
      trends.onTimePerformance[airport] = this.calculateTrend(onTimeByDay);
    }

    return trends;
  }

  /**
   * Detect anomalies in flight patterns
   */
  async detectAnomalies(startDate, endDate, airports) {
    const anomalies = [];

    for (const airport of airports) {
      const flights = await this.db.getFlightData({
        airport,
        startDate,
        endDate
      });

      const dailyStats = this.groupByDay(flights);
      
      // Calculate baseline statistics
      const volumes = dailyStats.map(d => d.count);
      const delays = dailyStats.map(d => d.avgDelay);
      
      const volumeMean = this.mean(volumes);
      const volumeStdDev = this.standardDeviation(volumes);
      const delayMean = this.mean(delays);
      const delayStdDev = this.standardDeviation(delays);

      // Detect anomalies (values beyond 2 standard deviations)
      dailyStats.forEach((day, index) => {
        const volumeZScore = Math.abs((day.count - volumeMean) / volumeStdDev);
        const delayZScore = Math.abs((day.avgDelay - delayMean) / delayStdDev);

        if (volumeZScore > 2) {
          anomalies.push({
            airport,
            date: day.date,
            type: 'volume',
            value: day.count,
            expected: volumeMean,
            severity: volumeZScore > 3 ? 'high' : 'medium',
            zScore: volumeZScore
          });
        }

        if (delayZScore > 2) {
          anomalies.push({
            airport,
            date: day.date,
            type: 'delay',
            value: day.avgDelay,
            expected: delayMean,
            severity: delayZScore > 3 ? 'high' : 'medium',
            zScore: delayZScore
          });
        }
      });
    }

    return anomalies.sort((a, b) => b.zScore - a.zScore);
  }

  /**
   * Generate forecasts for future periods
   */
  async generateForecasts(startDate, endDate, airports, daysAhead = 7) {
    const forecasts = {};

    for (const airport of airports) {
      const flights = await this.db.getFlightData({
        airport,
        startDate,
        endDate
      });

      const dailyStats = this.groupByDay(flights);
      const volumes = dailyStats.map(d => d.count);
      const delays = dailyStats.map(d => d.avgDelay);

      // Simple moving average forecast
      const volumeForecast = this.forecastMovingAverage(volumes, daysAhead);
      const delayForecast = this.forecastMovingAverage(delays, daysAhead);

      // Trend-based forecast
      const volumeTrend = this.calculateTrend(volumes);
      const delayTrend = this.calculateTrend(delays);

      forecasts[airport] = {
        volume: {
          values: volumeForecast,
          trend: volumeTrend.direction,
          confidence: this.calculateForecastConfidence(volumes)
        },
        delays: {
          values: delayForecast,
          trend: delayTrend.direction,
          confidence: this.calculateForecastConfidence(delays)
        },
        period: {
          start: new Date(endDate),
          end: new Date(new Date(endDate).setDate(new Date(endDate).getDate() + daysAhead))
        }
      };
    }

    return forecasts;
  }

  /**
   * Analyze correlations between different metrics
   */
  async analyzeCorrelations(startDate, endDate, airports) {
    const correlations = {};

    for (const airport of airports) {
      const flights = await this.db.getFlightData({
        airport,
        startDate,
        endDate
      });

      const dailyStats = this.groupByDay(flights);
      
      // Extract metrics
      const volumes = dailyStats.map(d => d.count);
      const delays = dailyStats.map(d => d.avgDelay);
      const cancellations = dailyStats.map(d => d.cancellationRate);
      const onTime = dailyStats.map(d => d.onTimeRate);

      correlations[airport] = {
        volumeVsDelay: this.calculateCorrelation(volumes, delays),
        volumeVsCancellation: this.calculateCorrelation(volumes, cancellations),
        delayVsCancellation: this.calculateCorrelation(delays, cancellations),
        volumeVsOnTime: this.calculateCorrelation(volumes, onTime),
        delayVsOnTime: this.calculateCorrelation(delays, onTime)
      };
    }

    return correlations;
  }

  /**
   * Analyze seasonality patterns
   */
  async analyzeSeasonality(startDate, endDate, airports) {
    const seasonality = {};

    for (const airport of airports) {
      const flights = await this.db.getFlightData({
        airport,
        startDate,
        endDate
      });

      const byDayOfWeek = this.groupByDayOfWeek(flights);
      const byHourOfDay = this.groupByHourOfDay(flights);
      const byMonth = this.groupByMonth(flights);

      seasonality[airport] = {
        dayOfWeek: {
          pattern: byDayOfWeek,
          busiestDay: this.findMax(byDayOfWeek, 'count').day,
          quietestDay: this.findMin(byDayOfWeek, 'count').day
        },
        hourOfDay: {
          pattern: byHourOfDay,
          peakHour: this.findMax(byHourOfDay, 'count').hour,
          quietHour: this.findMin(byHourOfDay, 'count').hour
        },
        monthly: {
          pattern: byMonth,
          busiestMonth: this.findMax(byMonth, 'count').month,
          quietestMonth: this.findMin(byMonth, 'count').month
        }
      };
    }

    return seasonality;
  }

  /**
   * Analyze performance metrics
   */
  async analyzePerformance(startDate, endDate, airports) {
    const performance = {};

    for (const airport of airports) {
      const flights = await this.db.getFlightData({
        airport,
        startDate,
        endDate
      });

      const airlines = this.groupByAirline(flights);
      const routes = this.groupByRoute(flights);

      // Rank airlines by performance
      const airlineRanking = airlines
        .sort((a, b) => b.onTimeRate - a.onTimeRate)
        .slice(0, 10);

      // Rank routes by reliability
      const routeRanking = routes
        .sort((a, b) => b.reliability - a.reliability)
        .slice(0, 10);

      performance[airport] = {
        topAirlines: airlineRanking,
        topRoutes: routeRanking,
        overallMetrics: {
          avgDelay: this.mean(flights.map(f => f.delay || 0)),
          onTimeRate: (flights.filter(f => f.onTime).length / flights.length) * 100,
          cancellationRate: (flights.filter(f => f.cancelled).length / flights.length) * 100,
          totalFlights: flights.length
        }
      };
    }

    return performance;
  }

  // Helper functions

  groupByDay(flights) {
    const groups = {};
    
    flights.forEach(flight => {
      const date = flight.flight_date || flight.date;
      if (!groups[date]) {
        groups[date] = {
          date,
          flights: [],
          count: 0,
          totalDelay: 0,
          cancelled: 0,
          onTime: 0
        };
      }
      
      groups[date].flights.push(flight);
      groups[date].count++;
      
      if (flight.delay) groups[date].totalDelay += flight.delay;
      if (flight.cancelled) groups[date].cancelled++;
      if (flight.onTime) groups[date].onTime++;
    });

    return Object.values(groups).map(g => ({
      date: g.date,
      count: g.count,
      avgDelay: g.count > 0 ? g.totalDelay / g.count : 0,
      cancellationRate: (g.cancelled / g.count) * 100,
      onTimeRate: (g.onTime / g.count) * 100
    }));
  }

  groupByDayOfWeek(flights) {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const groups = days.map(day => ({ day, count: 0, avgDelay: 0 }));
    
    flights.forEach(flight => {
      const date = new Date(flight.flight_date || flight.date);
      const dayIndex = date.getDay();
      groups[dayIndex].count++;
      if (flight.delay) groups[dayIndex].avgDelay += flight.delay;
    });

    return groups.map(g => ({
      ...g,
      avgDelay: g.count > 0 ? g.avgDelay / g.count : 0
    }));
  }

  groupByHourOfDay(flights) {
    const hours = Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      count: 0,
      avgDelay: 0
    }));
    
    flights.forEach(flight => {
      if (flight.scheduled_time) {
        const hour = new Date(flight.scheduled_time).getHours();
        hours[hour].count++;
        if (flight.delay) hours[hour].avgDelay += flight.delay;
      }
    });

    return hours.map(h => ({
      ...h,
      avgDelay: h.count > 0 ? h.avgDelay / h.count : 0
    }));
  }

  groupByMonth(flights) {
    const months = {};
    
    flights.forEach(flight => {
      const date = new Date(flight.flight_date || flight.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!months[monthKey]) {
        months[monthKey] = { month: monthKey, count: 0, avgDelay: 0 };
      }
      
      months[monthKey].count++;
      if (flight.delay) months[monthKey].avgDelay += flight.delay;
    });

    return Object.values(months).map(m => ({
      ...m,
      avgDelay: m.count > 0 ? m.avgDelay / m.count : 0
    }));
  }

  groupByAirline(flights) {
    const airlines = {};
    
    flights.forEach(flight => {
      const airline = flight.airline || 'Unknown';
      if (!airlines[airline]) {
        airlines[airline] = {
          airline,
          count: 0,
          delays: 0,
          cancellations: 0,
          onTime: 0
        };
      }
      
      airlines[airline].count++;
      if (flight.delayed) airlines[airline].delays++;
      if (flight.cancelled) airlines[airline].cancellations++;
      if (flight.onTime) airlines[airline].onTime++;
    });

    return Object.values(airlines).map(a => ({
      airline: a.airline,
      flights: a.count,
      delayRate: (a.delays / a.count) * 100,
      cancellationRate: (a.cancellations / a.count) * 100,
      onTimeRate: (a.onTime / a.count) * 100
    }));
  }

  groupByRoute(flights) {
    const routes = {};
    
    flights.forEach(flight => {
      if (flight.origin && flight.destination) {
        const route = `${flight.origin}-${flight.destination}`;
        if (!routes[route]) {
          routes[route] = {
            route,
            origin: flight.origin,
            destination: flight.destination,
            count: 0,
            delays: 0,
            cancellations: 0
          };
        }
        
        routes[route].count++;
        if (flight.delayed) routes[route].delays++;
        if (flight.cancelled) routes[route].cancellations++;
      }
    });

    return Object.values(routes).map(r => ({
      ...r,
      reliability: ((r.count - r.delays - r.cancellations) / r.count) * 100
    }));
  }

  calculateTrend(values) {
    if (values.length < 2) {
      return { slope: 0, direction: 'stable', strength: 0 };
    }

    // Simple linear regression
    const n = values.length;
    const indices = Array.from({ length: n }, (_, i) => i);
    
    const sumX = indices.reduce((a, b) => a + b, 0);
    const sumY = values.reduce((a, b) => a + b, 0);
    const sumXY = indices.reduce((sum, x, i) => sum + x * values[i], 0);
    const sumX2 = indices.reduce((sum, x) => sum + x * x, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    // Calculate R-squared
    const yMean = sumY / n;
    const ssTotal = values.reduce((sum, y) => sum + Math.pow(y - yMean, 2), 0);
    const ssResidual = values.reduce((sum, y, i) => {
      const yPred = slope * i + intercept;
      return sum + Math.pow(y - yPred, 2);
    }, 0);
    const rSquared = 1 - (ssResidual / ssTotal);
    
    return {
      slope,
      direction: slope > 0.1 ? 'increasing' : slope < -0.1 ? 'decreasing' : 'stable',
      strength: Math.abs(rSquared)
    };
  }

  forecastMovingAverage(values, periods, windowSize = 7) {
    if (values.length < windowSize) {
      return Array(periods).fill(this.mean(values));
    }

    const forecast = [];
    const recentValues = values.slice(-windowSize);
    
    for (let i = 0; i < periods; i++) {
      const avg = this.mean(recentValues);
      forecast.push(avg);
      recentValues.shift();
      recentValues.push(avg);
    }
    
    return forecast;
  }

  calculateForecastConfidence(values) {
    const cv = this.coefficientOfVariation(values);
    if (cv < 0.1) return 'high';
    if (cv < 0.3) return 'medium';
    return 'low';
  }

  calculateCorrelation(x, y) {
    if (x.length !== y.length || x.length === 0) return 0;
    
    const n = x.length;
    const meanX = this.mean(x);
    const meanY = this.mean(y);
    
    const numerator = x.reduce((sum, xi, i) => 
      sum + (xi - meanX) * (y[i] - meanY), 0
    );
    
    const denomX = Math.sqrt(x.reduce((sum, xi) => 
      sum + Math.pow(xi - meanX, 2), 0)
    );
    
    const denomY = Math.sqrt(y.reduce((sum, yi) => 
      sum + Math.pow(yi - meanY, 2), 0)
    );
    
    if (denomX === 0 || denomY === 0) return 0;
    
    return numerator / (denomX * denomY);
  }

  mean(values) {
    return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
  }

  standardDeviation(values) {
    const avg = this.mean(values);
    const squareDiffs = values.map(value => Math.pow(value - avg, 2));
    return Math.sqrt(this.mean(squareDiffs));
  }

  coefficientOfVariation(values) {
    const avg = this.mean(values);
    if (avg === 0) return 0;
    return this.standardDeviation(values) / avg;
  }

  findMax(array, property) {
    return array.reduce((max, item) => 
      item[property] > max[property] ? item : max, array[0]
    );
  }

  findMin(array, property) {
    return array.reduce((min, item) => 
      item[property] < min[property] ? item : min, array[0]
    );
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    this.cache.clear();
    this.logger.info('Advanced Analytics Engine cleaned up');
  }
}

module.exports = AdvancedAnalyticsEngine;