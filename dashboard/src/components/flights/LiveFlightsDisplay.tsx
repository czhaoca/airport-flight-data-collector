'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/Tabs';
import { RefreshCw, Plane, PlaneLanding, PlaneTakeoff } from 'lucide-react';
import { apiClient } from '@/services/api';
import { LiveFlights, Flight } from '@/types';
import { FlightCard } from './FlightCard';
import { Spinner } from '../ui/Spinner';
import { Badge } from '../ui/Badge';

interface LiveFlightsDisplayProps {
  airport: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export function LiveFlightsDisplay({
  airport,
  autoRefresh = true,
  refreshInterval = 60000, // 1 minute
}: LiveFlightsDisplayProps) {
  const [selectedTab, setSelectedTab] = useState<'arrivals' | 'departures'>('arrivals');
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const { data, isLoading, error, refetch } = useQuery<LiveFlights>({
    queryKey: ['liveFlights', airport, selectedTab],
    queryFn: () => apiClient.getLiveFlights(airport, selectedTab === 'arrivals' ? 'arrival' : 'departure'),
    refetchInterval: autoRefresh ? refreshInterval : false,
  });

  useEffect(() => {
    if (data) {
      setLastUpdate(new Date());
    }
  }, [data]);

  const handleManualRefresh = () => {
    refetch();
  };

  const renderFlightSection = (title: string, flights: Flight[], icon: React.ReactNode) => {
    if (flights.length === 0) return null;

    return (
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          {icon}
          <h3 className="text-lg font-semibold">{title}</h3>
          <Badge variant="info" className="ml-2">
            {flights.length}
          </Badge>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {flights.map((flight) => (
            <FlightCard key={flight.id} flight={flight} />
          ))}
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 mb-4">Failed to load live flights</p>
        <button
          onClick={handleManualRefresh}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (!data) return null;

  const flights = data.flights;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Live Flights - {airport}</h2>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">
            Last updated: {lastUpdate.toLocaleTimeString()}
          </span>
          <button
            onClick={handleManualRefresh}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            title="Refresh"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      <Tabs value={selectedTab} onValueChange={(v) => setSelectedTab(v as 'arrivals' | 'departures')}>
        <TabsList className="flex gap-2 mb-6 border-b">
          <TabsTrigger
            value="arrivals"
            className={`px-4 py-2 border-b-2 transition-colors ${
              selectedTab === 'arrivals'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent hover:text-gray-700'
            }`}
          >
            <PlaneLanding className="h-4 w-4 mr-2 inline" />
            Arrivals
          </TabsTrigger>
          <TabsTrigger
            value="departures"
            className={`px-4 py-2 border-b-2 transition-colors ${
              selectedTab === 'departures'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent hover:text-gray-700'
            }`}
          >
            <PlaneTakeoff className="h-4 w-4 mr-2 inline" />
            Departures
          </TabsTrigger>
        </TabsList>

        <TabsContent value="arrivals">
          {renderFlightSection(
            'Boarding',
            flights.boarding.filter(f => f.origin.airport !== airport),
            <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
          )}
          {renderFlightSection(
            'In Flight',
            flights.inFlight.filter(f => f.destination.airport === airport),
            <Plane className="h-5 w-5 text-blue-600" />
          )}
          {renderFlightSection(
            'Landed',
            flights.landed,
            <PlaneLanding className="h-5 w-5 text-green-600" />
          )}
          {renderFlightSection(
            'Delayed',
            flights.delayed.filter(f => f.destination.airport === airport),
            <div className="h-2 w-2 bg-yellow-500 rounded-full" />
          )}
          {renderFlightSection(
            'Cancelled',
            flights.cancelled.filter(f => f.destination.airport === airport),
            <div className="h-2 w-2 bg-red-500 rounded-full" />
          )}
        </TabsContent>

        <TabsContent value="departures">
          {renderFlightSection(
            'Boarding',
            flights.boarding.filter(f => f.origin.airport === airport),
            <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
          )}
          {renderFlightSection(
            'Departed',
            flights.departed,
            <PlaneTakeoff className="h-5 w-5 text-blue-600" />
          )}
          {renderFlightSection(
            'Delayed',
            flights.delayed.filter(f => f.origin.airport === airport),
            <div className="h-2 w-2 bg-yellow-500 rounded-full" />
          )}
          {renderFlightSection(
            'Cancelled',
            flights.cancelled.filter(f => f.origin.airport === airport),
            <div className="h-2 w-2 bg-red-500 rounded-full" />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}