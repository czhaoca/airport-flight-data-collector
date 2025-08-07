'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { AlertTriangle, AlertCircle, Info, CheckCircle, Clock, XCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Alert {
  id: string;
  type: 'critical' | 'warning' | 'info' | 'success';
  title: string;
  message: string;
  airport?: string;
  flightNumber?: string;
  timestamp: Date;
  acknowledged: boolean;
}

export function RecentAlerts() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate fetching alerts - in production this would come from the API
    setTimeout(() => {
      const mockAlerts: Alert[] = [
        {
          id: '1',
          type: 'critical',
          title: 'Multiple Flight Cancellations',
          message: 'Weather conditions causing widespread cancellations at SFO',
          airport: 'SFO',
          timestamp: new Date(Date.now() - 15 * 60 * 1000),
          acknowledged: false,
        },
        {
          id: '2',
          type: 'warning',
          title: 'High Delay Rate',
          message: 'Average delay exceeding 45 minutes for departures',
          airport: 'YYZ',
          timestamp: new Date(Date.now() - 30 * 60 * 1000),
          acknowledged: false,
        },
        {
          id: '3',
          type: 'info',
          title: 'System Update',
          message: 'Data collection completed successfully for all airports',
          timestamp: new Date(Date.now() - 60 * 60 * 1000),
          acknowledged: true,
        },
        {
          id: '4',
          type: 'warning',
          title: 'Flight Diversion',
          message: 'UA 857 diverted to alternate airport due to technical issue',
          flightNumber: 'UA 857',
          timestamp: new Date(Date.now() - 90 * 60 * 1000),
          acknowledged: false,
        },
        {
          id: '5',
          type: 'success',
          title: 'Service Restored',
          message: 'YVR data collection service back online after maintenance',
          airport: 'YVR',
          timestamp: new Date(Date.now() - 120 * 60 * 1000),
          acknowledged: true,
        },
      ];
      setAlerts(mockAlerts);
      setLoading(false);
    }, 500);

    // Set up WebSocket or SSE for real-time alerts
    if (process.env.NEXT_PUBLIC_ENABLE_REALTIME === 'true') {
      // TODO: Connect to WebSocket/SSE for real-time alerts
    }
  }, []);

  const acknowledgeAlert = (id: string) => {
    setAlerts(prev => 
      prev.map(alert => 
        alert.id === id ? { ...alert, acknowledged: true } : alert
      )
    );
  };

  const getAlertIcon = (type: Alert['type']) => {
    switch (type) {
      case 'critical':
        return <AlertTriangle className="h-5 w-5" />;
      case 'warning':
        return <AlertCircle className="h-5 w-5" />;
      case 'info':
        return <Info className="h-5 w-5" />;
      case 'success':
        return <CheckCircle className="h-5 w-5" />;
    }
  };

  const getAlertColor = (type: Alert['type']) => {
    switch (type) {
      case 'critical':
        return 'text-red-600 bg-red-50';
      case 'warning':
        return 'text-yellow-600 bg-yellow-50';
      case 'info':
        return 'text-blue-600 bg-blue-50';
      case 'success':
        return 'text-green-600 bg-green-50';
    }
  };

  const getBadgeVariant = (type: Alert['type']): 'error' | 'warning' | 'info' | 'success' => {
    switch (type) {
      case 'critical':
        return 'error';
      case 'warning':
        return 'warning';
      case 'info':
        return 'info';
      case 'success':
        return 'success';
    }
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="border-l-2 border-gray-200 pl-4">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </div>
      </Card>
    );
  }

  const unacknowledgedAlerts = alerts.filter(a => !a.acknowledged);
  const recentAlerts = alerts.slice(0, 5);

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Recent Alerts</h2>
        {unacknowledgedAlerts.length > 0 && (
          <Badge variant="error">
            {unacknowledgedAlerts.length} New
          </Badge>
        )}
      </div>

      <div className="space-y-3">
        {recentAlerts.length === 0 ? (
          <p className="text-gray-500 text-sm">No recent alerts</p>
        ) : (
          recentAlerts.map((alert) => (
            <div
              key={alert.id}
              className={`border-l-4 pl-4 py-2 ${
                alert.type === 'critical' ? 'border-red-500' :
                alert.type === 'warning' ? 'border-yellow-500' :
                alert.type === 'info' ? 'border-blue-500' :
                'border-green-500'
              } ${alert.acknowledged ? 'opacity-60' : ''}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  <div className={`p-1 rounded ${getAlertColor(alert.type)}`}>
                    {getAlertIcon(alert.type)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-sm text-gray-900">
                        {alert.title}
                      </h3>
                      {alert.airport && (
                        <Badge variant="info" size="small">
                          {alert.airport}
                        </Badge>
                      )}
                      {alert.flightNumber && (
                        <Badge variant="info" size="small">
                          {alert.flightNumber}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">{alert.message}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      <Clock className="inline h-3 w-3 mr-1" />
                      {formatDistanceToNow(alert.timestamp, { addSuffix: true })}
                    </p>
                  </div>
                </div>
                {!alert.acknowledged && (
                  <button
                    onClick={() => acknowledgeAlert(alert.id)}
                    className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-100"
                  >
                    Dismiss
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {alerts.length > 5 && (
        <div className="mt-4 pt-4 border-t">
          <a href="/alerts" className="text-sm text-blue-600 hover:text-blue-800">
            View all alerts →
          </a>
        </div>
      )}
    </Card>
  );
}