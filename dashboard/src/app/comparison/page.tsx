'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, TrendingUp, Clock, AlertCircle } from 'lucide-react';
import { format, subDays } from 'date-fns';
import { apiClient } from '@/services/api';
import { Spinner } from '@/components/ui/Spinner';
import { Card } from '@/components/ui/Card';
import { Bar, Radar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler
);

export default function ComparisonPage() {
  const [selectedAirports, setSelectedAirports] = useState(['SFO', 'YYZ', 'YVR']);
  const [dateRange, setDateRange] = useState(30); // days
  const [comparisonMetric, setComparisonMetric] = useState<'volume' | 'performance' | 'delays'>('performance');

  const startDate = format(subDays(new Date(), dateRange), 'yyyy-MM-dd');
  const endDate = format(new Date(), 'yyyy-MM-dd');

  const { data: airportData, isLoading, error } = useQuery({
    queryKey: ['airportComparison', selectedAirports, startDate, endDate],
    queryFn: async () => {
      const promises = selectedAirports.map(airport => 
        apiClient.getStatisticsOverview({ airport, startDate, endDate })
      );
      const results = await Promise.all(promises);
      
      return selectedAirports.map((airport, index) => ({
        airport,
        data: results[index],
      }));
    },
  });

  const availableAirports = ['SFO', 'YYZ', 'YVR', 'LAX', 'ORD', 'ATL'];

  const handleAirportToggle = (airport: string) => {
    if (selectedAirports.includes(airport)) {
      setSelectedAirports(selectedAirports.filter(a => a !== airport));
    } else if (selectedAirports.length < 5) {
      setSelectedAirports([...selectedAirports, airport]);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !airportData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Failed to load comparison data</p>
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

  const getComparisonChart = () => {
    const labels = airportData.map(d => d.airport);
    
    switch (comparisonMetric) {
      case 'volume':
        const volumeData = {
          labels,
          datasets: [
            {
              label: 'Total Flights',
              data: airportData.map(d => d.data.summary.totalFlights),
              backgroundColor: 'rgba(59, 130, 246, 0.8)',
            },
            {
              label: 'Average Daily Flights',
              data: airportData.map(d => 
                Math.round(d.data.summary.totalFlights / dateRange)
              ),
              backgroundColor: 'rgba(34, 197, 94, 0.8)',
            },
          ],
        };
        
        return <Bar data={volumeData} options={{
          responsive: true,
          plugins: {
            title: {
              display: true,
              text: 'Flight Volume Comparison',
            },
          },
        }} />;
        
      case 'performance':
        const performanceData = {
          labels: ['On-Time Rate', 'Cancellation Rate', 'Delay Rate', 'Avg Delay (min)', 'Flight Volume'],
          datasets: airportData.map((d, i) => ({
            label: d.airport,
            data: [
              d.data.summary.onTimePercentage,
              d.data.summary.cancellationRate,
              100 - d.data.summary.onTimePercentage - d.data.summary.cancellationRate,
              d.data.summary.avgDelay,
              (d.data.summary.totalFlights / Math.max(...airportData.map(a => a.data.summary.totalFlights))) * 100,
            ],
            borderColor: [
              'rgb(239, 68, 68)',
              'rgb(59, 130, 246)',
              'rgb(34, 197, 94)',
              'rgb(251, 191, 36)',
              'rgb(168, 85, 247)',
            ][i],
            backgroundColor: [
              'rgba(239, 68, 68, 0.2)',
              'rgba(59, 130, 246, 0.2)',
              'rgba(34, 197, 94, 0.2)',
              'rgba(251, 191, 36, 0.2)',
              'rgba(168, 85, 247, 0.2)',
            ][i],
          })),
        };
        
        return <Radar data={performanceData} options={{
          responsive: true,
          plugins: {
            title: {
              display: true,
              text: 'Airport Performance Comparison',
            },
          },
          scales: {
            r: {
              beginAtZero: true,
              max: 100,
            },
          },
        }} />;
        
      case 'delays':
        const delayData = {
          labels,
          datasets: [
            {
              label: 'Average Delay (minutes)',
              data: airportData.map(d => d.data.summary.avgDelay),
              backgroundColor: 'rgba(239, 68, 68, 0.8)',
            },
            {
              label: 'Delay Rate (%)',
              data: airportData.map(d => 
                100 - d.data.summary.onTimePercentage - d.data.summary.cancellationRate
              ),
              backgroundColor: 'rgba(251, 191, 36, 0.8)',
            },
          ],
        };
        
        return <Bar data={delayData} options={{
          responsive: true,
          plugins: {
            title: {
              display: true,
              text: 'Delay Comparison',
            },
          },
        }} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900">
              Airport Comparison
            </h2>
            
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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Airport Selection */}
        <Card className="p-6 mb-8">
          <h3 className="text-lg font-semibold mb-4">Select Airports to Compare (max 5)</h3>
          <div className="flex flex-wrap gap-2">
            {availableAirports.map(airport => (
              <button
                key={airport}
                onClick={() => handleAirportToggle(airport)}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  selectedAirports.includes(airport)
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                } ${
                  !selectedAirports.includes(airport) && selectedAirports.length >= 5
                    ? 'opacity-50 cursor-not-allowed'
                    : ''
                }`}
                disabled={!selectedAirports.includes(airport) && selectedAirports.length >= 5}
              >
                {airport}
              </button>
            ))}
          </div>
        </Card>

        {/* Metric Selection */}
        <div className="flex gap-2 mb-8">
          <button
            onClick={() => setComparisonMetric('performance')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              comparisonMetric === 'performance'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            <TrendingUp className="h-4 w-4 inline mr-2" />
            Performance
          </button>
          <button
            onClick={() => setComparisonMetric('volume')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              comparisonMetric === 'volume'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            <BarChart3 className="h-4 w-4 inline mr-2" />
            Volume
          </button>
          <button
            onClick={() => setComparisonMetric('delays')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              comparisonMetric === 'delays'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            <Clock className="h-4 w-4 inline mr-2" />
            Delays
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {airportData.map(({ airport, data }) => (
            <Card key={airport} className="p-6">
              <h4 className="text-lg font-semibold mb-3">{airport}</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Flights:</span>
                  <span className="font-medium">{data.summary.totalFlights.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">On-Time Rate:</span>
                  <span className="font-medium text-green-600">
                    {data.summary.onTimePercentage.toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Avg Delay:</span>
                  <span className="font-medium text-yellow-600">
                    {data.summary.avgDelay} min
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Cancellation Rate:</span>
                  <span className="font-medium text-red-600">
                    {data.summary.cancellationRate.toFixed(1)}%
                  </span>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Comparison Chart */}
        <Card className="p-6">
          {getComparisonChart()}
        </Card>

        {/* Detailed Comparison Table */}
        <Card className="mt-6 p-6">
          <h3 className="text-lg font-semibold mb-4">Detailed Comparison</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Airport</th>
                  <th className="text-right py-2">Flights</th>
                  <th className="text-right py-2">Arrivals</th>
                  <th className="text-right py-2">Departures</th>
                  <th className="text-right py-2">On-Time %</th>
                  <th className="text-right py-2">Delayed</th>
                  <th className="text-right py-2">Cancelled</th>
                  <th className="text-right py-2">Avg Delay</th>
                </tr>
              </thead>
              <tbody>
                {airportData.map(({ airport, data }) => (
                  <tr key={airport} className="border-b">
                    <td className="py-2 font-medium">{airport}</td>
                    <td className="text-right py-2">{data.summary.totalFlights.toLocaleString()}</td>
                    <td className="text-right py-2">{data.summary.totalArrivals.toLocaleString()}</td>
                    <td className="text-right py-2">{data.summary.totalDepartures.toLocaleString()}</td>
                    <td className="text-right py-2 text-green-600">
                      {data.summary.onTimePercentage.toFixed(1)}%
                    </td>
                    <td className="text-right py-2 text-yellow-600">
                      {data.summary.delayedFlights.toLocaleString()}
                    </td>
                    <td className="text-right py-2 text-red-600">
                      {data.summary.cancelledFlights.toLocaleString()}
                    </td>
                    <td className="text-right py-2">{data.summary.avgDelay} min</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Best/Worst Performers */}
        {airportData.length >= 2 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4 text-green-600">
                <TrendingUp className="h-5 w-5 inline mr-2" />
                Best Performers
              </h3>
              <div className="space-y-3">
                <div>
                  <p className="font-medium">Highest On-Time Rate</p>
                  <p className="text-gray-600">
                    {[...airportData].sort((a, b) => 
                      b.data.summary.onTimePercentage - a.data.summary.onTimePercentage
                    )[0].airport} - {[...airportData].sort((a, b) => 
                      b.data.summary.onTimePercentage - a.data.summary.onTimePercentage
                    )[0].data.summary.onTimePercentage.toFixed(1)}%
                  </p>
                </div>
                <div>
                  <p className="font-medium">Lowest Average Delay</p>
                  <p className="text-gray-600">
                    {[...airportData].sort((a, b) => 
                      a.data.summary.avgDelay - b.data.summary.avgDelay
                    )[0].airport} - {[...airportData].sort((a, b) => 
                      a.data.summary.avgDelay - b.data.summary.avgDelay
                    )[0].data.summary.avgDelay} min
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4 text-red-600">
                <AlertCircle className="h-5 w-5 inline mr-2" />
                Areas for Improvement
              </h3>
              <div className="space-y-3">
                <div>
                  <p className="font-medium">Highest Cancellation Rate</p>
                  <p className="text-gray-600">
                    {[...airportData].sort((a, b) => 
                      b.data.summary.cancellationRate - a.data.summary.cancellationRate
                    )[0].airport} - {[...airportData].sort((a, b) => 
                      b.data.summary.cancellationRate - a.data.summary.cancellationRate
                    )[0].data.summary.cancellationRate.toFixed(1)}%
                  </p>
                </div>
                <div>
                  <p className="font-medium">Highest Average Delay</p>
                  <p className="text-gray-600">
                    {[...airportData].sort((a, b) => 
                      b.data.summary.avgDelay - a.data.summary.avgDelay
                    )[0].airport} - {[...airportData].sort((a, b) => 
                      b.data.summary.avgDelay - a.data.summary.avgDelay
                    )[0].data.summary.avgDelay} min
                  </p>
                </div>
              </div>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}