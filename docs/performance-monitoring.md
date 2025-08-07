# Performance Monitoring Guide

This guide covers the performance monitoring capabilities of the Airport Flight Data Collector, including metrics collection, visualization with Grafana, and alerting.

## Overview

The system provides comprehensive performance monitoring through:
- Prometheus metrics collection
- Grafana dashboards for visualization
- Custom performance monitoring script
- Real-time alerts and notifications

## Architecture

```
┌─────────────┐     ┌────────────┐     ┌─────────┐
│ Application ├────►│ Prometheus ├────►│ Grafana │
│   Metrics   │     │  Scraper   │     │  Dash   │
└─────────────┘     └────────────┘     └─────────┘
       │                                      ▲
       │            ┌────────────┐           │
       └───────────►│  Metrics   ├───────────┘
                    │  Endpoint  │
                    └────────────┘
```

## Available Metrics

### HTTP Metrics
- `http_request_duration_seconds` - Request duration histogram
- `http_requests_total` - Total request counter
- `http_active_connections` - Active connection gauge

### Flight Data Metrics
- `flight_data_records_total` - Total flight records processed
- `flight_collection_duration_seconds` - Collection time by airport
- `flight_collection_errors_total` - Collection errors by type

### Database Metrics
- `database_operation_duration_seconds` - DB operation latency
- `database_connections_active` - Active DB connections
- `database_queries_total` - Total queries executed

### System Metrics
- `websocket_active_connections` - WebSocket connections
- `prediction_accuracy_percentage` - ML model accuracy
- `api_cache_hits_total` - Cache hit rate
- `api_cache_misses_total` - Cache miss rate

## Quick Start

### 1. Using Docker Compose

The easiest way to get started is with Docker Compose:

```bash
# Start all monitoring services
docker-compose up -d prometheus grafana

# Access services
# Prometheus: http://localhost:9090
# Grafana: http://localhost:3003 (admin/admin)
```

### 2. Manual Setup

#### Install Prometheus

```bash
# Download Prometheus
wget https://github.com/prometheus/prometheus/releases/download/v2.48.0/prometheus-2.48.0.linux-amd64.tar.gz
tar xvf prometheus-2.48.0.linux-amd64.tar.gz
cd prometheus-2.48.0.linux-amd64

# Copy configuration
cp /path/to/project/monitoring/prometheus.yml .

# Start Prometheus
./prometheus --config.file=prometheus.yml
```

#### Install Grafana

```bash
# Install Grafana (Ubuntu/Debian)
sudo apt-get install -y software-properties-common
sudo add-apt-repository "deb https://packages.grafana.com/oss/deb stable main"
wget -q -O - https://packages.grafana.com/gpg.key | sudo apt-key add -
sudo apt-get update
sudo apt-get install grafana

# Start Grafana
sudo systemctl start grafana-server
sudo systemctl enable grafana-server
```

## Configuring Metrics Collection

### 1. Enable Metrics in API

The API server exposes metrics at `/api/v1/metrics`:

```javascript
// Metrics are automatically collected for:
// - All HTTP requests
// - Database operations
// - WebSocket connections
// - Collection jobs
```

### 2. Configure Prometheus Scraping

Edit `monitoring/prometheus.yml`:

```yaml
scrape_configs:
  - job_name: 'flight-collector-api'
    static_configs:
      - targets: ['localhost:3001']
    metrics_path: '/api/v1/metrics'
    scrape_interval: 15s
```

### 3. Import Grafana Dashboard

1. Log into Grafana (http://localhost:3003)
2. Go to Dashboards → Import
3. Upload `monitoring/grafana/dashboards/flight-collector-dashboard.json`
4. Select Prometheus datasource
5. Click Import

## Using the Performance Monitor Script

### Basic Usage

```bash
# Run performance monitor
node scripts/performance-monitor.js

# With custom thresholds
CPU_THRESHOLD=70 MEMORY_THRESHOLD=80 node scripts/performance-monitor.js

# With webhook alerts
ALERT_WEBHOOK=https://your-webhook.com/alerts node scripts/performance-monitor.js
```

### Configuration Options

```bash
# Environment variables
API_URL=http://localhost:3001          # API endpoint to monitor
CHECK_INTERVAL=60000                   # Check interval in ms
CPU_THRESHOLD=80                       # CPU usage threshold (%)
MEMORY_THRESHOLD=85                    # Memory usage threshold (%)
RESPONSE_TIME_THRESHOLD=5000           # API response time (ms)
ERROR_RATE_THRESHOLD=5                 # Error rate threshold (%)
DISK_THRESHOLD=90                      # Disk usage threshold (%)
PERF_LOG_FILE=./logs/performance.log   # Log file location
ALERT_WEBHOOK=https://webhook.url      # Alert webhook URL
```

### Alert Types

The monitor can generate the following alerts:

1. **HIGH_CPU** - CPU usage exceeds threshold
2. **HIGH_MEMORY** - Memory usage exceeds threshold
3. **HIGH_DISK** - Disk usage exceeds threshold
4. **SLOW_RESPONSE** - API response time exceeds threshold
5. **API_ERROR** - API health check failed
6. **HIGH_ERROR_RATE** - Error rate exceeds threshold

## Grafana Dashboards

### Main Dashboard

The main dashboard includes:

1. **HTTP Request Rate** - Requests per second by endpoint
2. **API Response Time** - 95th percentile latency
3. **Flight Data Collection Rate** - Records processed per minute
4. **Collection Duration** - Time taken by airport
5. **Error Statistics** - Collection errors and API errors
6. **Connection Metrics** - HTTP and WebSocket connections
7. **System Resources** - CPU, memory, disk usage
8. **ML Accuracy** - Prediction model performance

### Custom Dashboards

Create custom dashboards for specific needs:

```json
{
  "dashboard": {
    "title": "Airport Performance",
    "panels": [
      {
        "title": "Collection Success Rate",
        "targets": [{
          "expr": "rate(flight_collection_duration_seconds_count{status='success'}[5m]) / rate(flight_collection_duration_seconds_count[5m])"
        }]
      }
    ]
  }
}
```

## Alert Rules

### Prometheus Alerts

Create alert rules in Prometheus:

```yaml
groups:
  - name: flight-collector
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status_code=~"5.."}[5m]) > 0.05
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: High error rate detected
          
      - alert: SlowCollection
        expr: histogram_quantile(0.95, flight_collection_duration_seconds_bucket) > 60
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: Collection taking too long
```

### Grafana Alerts

Configure alerts in Grafana:

1. Edit panel → Alert tab
2. Set conditions (e.g., `avg() > 80`)
3. Configure notifications
4. Set alert frequency

## Performance Optimization

### 1. Identify Bottlenecks

Use metrics to identify performance issues:

```promql
# Slow endpoints
topk(5, histogram_quantile(0.95, http_request_duration_seconds_bucket))

# High error endpoints
topk(5, rate(http_requests_total{status_code=~"5.."}[5m]))

# Database latency
histogram_quantile(0.95, database_operation_duration_seconds_bucket)
```

### 2. Optimization Strategies

Based on metrics, apply optimizations:

- **High Response Time**: Add caching, optimize queries
- **High CPU**: Scale horizontally, optimize algorithms
- **High Memory**: Fix memory leaks, adjust Node.js heap
- **Database Bottleneck**: Add indexes, connection pooling

### 3. Capacity Planning

Use historical data for planning:

```promql
# Growth rate
rate(flight_data_records_total[30d])

# Peak usage times
max_over_time(http_active_connections[7d])

# Resource trends
predict_linear(process_resident_memory_bytes[1d], 7*24*3600)
```

## Troubleshooting

### Common Issues

1. **Metrics not appearing**
   - Check API is running: `curl http://localhost:3001/api/v1/metrics`
   - Verify Prometheus config
   - Check firewall rules

2. **Grafana shows "No Data"**
   - Verify datasource configuration
   - Check time range
   - Test query in Prometheus

3. **High memory usage**
   - Check for memory leaks
   - Adjust Node.js heap size
   - Enable memory profiling

### Debug Commands

```bash
# Check Prometheus targets
curl http://localhost:9090/api/v1/targets

# Test metrics endpoint
curl http://localhost:3001/api/v1/metrics | grep flight_

# Verify Grafana datasource
curl -H "Authorization: Bearer <api-key>" \
  http://localhost:3003/api/datasources

# Check performance monitor logs
tail -f logs/performance.log | jq
```

## Best Practices

### 1. Metric Naming

Follow Prometheus conventions:
- Use lowercase with underscores
- Include unit suffix (`_seconds`, `_bytes`)
- Be descriptive but concise

### 2. Label Usage

Use labels effectively:
- Keep cardinality low
- Use consistent label names
- Avoid user-generated values

### 3. Dashboard Design

Create effective dashboards:
- Group related metrics
- Use appropriate visualizations
- Include context and thresholds
- Add helpful descriptions

### 4. Alert Configuration

Set up actionable alerts:
- Avoid alert fatigue
- Include remediation steps
- Use appropriate thresholds
- Test alert routing

## Integration with CI/CD

### Performance Tests

Include performance monitoring in CI/CD:

```yaml
# .github/workflows/performance.yml
- name: Run Performance Tests
  run: |
    npm run start:api &
    sleep 10
    node scripts/performance-monitor.js --check-once
    
- name: Check Metrics
  run: |
    curl http://localhost:3001/api/v1/metrics > metrics.txt
    grep -q "http_requests_total" metrics.txt
```

### Load Testing

Combine with load testing:

```bash
# Run load test with monitoring
artillery run loadtest.yml &
node scripts/performance-monitor.js --duration 600
```

## Advanced Topics

### Custom Metrics

Add application-specific metrics:

```javascript
const { metrics } = require('./middleware/metrics');

// Track business metrics
metrics.flightDataRecords.labels('SFO', 'arrival').inc(flights.length);

// Record operation timing
const timer = metrics.databaseOperationDuration.startTimer();
await database.query(sql);
timer({ operation: 'insert', table: 'flights' });
```

### Distributed Tracing

For microservices, add tracing:

```javascript
const { trace } = require('@opentelemetry/api');
const tracer = trace.getTracer('flight-collector');

const span = tracer.startSpan('collect-flights');
// ... operation ...
span.end();
```

### Log Correlation

Correlate logs with metrics:

```javascript
logger.info('Collection completed', {
  airport: 'SFO',
  duration: collectionTime,
  records: flightCount,
  traceId: span.spanContext().traceId
});
```

## Resources

- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [Node.js Performance Best Practices](https://nodejs.org/en/docs/guides/simple-profiling/)
- [Monitoring Distributed Systems](https://landing.google.com/sre/sre-book/chapters/monitoring-distributed-systems/)