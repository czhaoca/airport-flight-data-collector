# Airport Flight Data Python SDK

Python SDK for the Airport Flight Data Collector API.

## Installation

```bash
pip install airport-flight-data
```

## Quick Start

```python
from airport_flight_data import AirportFlightDataClient

# Initialize client
client = AirportFlightDataClient(
    api_key="your-api-key",
    base_url="http://localhost:3001"  # Optional, defaults to production URL
)

# Get flight data
flights = client.flights.list(airport="SFO", limit=10)

# Get airport statistics
stats = client.airports.get_stats("SFO")

# Subscribe to real-time updates
def on_flight_update(data):
    print(f"Flight update: {data}")

client.websocket.subscribe_airport("SFO", on_flight_update)
```

## Features

- RESTful API client with full endpoint coverage
- WebSocket support for real-time updates
- Data export in multiple formats (JSON, CSV, Parquet)
- Batch operations support
- Webhook management
- Pandas DataFrame integration
- Async/await support

## API Reference

### Flights

```python
# List flights
flights = client.flights.list(
    airport="SFO",
    type="departure",  # or "arrival"
    start_date="2025-07-01",
    end_date="2025-07-31",
    limit=100
)

# Get specific flight
flight = client.flights.get("FL123")

# Search flights
results = client.flights.search(
    flight_number="UA123",
    date="2025-07-15"
)
```

### Airports

```python
# List airports
airports = client.airports.list()

# Get airport details
airport = client.airports.get("SFO")

# Get airport statistics
stats = client.airports.get_stats(
    "SFO",
    start_date="2025-07-01",
    end_date="2025-07-31"
)
```

### Real-time Updates

```python
# Subscribe to airport updates
client.websocket.subscribe_airport("SFO", callback=on_update)

# Subscribe to specific flight
client.websocket.subscribe_flight("UA123", callback=on_flight_change)

# Subscribe to route updates
client.websocket.subscribe_route("SFO", "LAX", callback=on_route_update)

# Unsubscribe
client.websocket.unsubscribe_airport("SFO")
```

### Data Export

```python
# Export flight data
client.export.flights(
    format="csv",  # or "json", "parquet"
    airport="SFO",
    start_date="2025-07-01",
    end_date="2025-07-31",
    output_file="sfo_flights.csv"
)

# Export with pandas DataFrame
df = client.export.flights_to_dataframe(
    airport="SFO",
    start_date="2025-07-01"
)
```

### Batch Operations

```python
# Batch API calls
batch_job = client.batch.create([
    {"method": "GET", "endpoint": "/flights/FL123"},
    {"method": "GET", "endpoint": "/flights/FL456"},
    {"method": "GET", "endpoint": "/airports/SFO/stats"}
])

# Check job status
status = client.batch.get_status(batch_job.id)

# Get results when complete
if status.status == "completed":
    results = status.results
```

### Webhooks

```python
# Register webhook
webhook = client.webhooks.create(
    url="https://example.com/webhook",
    events=["flight.delayed", "flight.cancelled"],
    filters={"airport": "SFO", "min_delay": 30}
)

# List webhooks
webhooks = client.webhooks.list()

# Update webhook
client.webhooks.update(
    webhook.id,
    events=["flight.delayed", "flight.cancelled", "flight.statusChange"]
)

# Delete webhook
client.webhooks.delete(webhook.id)
```

## Async Support

```python
import asyncio
from airport_flight_data import AsyncAirportFlightDataClient

async def main():
    async with AsyncAirportFlightDataClient(api_key="your-api-key") as client:
        # Async API calls
        flights = await client.flights.list(airport="SFO")
        stats = await client.airports.get_stats("SFO")
        
        # Concurrent requests
        results = await asyncio.gather(
            client.flights.get("FL123"),
            client.flights.get("FL456"),
            client.airports.get("SFO")
        )

asyncio.run(main())
```

## Error Handling

```python
from airport_flight_data.exceptions import (
    APIError,
    AuthenticationError,
    RateLimitError,
    NotFoundError
)

try:
    flight = client.flights.get("INVALID")
except NotFoundError:
    print("Flight not found")
except AuthenticationError:
    print("Invalid API key")
except RateLimitError as e:
    print(f"Rate limit exceeded. Retry after: {e.retry_after}")
except APIError as e:
    print(f"API error: {e.message}")
```

## Configuration

```python
# Configure client
client = AirportFlightDataClient(
    api_key="your-api-key",
    base_url="http://localhost:3001",
    timeout=30,  # Request timeout in seconds
    max_retries=3,  # Maximum retry attempts
    verify_ssl=True  # SSL certificate verification
)

# Configure logging
import logging
logging.basicConfig(level=logging.DEBUG)
```

## Examples

See the `examples/` directory for more detailed examples:

- `basic_usage.py` - Basic API operations
- `real_time_monitoring.py` - WebSocket subscriptions
- `data_analysis.py` - Data export and analysis with pandas
- `batch_processing.py` - Batch operations
- `webhook_integration.py` - Webhook setup and handling

## License

MIT License