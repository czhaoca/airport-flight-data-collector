'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Calendar, TrendingUp, Clock, Plane } from 'lucide-react';
import { format, subDays } from 'date-fns';
import { apiClient } from '@/services/api';
import { FlightDelayChart } from '@/components/charts/FlightDelayChart';
import { FlightVolumeChart } from '@/components/charts/FlightVolumeChart';
import { AirlinePerformanceChart } from '@/components/charts/AirlinePerformanceChart';
import { HourlyDistributionChart } from '@/components/charts/HourlyDistributionChart';
import { Spinner } from '@/components/ui/Spinner';
import { Card } from '@/components/ui/Card';

export default function HistoricalPage() {
  const [selectedAirport, setSelectedAirport] = useState('YVR');
  const [dateRange, setDateRange] = useState(30); // days

  const { data, isLoading, error } = useQuery({
    queryKey: ['historicalData', selectedAirport, dateRange],
    queryFn: () => apiClient.getHistoricalData(
      selectedAirport,
      format(subDays(new Date(), dateRange), 'yyyy-MM-dd'),
      format(new Date(), 'yyyy-MM-dd')
    ),
  });

  const airports = ['SFO', 'YYZ', 'YVR'];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Failed to load historical data</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900">
              Historical Flight Data
            </h2>
            
            <div className="flex gap-4">
              <select
                value={selectedAirport}
                onChange={(e) => setSelectedAirport(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {airports.map(airport => (
                  <option key={airport} value={airport}>{airport}</option>
                ))}
              </select>
              
              <select
                value={dateRange}
                onChange={(e) => setDateRange(Number(e.target.value))}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value={7}>Last 7 days</option>
                <option value={14}>Last 14 days</option>
                <option value={30}>Last 30 days</option>
                <option value={90}>Last 90 days</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Flights</p>
                <p className="text-2xl font-bold">{data.summary.totalFlights.toLocaleString()}</p>
              </div>
              <Plane className="h-8 w-8 text-blue-600" />
            </div>
          </Card>
          
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">On-Time Rate</p>
                <p className="text-2xl font-bold">{data.summary.onTimeRate.toFixed(1)}%</p>
              </div>
              <Clock className="h-8 w-8 text-green-600" />
            </div>
          </Card>
          
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avg Delay</p>
                <p className="text-2xl font-bold">{data.summary.avgDelay} min</p>
              </div>
              <TrendingUp className="h-8 w-8 text-yellow-600" />
            </div>
          </Card>
          
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Cancellation Rate</p>
                <p className="text-2xl font-bold">{data.summary.cancellationRate.toFixed(1)}%</p>
              </div>
              <Calendar className="h-8 w-8 text-red-600" />
            </div>
          </Card>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6">
            <FlightVolumeChart data={data.dailyVolume} />
          </Card>
          
          <Card className="p-6">
            <FlightDelayChart data={data.dailyDelays} />
          </Card>
          
          <Card className="p-6">
            <HourlyDistributionChart data={data.hourlyDistribution} />
          </Card>
          
          <Card className="p-6">
            <AirlinePerformanceChart data={data.airlinePerformance} />
          </Card>
        </div>

        {/* Detailed Statistics */}
        <Card className="mt-6 p-6">
          <h2 className="text-xl font-bold mb-4">Top Routes</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Route</th>
                  <th className="text-right py-2">Flights</th>
                  <th className="text-right py-2">On-Time %</th>
                  <th className="text-right py-2">Avg Delay</th>
                </tr>
              </thead>
              <tbody>
                {data.topRoutes.map((route: any, index: number) => (
                  <tr key={index} className="border-b">
                    <td className="py-2">{route.origin} → {route.destination}</td>
                    <td className="text-right py-2">{route.flightCount}</td>
                    <td className="text-right py-2">{route.onTimePercentage.toFixed(1)}%</td>
                    <td className="text-right py-2">{route.avgDelay} min</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </main>
    </div>
  );
}