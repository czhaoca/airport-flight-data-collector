"""Real-time monitoring example using WebSocket subscriptions"""

import time
import signal
import sys
from airport_flight_data import AirportFlightDataClient


class FlightMonitor:
    def __init__(self, api_key: str, base_url: str = "http://localhost:3001"):
        self.client = AirportFlightDataClient(api_key=api_key, base_url=base_url)
        self.running = True
        
        # Set up signal handler for graceful shutdown
        signal.signal(signal.SIGINT, self._signal_handler)
    
    def _signal_handler(self, sig, frame):
        print("\nShutting down monitor...")
        self.running = False
        self.client.close()
        sys.exit(0)
    
    def on_airport_update(self, data):
        """Handle airport updates"""
        print(f"\n[AIRPORT UPDATE] {data.get('airport', 'Unknown')}")
        print(f"  Type: {data.get('type', 'N/A')}")
        print(f"  Time: {data.get('timestamp', 'N/A')}")
        
        if 'stats' in data:
            stats = data['stats']
            print(f"  Active flights: {stats.get('activeFlights', 0)}")
            print(f"  Delays: {stats.get('delayedFlights', 0)}")
    
    def on_flight_update(self, data):
        """Handle flight updates"""
        print(f"\n[FLIGHT UPDATE] {data.get('flightNumber', 'Unknown')}")
        print(f"  Status: {data.get('status', 'N/A')}")
        print(f"  Gate: {data.get('gate', 'TBD')}")
        
        if 'delay' in data:
            print(f"  Delay: {data['delay']['minutes']} minutes")
            print(f"  Reason: {data['delay'].get('reason', 'Unknown')}")
    
    def on_delay_notification(self, data):
        """Handle delay notifications"""
        flight = data.get('flight', {})
        delay = data.get('delay', {})
        
        print(f"\n🚨 [DELAY ALERT] Flight {flight.get('flightNumber', 'Unknown')}")
        print(f"  Route: {flight.get('origin', 'N/A')} → {flight.get('destination', 'N/A')}")
        print(f"  Delay: {delay.get('minutes', 0)} minutes")
        print(f"  New time: {delay.get('newTime', 'TBD')}")
        print(f"  Reason: {delay.get('reason', 'Unknown')}")
    
    def on_cancellation(self, data):
        """Handle cancellation notifications"""
        flight = data.get('flight', {})
        
        print(f"\n❌ [CANCELLATION] Flight {flight.get('flightNumber', 'Unknown')}")
        print(f"  Route: {flight.get('origin', 'N/A')} → {flight.get('destination', 'N/A')}")
        print(f"  Reason: {data.get('cancellationReason', 'Unknown')}")
    
    def monitor_airport(self, airport_code: str):
        """Monitor an airport for real-time updates"""
        print(f"Starting real-time monitoring for {airport_code}...")
        
        # Subscribe to various events
        self.client.websocket.subscribe_airport(
            airport_code,
            self.on_airport_update,
            types=['all']
        )
        
        print(f"✓ Subscribed to {airport_code} updates")
        print("Waiting for real-time events... (Press Ctrl+C to stop)")
        
        # Keep the script running
        while self.running:
            time.sleep(1)
    
    def monitor_specific_flight(self, flight_id: str):
        """Monitor a specific flight"""
        print(f"Monitoring flight {flight_id}...")
        
        self.client.websocket.subscribe_flight(
            flight_id,
            self.on_flight_update
        )
        
        print(f"✓ Subscribed to flight {flight_id}")
        print("Waiting for updates...")
        
        while self.running:
            time.sleep(1)
    
    def monitor_route(self, origin: str, destination: str):
        """Monitor a specific route"""
        print(f"Monitoring route {origin} → {destination}...")
        
        def on_route_update(data):
            print(f"\n[ROUTE UPDATE] {origin} → {destination}")
            print(f"  Active flights: {data.get('activeFlights', 0)}")
            print(f"  Average delay: {data.get('averageDelay', 0)} min")
            
            if 'flights' in data:
                print("  Recent flights:")
                for flight in data['flights'][:3]:
                    print(f"    - {flight['flightNumber']}: {flight['status']}")
        
        self.client.websocket.subscribe_route(
            origin,
            destination,
            on_route_update
        )
        
        print(f"✓ Subscribed to route updates")
        print("Waiting for updates...")
        
        while self.running:
            time.sleep(1)
    
    def comprehensive_monitoring(self, airports: list):
        """Monitor multiple airports with different event handlers"""
        print("Starting comprehensive monitoring...")
        
        # Subscribe to multiple airports
        for airport in airports:
            self.client.websocket.subscribe_airport(
                airport,
                self.on_airport_update
            )
            print(f"✓ Subscribed to {airport}")
        
        # Subscribe to specific event types
        # Note: In a real implementation, you'd subscribe to specific WebSocket events
        print("\n✓ Monitoring for:")
        print("  - Flight delays")
        print("  - Cancellations")
        print("  - Gate changes")
        print("  - Status updates")
        
        print("\nWaiting for events... (Press Ctrl+C to stop)")
        
        while self.running:
            time.sleep(1)


def main():
    # Example usage
    API_KEY = "your-api-key-here"
    
    monitor = FlightMonitor(API_KEY)
    
    # Example 1: Monitor a single airport
    # monitor.monitor_airport("SFO")
    
    # Example 2: Monitor a specific flight
    # monitor.monitor_specific_flight("UA123")
    
    # Example 3: Monitor a route
    # monitor.monitor_route("SFO", "LAX")
    
    # Example 4: Comprehensive monitoring
    monitor.comprehensive_monitoring(["SFO", "LAX", "ORD"])


if __name__ == "__main__":
    main()