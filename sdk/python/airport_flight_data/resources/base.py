"""Base resource class"""

from typing import TYPE_CHECKING, Dict, Any, Optional

if TYPE_CHECKING:
    from ..client import AirportFlightDataClient


class BaseResource:
    """Base class for API resources"""
    
    def __init__(self, client: "AirportFlightDataClient"):
        self.client = client
    
    def _get(self, endpoint: str, params: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Make a GET request"""
        response = self.client.request("GET", endpoint, params=params)
        return response.json()
    
    def _post(self, endpoint: str, json: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Make a POST request"""
        response = self.client.request("POST", endpoint, json=json)
        return response.json()
    
    def _put(self, endpoint: str, json: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Make a PUT request"""
        response = self.client.request("PUT", endpoint, json=json)
        return response.json()
    
    def _delete(self, endpoint: str) -> Dict[str, Any]:
        """Make a DELETE request"""
        response = self.client.request("DELETE", endpoint)
        return response.json()
    
    def _stream(self, endpoint: str, params: Optional[Dict[str, Any]] = None):
        """Make a streaming GET request"""
        return self.client.request("GET", endpoint, params=params, stream=True)