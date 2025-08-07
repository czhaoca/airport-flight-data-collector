'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { 
  Plane, 
  TrendingUp, 
  TrendingDown, 
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  Activity
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ActivityItem {
  id: string;
  type: 'arrival' | 'departure' | 'delay' | 'cancellation' | 'diversion' | 'system';
  title: string;
  description: string;
  airport: string;
  flightNumber?: string;
  timestamp: Date;
  severity?: 'low' | 'medium' | 'high';
}

export function ActivityFeed() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate fetching activities
    setTimeout(() => {
      const mockActivities: ActivityItem[] = [
        {
          id: '1',
          type: 'arrival',
          title: 'Flight Arrived',
          description: 'UA 312 from LAX arrived on time',
          airport: 'SFO',
          flightNumber: 'UA 312',
          timestamp: new Date(Date.now() - 5 * 60 * 1000),
        },
        {
          id: '2',
          type: 'delay',
          title: 'Departure Delayed',
          description: 'AC 759 to YVR delayed by 35 minutes',
          airport: 'YYZ',
          flightNumber: 'AC 759',
          timestamp: new Date(Date.now() - 10 * 60 * 1000),
          severity: 'medium',
        },
        {
          id: '3',
          type: 'system',
          title: 'Data Collection Complete',
          description: 'Successfully collected 247 flights from YVR',
          airport: 'YVR',
          timestamp: new Date(Date.now() - 15 * 60 * 1000),
        },
        {
          id: '4',
          type: 'cancellation',
          title: 'Flight Cancelled',
          description: 'WS 1447 to Calgary cancelled due to weather',
          airport: 'YYZ',
          flightNumber: 'WS 1447',
          timestamp: new Date(Date.now() - 20 * 60 * 1000),
          severity: 'high',
        },
        {
          id: '5',
          type: 'departure',
          title: 'Flight Departed',
          description: 'DL 089 to JFK departed 5 minutes early',
          airport: 'SFO',
          flightNumber: 'DL 089',
          timestamp: new Date(Date.now() - 25 * 60 * 1000),
        },
        {
          id: '6',
          type: 'system',
          title: 'ML Prediction Update',
          description: 'Delay prediction model updated with 98.2% accuracy',
          airport: 'ALL',
          timestamp: new Date(Date.now() - 30 * 60 * 1000),
        },
        {
          id: '7',
          type: 'diversion',
          title: 'Flight Diverted',
          description: 'AA 234 diverted to SEA due to medical emergency',
          airport: 'YVR',
          flightNumber: 'AA 234',
          timestamp: new Date(Date.now() - 35 * 60 * 1000),
          severity: 'medium',
        },
        {
          id: '8',
          type: 'arrival',
          title: 'International Arrival',
          description: 'LH 454 from Munich arrived 10 minutes early',
          airport: 'SFO',
          flightNumber: 'LH 454',
          timestamp: new Date(Date.now() - 40 * 60 * 1000),
        },
      ];
      setActivities(mockActivities);
      setLoading(false);
    }, 500);

    // Set up WebSocket or SSE for real-time activities
    if (process.env.NEXT_PUBLIC_ENABLE_REALTIME === 'true') {
      // TODO: Connect to WebSocket/SSE for real-time activity feed
    }
  }, []);

  const getActivityIcon = (type: ActivityItem['type']) => {
    switch (type) {
      case 'arrival':
        return <Plane className="h-4 w-4 rotate-90" />;
      case 'departure':
        return <Plane className="h-4 w-4 -rotate-90" />;
      case 'delay':
        return <Clock className="h-4 w-4" />;
      case 'cancellation':
        return <XCircle className="h-4 w-4" />;
      case 'diversion':
        return <AlertCircle className="h-4 w-4" />;
      case 'system':
        return <Activity className="h-4 w-4" />;
    }
  };

  const getActivityColor = (type: ActivityItem['type'], severity?: string) => {
    if (severity === 'high') return 'text-red-600 bg-red-50';
    if (severity === 'medium') return 'text-yellow-600 bg-yellow-50';
    
    switch (type) {
      case 'arrival':
        return 'text-green-600 bg-green-50';
      case 'departure':
        return 'text-blue-600 bg-blue-50';
      case 'delay':
        return 'text-yellow-600 bg-yellow-50';
      case 'cancellation':
        return 'text-red-600 bg-red-50';
      case 'diversion':
        return 'text-orange-600 bg-orange-50';
      case 'system':
        return 'text-purple-600 bg-purple-50';
    }
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-start space-x-3">
                <div className="h-8 w-8 bg-gray-200 rounded-full"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Activity Feed</h2>
        <button className="text-sm text-blue-600 hover:text-blue-800">
          View All
        </button>
      </div>

      <div className="space-y-3 max-h-96 overflow-y-auto">
        {activities.map((activity) => (
          <div key={activity.id} className="flex items-start space-x-3">
            <div className={`p-2 rounded-full ${getActivityColor(activity.type, activity.severity)}`}>
              {getActivityIcon(activity.type)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-medium text-gray-900">
                  {activity.title}
                </p>
                <Badge variant="info" size="small">
                  {activity.airport}
                </Badge>
                {activity.flightNumber && (
                  <Badge variant="success" size="small">
                    {activity.flightNumber}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-gray-600 mt-1">
                {activity.description}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {formatDistanceToNow(activity.timestamp, { addSuffix: true })}
              </p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}