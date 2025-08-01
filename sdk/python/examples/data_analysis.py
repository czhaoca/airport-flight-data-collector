"""Data analysis example using pandas integration"""

import pandas as pd
import matplotlib.pyplot as plt
from datetime import datetime, timedelta
from airport_flight_data import AirportFlightDataClient


def analyze_flight_data(api_key: str, airport: str = "SFO"):
    """Analyze flight data for an airport"""
    
    # Initialize client
    client = AirportFlightDataClient(
        api_key=api_key,
        base_url="http://localhost:3001"
    )
    
    try:
        # Calculate date range (last 30 days)
        end_date = datetime.now()
        start_date = end_date - timedelta(days=30)
        
        print(f"Fetching flight data for {airport} from {start_date.date()} to {end_date.date()}...")
        
        # Export flight data to DataFrame
        df = client.export.flights_to_dataframe(
            airport=airport,
            start_date=start_date.strftime("%Y-%m-%d"),
            end_date=end_date.strftime("%Y-%m-%d"),
            limit=5000
        )
        
        print(f"Retrieved {len(df)} flights")
        
        # Basic statistics
        print("\n=== Basic Statistics ===")
        print(f"Total flights: {len(df)}")
        print(f"Unique airlines: {df['airline'].nunique()}")
        print(f"Unique destinations: {df['destination'].nunique()}")
        
        # Convert time columns to datetime
        df['scheduledTime'] = pd.to_datetime(df['scheduledTime'])
        df['actualTime'] = pd.to_datetime(df['actualTime'], errors='coerce')
        
        # Calculate delays
        df['delayMinutes'] = (df['actualTime'] - df['scheduledTime']).dt.total_seconds() / 60
        df['isDelayed'] = df['delayMinutes'] > 15
        
        # Delay analysis
        print("\n=== Delay Analysis ===")
        delayed_flights = df[df['isDelayed']]
        print(f"Delayed flights: {len(delayed_flights)} ({len(delayed_flights)/len(df)*100:.1f}%)")
        print(f"Average delay: {df[df['isDelayed']]['delayMinutes'].mean():.1f} minutes")
        print(f"Maximum delay: {df['delayMinutes'].max():.1f} minutes")
        
        # Top delayed airlines
        print("\n=== Top 5 Airlines by Delay Rate ===")
        airline_delays = df.groupby('airline').agg({
            'isDelayed': ['sum', 'count']
        })
        airline_delays.columns = ['delayed_flights', 'total_flights']
        airline_delays['delay_rate'] = (airline_delays['delayed_flights'] / airline_delays['total_flights'] * 100)
        airline_delays = airline_delays.sort_values('delay_rate', ascending=False)
        
        for airline, row in airline_delays.head().iterrows():
            print(f"{airline}: {row['delay_rate']:.1f}% ({row['delayed_flights']}/{row['total_flights']} flights)")
        
        # Hourly distribution
        print("\n=== Busiest Hours ===")
        df['hour'] = df['scheduledTime'].dt.hour
        hourly_flights = df.groupby('hour').size()
        
        top_hours = hourly_flights.nlargest(5)
        for hour, count in top_hours.items():
            print(f"{hour:02d}:00 - {count} flights")
        
        # Day of week analysis
        print("\n=== Flights by Day of Week ===")
        df['dayOfWeek'] = df['scheduledTime'].dt.day_name()
        dow_order = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
        dow_flights = df['dayOfWeek'].value_counts().reindex(dow_order)
        
        for day, count in dow_flights.items():
            print(f"{day}: {count} flights")
        
        # Popular routes
        print("\n=== Top 10 Destinations ===")
        destinations = df['destination'].value_counts().head(10)
        for dest, count in destinations.items():
            print(f"{dest}: {count} flights")
        
        # Create visualizations
        create_visualizations(df, airport)
        
        # Export processed data
        print("\n=== Exporting Processed Data ===")
        
        # Daily summary
        daily_summary = df.groupby(df['scheduledTime'].dt.date).agg({
            'flightNumber': 'count',
            'isDelayed': 'sum',
            'delayMinutes': 'mean'
        }).rename(columns={
            'flightNumber': 'total_flights',
            'isDelayed': 'delayed_flights',
            'delayMinutes': 'avg_delay_minutes'
        })
        
        daily_summary.to_csv(f"{airport}_daily_summary.csv")
        print(f"✓ Daily summary saved to {airport}_daily_summary.csv")
        
        # Airline performance
        airline_performance = df.groupby('airline').agg({
            'flightNumber': 'count',
            'isDelayed': ['sum', 'mean'],
            'delayMinutes': 'mean'
        })
        airline_performance.columns = ['total_flights', 'delayed_flights', 'delay_rate', 'avg_delay_minutes']
        airline_performance = airline_performance.sort_values('total_flights', ascending=False)
        
        airline_performance.to_csv(f"{airport}_airline_performance.csv")
        print(f"✓ Airline performance saved to {airport}_airline_performance.csv")
        
    except Exception as e:
        print(f"Error: {e}")
    
    finally:
        client.close()


def create_visualizations(df: pd.DataFrame, airport: str):
    """Create data visualizations"""
    
    print("\n=== Creating Visualizations ===")
    
    # Set up the plot style
    plt.style.use('seaborn-v0_8-darkgrid')
    fig, axes = plt.subplots(2, 2, figsize=(15, 10))
    fig.suptitle(f'{airport} Flight Data Analysis', fontsize=16)
    
    # 1. Hourly distribution
    ax1 = axes[0, 0]
    df['hour'] = df['scheduledTime'].dt.hour
    hourly = df.groupby('hour').size()
    hourly.plot(kind='bar', ax=ax1, color='skyblue')
    ax1.set_title('Flights by Hour of Day')
    ax1.set_xlabel('Hour')
    ax1.set_ylabel('Number of Flights')
    
    # 2. Delay rate by airline (top 10)
    ax2 = axes[0, 1]
    airline_delays = df.groupby('airline').agg({
        'isDelayed': 'mean'
    }).sort_values('isDelayed', ascending=False).head(10)
    airline_delays['isDelayed'] *= 100  # Convert to percentage
    airline_delays.plot(kind='barh', ax=ax2, color='coral')
    ax2.set_title('Top 10 Airlines by Delay Rate')
    ax2.set_xlabel('Delay Rate (%)')
    ax2.set_ylabel('Airline')
    
    # 3. Daily flight volume
    ax3 = axes[1, 0]
    daily_flights = df.groupby(df['scheduledTime'].dt.date).size()
    daily_flights.plot(ax=ax3, color='green', linewidth=2)
    ax3.set_title('Daily Flight Volume')
    ax3.set_xlabel('Date')
    ax3.set_ylabel('Number of Flights')
    ax3.tick_params(axis='x', rotation=45)
    
    # 4. Delay distribution
    ax4 = axes[1, 1]
    delays = df[df['isDelayed']]['delayMinutes']
    delays[delays <= 180].hist(bins=30, ax=ax4, color='purple', alpha=0.7)
    ax4.set_title('Delay Distribution (0-180 minutes)')
    ax4.set_xlabel('Delay (minutes)')
    ax4.set_ylabel('Number of Flights')
    
    plt.tight_layout()
    plt.savefig(f'{airport}_analysis.png', dpi=300, bbox_inches='tight')
    print(f"✓ Visualizations saved to {airport}_analysis.png")
    plt.close()
    
    # Create a separate delay trend chart
    fig2, ax = plt.subplots(figsize=(12, 6))
    
    # Daily delay trend
    daily_delays = df.groupby(df['scheduledTime'].dt.date).agg({
        'isDelayed': 'mean',
        'delayMinutes': 'mean'
    })
    daily_delays['isDelayed'] *= 100  # Convert to percentage
    
    ax.plot(daily_delays.index, daily_delays['isDelayed'], 
            label='Delay Rate (%)', color='red', linewidth=2)
    ax2 = ax.twinx()
    ax2.plot(daily_delays.index, daily_delays['delayMinutes'], 
             label='Avg Delay (min)', color='blue', linewidth=2, alpha=0.7)
    
    ax.set_xlabel('Date')
    ax.set_ylabel('Delay Rate (%)', color='red')
    ax2.set_ylabel('Average Delay (minutes)', color='blue')
    ax.tick_params(axis='x', rotation=45)
    ax.set_title(f'{airport} Daily Delay Trends')
    
    # Add legends
    lines1, labels1 = ax.get_legend_handles_labels()
    lines2, labels2 = ax2.get_legend_handles_labels()
    ax.legend(lines1 + lines2, labels1 + labels2, loc='upper left')
    
    plt.tight_layout()
    plt.savefig(f'{airport}_delay_trends.png', dpi=300, bbox_inches='tight')
    print(f"✓ Delay trends saved to {airport}_delay_trends.png")
    plt.close()


def main():
    API_KEY = "your-api-key-here"
    
    # Analyze data for SFO
    analyze_flight_data(API_KEY, "SFO")
    
    # You can also analyze other airports
    # analyze_flight_data(API_KEY, "LAX")
    # analyze_flight_data(API_KEY, "ORD")


if __name__ == "__main__":
    main()