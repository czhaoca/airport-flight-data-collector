"""Main client for the Airport Flight Data API"""

import requests
from urllib.parse import urljoin
from typing import Optional, Dict, Any, List

from .exceptions import (
    APIError,
    AuthenticationError,
    RateLimitError,
    NotFoundError,
    ValidationError
)
from .resources import (
    FlightsResource,
    AirportsResource,
    StatisticsResource,
    ExportResource,
    BatchResource,
    WebhooksResource,
    WebSocketResource
)


class AirportFlightDataClient:
    """Main client for interacting with the Airport Flight Data API"""
    
    DEFAULT_BASE_URL = "https://api.airportflightdata.com"
    DEFAULT_TIMEOUT = 30
    DEFAULT_MAX_RETRIES = 3
    
    def __init__(
        self,
        api_key: str,
        base_url: Optional[str] = None,
        timeout: int = DEFAULT_TIMEOUT,
        max_retries: int = DEFAULT_MAX_RETRIES,
        verify_ssl: bool = True
    ):
        """
        Initialize the client
        
        Args:
            api_key: API authentication key
            base_url: Base URL for the API (defaults to production)
            timeout: Request timeout in seconds
            max_retries: Maximum number of retry attempts
            verify_ssl: Whether to verify SSL certificates
        """
        self.api_key = api_key
        self.base_url = (base_url or self.DEFAULT_BASE_URL).rstrip('/')
        self.timeout = timeout
        self.max_retries = max_retries
        self.verify_ssl = verify_ssl
        
        # Create session
        self.session = requests.Session()
        self.session.headers.update({
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "User-Agent": "airport-flight-data-python/1.0.0"
        })
        
        # Initialize resources
        self.flights = FlightsResource(self)
        self.airports = AirportsResource(self)
        self.statistics = StatisticsResource(self)
        self.export = ExportResource(self)
        self.batch = BatchResource(self)
        self.webhooks = WebhooksResource(self)
        self.websocket = WebSocketResource(self)
    
    def request(
        self,
        method: str,
        endpoint: str,
        params: Optional[Dict[str, Any]] = None,
        json: Optional[Dict[str, Any]] = None,
        data: Optional[Any] = None,
        headers: Optional[Dict[str, str]] = None,
        stream: bool = False
    ) -> requests.Response:
        """
        Make an HTTP request to the API
        
        Args:
            method: HTTP method (GET, POST, etc.)
            endpoint: API endpoint path
            params: Query parameters
            json: JSON body data
            data: Form data or raw body
            headers: Additional headers
            stream: Whether to stream the response
            
        Returns:
            Response object
            
        Raises:
            APIError: For API errors
            AuthenticationError: For auth failures
            RateLimitError: When rate limited
            NotFoundError: When resource not found
            ValidationError: For validation errors
        """
        url = urljoin(self.base_url, endpoint)
        
        # Merge headers
        request_headers = self.session.headers.copy()
        if headers:
            request_headers.update(headers)
        
        # Retry logic
        last_exception = None
        for attempt in range(self.max_retries):
            try:
                response = self.session.request(
                    method=method,
                    url=url,
                    params=params,
                    json=json,
                    data=data,
                    headers=request_headers,
                    timeout=self.timeout,
                    verify=self.verify_ssl,
                    stream=stream
                )
                
                # Handle success
                if response.ok:
                    return response
                
                # Handle errors
                self._handle_error(response)
                
            except requests.exceptions.Timeout:
                last_exception = APIError(f"Request timeout after {self.timeout}s")
            except requests.exceptions.ConnectionError as e:
                last_exception = APIError(f"Connection error: {str(e)}")
            except APIError:
                raise
            except Exception as e:
                last_exception = APIError(f"Unexpected error: {str(e)}")
        
        # All retries failed
        if last_exception:
            raise last_exception
        else:
            raise APIError("Request failed after all retries")
    
    def _handle_error(self, response: requests.Response):
        """Handle API error responses"""
        try:
            error_data = response.json()
            message = error_data.get("error", "Unknown error")
        except:
            message = response.text or "Unknown error"
        
        if response.status_code == 401:
            raise AuthenticationError(message, response.status_code, response)
        elif response.status_code == 404:
            raise NotFoundError(message, response.status_code, response)
        elif response.status_code == 422 or response.status_code == 400:
            raise ValidationError(message, response.status_code, response)
        elif response.status_code == 429:
            retry_after = response.headers.get("Retry-After")
            raise RateLimitError(message, retry_after, response.status_code, response)
        else:
            raise APIError(message, response.status_code, response)
    
    def close(self):
        """Close the client session"""
        self.session.close()
        if hasattr(self.websocket, 'close'):
            self.websocket.close()
    
    def __enter__(self):
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        self.close()