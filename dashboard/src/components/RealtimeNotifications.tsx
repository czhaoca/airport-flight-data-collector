'use client';

import { useEffect, useState } from 'react';
import { Bell, AlertTriangle, X, Plane, Clock } from 'lucide-react';
import { useRealtimeUpdates } from '@/hooks/useRealtimeUpdates';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';

interface Notification {
  id: string;
  type: 'delay' | 'cancellation' | 'gate_change' | 'update';
  title: string;
  message: string;
  timestamp: Date;
  severity: 'info' | 'warning' | 'error';
  flight?: {
    flightNumber: string;
    origin: string;
    destination: string;
  };
}

interface RealtimeNotificationsProps {
  airport?: string;
  maxNotifications?: number;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

export function RealtimeNotifications({ 
  airport, 
  maxNotifications = 5,
  position = 'top-right' 
}: RealtimeNotificationsProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);

  const { connected, lastUpdate } = useRealtimeUpdates({
    airport,
    onDelay: (delay) => {
      const notification: Notification = {
        id: `delay-${Date.now()}`,
        type: 'delay',
        title: `Flight ${delay.flight.flightNumber} Delayed`,
        message: `Delayed by ${delay.delay.minutes} minutes${delay.delay.reason ? `: ${delay.delay.reason}` : ''}`,
        timestamp: new Date(delay.timestamp),
        severity: delay.delay.severity === 'severe' ? 'error' : 'warning',
        flight: delay.flight
      };
      addNotification(notification);
    },
    onCancellation: (cancellation) => {
      const notification: Notification = {
        id: `cancel-${Date.now()}`,
        type: 'cancellation',
        title: `Flight ${cancellation.flight.flightNumber} Cancelled`,
        message: cancellation.reason || 'Flight has been cancelled',
        timestamp: new Date(cancellation.timestamp),
        severity: 'error',
        flight: cancellation.flight
      };
      addNotification(notification);
    },
    onGateChange: (change) => {
      const notification: Notification = {
        id: `gate-${Date.now()}`,
        type: 'gate_change',
        title: `Gate Change: ${change.flight.flightNumber}`,
        message: `Gate changed from ${change.gate.old} to ${change.gate.new}`,
        timestamp: new Date(change.timestamp),
        severity: 'info',
        flight: change.flight
      };
      addNotification(notification);
    }
  });

  const addNotification = (notification: Notification) => {
    setNotifications(prev => {
      const updated = [notification, ...prev].slice(0, 50); // Keep last 50
      return updated;
    });
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  // Auto-dismiss old notifications
  useEffect(() => {
    const interval = setInterval(() => {
      setNotifications(prev => 
        prev.filter(n => 
          new Date().getTime() - n.timestamp.getTime() < 5 * 60 * 1000 // Keep for 5 minutes
        )
      );
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const positionClasses = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4'
  };

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'delay':
        return <Clock className="h-4 w-4" />;
      case 'cancellation':
        return <AlertTriangle className="h-4 w-4" />;
      case 'gate_change':
        return <Plane className="h-4 w-4" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const getSeverityColor = (severity: Notification['severity']) => {
    switch (severity) {
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      default:
        return 'bg-blue-50 border-blue-200';
    }
  };

  const displayedNotifications = isExpanded 
    ? notifications 
    : notifications.slice(0, maxNotifications);

  return (
    <div className={`fixed ${positionClasses[position]} z-50 w-96 max-w-full`}>
      {/* Connection status */}
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`h-2 w-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-xs text-gray-600">
            {connected ? 'Live updates' : 'Disconnected'}
          </span>
        </div>
        {notifications.length > 0 && (
          <button
            onClick={clearAll}
            className="text-xs text-gray-500 hover:text-gray-700"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Notifications */}
      <div className="space-y-2">
        {displayedNotifications.map((notification) => (
          <Card
            key={notification.id}
            className={`p-3 ${getSeverityColor(notification.severity)} border transition-all duration-300 hover:shadow-md`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className="mt-0.5">
                  {getIcon(notification.type)}
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-sm">{notification.title}</h4>
                  <p className="text-xs text-gray-600 mt-1">{notification.message}</p>
                  {notification.flight && (
                    <p className="text-xs text-gray-500 mt-1">
                      {notification.flight.origin} → {notification.flight.destination}
                    </p>
                  )}
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(notification.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              </div>
              <button
                onClick={() => removeNotification(notification.id)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </Card>
        ))}
      </div>

      {/* Show more/less button */}
      {notifications.length > maxNotifications && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="mt-2 w-full text-center text-sm text-blue-600 hover:text-blue-700"
        >
          {isExpanded 
            ? 'Show less' 
            : `Show ${notifications.length - maxNotifications} more`}
        </button>
      )}

      {/* No notifications message */}
      {notifications.length === 0 && connected && (
        <Card className="p-4 text-center">
          <Bell className="h-8 w-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500">
            No notifications yet
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Monitoring {airport || 'all airports'}
          </p>
        </Card>
      )}
    </div>
  );
}