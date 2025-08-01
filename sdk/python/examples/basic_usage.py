"""Basic usage examples for the Airport Flight Data SDK"""

from airport_flight_data import AirportFlightDataClient


def main():
    # Initialize client
    client = AirportFlightDataClient(
        api_key="your-api-key-here",
        base_url="http://localhost:3001"  # Change to production URL
    )
    
    try:
        # List flights from SFO
        print("=== Flights from SFO ===")
        flights = client.flights.list(
            airport="SFO",
            type="departure",
            limit=5
        )
        
        for flight in flights:
            print(f"Flight {flight['flightNumber']} to {flight['destination']} at {flight['scheduledTime']}")
        
        # Get airport statistics
        print("\n=== SFO Statistics ===")
        stats = client.airports.get_stats("SFO")
        print(f"Total flights: {stats.get('totalFlights', 0)}")
        print(f"On-time performance: {stats.get('onTimePercentage', 0)}%")
        print(f"Average delay: {stats.get('averageDelay', 0)} minutes")
        
        # Search for a specific flight
        print("\n=== Search for Flight ===")
        search_results = client.flights.search(
            flight_number="UA123",
            date="2025-08-01"
        )
        
        if search_results:
            flight = search_results[0]
            print(f"Found flight {flight['flightNumber']}")
            print(f"Status: {flight['status']}")
            print(f"Gate: {flight.get('gate', 'TBD')}")
        
        # Get delayed flights
        print("\n=== Delayed Flights ===")
        delayed = client.flights.get_delays(
            airport="SFO",
            min_delay=30  # 30+ minutes
        )
        
        print(f"Found {len(delayed)} delayed flights")
        for flight in delayed[:3]:
            print(f"- {flight['flightNumber']}: {flight['delayMinutes']} min delay")
        
        # Get airport list
        print("\n=== Available Airports ===")
        airports = client.airports.list()
        for airport in airports:
            print(f"- {airport['code']}: {airport['name']}")
        
        # Get system statistics
        print("\n=== System Overview ===")
        overview = client.statistics.get_overview()
        print(f"Total airports: {overview.get('totalAirports', 0)}")
        print(f"Total flights tracked: {overview.get('totalFlights', 0)}")
        print(f"System uptime: {overview.get('uptime', 'N/A')}")
        
    except Exception as e:
        print(f"Error: {e}")
    
    finally:
        # Clean up
        client.close()


if __name__ == "__main__":
    main()