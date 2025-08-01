# Pattern Detection and Analysis

The Airport Flight Data Collector includes sophisticated pattern detection algorithms that analyze historical flight data to identify trends, anomalies, and operational patterns.

## Overview

The pattern detection system uses multiple algorithms to identify:

- **Temporal Patterns**: Time-based patterns like peak delay hours, weekday vs weekend trends
- **Spatial Patterns**: Location-based patterns including route-specific issues and airport congestion
- **Operational Patterns**: Aircraft utilization, turnaround times, gate usage patterns
- **Anomalies**: Statistical outliers, unusual delays, performance changes
- **Cascading Delays**: How delays propagate through the flight network
- **Seasonal Patterns**: Monthly and seasonal variations in performance

## Pattern Types

### 1. Temporal Patterns

#### Peak Delay Hours
Identifies specific hours of the day with consistently high delay rates.

```json
{
  "type": "PEAK_DELAY_HOURS",
  "description": "Peak delays occur at 17:00, 18:00, 19:00",
  "confidence": 0.85,
  "peakHours": [
    { "hour": 17, "rate": 0.42, "avgDelay": 35 },
    { "hour": 18, "rate": 0.45, "avgDelay": 38 },
    { "hour": 19, "rate": 0.41, "avgDelay": 32 }
  ]
}
```

#### Weekday Patterns
Compares performance between weekdays and weekends.

```json
{
  "type": "WEEKDAY_WEEKEND_PATTERN",
  "description": "Higher delays on weekdays",
  "confidence": 0.75,
  "weekdayRate": 0.32,
  "weekendRate": 0.18
}
```

#### Recurring Delay Windows
Identifies specific day/hour combinations with recurring delays.

```json
{
  "type": "RECURRING_DELAY_WINDOW",
  "description": "High delays on Fridays at 17:00",
  "confidence": 0.82,
  "dayOfWeek": 5,
  "hour": 17,
  "delayRate": 0.48
}
```

### 2. Spatial Patterns

#### High Delay Routes
Routes with consistently poor performance.

```json
{
  "type": "HIGH_DELAY_ROUTE",
  "route": "SFO-LAX",
  "description": "Route SFO-LAX has high delay rate",
  "confidence": 0.88,
  "delayRate": 0.38,
  "avgDelay": 42
}
```

#### Airport Congestion
Identifies congestion patterns at specific airports and times.

```json
{
  "type": "AIRPORT_CONGESTION",
  "airport": "SFO",
  "hour": 18,
  "operationType": "departure",
  "utilization": 0.85,
  "delayRate": 0.35
}
```

### 3. Operational Patterns

#### Aircraft Utilization
Identifies aircraft with high utilization that may impact performance.

```json
{
  "type": "HIGH_AIRCRAFT_UTILIZATION",
  "aircraft": "N12345",
  "avgDailyFlights": 8.5,
  "delayRate": 0.28,
  "impact": "HIGH"
}
```

#### Short Turnaround Delays
Links short turnaround times to increased delays.

```json
{
  "type": "SHORT_TURNAROUND_DELAYS",
  "description": "Short turnarounds lead to higher delay rates",
  "threshold": 45,
  "delayRate": 0.52,
  "recommendation": "Increase minimum turnaround time"
}
```

### 4. Anomalies

#### Extreme Delays
Statistical outliers in delay duration.

```json
{
  "type": "EXTREME_DELAY_OUTLIER",
  "flightNumber": "UA789",
  "delayMinutes": 245,
  "expectedRange": [0, 60],
  "severity": "HIGH"
}
```

#### Performance Changes
Sudden changes in system performance.

```json
{
  "type": "PERFORMANCE_CHANGE",
  "direction": "DEGRADATION",
  "previousRate": 0.22,
  "currentRate": 0.38,
  "changePercent": 16,
  "severity": "HIGH"
}
```

### 5. Cascading Delays

Tracks how delays propagate through the network.

```json
{
  "type": "CASCADE_DELAY",
  "aircraft": "N67890",
  "initialFlight": {
    "flightNumber": "AA123",
    "delay": 85
  },
  "affectedFlights": [
    {
      "flightNumber": "AA456",
      "delay": 62,
      "turnaroundTime": 35
    }
  ],
  "impact": "HIGH"
}
```

## API Endpoints

### Get Current Patterns
```http
GET /api/v2/patterns?refresh=false
```

Returns all currently detected patterns. Set `refresh=true` to force new analysis.

### Get Pattern Summary
```http
GET /api/v2/patterns/summary
```

Returns a high-level summary of detected patterns.

### Get Patterns by Type
```http
GET /api/v2/patterns/type/temporal
```

Valid types: `temporal`, `spatial`, `operational`, `anomalies`, `cascading`, `seasonal`

### Get Insights
```http
GET /api/v2/patterns/insights
```

Returns actionable insights generated from pattern analysis.

### Get Real-time Alerts
```http
GET /api/v2/patterns/alerts
```

Returns current alerts based on real-time pattern detection.

### Analyze Custom Date Range
```http
POST /api/v2/patterns/analyze
Content-Type: application/json
Authorization: Bearer YOUR_TOKEN

{
  "startDate": "2025-07-01",
  "endDate": "2025-07-31"
}
```

### Get Pattern Trends
```http
GET /api/v2/patterns/trends/temporal?weeks=8
```

Shows how patterns evolve over time.

### Export Patterns Report
```http
GET /api/v2/patterns/export?format=markdown
Authorization: Bearer YOUR_TOKEN
```

Formats: `json`, `markdown`

### Trigger Analysis
```http
POST /api/v2/patterns/run
Authorization: Bearer ADMIN_TOKEN

{
  "days": 30
}
```

## Insights

The system generates actionable insights by combining multiple patterns:

### Example: Peak Congestion Insight
```json
{
  "type": "PEAK_CONGESTION",
  "title": "Peak Hour Congestion Pattern",
  "description": "Multiple airports experience congestion during similar peak hours",
  "severity": "HIGH",
  "recommendations": [
    "Consider staggering flight schedules",
    "Increase ground crew during peak hours",
    "Implement slot management system"
  ],
  "affectedAirports": ["SFO", "LAX", "ORD"],
  "peakTimes": ["17:00", "18:00", "19:00"]
}
```

### Example: Cascade Effect Insight
```json
{
  "type": "CASCADE_DELAYS",
  "title": "Significant Delay Propagation",
  "description": "15 cascade delay chains affecting 47 flights",
  "severity": "HIGH",
  "recommendations": [
    "Increase buffer time between flights",
    "Implement aircraft swap protocols",
    "Review minimum turnaround times"
  ],
  "metrics": {
    "cascadeCount": 15,
    "affectedFlights": 47,
    "avgCascadeLength": 3.1
  }
}
```

## Real-time Alerts

The system monitors for emerging patterns and generates alerts:

### Delay Spike Alert
```json
{
  "type": "DELAY_SPIKE",
  "severity": "HIGH",
  "message": "Delay rate spike detected: 45.2% in last hour",
  "timestamp": "2025-08-01T15:30:00Z",
  "metrics": {
    "delayRate": 0.452,
    "flightCount": 42,
    "affectedFlights": 19
  }
}
```

### Airport Disruption Alert
```json
{
  "type": "AIRPORT_DISRUPTION",
  "severity": "MEDIUM",
  "message": "High delays at SFO: 12/20 flights delayed",
  "airport": "SFO",
  "metrics": {
    "total": 20,
    "delayed": 12
  }
}
```

## Pattern Analysis Schedule

- **Real-time Monitoring**: Continuous monitoring for alerts
- **Daily Analysis**: Quick analysis of previous day's patterns
- **Weekly Analysis**: Comprehensive pattern detection every Sunday at 3 AM
- **Custom Analysis**: On-demand analysis for specific date ranges

## Use Cases

### 1. Operational Planning
- Identify optimal scheduling windows
- Plan maintenance during low-impact periods
- Allocate resources based on congestion patterns

### 2. Performance Monitoring
- Track performance trends over time
- Identify degradation before it becomes critical
- Benchmark against historical patterns

### 3. Root Cause Analysis
- Trace delay propagation through the network
- Identify systemic issues vs isolated incidents
- Understand seasonal and temporal factors

### 4. Predictive Insights
- Anticipate congestion based on historical patterns
- Prepare for seasonal variations
- Identify early warning signs of performance issues

## Integration Examples

### Python
```python
import requests

# Get pattern summary
response = requests.get(
    'http://localhost:3001/api/v2/patterns/summary',
    headers={'Authorization': 'Bearer YOUR_TOKEN'}
)

summary = response.json()['summary']
print(f"Total patterns detected: {summary['temporal']['total']}")
print(f"Critical patterns: {len(summary['criticalPatterns'])}")

# Get real-time alerts
alerts = requests.get(
    'http://localhost:3001/api/v2/patterns/alerts'
).json()

for alert in alerts['alerts']:
    print(f"{alert['severity']}: {alert['message']}")
```

### JavaScript
```javascript
// Monitor for pattern updates
const EventSource = require('eventsource');

const sse = new EventSource(
  'http://localhost:3001/api/v2/sse/patterns',
  {
    headers: {
      'Authorization': 'Bearer YOUR_TOKEN'
    }
  }
);

sse.addEventListener('pattern-detected', (event) => {
  const pattern = JSON.parse(event.data);
  console.log(`New pattern: ${pattern.type} - ${pattern.description}`);
});

sse.addEventListener('insight-generated', (event) => {
  const insight = JSON.parse(event.data);
  console.log(`Insight: ${insight.title}`);
  insight.recommendations.forEach(rec => {
    console.log(`  - ${rec}`);
  });
});
```

## Best Practices

1. **Regular Review**: Review pattern insights weekly to identify trends
2. **Action Tracking**: Track which patterns have been addressed
3. **Threshold Tuning**: Adjust confidence thresholds based on operational needs
4. **Integration**: Integrate pattern alerts with operational systems
5. **Historical Context**: Compare current patterns with historical baselines

## Limitations

1. **Data Quality**: Pattern detection quality depends on data completeness
2. **External Factors**: Cannot detect patterns from unmeasured factors (e.g., weather)
3. **Causation**: Patterns show correlation, not necessarily causation
4. **Lag Time**: Some patterns only emerge with sufficient historical data