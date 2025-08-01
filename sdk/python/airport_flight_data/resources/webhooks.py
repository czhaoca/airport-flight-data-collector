"""Webhooks resource"""

from typing import List, Dict, Any, Optional
from .base import BaseResource


class Webhook:
    """Represents a webhook subscription"""
    
    def __init__(self, data: Dict[str, Any]):
        self.id = data.get("id")
        self.url = data.get("url")
        self.events = data.get("events", [])
        self.filters = data.get("filters", {})
        self.secret = data.get("secret")
        self.active = data.get("active", True)
        self.created_at = data.get("createdAt")
        self.last_delivery = data.get("lastDelivery")
        self.delivery_attempts = data.get("deliveryAttempts", 0)
        self.failure_count = data.get("failureCount", 0)


class WebhooksResource(BaseResource):
    """Operations for webhook management"""
    
    def create(
        self,
        url: str,
        events: List[str],
        filters: Optional[Dict[str, Any]] = None,
        secret: Optional[str] = None
    ) -> Webhook:
        """
        Create a new webhook subscription
        
        Args:
            url: Webhook endpoint URL
            events: List of events to subscribe to
            filters: Optional event filters
            secret: Optional secret for webhook signing
            
        Returns:
            Webhook instance
        """
        body = {
            "url": url,
            "events": events
        }
        
        if filters:
            body["filters"] = filters
        if secret:
            body["secret"] = secret
        
        response = self._post("/api/v2/webhooks", json=body)
        return Webhook(response.get("webhook", {}))
    
    def list(self) -> List[Webhook]:
        """
        List all webhooks for the user
        
        Returns:
            List of Webhook instances
        """
        response = self._get("/api/v2/webhooks")
        return [Webhook(webhook) for webhook in response.get("webhooks", [])]
    
    def get(self, webhook_id: str) -> Webhook:
        """
        Get webhook details
        
        Args:
            webhook_id: Webhook ID
            
        Returns:
            Webhook instance
        """
        response = self._get(f"/api/v2/webhooks/{webhook_id}")
        return Webhook(response.get("webhook", {}))
    
    def update(
        self,
        webhook_id: str,
        url: Optional[str] = None,
        events: Optional[List[str]] = None,
        filters: Optional[Dict[str, Any]] = None,
        active: Optional[bool] = None
    ) -> Webhook:
        """
        Update a webhook
        
        Args:
            webhook_id: Webhook ID
            url: New webhook URL
            events: New event list
            filters: New filters
            active: Enable/disable webhook
            
        Returns:
            Updated Webhook instance
        """
        body = {}
        
        if url is not None:
            body["url"] = url
        if events is not None:
            body["events"] = events
        if filters is not None:
            body["filters"] = filters
        if active is not None:
            body["active"] = active
        
        response = self._put(f"/api/v2/webhooks/{webhook_id}", json=body)
        return Webhook(response.get("webhook", {}))
    
    def delete(self, webhook_id: str) -> Dict[str, Any]:
        """
        Delete a webhook
        
        Args:
            webhook_id: Webhook ID
            
        Returns:
            Deletion response
        """
        return self._delete(f"/api/v2/webhooks/{webhook_id}")
    
    def test(self, webhook_id: str) -> Dict[str, Any]:
        """
        Test a webhook
        
        Args:
            webhook_id: Webhook ID
            
        Returns:
            Test response
        """
        return self._post(f"/api/v2/webhooks/{webhook_id}/test")
    
    def pause(self, webhook_id: str) -> Webhook:
        """
        Pause a webhook (set active=false)
        
        Args:
            webhook_id: Webhook ID
            
        Returns:
            Updated Webhook instance
        """
        return self.update(webhook_id, active=False)
    
    def resume(self, webhook_id: str) -> Webhook:
        """
        Resume a webhook (set active=true)
        
        Args:
            webhook_id: Webhook ID
            
        Returns:
            Updated Webhook instance
        """
        return self.update(webhook_id, active=True)
    
    @staticmethod
    def available_events() -> List[str]:
        """
        Get list of available webhook events
        
        Returns:
            List of event names
        """
        return [
            "flight.delayed",
            "flight.cancelled",
            "flight.statusChange",
            "flight.gateChange",
            "airport.stats",
            "collection.completed",
            "system.alert"
        ]
    
    @staticmethod
    def verify_signature(secret: str, payload: str, signature: str) -> bool:
        """
        Verify webhook signature
        
        Args:
            secret: Webhook secret
            payload: Request body as string
            signature: X-Webhook-Signature header value
            
        Returns:
            True if signature is valid
        """
        import hmac
        import hashlib
        
        expected = hmac.new(
            secret.encode(),
            payload.encode(),
            hashlib.sha256
        ).hexdigest()
        
        return hmac.compare_digest(expected, signature)