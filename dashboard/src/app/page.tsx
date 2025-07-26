'use client';

import { useState } from 'react';
import { LiveFlightsDisplay } from '@/components/flights/LiveFlightsDisplay';
import { Search } from 'lucide-react';

export default function HomePage() {
  const [selectedAirport, setSelectedAirport] = useState('YVR');
  const [airportInput, setAirportInput] = useState('');

  const handleAirportChange = (e: React.FormEvent) => {
    e.preventDefault();
    if (airportInput.length === 3) {
      setSelectedAirport(airportInput.toUpperCase());
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-gray-900">
              Airport Flight Tracker
            </h1>
            
            <form onSubmit={handleAirportChange} className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={airportInput}
                  onChange={(e) => setAirportInput(e.target.value)}
                  placeholder="Airport code (e.g., YVR)"
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <LiveFlightsDisplay airport={selectedAirport} />
      </main>
    </div>
  );
}
