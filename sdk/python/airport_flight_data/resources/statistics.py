"""Statistics resource"""

from typing import Optional, List, Dict, Any
from .base import BaseResource


class StatisticsResource(BaseResource):
    """Operations for statistical data"""
    
    def get_overview(
        self,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Get system-wide statistics overview
        
        Args:
            start_date: Start date (YYYY-MM-DD)
            end_date: End date (YYYY-MM-DD)
            
        Returns:
            Statistics overview
        """
        params = {}
        
        if start_date:
            params["startDate"] = start_date
        if end_date:
            params["endDate"] = end_date
        
        response = self._get("/api/v2/statistics", params=params)
        return response.get("data", {})
    
    def get_delays(
        self,
        airport: Optional[str] = None,
        airline: Optional[str] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        granularity: str = "daily"
    ) -> Dict[str, Any]:
        """
        Get delay statistics
        
        Args:
            airport: Airport code
            airline: Airline code
            start_date: Start date
            end_date: End date
            granularity: Data granularity
            
        Returns:
            Delay statistics
        """
        params = {
            "granularity": granularity
        }
        
        if airport:
            params["airport"] = airport
        if airline:
            params["airline"] = airline
        if start_date:
            params["startDate"] = start_date
        if end_date:
            params["endDate"] = end_date
        
        response = self._get("/api/v2/statistics/delays", params=params)
        return response.get("data", {})
    
    def get_performance(
        self,
        entity_type: str,
        entity_id: str,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Get performance metrics
        
        Args:
            entity_type: Type of entity ("airport", "airline", "route")
            entity_id: Entity identifier
            start_date: Start date
            end_date: End date
            
        Returns:
            Performance metrics
        """
        params = {
            "entityType": entity_type,
            "entityId": entity_id
        }
        
        if start_date:
            params["startDate"] = start_date
        if end_date:
            params["endDate"] = end_date
        
        response = self._get("/api/v2/statistics/performance", params=params)
        return response.get("data", {})
    
    def get_trends(
        self,
        metric: str,
        airport: Optional[str] = None,
        airline: Optional[str] = None,
        period: str = "30d"
    ) -> List[Dict[str, Any]]:
        """
        Get trend data for a metric
        
        Args:
            metric: Metric name ("delays", "cancellations", "traffic", etc.)
            airport: Airport code
            airline: Airline code
            period: Time period ("7d", "30d", "90d", "1y")
            
        Returns:
            Trend data points
        """
        params = {
            "metric": metric,
            "period": period
        }
        
        if airport:
            params["airport"] = airport
        if airline:
            params["airline"] = airline
        
        response = self._get("/api/v2/statistics/trends", params=params)
        return response.get("data", [])
    
    def get_rankings(
        self,
        category: str,
        metric: str,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """
        Get rankings for a category
        
        Args:
            category: Ranking category ("airports", "airlines", "routes")
            metric: Ranking metric ("ontime", "delays", "traffic", etc.)
            start_date: Start date
            end_date: End date
            limit: Number of results
            
        Returns:
            Ranked list
        """
        params = {
            "category": category,
            "metric": metric,
            "limit": limit
        }
        
        if start_date:
            params["startDate"] = start_date
        if end_date:
            params["endDate"] = end_date
        
        response = self._get("/api/v2/statistics/rankings", params=params)
        return response.get("data", [])
    
    def get_predictions(
        self,
        prediction_type: str,
        airport: Optional[str] = None,
        flight: Optional[str] = None,
        date: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Get predictions
        
        Args:
            prediction_type: Type of prediction ("delay", "cancellation", "traffic")
            airport: Airport code
            flight: Flight number
            date: Date for prediction
            
        Returns:
            Prediction data
        """
        params = {
            "type": prediction_type
        }
        
        if airport:
            params["airport"] = airport
        if flight:
            params["flight"] = flight
        if date:
            params["date"] = date
        
        response = self._get("/api/v2/statistics/predictions", params=params)
        return response.get("data", {})