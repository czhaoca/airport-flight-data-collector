import { useEffect, useState, useCallback } from 'react';
import { useWebSocket } from '@/providers/WebSocketProvider';

interface FlightUpdate {
  type: string;
  timestamp: Date;
  flight: any;
}

interface UseRealtimeUpdatesOptions {
  airport?: string;
  flightNumber?: string;
  route?: { origin: string; destination: string };
  onUpdate?: (update: FlightUpdate) => void;
  onDelay?: (delay: any) => void;
  onCancellation?: (cancellation: any) => void;
  onGateChange?: (change: any) => void;
}

export function useRealtimeUpdates(options: UseRealtimeUpdatesOptions) {
  const { 
    subscribeToAirport, 
    unsubscribeFromAirport,
    subscribeToFlight,
    unsubscribeFromFlight,
    subscribeToRoute,
    unsubscribeFromRoute,
    connected,
    lastUpdate
  } = useWebSocket();

  const [updates, setUpdates] = useState<FlightUpdate[]>([]);
  const [isSubscribed, setIsSubscribed] = useState(false);

  // Subscribe based on options
  useEffect(() => {
    if (!connected) return;

    if (options.airport) {
      subscribeToAirport(options.airport);
      setIsSubscribed(true);
    }

    if (options.flightNumber) {
      subscribeToFlight(options.flightNumber);
      setIsSubscribed(true);
    }

    if (options.route) {
      subscribeToRoute(options.route.origin, options.route.destination);
      setIsSubscribed(true);
    }

    return () => {
      if (options.airport) {
        unsubscribeFromAirport(options.airport);
      }
      if (options.flightNumber) {
        unsubscribeFromFlight(options.flightNumber);
      }
      if (options.route) {
        unsubscribeFromRoute(options.route.origin, options.route.destination);
      }
      setIsSubscribed(false);
    };
  }, [
    connected,
    options.airport,
    options.flightNumber,
    options.route?.origin,
    options.route?.destination,
    subscribeToAirport,
    unsubscribeFromAirport,
    subscribeToFlight,
    unsubscribeFromFlight,
    subscribeToRoute,
    unsubscribeFromRoute
  ]);

  // Listen for events
  useEffect(() => {
    const handleFlightUpdate = (event: CustomEvent) => {
      const update: FlightUpdate = event.detail;
      setUpdates(prev => [update, ...prev].slice(0, 100)); // Keep last 100 updates
      options.onUpdate?.(update);
    };

    const handleFlightDelay = (event: CustomEvent) => {
      const delay = event.detail;
      options.onDelay?.(delay);
    };

    const handleFlightCancelled = (event: CustomEvent) => {
      const cancellation = event.detail;
      options.onCancellation?.(cancellation);
    };

    const handleGateChange = (event: CustomEvent) => {
      const change = event.detail;
      options.onGateChange?.(change);
    };

    window.addEventListener('flightUpdate', handleFlightUpdate as EventListener);
    window.addEventListener('flightDelay', handleFlightDelay as EventListener);
    window.addEventListener('flightCancelled', handleFlightCancelled as EventListener);
    window.addEventListener('gateChange', handleGateChange as EventListener);

    return () => {
      window.removeEventListener('flightUpdate', handleFlightUpdate as EventListener);
      window.removeEventListener('flightDelay', handleFlightDelay as EventListener);
      window.removeEventListener('flightCancelled', handleFlightCancelled as EventListener);
      window.removeEventListener('gateChange', handleGateChange as EventListener);
    };
  }, [options]);

  const clearUpdates = useCallback(() => {
    setUpdates([]);
  }, []);

  return {
    updates,
    isSubscribed,
    connected,
    lastUpdate,
    clearUpdates
  };
}