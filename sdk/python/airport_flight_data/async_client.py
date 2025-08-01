"""Async client for the Airport Flight Data API"""

import aiohttp
from typing import Optional, Dict, Any
from urllib.parse import urljoin

from .exceptions import (
    APIError,
    AuthenticationError,
    RateLimitError,
    NotFoundError,
    ValidationError
)
from .async_resources import (
    AsyncFlightsResource,
    AsyncAirportsResource,
    AsyncStatisticsResource,
    AsyncExportResource,
    AsyncBatchResource,
    AsyncWebhooksResource
)


class AsyncAirportFlightDataClient:
    """Async client for interacting with the Airport Flight Data API"""
    
    DEFAULT_BASE_URL = "https://api.airportflightdata.com"
    DEFAULT_TIMEOUT = 30
    DEFAULT_MAX_RETRIES = 3
    
    def __init__(
        self,
        api_key: str,
        base_url: Optional[str] = None,
        timeout: int = DEFAULT_TIMEOUT,
        max_retries: int = DEFAULT_MAX_RETRIES
    ):
        """
        Initialize the async client
        
        Args:
            api_key: API authentication key
            base_url: Base URL for the API
            timeout: Request timeout in seconds
            max_retries: Maximum number of retry attempts
        """
        self.api_key = api_key
        self.base_url = (base_url or self.DEFAULT_BASE_URL).rstrip('/')
        self.timeout_seconds = timeout
        self.max_retries = max_retries
        self.session: Optional[aiohttp.ClientSession] = None
        
        # Initialize resources
        self.flights = AsyncFlightsResource(self)
        self.airports = AsyncAirportsResource(self)
        self.statistics = AsyncStatisticsResource(self)
        self.export = AsyncExportResource(self)
        self.batch = AsyncBatchResource(self)
        self.webhooks = AsyncWebhooksResource(self)
    
    async def __aenter__(self):
        """Async context manager entry"""
        self.session = aiohttp.ClientSession(
            headers={
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
                "User-Agent": "airport-flight-data-python-async/1.0.0"
            },
            timeout=aiohttp.ClientTimeout(total=self.timeout_seconds)
        )
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit"""
        if self.session:
            await self.session.close()
    
    async def request(
        self,
        method: str,
        endpoint: str,
        params: Optional[Dict[str, Any]] = None,
        json: Optional[Dict[str, Any]] = None,
        headers: Optional[Dict[str, str]] = None
    ) -> Dict[str, Any]:
        """
        Make an async HTTP request to the API
        
        Args:
            method: HTTP method
            endpoint: API endpoint path
            params: Query parameters
            json: JSON body data
            headers: Additional headers
            
        Returns:
            Response data as dictionary
        """
        if not self.session:
            raise RuntimeError("Client must be used as async context manager")
        
        url = urljoin(self.base_url, endpoint)
        
        # Merge headers
        request_headers = {}
        if headers:
            request_headers.update(headers)
        
        # Retry logic
        last_exception = None
        for attempt in range(self.max_retries):
            try:
                async with self.session.request(
                    method=method,
                    url=url,
                    params=params,
                    json=json,
                    headers=request_headers
                ) as response:
                    if response.ok:
                        return await response.json()
                    
                    await self._handle_error(response)
                    
            except aiohttp.ClientTimeout:
                last_exception = APIError(f"Request timeout after {self.timeout_seconds}s")
            except aiohttp.ClientError as e:
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
    
    async def _handle_error(self, response: aiohttp.ClientResponse):
        """Handle API error responses"""
        try:
            error_data = await response.json()
            message = error_data.get("error", "Unknown error")
        except:
            message = await response.text() or "Unknown error"
        
        if response.status == 401:
            raise AuthenticationError(message, response.status)
        elif response.status == 404:
            raise NotFoundError(message, response.status)
        elif response.status in (400, 422):
            raise ValidationError(message, response.status)
        elif response.status == 429:
            retry_after = response.headers.get("Retry-After")
            raise RateLimitError(message, retry_after, response.status)
        else:
            raise APIError(message, response.status)
    
    async def stream(
        self,
        endpoint: str,
        params: Optional[Dict[str, Any]] = None,
        chunk_size: int = 8192
    ):
        """
        Stream data from an endpoint
        
        Args:
            endpoint: API endpoint
            params: Query parameters
            chunk_size: Size of chunks to yield
            
        Yields:
            Data chunks
        """
        if not self.session:
            raise RuntimeError("Client must be used as async context manager")
        
        url = urljoin(self.base_url, endpoint)
        
        async with self.session.get(url, params=params) as response:
            if not response.ok:
                await self._handle_error(response)
            
            async for chunk in response.content.iter_chunked(chunk_size):
                yield chunk