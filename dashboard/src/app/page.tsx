'use client';

import { useState } from 'react';
import { OverviewStats } from '@/components/dashboard/OverviewStats';
import { RecentAlerts } from '@/components/dashboard/RecentAlerts';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { ActivityFeed } from '@/components/dashboard/ActivityFeed';
import { LiveFlightsDisplay } from '@/components/flights/LiveFlightsDisplay';
import { FlightVolumeChart } from '@/components/charts/FlightVolumeChart';
import { FlightDelayChart } from '@/components/charts/FlightDelayChart';
import { Search, RefreshCw } from 'lucide-react';

export default function HomePage() {
  const [selectedAirport, setSelectedAirport] = useState('SFO');
  const [airportInput, setAirportInput] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const handleAirportChange = (e: React.FormEvent) => {
    e.preventDefault();
    if (airportInput.length === 3) {
      setSelectedAirport(airportInput.toUpperCase());
      setAirportInput('');
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    // Trigger a refresh of all data
    await new Promise(resolve => setTimeout(resolve, 1000));
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Flight Data Dashboard
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Real-time monitoring and analytics for airport operations
              </p>
            </div>
            <div className="flex items-center gap-4">
              <form onSubmit={handleAirportChange} className="flex gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    value={airportInput}
                    onChange={(e) => setAirportInput(e.target.value.toUpperCase())}
                    placeholder="Airport code"
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-32"
                    maxLength={3}
                  />
                </div>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Search
                </button>
              </form>
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Overview */}
        <div className="mb-8">
          <OverviewStats />
        </div>

        {/* Quick Actions and Alerts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          <div className="lg:col-span-2">
            <QuickActions />
          </div>
          <div>
            <RecentAlerts />
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <FlightVolumeChart airport={selectedAirport} />
          <FlightDelayChart airport={selectedAirport} />
        </div>

        {/* Live Flights and Activity Feed */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          <div className="lg:col-span-2">
            <LiveFlightsDisplay airport={selectedAirport} />
          </div>
          <div>
            <ActivityFeed />
          </div>
        </div>
      </main>
    </div>
  );
}
