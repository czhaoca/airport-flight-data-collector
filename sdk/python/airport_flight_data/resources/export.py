"""Export resource"""

import os
from typing import Optional, Dict, Any
from .base import BaseResource


class ExportResource(BaseResource):
    """Operations for data export"""
    
    def flights(
        self,
        format: str = "json",
        airport: Optional[str] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        type: Optional[str] = None,
        airline: Optional[str] = None,
        output_file: Optional[str] = None,
        limit: int = 10000
    ) -> str:
        """
        Export flight data
        
        Args:
            format: Export format ("json", "csv", "parquet")
            airport: Airport code
            start_date: Start date
            end_date: End date
            type: Flight type
            airline: Airline code
            output_file: Path to save the file
            limit: Maximum records
            
        Returns:
            Path to the exported file
        """
        params = {
            "format": format,
            "limit": limit
        }
        
        if airport:
            params["airport"] = airport
        if start_date:
            params["startDate"] = start_date
        if end_date:
            params["endDate"] = end_date
        if type:
            params["type"] = type
        if airline:
            params["airline"] = airline
        
        # Stream the response
        response = self._stream("/api/v2/export/flights", params=params)
        
        # Determine output file
        if not output_file:
            ext = {"json": "json", "csv": "csv", "parquet": "parquet"}.get(format, "dat")
            output_file = f"flights_export.{ext}"
        
        # Write to file
        with open(output_file, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)
        
        return os.path.abspath(output_file)
    
    def flights_to_dataframe(
        self,
        airport: Optional[str] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        type: Optional[str] = None,
        airline: Optional[str] = None,
        limit: int = 10000
    ):
        """
        Export flight data directly to pandas DataFrame
        
        Args:
            airport: Airport code
            start_date: Start date
            end_date: End date
            type: Flight type
            airline: Airline code
            limit: Maximum records
            
        Returns:
            pandas DataFrame
        """
        try:
            import pandas as pd
        except ImportError:
            raise ImportError("pandas is required for DataFrame export. Install with: pip install pandas")
        
        # Export as JSON
        import tempfile
        with tempfile.NamedTemporaryFile(suffix='.json', delete=False) as tmp:
            self.flights(
                format="json",
                airport=airport,
                start_date=start_date,
                end_date=end_date,
                type=type,
                airline=airline,
                output_file=tmp.name,
                limit=limit
            )
            
            # Load into DataFrame
            df = pd.read_json(tmp.name)
            
        # Clean up
        os.unlink(tmp.name)
        
        return df
    
    def statistics(
        self,
        format: str = "json",
        metric: str = "all",
        airport: Optional[str] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        granularity: str = "daily",
        output_file: Optional[str] = None
    ) -> str:
        """
        Export statistics data
        
        Args:
            format: Export format
            metric: Metric to export
            airport: Airport code
            start_date: Start date
            end_date: End date
            granularity: Data granularity
            output_file: Path to save the file
            
        Returns:
            Path to the exported file
        """
        params = {
            "format": format,
            "metric": metric,
            "granularity": granularity
        }
        
        if airport:
            params["airport"] = airport
        if start_date:
            params["startDate"] = start_date
        if end_date:
            params["endDate"] = end_date
        
        # Stream the response
        response = self._stream("/api/v2/export/statistics", params=params)
        
        # Determine output file
        if not output_file:
            ext = {"json": "json", "csv": "csv", "parquet": "parquet"}.get(format, "dat")
            output_file = f"statistics_export.{ext}"
        
        # Write to file
        with open(output_file, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)
        
        return os.path.abspath(output_file)
    
    def aggregated(
        self,
        aggregation: str,
        group_by: str,
        format: str = "json",
        airport: Optional[str] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        output_file: Optional[str] = None
    ) -> str:
        """
        Export aggregated data
        
        Args:
            aggregation: Aggregation type ("sum", "avg", "count", etc.)
            group_by: Grouping field ("date", "airport", "airline", etc.)
            format: Export format
            airport: Airport code
            start_date: Start date
            end_date: End date
            output_file: Path to save the file
            
        Returns:
            Path to the exported file
        """
        params = {
            "aggregation": aggregation,
            "groupBy": group_by,
            "format": format
        }
        
        if airport:
            params["airport"] = airport
        if start_date:
            params["startDate"] = start_date
        if end_date:
            params["endDate"] = end_date
        
        # Stream the response
        response = self._stream("/api/v2/export/aggregated", params=params)
        
        # Determine output file
        if not output_file:
            ext = {"json": "json", "csv": "csv", "parquet": "parquet"}.get(format, "dat")
            output_file = f"aggregated_export.{ext}"
        
        # Write to file
        with open(output_file, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)
        
        return os.path.abspath(output_file)