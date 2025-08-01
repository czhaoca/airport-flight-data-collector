'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Activity, Zap, Database, Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { apiClient } from '@/services/api';
import { Spinner } from '@/components/ui/Spinner';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface SystemMetrics {
  timestamp: string;
  collection: {
    successRate: number;
    totalCollections: number;
    failedCollections: number;
    avgCollectionTime: number;
    lastCollectionTime: string;
  };
  api: {
    responseTime: number;
    requestsPerMinute: number;
    errorRate: number;
    activeConnections: number;
  };
  database: {
    size: number;
    queryTime: number;
    connections: number;
    slowQueries: number;
  };
  system: {
    cpuUsage: number;
    memoryUsage: number;
    diskUsage: number;
    uptime: number;
  };
  recentIssues?: Array<{
    timestamp: string;
    severity: 'error' | 'warning';
    title: string;
    description: string;
  }>;
}

export default function MetricsPage() {
  const [timeRange, setTimeRange] = useState<'1h' | '6h' | '24h' | '7d'>('24h');
  const [autoRefresh, setAutoRefresh] = useState(true);

  const { data: metrics, isLoading, error, refetch } = useQuery<SystemMetrics>({
    queryKey: ['systemMetrics'],
    queryFn: () => apiClient.getSystemMetrics(),
    refetchInterval: autoRefresh ? 30000 : false, // Refresh every 30 seconds
  });

  const { data: timeSeriesData } = useQuery({
    queryKey: ['metricsTimeSeries', timeRange],
    queryFn: () => apiClient.getMetricsTimeSeries(timeRange),
    refetchInterval: autoRefresh ? 60000 : false, // Refresh every minute
  });

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        refetch();
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refetch]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !metrics) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Failed to load system metrics</p>
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

  const getStatusColor = (value: number, thresholds: { good: number; warning: number }) => {
    if (value >= thresholds.good) return 'text-green-600';
    if (value >= thresholds.warning) return 'text-yellow-600';
    return 'text-red-600';
  };

  const formatBytes = (bytes: number) => {
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900">
              Performance Metrics Dashboard
            </h2>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">Auto-refresh</label>
                <button
                  onClick={() => setAutoRefresh(!autoRefresh)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full ${
                    autoRefresh ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                      autoRefresh ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
              
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value as any)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="1h">Last Hour</option>
                <option value="6h">Last 6 Hours</option>
                <option value="24h">Last 24 Hours</option>
                <option value="7d">Last 7 Days</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* System Status Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold">Collection Health</h3>
              <Activity className="h-6 w-6 text-blue-600" />
            </div>
            <p className={`text-3xl font-bold ${getStatusColor(metrics.collection.successRate, { good: 95, warning: 90 })}`}>
              {metrics.collection.successRate.toFixed(1)}%
            </p>
            <p className="text-sm text-gray-600 mt-1">Success Rate</p>
            <div className="mt-3 space-y-1">
              <p className="text-xs text-gray-500">
                Total: {metrics.collection.totalCollections}
              </p>
              <p className="text-xs text-gray-500">
                Failed: {metrics.collection.failedCollections}
              </p>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold">API Performance</h3>
              <Zap className="h-6 w-6 text-yellow-600" />
            </div>
            <p className={`text-3xl font-bold ${getStatusColor(100 - metrics.api.responseTime, { good: 80, warning: 50 })}`}>
              {metrics.api.responseTime}ms
            </p>
            <p className="text-sm text-gray-600 mt-1">Avg Response Time</p>
            <div className="mt-3 space-y-1">
              <p className="text-xs text-gray-500">
                RPM: {metrics.api.requestsPerMinute}
              </p>
              <p className="text-xs text-gray-500">
                Error Rate: {metrics.api.errorRate.toFixed(2)}%
              </p>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold">Database</h3>
              <Database className="h-6 w-6 text-green-600" />
            </div>
            <p className="text-3xl font-bold">{formatBytes(metrics.database.size)}</p>
            <p className="text-sm text-gray-600 mt-1">Database Size</p>
            <div className="mt-3 space-y-1">
              <p className="text-xs text-gray-500">
                Query Time: {metrics.database.queryTime}ms
              </p>
              <p className="text-xs text-gray-500">
                Connections: {metrics.database.connections}
              </p>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold">System</h3>
              <Clock className="h-6 w-6 text-purple-600" />
            </div>
            <p className="text-3xl font-bold">{formatUptime(metrics.system.uptime)}</p>
            <p className="text-sm text-gray-600 mt-1">Uptime</p>
            <div className="mt-3 space-y-1">
              <p className="text-xs text-gray-500">
                CPU: {metrics.system.cpuUsage.toFixed(1)}%
              </p>
              <p className="text-xs text-gray-500">
                Memory: {metrics.system.memoryUsage.toFixed(1)}%
              </p>
            </div>
          </Card>
        </div>

        {/* Time Series Charts */}
        {timeSeriesData && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Collection Performance</h3>
              <Line
                data={{
                  labels: timeSeriesData.timestamps.map((t: string) => 
                    format(new Date(t), 'HH:mm')
                  ),
                  datasets: [
                    {
                      label: 'Success Rate (%)',
                      data: timeSeriesData.collectionSuccessRate,
                      borderColor: 'rgb(34, 197, 94)',
                      backgroundColor: 'rgba(34, 197, 94, 0.1)',
                      yAxisID: 'y',
                    },
                    {
                      label: 'Collection Time (s)',
                      data: timeSeriesData.collectionTime,
                      borderColor: 'rgb(59, 130, 246)',
                      backgroundColor: 'rgba(59, 130, 246, 0.1)',
                      yAxisID: 'y1',
                    },
                  ],
                }}
                options={{
                  responsive: true,
                  interaction: {
                    mode: 'index',
                    intersect: false,
                  },
                  scales: {
                    y: {
                      type: 'linear',
                      display: true,
                      position: 'left',
                      title: {
                        display: true,
                        text: 'Success Rate (%)',
                      },
                    },
                    y1: {
                      type: 'linear',
                      display: true,
                      position: 'right',
                      grid: {
                        drawOnChartArea: false,
                      },
                      title: {
                        display: true,
                        text: 'Time (seconds)',
                      },
                    },
                  },
                }}
              />
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">API Performance</h3>
              <Line
                data={{
                  labels: timeSeriesData.timestamps.map((t: string) => 
                    format(new Date(t), 'HH:mm')
                  ),
                  datasets: [
                    {
                      label: 'Response Time (ms)',
                      data: timeSeriesData.apiResponseTime,
                      borderColor: 'rgb(239, 68, 68)',
                      backgroundColor: 'rgba(239, 68, 68, 0.1)',
                      yAxisID: 'y',
                    },
                    {
                      label: 'Requests/min',
                      data: timeSeriesData.apiRequestsPerMinute,
                      borderColor: 'rgb(168, 85, 247)',
                      backgroundColor: 'rgba(168, 85, 247, 0.1)',
                      yAxisID: 'y1',
                    },
                  ],
                }}
                options={{
                  responsive: true,
                  interaction: {
                    mode: 'index',
                    intersect: false,
                  },
                  scales: {
                    y: {
                      type: 'linear',
                      display: true,
                      position: 'left',
                      title: {
                        display: true,
                        text: 'Response Time (ms)',
                      },
                    },
                    y1: {
                      type: 'linear',
                      display: true,
                      position: 'right',
                      grid: {
                        drawOnChartArea: false,
                      },
                      title: {
                        display: true,
                        text: 'Requests/min',
                      },
                    },
                  },
                }}
              />
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">System Resources</h3>
              <Line
                data={{
                  labels: timeSeriesData.timestamps.map((t: string) => 
                    format(new Date(t), 'HH:mm')
                  ),
                  datasets: [
                    {
                      label: 'CPU Usage (%)',
                      data: timeSeriesData.cpuUsage,
                      borderColor: 'rgb(251, 191, 36)',
                      backgroundColor: 'rgba(251, 191, 36, 0.1)',
                      fill: true,
                    },
                    {
                      label: 'Memory Usage (%)',
                      data: timeSeriesData.memoryUsage,
                      borderColor: 'rgb(6, 182, 212)',
                      backgroundColor: 'rgba(6, 182, 212, 0.1)',
                      fill: true,
                    },
                  ],
                }}
                options={{
                  responsive: true,
                  plugins: {
                    legend: {
                      position: 'top',
                    },
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      max: 100,
                    },
                  },
                }}
              />
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Database Performance</h3>
              <Line
                data={{
                  labels: timeSeriesData.timestamps.map((t: string) => 
                    format(new Date(t), 'HH:mm')
                  ),
                  datasets: [
                    {
                      label: 'Query Time (ms)',
                      data: timeSeriesData.dbQueryTime,
                      borderColor: 'rgb(34, 197, 94)',
                      backgroundColor: 'rgba(34, 197, 94, 0.1)',
                    },
                    {
                      label: 'Slow Queries',
                      data: timeSeriesData.dbSlowQueries,
                      borderColor: 'rgb(239, 68, 68)',
                      backgroundColor: 'rgba(239, 68, 68, 0.1)',
                      type: 'bar',
                    },
                  ],
                }}
                options={{
                  responsive: true,
                }}
              />
            </Card>
          </div>
        )}

        {/* Recent Issues */}
        <Card className="p-6 mb-8">
          <h3 className="text-lg font-semibold mb-4">Recent Issues & Alerts</h3>
          <div className="space-y-3">
            {metrics.recentIssues?.length > 0 ? (
              metrics.recentIssues.map((issue: any, index: number) => (
                <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  {issue.severity === 'error' ? (
                    <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <p className="font-medium">{issue.title}</p>
                    <p className="text-sm text-gray-600">{issue.description}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {format(new Date(issue.timestamp), 'PPpp')}
                    </p>
                  </div>
                  <Badge variant={issue.severity === 'error' ? 'danger' : 'warning'}>
                    {issue.severity}
                  </Badge>
                </div>
              ))
            ) : (
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-5 w-5" />
                <p>No recent issues. System is running smoothly.</p>
              </div>
            )}
          </div>
        </Card>

        {/* Collection Statistics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Collection Statistics by Airport</h3>
            <Bar
              data={{
                labels: ['SFO', 'YYZ', 'YVR'],
                datasets: [
                  {
                    label: 'Success',
                    data: [98.5, 97.8, 99.2],
                    backgroundColor: 'rgba(34, 197, 94, 0.8)',
                  },
                  {
                    label: 'Failed',
                    data: [1.5, 2.2, 0.8],
                    backgroundColor: 'rgba(239, 68, 68, 0.8)',
                  },
                ],
              }}
              options={{
                responsive: true,
                scales: {
                  x: {
                    stacked: true,
                  },
                  y: {
                    stacked: true,
                    max: 100,
                  },
                },
              }}
            />
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">API Endpoint Performance</h3>
            <div className="space-y-3">
              {[
                { endpoint: '/api/v2/flights', avgTime: 45, calls: 12500 },
                { endpoint: '/api/v2/airports', avgTime: 32, calls: 8200 },
                { endpoint: '/api/v2/statistics', avgTime: 125, calls: 3400 },
                { endpoint: '/api/v2/flights/live', avgTime: 89, calls: 9800 },
              ].map((endpoint, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{endpoint.endpoint}</p>
                    <p className="text-xs text-gray-500">{endpoint.calls.toLocaleString()} calls</p>
                  </div>
                  <div className="text-right">
                    <p className={`font-medium ${endpoint.avgTime < 100 ? 'text-green-600' : 'text-yellow-600'}`}>
                      {endpoint.avgTime}ms
                    </p>
                    <p className="text-xs text-gray-500">avg response</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}