"""WebSocket resource for real-time updates"""

import json
import threading
from typing import Callable, Optional, Dict, Any, Set
from websocket import WebSocketApp
from ..exceptions import WebSocketError, ConnectionError


class WebSocketResource:
    """Operations for WebSocket real-time updates"""
    
    def __init__(self, client):
        self.client = client
        self.ws: Optional[WebSocketApp] = None
        self.ws_thread: Optional[threading.Thread] = None
        self.subscriptions: Dict[str, Set[Callable]] = {}
        self.connected = False
        self._closing = False
    
    def connect(self):
        """Connect to the WebSocket server"""
        if self.connected:
            return
        
        # Construct WebSocket URL
        ws_url = self.client.base_url.replace("http://", "ws://").replace("https://", "wss://")
        ws_url = f"{ws_url}/socket.io/?EIO=4&transport=websocket"
        
        # Add auth token
        headers = {
            "Authorization": f"Bearer {self.client.api_key}"
        }
        
        self.ws = WebSocketApp(
            ws_url,
            header=headers,
            on_open=self._on_open,
            on_message=self._on_message,
            on_error=self._on_error,
            on_close=self._on_close
        )
        
        # Run WebSocket in a separate thread
        self.ws_thread = threading.Thread(target=self._run_websocket)
        self.ws_thread.daemon = True
        self.ws_thread.start()
        
        # Wait for connection
        import time
        timeout = 5
        start = time.time()
        while not self.connected and time.time() - start < timeout:
            time.sleep(0.1)
        
        if not self.connected:
            raise ConnectionError("Failed to connect to WebSocket server")
    
    def _run_websocket(self):
        """Run the WebSocket connection"""
        try:
            self.ws.run_forever()
        except Exception as e:
            if not self._closing:
                raise WebSocketError(f"WebSocket error: {str(e)}")
    
    def _on_open(self, ws):
        """Handle WebSocket connection open"""
        self.connected = True
        
        # Send Socket.IO handshake
        self.ws.send("40")
        
        # Resubscribe to existing subscriptions
        for event, callbacks in self.subscriptions.items():
            if callbacks:
                self._send_subscription(event)
    
    def _on_message(self, ws, message):
        """Handle incoming WebSocket messages"""
        # Parse Socket.IO message format
        if message.startswith("42"):
            try:
                data = json.loads(message[2:])
                event_name = data[0]
                event_data = data[1] if len(data) > 1 else {}
                
                # Route to appropriate handlers
                if event_name in self.subscriptions:
                    for callback in self.subscriptions[event_name]:
                        try:
                            callback(event_data)
                        except Exception as e:
                            print(f"Error in callback: {e}")
                            
            except json.JSONDecodeError:
                pass
    
    def _on_error(self, ws, error):
        """Handle WebSocket errors"""
        if not self._closing:
            print(f"WebSocket error: {error}")
    
    def _on_close(self, ws, close_status_code, close_msg):
        """Handle WebSocket close"""
        self.connected = False
        if not self._closing:
            print(f"WebSocket closed: {close_status_code} - {close_msg}")
    
    def _send_subscription(self, event: str, data: Optional[Dict[str, Any]] = None):
        """Send a subscription message"""
        if not self.connected:
            self.connect()
        
        message = ["subscribe:" + event]
        if data:
            message.append(data)
        
        self.ws.send("42" + json.dumps(message))
    
    def _send_unsubscription(self, event: str, data: Optional[Dict[str, Any]] = None):
        """Send an unsubscription message"""
        if not self.connected:
            return
        
        message = ["unsubscribe:" + event]
        if data:
            message.append(data)
        
        self.ws.send("42" + json.dumps(message))
    
    def subscribe_airport(self, airport: str, callback: Callable, types: Optional[List[str]] = None):
        """
        Subscribe to airport updates
        
        Args:
            airport: Airport IATA code
            callback: Function to call on updates
            types: Event types to subscribe to (default: all)
        """
        if not self.connected:
            self.connect()
        
        event = f"airport:{airport.upper()}"
        
        if event not in self.subscriptions:
            self.subscriptions[event] = set()
        
        self.subscriptions[event].add(callback)
        
        data = {"airport": airport}
        if types:
            data["types"] = types
        
        self._send_subscription("airport", data)
    
    def subscribe_flight(self, flight_id: str, callback: Callable):
        """
        Subscribe to flight updates
        
        Args:
            flight_id: Flight identifier
            callback: Function to call on updates
        """
        if not self.connected:
            self.connect()
        
        event = f"flight:{flight_id}"
        
        if event not in self.subscriptions:
            self.subscriptions[event] = set()
        
        self.subscriptions[event].add(callback)
        
        self._send_subscription("flight", {"flightId": flight_id})
    
    def subscribe_route(self, origin: str, destination: str, callback: Callable):
        """
        Subscribe to route updates
        
        Args:
            origin: Origin airport code
            destination: Destination airport code
            callback: Function to call on updates
        """
        if not self.connected:
            self.connect()
        
        event = f"route:{origin}-{destination}"
        
        if event not in self.subscriptions:
            self.subscriptions[event] = set()
        
        self.subscriptions[event].add(callback)
        
        self._send_subscription("route", {
            "origin": origin,
            "destination": destination
        })
    
    def unsubscribe_airport(self, airport: str, callback: Optional[Callable] = None):
        """
        Unsubscribe from airport updates
        
        Args:
            airport: Airport IATA code
            callback: Specific callback to remove (or all if None)
        """
        event = f"airport:{airport.upper()}"
        
        if event in self.subscriptions:
            if callback:
                self.subscriptions[event].discard(callback)
            else:
                self.subscriptions[event].clear()
            
            if not self.subscriptions[event]:
                del self.subscriptions[event]
                self._send_unsubscription("airport", {"airport": airport})
    
    def unsubscribe_flight(self, flight_id: str, callback: Optional[Callable] = None):
        """
        Unsubscribe from flight updates
        
        Args:
            flight_id: Flight identifier
            callback: Specific callback to remove (or all if None)
        """
        event = f"flight:{flight_id}"
        
        if event in self.subscriptions:
            if callback:
                self.subscriptions[event].discard(callback)
            else:
                self.subscriptions[event].clear()
            
            if not self.subscriptions[event]:
                del self.subscriptions[event]
                self._send_unsubscription("flight", {"flightId": flight_id})
    
    def unsubscribe_route(self, origin: str, destination: str, callback: Optional[Callable] = None):
        """
        Unsubscribe from route updates
        
        Args:
            origin: Origin airport code
            destination: Destination airport code
            callback: Specific callback to remove (or all if None)
        """
        event = f"route:{origin}-{destination}"
        
        if event in self.subscriptions:
            if callback:
                self.subscriptions[event].discard(callback)
            else:
                self.subscriptions[event].clear()
            
            if not self.subscriptions[event]:
                del self.subscriptions[event]
                self._send_unsubscription("route", {
                    "origin": origin,
                    "destination": destination
                })
    
    def close(self):
        """Close the WebSocket connection"""
        self._closing = True
        
        if self.ws and self.connected:
            self.ws.close()
        
        if self.ws_thread and self.ws_thread.is_alive():
            self.ws_thread.join(timeout=2)
        
        self.subscriptions.clear()
        self.connected = False
        self._closing = False