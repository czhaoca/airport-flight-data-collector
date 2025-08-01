# Delay Prediction Feature

The Airport Flight Data Collector includes an advanced machine learning-based delay prediction system that analyzes historical flight data to predict potential delays.

## Overview

The delay prediction model uses gradient boosting to analyze multiple factors and provide accurate delay predictions for flights. It considers:

- Historical airline performance
- Airport congestion patterns
- Route-specific delay trends
- Time of day and day of week patterns
- Weather impact estimates
- Aircraft turnaround times
- Terminal congestion
- Seasonal factors

## Features

### Real-time Predictions
- Get delay predictions for any flight
- Batch predictions for multiple flights
- Real-time updates as conditions change

### Risk Assessment
- Three-tier risk levels: LOW, MEDIUM, HIGH
- Probability of delay (0-100%)
- Expected delay duration in minutes
- Confidence score for predictions

### Contributing Factors
- Top 5 factors contributing to delay risk
- Impact level for each factor
- Actionable insights for operations

## API Endpoints

### REST API

#### Single Flight Prediction
```http
POST /api/v2/predictions/delay
Content-Type: application/json
Authorization: Bearer YOUR_TOKEN

{
  "flightNumber": "UA123",
  "airline": "UA",
  "origin": "SFO",
  "destination": "LAX",
  "scheduledTime": "2025-08-02T08:00:00Z",
  "aircraft": "B737"
}
```

Response:
```json
{
  "success": true,
  "prediction": {
    "delayProbability": 0.68,
    "expectedDelayMinutes": 45,
    "riskLevel": "HIGH",
    "confidence": 0.82,
    "factors": [
      {
        "factor": "Terminal Congestion",
        "impact": "High",
        "value": 0.85
      },
      {
        "factor": "Airline Performance",
        "impact": "Medium",
        "value": 0.42
      }
    ]
  }
}
```

#### Batch Predictions
```http
POST /api/v2/predictions/batch
Content-Type: application/json
Authorization: Bearer YOUR_TOKEN

{
  "flights": [
    {
      "flightNumber": "UA123",
      "airline": "UA",
      "origin": "SFO",
      "destination": "LAX",
      "scheduledTime": "2025-08-02T08:00:00Z"
    },
    {
      "flightNumber": "AC456",
      "airline": "AC",
      "origin": "YYZ",
      "destination": "YVR",
      "scheduledTime": "2025-08-02T17:30:00Z"
    }
  ]
}
```

#### Upcoming Flight Predictions
```http
GET /api/v2/predictions/upcoming?airport=SFO&hours=24
```

#### High-Risk Flights
```http
GET /api/v2/predictions/high-risk?airport=SFO&hours=12
```

#### Real-time Prediction
```http
GET /api/v2/predictions/realtime/FLIGHT_ID
```

#### Model Metrics
```http
GET /api/v2/predictions/metrics
Authorization: Bearer YOUR_TOKEN
```

### GraphQL API

#### Single Flight Prediction
```graphql
query PredictDelay($flightData: FlightDataInput!) {
  delayPrediction(flightData: $flightData) {
    delayProbability
    expectedDelayMinutes
    riskLevel
    confidence
    factors {
      factor
      impact
      value
    }
  }
}
```

Variables:
```json
{
  "flightData": {
    "flightNumber": "UA123",
    "airline": "UA",
    "origin": "SFO",
    "destination": "LAX",
    "scheduledTime": "2025-08-02T08:00:00Z",
    "aircraft": "B737"
  }
}
```

#### Upcoming Predictions
```graphql
query UpcomingFlights($airport: String!, $hours: Int) {
  upcomingPredictions(airport: $airport, hours: $hours) {
    airport
    timeRange
    totalFlights
    predictions {
      flightId
      flightNumber
      prediction {
        delayProbability
        expectedDelayMinutes
        riskLevel
      }
    }
  }
}
```

#### High-Risk Flights
```graphql
query HighRiskFlights($airport: String!, $hours: Int) {
  highRiskFlights(airport: $airport, hours: $hours) {
    flightId
    flightNumber
    prediction {
      delayProbability
      expectedDelayMinutes
      riskLevel
      confidence
      factors {
        factor
        impact
      }
    }
  }
}
```

#### Prediction Metrics
```graphql
query ModelMetrics {
  predictionMetrics {
    isModelTrained
    lastTrainingDate
    modelVersion
    features
    performance {
      accuracy
      precision
      recall
      f1Score
    }
  }
}
```

### Real-time Subscriptions

```graphql
subscription DelayPredictionUpdates($airports: [String!], $minProbability: Float) {
  delayPredictionUpdate(airports: $airports, minProbability: $minProbability) {
    flight {
      flightNumber
      airline {
        name
      }
      origin {
        code
      }
      destination {
        code
      }
    }
    prediction {
      delayProbability
      expectedDelayMinutes
      riskLevel
    }
    previousPrediction {
      delayProbability
      expectedDelayMinutes
    }
    timestamp
  }
}
```

## Model Features

The prediction model analyzes 11 key features:

1. **Hour of Day**: Peak hours typically see more delays
2. **Day of Week**: Weekend vs weekday patterns
3. **Month**: Seasonal variations
4. **Airline Delay Rate**: Historical performance of the airline
5. **Airport Delay Rate**: Congestion patterns at the origin airport
6. **Route Delay Rate**: Historical performance of the specific route
7. **Weather Impact**: Estimated weather conditions effect
8. **Previous Delay**: Delays from previous flight with same aircraft
9. **Aircraft Turnaround Time**: Time available for preparation
10. **Terminal Congestion**: Current terminal occupancy
11. **Seasonal Factor**: Holiday and peak travel periods

## Model Training

The model is automatically retrained daily at 2 AM using the last 90 days of flight data. Manual retraining can be triggered by administrators:

```http
POST /api/v2/predictions/train
Authorization: Bearer ADMIN_TOKEN
```

## Performance Metrics

Current model performance (example):
- **Accuracy**: 85%
- **Precision**: 82%
- **Recall**: 78%
- **F1 Score**: 0.80

## Use Cases

### 1. Passenger Notifications
Alert passengers about potential delays before they leave for the airport.

### 2. Gate Management
Optimize gate assignments based on delay predictions.

### 3. Crew Scheduling
Adjust crew schedules proactively based on predicted delays.

### 4. Ground Operations
Prepare ground services for delayed flights in advance.

### 5. Customer Service
Staff customer service appropriately for high-delay periods.

## Integration Examples

### Python
```python
from airport_flight_data import AirportFlightDataClient

client = AirportFlightDataClient(api_key="YOUR_KEY")

# Single prediction
prediction = client.predictions.delay({
    "flightNumber": "UA123",
    "airline": "UA",
    "origin": "SFO",
    "destination": "LAX",
    "scheduledTime": "2025-08-02T08:00:00Z"
})

if prediction.risk_level == "HIGH":
    print(f"High delay risk: {prediction.delay_probability * 100}% chance")
    print(f"Expected delay: {prediction.expected_delay_minutes} minutes")
```

### JavaScript
```javascript
const response = await fetch('/api/v2/predictions/delay', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_TOKEN'
  },
  body: JSON.stringify({
    flightNumber: 'UA123',
    airline: 'UA',
    origin: 'SFO',
    destination: 'LAX',
    scheduledTime: '2025-08-02T08:00:00Z'
  })
});

const result = await response.json();
console.log(`Delay risk: ${result.prediction.riskLevel}`);
```

## Limitations

1. **Weather Data**: Currently uses simplified weather impact estimates
2. **Real-time Factors**: Some real-time factors like ATC delays are estimated
3. **New Routes**: Limited accuracy for newly established routes
4. **External Events**: Cannot predict extraordinary events (strikes, emergencies)

## Future Enhancements

- Integration with real-time weather APIs
- ATC delay feed integration
- Multi-model ensemble predictions
- Deep learning models for complex patterns
- Mobile push notifications for high-risk flights