"""Batch operations resource"""

from typing import List, Dict, Any, Optional
import time
from .base import BaseResource


class BatchOperation:
    """Represents a single batch operation"""
    
    def __init__(self, method: str, endpoint: str, body: Optional[Dict[str, Any]] = None):
        self.method = method
        self.endpoint = endpoint
        self.body = body
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for API"""
        op = {
            "method": self.method,
            "endpoint": self.endpoint
        }
        if self.body:
            op["body"] = self.body
        return op


class BatchJob:
    """Represents a batch job"""
    
    def __init__(self, data: Dict[str, Any]):
        self.id = data.get("jobId", data.get("id"))
        self.status = data.get("status")
        self.status_url = data.get("statusUrl")
        self.created_at = data.get("createdAt")
        self.completed_at = data.get("completedAt")
        self.total_operations = data.get("totalOperations", 0)
        self.completed_operations = data.get("completedOperations", 0)
        self.results = data.get("results", [])
        self.errors = data.get("errors", [])
    
    @property
    def is_complete(self) -> bool:
        """Check if job is complete"""
        return self.status in ["completed", "failed", "cancelled"]
    
    @property
    def progress_percentage(self) -> int:
        """Get progress percentage"""
        if self.total_operations == 0:
            return 0
        return int((self.completed_operations / self.total_operations) * 100)


class BatchResource(BaseResource):
    """Operations for batch processing"""
    
    def create(self, operations: List[BatchOperation]) -> BatchJob:
        """
        Create a new batch job
        
        Args:
            operations: List of batch operations
            
        Returns:
            BatchJob instance
        """
        # Convert operations to dict format
        ops_data = [op.to_dict() if isinstance(op, BatchOperation) else op for op in operations]
        
        response = self._post("/api/v2/batch", json={"operations": ops_data})
        return BatchJob(response)
    
    def get_status(self, job_id: str) -> BatchJob:
        """
        Get batch job status
        
        Args:
            job_id: Batch job ID
            
        Returns:
            BatchJob instance with current status
        """
        response = self._get(f"/api/v2/batch/{job_id}")
        return BatchJob(response.get("job", {}))
    
    def list(self) -> List[BatchJob]:
        """
        List all batch jobs for the user
        
        Returns:
            List of BatchJob instances
        """
        response = self._get("/api/v2/batch")
        return [BatchJob(job) for job in response.get("jobs", [])]
    
    def cancel(self, job_id: str) -> Dict[str, Any]:
        """
        Cancel a batch job
        
        Args:
            job_id: Batch job ID
            
        Returns:
            Cancellation response
        """
        return self._delete(f"/api/v2/batch/{job_id}")
    
    def wait_for_completion(
        self,
        job_id: str,
        poll_interval: int = 2,
        timeout: int = 300
    ) -> BatchJob:
        """
        Wait for a batch job to complete
        
        Args:
            job_id: Batch job ID
            poll_interval: Seconds between status checks
            timeout: Maximum wait time in seconds
            
        Returns:
            Completed BatchJob instance
            
        Raises:
            TimeoutError: If job doesn't complete within timeout
        """
        start_time = time.time()
        
        while True:
            job = self.get_status(job_id)
            
            if job.is_complete:
                return job
            
            elapsed = time.time() - start_time
            if elapsed > timeout:
                raise TimeoutError(f"Batch job {job_id} did not complete within {timeout} seconds")
            
            time.sleep(poll_interval)
    
    def batch_flight_updates(self, updates: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Batch update flights
        
        Args:
            updates: List of flight updates, each containing 'id' and 'data'
            
        Returns:
            Update results
        """
        return self._post("/api/v2/batch/flights/update", json={"updates": updates})
    
    def batch_collect(self, airports: List[str], options: Optional[Dict[str, Any]] = None) -> BatchJob:
        """
        Trigger batch collection for multiple airports
        
        Args:
            airports: List of airport codes
            options: Collection options
            
        Returns:
            BatchJob instance for tracking
        """
        body = {
            "airports": airports
        }
        if options:
            body["options"] = options
        
        response = self._post("/api/v2/batch/collect", json=body)
        return BatchJob(response)
    
    def create_from_list(self, operations: List[Dict[str, Any]]) -> BatchJob:
        """
        Create batch job from a list of operation dictionaries
        
        Args:
            operations: List of operation dicts with 'method', 'endpoint', and optional 'body'
            
        Returns:
            BatchJob instance
        """
        batch_ops = []
        for op in operations:
            batch_ops.append(BatchOperation(
                method=op["method"],
                endpoint=op["endpoint"],
                body=op.get("body")
            ))
        
        return self.create(batch_ops)