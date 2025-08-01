"""Airports resource"""

from typing import Optional, List, Dict, Any
from .base import BaseResource


class AirportsResource(BaseResource):
    """Operations for airport data"""
    
    def list(self) -> List[Dict[str, Any]]:
        """
        List all available airports
        
        Returns:
            List of airport records
        """
        response = self._get("/api/v2/airports")
        return response.get("data", [])
    
    def get(self, airport_code: str) -> Dict[str, Any]:
        """
        Get details for a specific airport
        
        Args:
            airport_code: Airport IATA code (e.g., "SFO")
            
        Returns:
            Airport details
        """
        response = self._get(f"/api/v2/airports/{airport_code}")
        return response.get("data", {})
    
    def get_stats(
        self,
        airport_code: str,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        granularity: str = "daily"
    ) -> Dict[str, Any]:
        """
        Get statistics for an airport
        
        Args:
            airport_code: Airport IATA code
            start_date: Start date (YYYY-MM-DD)
            end_date: End date (YYYY-MM-DD)
            granularity: Stats granularity ("hourly", "daily", "weekly", "monthly")
            
        Returns:
            Airport statistics
        """
        params = {
            "granularity": granularity
        }
        
        if start_date:
            params["startDate"] = start_date
        if end_date:
            params["endDate"] = end_date
        
        response = self._get(f"/api/v2/airports/{airport_code}/stats", params=params)
        return response.get("data", {})
    
    def get_airlines(self, airport_code: str) -> List[Dict[str, Any]]:
        """
        Get airlines operating at an airport
        
        Args:
            airport_code: Airport IATA code
            
        Returns:
            List of airlines
        """
        response = self._get(f"/api/v2/airports/{airport_code}/airlines")
        return response.get("data", [])
    
    def get_destinations(self, airport_code: str) -> List[Dict[str, Any]]:
        """
        Get destinations from an airport
        
        Args:
            airport_code: Airport IATA code
            
        Returns:
            List of destination airports
        """
        response = self._get(f"/api/v2/airports/{airport_code}/destinations")
        return response.get("data", [])
    
    def get_delays(
        self,
        airport_code: str,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Get delay statistics for an airport
        
        Args:
            airport_code: Airport IATA code
            start_date: Start date
            end_date: End date
            
        Returns:
            Delay statistics
        """
        params = {}
        
        if start_date:
            params["startDate"] = start_date
        if end_date:
            params["endDate"] = end_date
        
        response = self._get(f"/api/v2/airports/{airport_code}/delays", params=params)
        return response.get("data", {})
    
    def get_weather(self, airport_code: str) -> Dict[str, Any]:
        """
        Get current weather at an airport
        
        Args:
            airport_code: Airport IATA code
            
        Returns:
            Weather information
        """
        response = self._get(f"/api/v2/airports/{airport_code}/weather")
        return response.get("data", {})
    
    def get_traffic(
        self,
        airport_code: str,
        date: Optional[str] = None,
        hour: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Get traffic data for an airport
        
        Args:
            airport_code: Airport IATA code
            date: Date (YYYY-MM-DD)
            hour: Hour of day (0-23)
            
        Returns:
            Traffic data
        """
        params = {}
        
        if date:
            params["date"] = date
        if hour is not None:
            params["hour"] = hour
        
        response = self._get(f"/api/v2/airports/{airport_code}/traffic", params=params)
        return response.get("data", {})