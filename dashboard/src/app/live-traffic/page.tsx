'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plane, PlaneLanding, PlaneTakeoff, Circle, Activity } from 'lucide-react';
import { format } from 'date-fns';
import { apiClient } from '@/services/api';
import { Spinner } from '@/components/ui/Spinner';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { useRealtimeUpdates } from '@/hooks/useRealtimeUpdates';
import { RealtimeNotifications } from '@/components/RealtimeNotifications';

interface AirportTraffic {
  airport: string;
  timestamp: Date;
  activeFlights: {
    inbound: Flight[];
    outbound: Flight[];
    onGround: Flight[];
  };
  statistics: {
    totalActive: number;
    inboundCount: number;
    outboundCount: number;
    delayedCount: number;
    nextHourArrivals: number;
    nextHourDepartures: number;
  };
  runways: {
    active: number;
    total: number;
  };
}

interface Flight {
  id: string;
  flightNumber: string;
  airline: string;
  origin: string;
  destination: string;
  status: string;
  estimatedTime: string;
  altitude?: number;
  speed?: number;
  distance?: number;
  gate?: string;
}

export default function LiveTrafficPage() {
  const [selectedAirport, setSelectedAirport] = useState('SFO');
  const [showNotifications, setShowNotifications] = useState(true);
  const [autoRotate, setAutoRotate] = useState(true);
  
  const airports = ['SFO', 'YYZ', 'YVR'];

  // Real-time updates
  const { connected, lastUpdate } = useRealtimeUpdates({
    airport: selectedAirport,
    onUpdate: (update) => {
      // Handle real-time updates
      console.log('Traffic update:', update);
    }
  });

  // Fetch live traffic data
  const { data: traffic, isLoading, error, refetch } = useQuery<AirportTraffic>({
    queryKey: ['liveTraffic', selectedAirport],
    queryFn: async () => {
      // This would be a real API call
      const mockData: AirportTraffic = {
        airport: selectedAirport,
        timestamp: new Date(),
        activeFlights: {
          inbound: generateMockFlights('inbound', 8),
          outbound: generateMockFlights('outbound', 6),
          onGround: generateMockFlights('ground', 12)
        },
        statistics: {
          totalActive: 26,
          inboundCount: 8,
          outboundCount: 6,
          delayedCount: 3,
          nextHourArrivals: 15,
          nextHourDepartures: 12
        },
        runways: {
          active: 2,
          total: 4
        }
      };
      return mockData;
    },
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  // Auto-rotate through airports
  useEffect(() => {
    if (!autoRotate) return;
    
    const interval = setInterval(() => {
      setSelectedAirport(prev => {
        const currentIndex = airports.indexOf(prev);
        return airports[(currentIndex + 1) % airports.length];
      });
    }, 60000); // Rotate every minute

    return () => clearInterval(interval);
  }, [autoRotate]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !traffic) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Failed to load traffic data</p>
          <button
            onClick={() => refetch()}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold">Live Airport Traffic</h1>
              <div className="flex items-center gap-2">
                <div className={`h-3 w-3 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'} animate-pulse`} />
                <span className="text-sm text-gray-400">
                  {connected ? 'Live' : 'Offline'}
                </span>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <select
                value={selectedAirport}
                onChange={(e) => setSelectedAirport(e.target.value)}
                className="bg-gray-700 text-white px-4 py-2 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                {airports.map(airport => (
                  <option key={airport} value={airport}>{airport}</option>
                ))}
              </select>
              
              <button
                onClick={() => setAutoRotate(!autoRotate)}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  autoRotate 
                    ? 'bg-blue-600 hover:bg-blue-700' 
                    : 'bg-gray-700 hover:bg-gray-600'
                }`}
              >
                Auto-rotate: {autoRotate ? 'ON' : 'OFF'}
              </button>

              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg"
              >
                Notifications: {showNotifications ? 'ON' : 'OFF'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Statistics Bar */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-8">
          <Card className="bg-gray-800 border-gray-700 p-4">
            <div className="text-center">
              <p className="text-3xl font-bold text-blue-400">{traffic.statistics.totalActive}</p>
              <p className="text-sm text-gray-400">Active Flights</p>
            </div>
          </Card>
          
          <Card className="bg-gray-800 border-gray-700 p-4">
            <div className="text-center">
              <p className="text-3xl font-bold text-green-400">{traffic.statistics.inboundCount}</p>
              <p className="text-sm text-gray-400">Inbound</p>
            </div>
          </Card>
          
          <Card className="bg-gray-800 border-gray-700 p-4">
            <div className="text-center">
              <p className="text-3xl font-bold text-blue-400">{traffic.statistics.outboundCount}</p>
              <p className="text-sm text-gray-400">Outbound</p>
            </div>
          </Card>
          
          <Card className="bg-gray-800 border-gray-700 p-4">
            <div className="text-center">
              <p className="text-3xl font-bold text-yellow-400">{traffic.statistics.delayedCount}</p>
              <p className="text-sm text-gray-400">Delayed</p>
            </div>
          </Card>
          
          <Card className="bg-gray-800 border-gray-700 p-4">
            <div className="text-center">
              <p className="text-3xl font-bold text-purple-400">{traffic.runways.active}/{traffic.runways.total}</p>
              <p className="text-sm text-gray-400">Active Runways</p>
            </div>
          </Card>
          
          <Card className="bg-gray-800 border-gray-700 p-4">
            <div className="text-center">
              <p className="text-sm text-gray-400">Next Hour</p>
              <div className="flex justify-center gap-2 mt-1">
                <span className="text-green-400">↓{traffic.statistics.nextHourArrivals}</span>
                <span className="text-blue-400">↑{traffic.statistics.nextHourDepartures}</span>
              </div>
            </div>
          </Card>
        </div>

        {/* Visual Traffic Display */}
        <Card className="bg-gray-800 border-gray-700 p-6 mb-8">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Activity className="h-6 w-6" />
            Air Traffic Visualization
          </h2>
          
          <div className="relative h-96 bg-gray-900 rounded-lg overflow-hidden">
            {/* Airport Center */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
              <div className="w-32 h-32 bg-gray-700 rounded-full flex items-center justify-center">
                <span className="text-2xl font-bold">{selectedAirport}</span>
              </div>
            </div>
            
            {/* Inbound Flights */}
            {traffic.activeFlights.inbound.slice(0, 6).map((flight, index) => {
              const angle = (index * 60) * Math.PI / 180;
              const radius = 120 + (index % 2) * 30;
              const x = Math.cos(angle) * radius;
              const y = Math.sin(angle) * radius;
              
              return (
                <div
                  key={flight.id}
                  className="absolute transform -translate-x-1/2 -translate-y-1/2"
                  style={{
                    top: '50%',
                    left: '50%',
                    transform: `translate(${x}px, ${y}px)`
                  }}
                >
                  <div className="relative group">
                    <PlaneLanding className="h-6 w-6 text-green-400 animate-pulse" />
                    <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-700 px-2 py-1 rounded text-xs whitespace-nowrap">
                      {flight.flightNumber} from {flight.origin}
                    </div>
                  </div>
                </div>
              );
            })}
            
            {/* Outbound Flights */}
            {traffic.activeFlights.outbound.slice(0, 6).map((flight, index) => {
              const angle = ((index * 60) + 30) * Math.PI / 180;
              const radius = 150 + (index % 2) * 30;
              const x = Math.cos(angle) * radius;
              const y = Math.sin(angle) * radius;
              
              return (
                <div
                  key={flight.id}
                  className="absolute transform -translate-x-1/2 -translate-y-1/2"
                  style={{
                    top: '50%',
                    left: '50%',
                    transform: `translate(${x}px, ${y}px)`
                  }}
                >
                  <div className="relative group">
                    <PlaneTakeoff className="h-6 w-6 text-blue-400 animate-pulse" />
                    <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-700 px-2 py-1 rounded text-xs whitespace-nowrap">
                      {flight.flightNumber} to {flight.destination}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Flight Lists */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Inbound Flights */}
          <Card className="bg-gray-800 border-gray-700 p-4">
            <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
              <PlaneLanding className="h-5 w-5 text-green-400" />
              Inbound Flights
            </h3>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {traffic.activeFlights.inbound.map(flight => (
                <div key={flight.id} className="bg-gray-900 p-3 rounded-lg">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">{flight.flightNumber}</p>
                      <p className="text-sm text-gray-400">
                        {flight.origin} → {selectedAirport}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge variant={flight.status === 'delayed' ? 'warning' : 'success'}>
                        {flight.status}
                      </Badge>
                      <p className="text-xs text-gray-400 mt-1">
                        ETA: {format(new Date(flight.estimatedTime), 'HH:mm')}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* On Ground */}
          <Card className="bg-gray-800 border-gray-700 p-4">
            <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
              <Plane className="h-5 w-5 text-gray-400" />
              On Ground
            </h3>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {traffic.activeFlights.onGround.map(flight => (
                <div key={flight.id} className="bg-gray-900 p-3 rounded-lg">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">{flight.flightNumber}</p>
                      <p className="text-sm text-gray-400">
                        Gate {flight.gate || 'TBD'}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge variant="default">
                        {flight.status}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Outbound Flights */}
          <Card className="bg-gray-800 border-gray-700 p-4">
            <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
              <PlaneTakeoff className="h-5 w-5 text-blue-400" />
              Outbound Flights
            </h3>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {traffic.activeFlights.outbound.map(flight => (
                <div key={flight.id} className="bg-gray-900 p-3 rounded-lg">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">{flight.flightNumber}</p>
                      <p className="text-sm text-gray-400">
                        {selectedAirport} → {flight.destination}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge variant={flight.status === 'delayed' ? 'warning' : 'info'}>
                        {flight.status}
                      </Badge>
                      <p className="text-xs text-gray-400 mt-1">
                        ETD: {format(new Date(flight.estimatedTime), 'HH:mm')}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </main>

      {/* Real-time Notifications */}
      {showNotifications && (
        <RealtimeNotifications 
          airport={selectedAirport} 
          position="bottom-right"
          maxNotifications={3}
        />
      )}
    </div>
  );
}

// Mock data generator
function generateMockFlights(type: 'inbound' | 'outbound' | 'ground', count: number): Flight[] {
  const airlines = ['AC', 'UA', 'DL', 'AA', 'WS', 'AS', 'B6'];
  const airports = ['LAX', 'ORD', 'DFW', 'DEN', 'JFK', 'SEA', 'PHX', 'LAS'];
  const statuses = type === 'ground' 
    ? ['boarding', 'departing', 'arrived'] 
    : ['on-time', 'delayed', 'on-time', 'on-time']; // More on-time flights
  
  return Array.from({ length: count }, (_, i) => ({
    id: `${type}-${i}`,
    flightNumber: `${airlines[Math.floor(Math.random() * airlines.length)]}${Math.floor(Math.random() * 900) + 100}`,
    airline: airlines[Math.floor(Math.random() * airlines.length)],
    origin: type === 'inbound' ? airports[Math.floor(Math.random() * airports.length)] : 'SFO',
    destination: type === 'outbound' ? airports[Math.floor(Math.random() * airports.length)] : 'SFO',
    status: statuses[Math.floor(Math.random() * statuses.length)],
    estimatedTime: new Date(Date.now() + (Math.random() * 2 * 60 * 60 * 1000)).toISOString(),
    altitude: type !== 'ground' ? Math.floor(Math.random() * 30000) + 10000 : undefined,
    speed: type !== 'ground' ? Math.floor(Math.random() * 200) + 400 : undefined,
    distance: type !== 'ground' ? Math.floor(Math.random() * 200) + 50 : undefined,
    gate: type === 'ground' ? `${String.fromCharCode(65 + Math.floor(Math.random() * 6))}${Math.floor(Math.random() * 50) + 1}` : undefined
  }));
}