"""Flights resource"""

from typing import Optional, List, Dict, Any
from datetime import date, datetime
from .base import BaseResource


class FlightsResource(BaseResource):
    """Operations for flight data"""
    
    def list(
        self,
        airport: Optional[str] = None,
        type: Optional[str] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        airline: Optional[str] = None,
        status: Optional[str] = None,
        limit: int = 100,
        offset: int = 0
    ) -> List[Dict[str, Any]]:
        """
        List flights with optional filters
        
        Args:
            airport: Airport code (e.g., "SFO")
            type: Flight type ("departure" or "arrival")
            start_date: Start date (YYYY-MM-DD)
            end_date: End date (YYYY-MM-DD)
            airline: Airline code
            status: Flight status
            limit: Maximum results to return
            offset: Pagination offset
            
        Returns:
            List of flight records
        """
        params = {
            "limit": limit,
            "offset": offset
        }
        
        if airport:
            params["airport"] = airport
        if type:
            params["type"] = type
        if start_date:
            params["startDate"] = start_date
        if end_date:
            params["endDate"] = end_date
        if airline:
            params["airline"] = airline
        if status:
            params["status"] = status
        
        response = self._get("/api/v2/flights", params=params)
        return response.get("data", [])
    
    def get(self, flight_id: str) -> Dict[str, Any]:
        """
        Get details for a specific flight
        
        Args:
            flight_id: Flight identifier
            
        Returns:
            Flight details
        """
        response = self._get(f"/api/v2/flights/{flight_id}")
        return response.get("data", {})
    
    def search(
        self,
        flight_number: str,
        date: Optional[str] = None,
        airport: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Search for flights by flight number
        
        Args:
            flight_number: Flight number (e.g., "UA123")
            date: Date to search (YYYY-MM-DD)
            airport: Airport code to filter by
            
        Returns:
            List of matching flights
        """
        params = {
            "flightNumber": flight_number
        }
        
        if date:
            params["date"] = date
        if airport:
            params["airport"] = airport
        
        response = self._get("/api/v2/flights/search", params=params)
        return response.get("data", [])
    
    def get_delays(
        self,
        airport: Optional[str] = None,
        min_delay: int = 0,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Get delayed flights
        
        Args:
            airport: Airport code
            min_delay: Minimum delay in minutes
            start_date: Start date
            end_date: End date
            
        Returns:
            List of delayed flights
        """
        params = {
            "minDelay": min_delay
        }
        
        if airport:
            params["airport"] = airport
        if start_date:
            params["startDate"] = start_date
        if end_date:
            params["endDate"] = end_date
        
        response = self._get("/api/v2/flights/delays", params=params)
        return response.get("data", [])
    
    def get_cancellations(
        self,
        airport: Optional[str] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Get cancelled flights
        
        Args:
            airport: Airport code
            start_date: Start date
            end_date: End date
            
        Returns:
            List of cancelled flights
        """
        params = {}
        
        if airport:
            params["airport"] = airport
        if start_date:
            params["startDate"] = start_date
        if end_date:
            params["endDate"] = end_date
        
        response = self._get("/api/v2/flights/cancellations", params=params)
        return response.get("data", [])
    
    def track(self, flight_number: str, date: str) -> Dict[str, Any]:
        """
        Track a specific flight
        
        Args:
            flight_number: Flight number
            date: Flight date
            
        Returns:
            Real-time flight tracking data
        """
        params = {
            "flightNumber": flight_number,
            "date": date
        }
        
        response = self._get("/api/v2/flights/track", params=params)
        return response.get("data", {})