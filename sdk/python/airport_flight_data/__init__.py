"""Airport Flight Data Python SDK"""

from .client import AirportFlightDataClient
from .async_client import AsyncAirportFlightDataClient
from .exceptions import (
    APIError,
    AuthenticationError,
    RateLimitError,
    NotFoundError,
    ValidationError,
    WebSocketError
)

__version__ = "1.0.0"
__all__ = [
    "AirportFlightDataClient",
    "AsyncAirportFlightDataClient",
    "APIError",
    "AuthenticationError",
    "RateLimitError",
    "NotFoundError",
    "ValidationError",
    "WebSocketError"
]