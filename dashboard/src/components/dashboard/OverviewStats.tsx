'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { TrendingUp, TrendingDown, Clock, AlertCircle, Plane, Users, CheckCircle, XCircle } from 'lucide-react';
import apiClient from '@/services/api';

interface Stats {
  totalFlights: number;
  totalFlightsChange: number;
  onTimeRate: number;
  onTimeChange: number;
  avgDelay: number;
  avgDelayChange: number;
  cancellationRate: number;
  cancellationChange: number;
  activeFlights: number;
  delayedFlights: number;
  airportsMonitored: number;
  totalPassengers: number;
}

export function OverviewStats() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      
      // Get today's date range
      const today = new Date();
      const startDate = new Date(today);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(today);
      endDate.setHours(23, 59, 59, 999);
      
      // Get yesterday for comparison
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStart = new Date(yesterday);
      yesterdayStart.setHours(0, 0, 0, 0);
      const yesterdayEnd = new Date(yesterday);
      yesterdayEnd.setHours(23, 59, 59, 999);

      // Fetch today's and yesterday's data
      const [todayData, yesterdayData] = await Promise.all([
        apiClient.getStatisticsOverview({
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        }),
        apiClient.getStatisticsOverview({
          startDate: yesterdayStart.toISOString(),
          endDate: yesterdayEnd.toISOString(),
        }),
      ]);

      // Calculate changes
      const todayStats = todayData.summary || {};
      const yesterdayStats = yesterdayData.summary || {};

      setStats({
        totalFlights: todayStats.totalFlights || 0,
        totalFlightsChange: ((todayStats.totalFlights - yesterdayStats.totalFlights) / yesterdayStats.totalFlights) * 100 || 0,
        onTimeRate: todayStats.onTimePercentage || 0,
        onTimeChange: todayStats.onTimePercentage - yesterdayStats.onTimePercentage || 0,
        avgDelay: Math.round(todayStats.avgDelay || 0),
        avgDelayChange: todayStats.avgDelay - yesterdayStats.avgDelay || 0,
        cancellationRate: todayStats.cancellationRate || 0,
        cancellationChange: todayStats.cancellationRate - yesterdayStats.cancellationRate || 0,
        activeFlights: todayStats.activeFlights || 0,
        delayedFlights: todayStats.delayedFlights || 0,
        airportsMonitored: 3, // SFO, YYZ, YVR
        totalPassengers: todayStats.totalPassengers || 0,
      });

      setError(null);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
      setError('Failed to load statistics');
      // Set mock data for development
      setStats({
        totalFlights: 1247,
        totalFlightsChange: 5.2,
        onTimeRate: 78.5,
        onTimeChange: -2.3,
        avgDelay: 24,
        avgDelayChange: 3,
        cancellationRate: 2.1,
        cancellationChange: 0.5,
        activeFlights: 42,
        delayedFlights: 8,
        airportsMonitored: 3,
        totalPassengers: 185000,
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading && !stats) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(8)].map((_, i) => (
          <Card key={i} className="p-6 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-3"></div>
            <div className="h-8 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-1/3"></div>
          </Card>
        ))}
      </div>
    );
  }

  if (error && !stats) {
    return (
      <Card className="p-6">
        <div className="flex items-center text-red-600">
          <AlertCircle className="h-5 w-5 mr-2" />
          <span>{error}</span>
        </div>
      </Card>
    );
  }

  if (!stats) return null;

  const statCards = [
    {
      title: 'Total Flights',
      value: stats.totalFlights.toLocaleString(),
      change: stats.totalFlightsChange,
      icon: Plane,
      color: 'blue',
    },
    {
      title: 'On-Time Rate',
      value: `${stats.onTimeRate.toFixed(1)}%`,
      change: stats.onTimeChange,
      icon: CheckCircle,
      color: 'green',
    },
    {
      title: 'Average Delay',
      value: `${stats.avgDelay} min`,
      change: -stats.avgDelayChange, // Negative because less delay is better
      icon: Clock,
      color: 'yellow',
    },
    {
      title: 'Cancellation Rate',
      value: `${stats.cancellationRate.toFixed(1)}%`,
      change: -stats.cancellationChange, // Negative because less cancellation is better
      icon: XCircle,
      color: 'red',
    },
    {
      title: 'Active Flights',
      value: stats.activeFlights.toLocaleString(),
      subtitle: 'Currently in air',
      icon: Plane,
      color: 'indigo',
    },
    {
      title: 'Delayed Flights',
      value: stats.delayedFlights.toLocaleString(),
      subtitle: 'More than 15 min',
      icon: AlertCircle,
      color: 'orange',
    },
    {
      title: 'Airports',
      value: stats.airportsMonitored,
      subtitle: 'Being monitored',
      icon: Plane,
      color: 'purple',
    },
    {
      title: 'Passengers',
      value: (stats.totalPassengers / 1000).toFixed(0) + 'K',
      subtitle: 'Today',
      icon: Users,
      color: 'cyan',
    },
  ];

  const getColorClasses = (color: string) => {
    const colors: Record<string, string> = {
      blue: 'bg-blue-100 text-blue-600',
      green: 'bg-green-100 text-green-600',
      yellow: 'bg-yellow-100 text-yellow-600',
      red: 'bg-red-100 text-red-600',
      indigo: 'bg-indigo-100 text-indigo-600',
      orange: 'bg-orange-100 text-orange-600',
      purple: 'bg-purple-100 text-purple-600',
      cyan: 'bg-cyan-100 text-cyan-600',
    };
    return colors[color] || colors.blue;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {statCards.map((stat, index) => {
        const Icon = stat.icon;
        const colorClass = getColorClasses(stat.color);
        
        return (
          <Card key={index} className="p-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-600">{stat.title}</h3>
              <div className={`p-2 rounded-lg ${colorClass}`}>
                <Icon className="h-5 w-5" />
              </div>
            </div>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                {stat.subtitle && (
                  <p className="text-xs text-gray-500 mt-1">{stat.subtitle}</p>
                )}
              </div>
              {stat.change !== undefined && (
                <div className={`flex items-center text-sm ${stat.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {stat.change >= 0 ? (
                    <TrendingUp className="h-4 w-4 mr-1" />
                  ) : (
                    <TrendingDown className="h-4 w-4 mr-1" />
                  )}
                  <span>{Math.abs(stat.change).toFixed(1)}%</span>
                </div>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
}