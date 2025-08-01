/**
 * Prediction Service
 * Manages delay predictions and model training
 */

const DelayPredictionModel = require('../models/DelayPredictionModel');
const { apiLogger } = require('../../lib/logging');
const { getDatabase } = require('../../lib/database');
const schedule = require('node-schedule');

class PredictionService {
  constructor() {
    this.logger = apiLogger.child('PredictionService');
    this.model = new DelayPredictionModel();
    this.isModelTrained = false;
    this.lastTrainingDate = null;
    this.trainingJob = null;
  }

  /**
   * Initialize the prediction service
   */
  async initialize() {
    this.logger.info('Initializing prediction service');
    
    try {
      // Train model with recent data
      await this.trainModel();
      
      // Schedule daily retraining at 2 AM
      this.trainingJob = schedule.scheduleJob('0 2 * * *', async () => {
        await this.trainModel();
      });
      
      this.logger.info('Prediction service initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize prediction service', error);
      throw error;
    }
  }

  /**
   * Train the prediction model
   */
  async trainModel() {
    this.logger.info('Starting model training');
    
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 90); // Use last 90 days
      
      const result = await this.model.train(startDate, endDate);
      
      this.isModelTrained = true;
      this.lastTrainingDate = new Date();
      
      // Store model metrics
      await this.storeModelMetrics(result.metrics);
      
      this.logger.info('Model training completed', result.metrics);
      
      return result;
    } catch (error) {
      this.logger.error('Model training failed', error);
      throw error;
    }
  }

  /**
   * Get delay prediction for a flight
   */
  async predictDelay(flightData) {
    if (!this.isModelTrained) {
      throw new Error('Model not trained yet');
    }
    
    try {
      const prediction = await this.model.predict(flightData);
      
      // Log prediction for monitoring
      this.logger.debug('Delay prediction', {
        flightNumber: flightData.flightNumber,
        prediction
      });
      
      // Store prediction for future analysis
      await this.storePrediction(flightData, prediction);
      
      return prediction;
    } catch (error) {
      this.logger.error('Prediction failed', error);
      throw error;
    }
  }

  /**
   * Get batch predictions
   */
  async batchPredict(flights) {
    if (!this.isModelTrained) {
      throw new Error('Model not trained yet');
    }
    
    try {
      const predictions = await this.model.batchPredict(flights);
      
      // Store batch predictions
      await this.storeBatchPredictions(predictions);
      
      return predictions;
    } catch (error) {
      this.logger.error('Batch prediction failed', error);
      throw error;
    }
  }

  /**
   * Get predictions for upcoming flights
   */
  async getUpcomingFlightPredictions(airport, hours = 24) {
    try {
      const db = await getDatabase();
      
      const startTime = new Date();
      const endTime = new Date();
      endTime.setHours(endTime.getHours() + hours);
      
      // Get upcoming flights
      const flights = await db.getFlightData({
        filters: {
          airport,
          startDate: startTime,
          endDate: endTime,
          status: 'scheduled'
        }
      });
      
      // Get predictions
      const predictions = await this.batchPredict(flights);
      
      // Sort by risk level
      predictions.sort((a, b) => {
        const riskOrder = { HIGH: 3, MEDIUM: 2, LOW: 1 };
        return (riskOrder[b.prediction?.riskLevel] || 0) - (riskOrder[a.prediction?.riskLevel] || 0);
      });
      
      return predictions;
    } catch (error) {
      this.logger.error('Failed to get upcoming flight predictions', error);
      throw error;
    }
  }

  /**
   * Get real-time prediction for a flight
   */
  async getRealTimePrediction(flightId) {
    try {
      const db = await getDatabase();
      
      // Get current flight data
      const flights = await db.getFlightData({
        filters: { id: flightId }
      });
      
      if (!flights.length) {
        throw new Error('Flight not found');
      }
      
      const flight = flights[0];
      
      // Get real-time factors
      const realTimeFactors = await this.getRealTimeFactors(flight);
      
      // Enhance flight data with real-time factors
      const enhancedFlight = {
        ...flight,
        ...realTimeFactors
      };
      
      // Get prediction
      const prediction = await this.predictDelay(enhancedFlight);
      
      return {
        flight: {
          id: flight.id,
          flightNumber: flight.flightNumber,
          scheduledTime: flight.scheduledTime
        },
        prediction,
        realTimeFactors,
        timestamp: new Date()
      };
    } catch (error) {
      this.logger.error('Real-time prediction failed', error);
      throw error;
    }
  }

  /**
   * Get real-time factors
   */
  async getRealTimeFactors(flight) {
    const db = await getDatabase();
    const factors = {};
    
    // Current delays at airport
    const currentDelays = await db.getFlightData({
      filters: {
        airport: flight.origin,
        status: 'delayed',
        date: new Date()
      }
    });
    
    factors.currentAirportDelays = currentDelays.length;
    
    // Gate availability
    factors.gateAvailability = await this.checkGateAvailability(flight);
    
    // Weather conditions (simplified)
    factors.currentWeather = await this.getCurrentWeather(flight.origin);
    
    // Air traffic congestion
    factors.airTrafficCongestion = await this.getAirTrafficCongestion(flight);
    
    return factors;
  }

  /**
   * Analyze prediction accuracy
   */
  async analyzePredictionAccuracy(startDate, endDate) {
    try {
      const db = await getDatabase();
      
      // Get stored predictions
      const predictions = await this.getStoredPredictions(startDate, endDate);
      
      // Get actual flight data
      const actualData = await db.getFlightData({
        filters: {
          startDate,
          endDate
        }
      });
      
      // Create lookup map for actual delays
      const actualDelaysMap = new Map();
      actualData.forEach(flight => {
        actualDelaysMap.set(flight.id, {
          actualDelay: flight.delayMinutes || 0,
          wasDelayed: (flight.delayMinutes || 0) > 15
        });
      });
      
      // Calculate accuracy metrics
      let correctPredictions = 0;
      let totalPredictions = 0;
      let delayMinuteErrors = [];
      
      predictions.forEach(pred => {
        const actual = actualDelaysMap.get(pred.flightId);
        if (actual) {
          totalPredictions++;
          
          // Check if delay prediction was correct
          const predictedDelayed = pred.delayProbability > 0.5;
          if (predictedDelayed === actual.wasDelayed) {
            correctPredictions++;
          }
          
          // Calculate minute error
          const minuteError = Math.abs(pred.expectedDelayMinutes - actual.actualDelay);
          delayMinuteErrors.push(minuteError);
        }
      });
      
      const accuracy = correctPredictions / totalPredictions || 0;
      const avgMinuteError = delayMinuteErrors.reduce((a, b) => a + b, 0) / delayMinuteErrors.length || 0;
      
      return {
        accuracy,
        correctPredictions,
        totalPredictions,
        avgMinuteError,
        medianMinuteError: this.calculateMedian(delayMinuteErrors)
      };
    } catch (error) {
      this.logger.error('Failed to analyze prediction accuracy', error);
      throw error;
    }
  }

  /**
   * Get model performance metrics
   */
  async getModelMetrics() {
    return {
      isModelTrained: this.isModelTrained,
      lastTrainingDate: this.lastTrainingDate,
      modelVersion: '1.0',
      features: this.model.features,
      performance: await this.getStoredModelMetrics()
    };
  }

  // Helper methods

  async storeModelMetrics(metrics) {
    // In production, store in database
    this.logger.info('Storing model metrics', metrics);
  }

  async storePrediction(flightData, prediction) {
    // In production, store in database
    this.logger.debug('Storing prediction', {
      flightId: flightData.id,
      prediction
    });
  }

  async storeBatchPredictions(predictions) {
    // In production, store in database
    this.logger.debug(`Storing ${predictions.length} predictions`);
  }

  async getStoredPredictions(startDate, endDate) {
    // In production, fetch from database
    return [];
  }

  async getStoredModelMetrics() {
    // In production, fetch from database
    return {
      accuracy: 0.85,
      precision: 0.82,
      recall: 0.78,
      f1Score: 0.80
    };
  }

  async checkGateAvailability(flight) {
    // Simplified gate availability check
    return Math.random() > 0.2 ? 'available' : 'congested';
  }

  async getCurrentWeather(airport) {
    // Simplified weather check
    const conditions = ['clear', 'cloudy', 'rain', 'snow', 'fog'];
    return conditions[Math.floor(Math.random() * conditions.length)];
  }

  async getAirTrafficCongestion(flight) {
    // Simplified air traffic check
    const hour = new Date(flight.scheduledTime).getHours();
    if (hour >= 7 && hour <= 9 || hour >= 17 && hour <= 19) {
      return 'high';
    } else if (hour >= 10 && hour <= 16) {
      return 'moderate';
    } else {
      return 'low';
    }
  }

  calculateMedian(values) {
    if (values.length === 0) return 0;
    
    values.sort((a, b) => a - b);
    const middle = Math.floor(values.length / 2);
    
    if (values.length % 2 === 0) {
      return (values[middle - 1] + values[middle]) / 2;
    } else {
      return values[middle];
    }
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    if (this.trainingJob) {
      this.trainingJob.cancel();
    }
  }
}

module.exports = PredictionService;