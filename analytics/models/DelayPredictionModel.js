/**
 * Delay Prediction Model
 * Uses historical flight data to predict delays
 */

const { apiLogger } = require('../../lib/logging');
const { getDatabase } = require('../../lib/database');

class DelayPredictionModel {
  constructor() {
    this.logger = apiLogger.child('DelayPrediction');
    this.modelWeights = null;
    this.features = [
      'hour_of_day',
      'day_of_week',
      'month',
      'airline_delay_rate',
      'airport_delay_rate',
      'route_delay_rate',
      'weather_impact',
      'previous_delay',
      'aircraft_turnaround_time',
      'terminal_congestion',
      'seasonal_factor'
    ];
  }

  /**
   * Train the model using historical data
   */
  async train(startDate, endDate) {
    this.logger.info('Training delay prediction model', { startDate, endDate });
    
    try {
      const db = await getDatabase();
      
      // Fetch historical flight data
      const flights = await db.getFlightData({
        filters: {
          startDate,
          endDate
        }
      });
      
      this.logger.info(`Training with ${flights.length} flights`);
      
      // Extract features and labels
      const trainingData = await this.prepareTrainingData(flights);
      
      // Train using gradient boosting approach
      this.modelWeights = await this.trainGradientBoosting(trainingData);
      
      // Evaluate model performance
      const metrics = await this.evaluateModel(trainingData);
      
      this.logger.info('Model training completed', metrics);
      
      return {
        success: true,
        metrics,
        featuresUsed: this.features,
        trainingSize: trainingData.length
      };
    } catch (error) {
      this.logger.error('Model training failed', error);
      throw error;
    }
  }

  /**
   * Predict delay for a flight
   */
  async predict(flightData) {
    if (!this.modelWeights) {
      throw new Error('Model not trained');
    }
    
    try {
      // Extract features
      const features = await this.extractFeatures(flightData);
      
      // Calculate prediction
      const delayProbability = this.calculatePrediction(features);
      const expectedDelayMinutes = this.calculateExpectedDelay(features, delayProbability);
      
      // Determine risk level
      const riskLevel = this.calculateRiskLevel(delayProbability, expectedDelayMinutes);
      
      return {
        delayProbability,
        expectedDelayMinutes,
        riskLevel,
        confidence: this.calculateConfidence(features),
        factors: this.getTopFactors(features)
      };
    } catch (error) {
      this.logger.error('Prediction failed', error);
      throw error;
    }
  }

  /**
   * Batch predict delays for multiple flights
   */
  async batchPredict(flights) {
    const predictions = [];
    
    for (const flight of flights) {
      try {
        const prediction = await this.predict(flight);
        predictions.push({
          flightId: flight.id,
          flightNumber: flight.flightNumber,
          prediction
        });
      } catch (error) {
        this.logger.error('Batch prediction failed for flight', { 
          flightNumber: flight.flightNumber, 
          error: error.message 
        });
        
        predictions.push({
          flightId: flight.id,
          flightNumber: flight.flightNumber,
          error: error.message
        });
      }
    }
    
    return predictions;
  }

  /**
   * Prepare training data
   */
  async prepareTrainingData(flights) {
    const db = await getDatabase();
    const trainingData = [];
    
    // Get historical statistics for context
    const airlineStats = await this.getAirlineStatistics(db);
    const airportStats = await this.getAirportStatistics(db);
    const routeStats = await this.getRouteStatistics(db);
    
    for (const flight of flights) {
      const features = {
        // Time features
        hour_of_day: new Date(flight.scheduledTime).getHours(),
        day_of_week: new Date(flight.scheduledTime).getDay(),
        month: new Date(flight.scheduledTime).getMonth() + 1,
        
        // Historical performance
        airline_delay_rate: airlineStats[flight.airline]?.delayRate || 0,
        airport_delay_rate: airportStats[flight.origin]?.delayRate || 0,
        route_delay_rate: routeStats[`${flight.origin}-${flight.destination}`]?.delayRate || 0,
        
        // Weather impact (simplified - in production, use real weather data)
        weather_impact: this.estimateWeatherImpact(flight),
        
        // Previous flight delay
        previous_delay: await this.getPreviousFlightDelay(db, flight),
        
        // Aircraft turnaround time
        aircraft_turnaround_time: await this.getAircraftTurnaroundTime(db, flight),
        
        // Terminal congestion
        terminal_congestion: await this.getTerminalCongestion(db, flight),
        
        // Seasonal factor
        seasonal_factor: this.getSeasonalFactor(flight)
      };
      
      // Label (actual delay)
      const label = flight.delayMinutes || 0;
      
      trainingData.push({
        features,
        label,
        isDelayed: label > 15 // Binary classification threshold
      });
    }
    
    return trainingData;
  }

  /**
   * Extract features for prediction
   */
  async extractFeatures(flightData) {
    const db = await getDatabase();
    
    return {
      hour_of_day: new Date(flightData.scheduledTime).getHours(),
      day_of_week: new Date(flightData.scheduledTime).getDay(),
      month: new Date(flightData.scheduledTime).getMonth() + 1,
      airline_delay_rate: await this.getAirlineDelayRate(db, flightData.airline),
      airport_delay_rate: await this.getAirportDelayRate(db, flightData.origin),
      route_delay_rate: await this.getRouteDelayRate(db, flightData.origin, flightData.destination),
      weather_impact: await this.getCurrentWeatherImpact(flightData),
      previous_delay: await this.getPreviousFlightDelay(db, flightData),
      aircraft_turnaround_time: await this.getAircraftTurnaroundTime(db, flightData),
      terminal_congestion: await this.getTerminalCongestion(db, flightData),
      seasonal_factor: this.getSeasonalFactor(flightData)
    };
  }

  /**
   * Train using gradient boosting
   */
  async trainGradientBoosting(trainingData) {
    // Simplified gradient boosting implementation
    const iterations = 100;
    const learningRate = 0.1;
    const weights = {};
    
    // Initialize weights
    this.features.forEach(feature => {
      weights[feature] = 0;
    });
    
    // Training iterations
    for (let i = 0; i < iterations; i++) {
      let totalError = 0;
      
      for (const data of trainingData) {
        const prediction = this.calculatePredictionWithWeights(data.features, weights);
        const error = data.isDelayed ? 1 - prediction : prediction;
        
        // Update weights based on gradient
        for (const feature of this.features) {
          const gradient = error * data.features[feature];
          weights[feature] += learningRate * gradient;
        }
        
        totalError += Math.abs(error);
      }
      
      // Log progress
      if (i % 10 === 0) {
        this.logger.debug(`Training iteration ${i}, error: ${totalError / trainingData.length}`);
      }
    }
    
    return weights;
  }

  /**
   * Calculate prediction with weights
   */
  calculatePredictionWithWeights(features, weights) {
    let sum = 0;
    
    for (const feature of this.features) {
      sum += features[feature] * (weights[feature] || 0);
    }
    
    // Sigmoid activation
    return 1 / (1 + Math.exp(-sum));
  }

  /**
   * Calculate prediction
   */
  calculatePrediction(features) {
    return this.calculatePredictionWithWeights(features, this.modelWeights);
  }

  /**
   * Calculate expected delay in minutes
   */
  calculateExpectedDelay(features, probability) {
    // Base delay calculation
    let expectedDelay = probability * 30; // Base 30 minutes for delayed flights
    
    // Adjust based on specific factors
    if (features.weather_impact > 0.5) {
      expectedDelay *= 1.5;
    }
    
    if (features.terminal_congestion > 0.7) {
      expectedDelay *= 1.3;
    }
    
    if (features.previous_delay > 30) {
      expectedDelay += features.previous_delay * 0.3;
    }
    
    // Hour of day adjustment
    if (features.hour_of_day >= 15 && features.hour_of_day <= 20) {
      expectedDelay *= 1.2; // Peak hours
    }
    
    return Math.round(expectedDelay);
  }

  /**
   * Calculate risk level
   */
  calculateRiskLevel(probability, expectedDelay) {
    if (probability > 0.7 || expectedDelay > 60) {
      return 'HIGH';
    } else if (probability > 0.4 || expectedDelay > 30) {
      return 'MEDIUM';
    } else {
      return 'LOW';
    }
  }

  /**
   * Calculate prediction confidence
   */
  calculateConfidence(features) {
    // Confidence based on data availability and feature strength
    let confidence = 0.5;
    
    // Increase confidence for strong signals
    if (features.airline_delay_rate > 0.3) confidence += 0.1;
    if (features.weather_impact > 0.5) confidence += 0.15;
    if (features.previous_delay > 0) confidence += 0.1;
    if (features.terminal_congestion > 0.5) confidence += 0.1;
    
    // Cap at 0.95
    return Math.min(confidence, 0.95);
  }

  /**
   * Get top contributing factors
   */
  getTopFactors(features) {
    const factors = [];
    
    // Calculate feature importance
    for (const feature of this.features) {
      const importance = Math.abs(features[feature] * this.modelWeights[feature]);
      factors.push({
        feature,
        value: features[feature],
        importance,
        description: this.getFeatureDescription(feature)
      });
    }
    
    // Sort by importance and return top 5
    return factors
      .sort((a, b) => b.importance - a.importance)
      .slice(0, 5)
      .map(f => ({
        factor: f.description,
        impact: f.importance > 0.3 ? 'High' : f.importance > 0.1 ? 'Medium' : 'Low',
        value: f.value
      }));
  }

  /**
   * Get feature description
   */
  getFeatureDescription(feature) {
    const descriptions = {
      'hour_of_day': 'Time of Day',
      'day_of_week': 'Day of Week',
      'month': 'Month',
      'airline_delay_rate': 'Airline Performance',
      'airport_delay_rate': 'Airport Congestion',
      'route_delay_rate': 'Route History',
      'weather_impact': 'Weather Conditions',
      'previous_delay': 'Previous Flight Delay',
      'aircraft_turnaround_time': 'Aircraft Turnaround',
      'terminal_congestion': 'Terminal Congestion',
      'seasonal_factor': 'Seasonal Patterns'
    };
    
    return descriptions[feature] || feature;
  }

  /**
   * Evaluate model performance
   */
  async evaluateModel(trainingData) {
    let truePositives = 0;
    let falsePositives = 0;
    let trueNegatives = 0;
    let falseNegatives = 0;
    
    for (const data of trainingData) {
      const prediction = this.calculatePrediction(data.features);
      const predictedDelayed = prediction > 0.5;
      const actualDelayed = data.isDelayed;
      
      if (predictedDelayed && actualDelayed) truePositives++;
      else if (predictedDelayed && !actualDelayed) falsePositives++;
      else if (!predictedDelayed && !actualDelayed) trueNegatives++;
      else if (!predictedDelayed && actualDelayed) falseNegatives++;
    }
    
    const accuracy = (truePositives + trueNegatives) / trainingData.length;
    const precision = truePositives / (truePositives + falsePositives) || 0;
    const recall = truePositives / (truePositives + falseNegatives) || 0;
    const f1Score = 2 * (precision * recall) / (precision + recall) || 0;
    
    return {
      accuracy,
      precision,
      recall,
      f1Score,
      confusionMatrix: {
        truePositives,
        falsePositives,
        trueNegatives,
        falseNegatives
      }
    };
  }

  // Helper methods for feature extraction
  
  async getAirlineStatistics(db) {
    const stats = {};
    const airlines = await db.getUniqueAirlines();
    
    for (const airline of airlines) {
      const airlineFlights = await db.getFlightData({
        filters: { airline }
      });
      
      const delayedFlights = airlineFlights.filter(f => f.delayMinutes > 15).length;
      stats[airline] = {
        delayRate: delayedFlights / airlineFlights.length || 0
      };
    }
    
    return stats;
  }

  async getAirportStatistics(db) {
    const stats = {};
    const airports = ['SFO', 'YYZ', 'YVR'];
    
    for (const airport of airports) {
      const airportFlights = await db.getFlightData({
        filters: { airport }
      });
      
      const delayedFlights = airportFlights.filter(f => f.delayMinutes > 15).length;
      stats[airport] = {
        delayRate: delayedFlights / airportFlights.length || 0
      };
    }
    
    return stats;
  }

  async getRouteStatistics(db) {
    const stats = {};
    const routes = await db.getUniqueRoutes();
    
    for (const route of routes) {
      const routeFlights = await db.getFlightData({
        filters: { 
          origin: route.origin,
          destination: route.destination
        }
      });
      
      const delayedFlights = routeFlights.filter(f => f.delayMinutes > 15).length;
      stats[`${route.origin}-${route.destination}`] = {
        delayRate: delayedFlights / routeFlights.length || 0
      };
    }
    
    return stats;
  }

  async getAirlineDelayRate(db, airline) {
    const flights = await db.getFlightData({
      filters: { airline },
      limit: 1000
    });
    
    const delayedFlights = flights.filter(f => f.delayMinutes > 15).length;
    return delayedFlights / flights.length || 0;
  }

  async getAirportDelayRate(db, airport) {
    const flights = await db.getFlightData({
      filters: { airport },
      limit: 1000
    });
    
    const delayedFlights = flights.filter(f => f.delayMinutes > 15).length;
    return delayedFlights / flights.length || 0;
  }

  async getRouteDelayRate(db, origin, destination) {
    const flights = await db.getFlightData({
      filters: { origin, destination },
      limit: 100
    });
    
    const delayedFlights = flights.filter(f => f.delayMinutes > 15).length;
    return delayedFlights / flights.length || 0;
  }

  estimateWeatherImpact(flight) {
    // Simplified weather impact estimation
    const month = new Date(flight.scheduledTime).getMonth() + 1;
    const hour = new Date(flight.scheduledTime).getHours();
    
    // Winter months have higher impact
    let impact = 0;
    if (month >= 11 || month <= 2) impact += 0.3;
    
    // Night and early morning flights
    if (hour < 6 || hour > 20) impact += 0.2;
    
    return Math.min(impact, 1);
  }

  async getCurrentWeatherImpact(flightData) {
    // In production, fetch real weather data
    return this.estimateWeatherImpact(flightData);
  }

  async getPreviousFlightDelay(db, flight) {
    // Get previous flight with same aircraft
    if (!flight.aircraft) return 0;
    
    const previousFlights = await db.getFlightData({
      filters: {
        aircraft: flight.aircraft,
        endDate: flight.scheduledTime
      },
      limit: 2
    });
    
    if (previousFlights.length > 1) {
      return previousFlights[0].delayMinutes || 0;
    }
    
    return 0;
  }

  async getAircraftTurnaroundTime(db, flight) {
    // Simplified turnaround time calculation
    return 45; // Default 45 minutes
  }

  async getTerminalCongestion(db, flight) {
    // Calculate terminal congestion
    const hour = new Date(flight.scheduledTime).getHours();
    const hourlyFlights = await db.getFlightData({
      filters: {
        airport: flight.origin,
        hour
      }
    });
    
    // Normalize to 0-1 scale
    return Math.min(hourlyFlights.length / 50, 1);
  }

  getSeasonalFactor(flight) {
    const month = new Date(flight.scheduledTime).getMonth() + 1;
    const dayOfWeek = new Date(flight.scheduledTime).getDay();
    
    // Holiday season
    if (month === 12 || month === 7) return 1.3;
    
    // Weekend
    if (dayOfWeek === 0 || dayOfWeek === 6) return 1.1;
    
    return 1.0;
  }
}

module.exports = DelayPredictionModel;