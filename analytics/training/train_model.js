#!/usr/bin/env node

/**
 * Train delay prediction model
 * This script trains the delay prediction model using historical flight data
 */

const PredictionService = require('../services/PredictionService');
const { apiLogger } = require('../../lib/logging');

const logger = apiLogger.child('ModelTraining');

async function trainModel() {
  logger.info('Starting model training process');
  
  const predictionService = new PredictionService();
  
  try {
    // Initialize service
    await predictionService.initialize();
    
    // Train model
    logger.info('Training model with last 90 days of data');
    const result = await predictionService.trainModel();
    
    logger.info('Model training completed successfully');
    console.log('\nModel Training Results:');
    console.log('========================');
    console.log(`Accuracy: ${(result.metrics.accuracy * 100).toFixed(2)}%`);
    console.log(`Precision: ${(result.metrics.precision * 100).toFixed(2)}%`);
    console.log(`Recall: ${(result.metrics.recall * 100).toFixed(2)}%`);
    console.log(`F1 Score: ${result.metrics.f1Score.toFixed(3)}`);
    console.log(`\nTraining set size: ${result.trainingSize} flights`);
    console.log(`Features used: ${result.featuresUsed.length}`);
    
    console.log('\nConfusion Matrix:');
    console.log(`True Positives: ${result.metrics.confusionMatrix.truePositives}`);
    console.log(`False Positives: ${result.metrics.confusionMatrix.falsePositives}`);
    console.log(`True Negatives: ${result.metrics.confusionMatrix.trueNegatives}`);
    console.log(`False Negatives: ${result.metrics.confusionMatrix.falseNegatives}`);
    
    // Test with sample predictions
    console.log('\n\nSample Predictions:');
    console.log('==================');
    
    const sampleFlights = [
      {
        id: 'test1',
        flightNumber: 'UA123',
        airline: 'UA',
        origin: 'SFO',
        destination: 'LAX',
        scheduledTime: new Date('2025-08-02T08:00:00'),
        aircraft: 'B737'
      },
      {
        id: 'test2',
        flightNumber: 'AC456',
        airline: 'AC',
        origin: 'YYZ',
        destination: 'YVR',
        scheduledTime: new Date('2025-08-02T17:30:00'),
        aircraft: 'A320'
      },
      {
        id: 'test3',
        flightNumber: 'WS789',
        airline: 'WS',
        origin: 'YVR',
        destination: 'YYZ',
        scheduledTime: new Date('2025-08-02T06:00:00'),
        aircraft: 'B737'
      }
    ];
    
    for (const flight of sampleFlights) {
      const prediction = await predictionService.predictDelay(flight);
      
      console.log(`\nFlight ${flight.flightNumber} (${flight.origin} → ${flight.destination}):`);
      console.log(`  Scheduled: ${flight.scheduledTime.toLocaleString()}`);
      console.log(`  Delay Probability: ${(prediction.delayProbability * 100).toFixed(1)}%`);
      console.log(`  Expected Delay: ${prediction.expectedDelayMinutes} minutes`);
      console.log(`  Risk Level: ${prediction.riskLevel}`);
      console.log(`  Confidence: ${(prediction.confidence * 100).toFixed(1)}%`);
      
      console.log('  Top Contributing Factors:');
      prediction.factors.forEach(factor => {
        console.log(`    - ${factor.factor}: ${factor.impact} impact`);
      });
    }
    
    // Cleanup
    await predictionService.cleanup();
    
    process.exit(0);
  } catch (error) {
    logger.error('Model training failed', error);
    console.error('\nError:', error.message);
    process.exit(1);
  }
}

// Run training
trainModel();