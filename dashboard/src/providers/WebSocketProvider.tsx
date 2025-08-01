'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

interface WebSocketContextType {
  socket: Socket | null;
  connected: boolean;
  subscribeToAirport: (airport: string, types?: string[]) => void;
  unsubscribeFromAirport: (airport: string) => void;
  subscribeToFlight: (flightNumber: string, date?: string) => void;
  unsubscribeFromFlight: (flightNumber: string, date?: string) => void;
  subscribeToRoute: (origin: string, destination: string) => void;
  unsubscribeFromRoute: (origin: string, destination: string) => void;
  lastUpdate: Date | null;
  connectionStats: {
    reconnectAttempts: number;
    lastError: string | null;
  };
}

const WebSocketContext = createContext<WebSocketContextType | null>(null);

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within WebSocketProvider');
  }
  return context;
};

interface WebSocketProviderProps {
  children: React.ReactNode;
  url?: string;
  authToken?: string;
  autoConnect?: boolean;
}

export function WebSocketProvider({ 
  children, 
  url = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001',
  authToken,
  autoConnect = true
}: WebSocketProviderProps) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [connectionStats, setConnectionStats] = useState({
    reconnectAttempts: 0,
    lastError: null as string | null
  });
  
  const reconnectAttemptsRef = useRef(0);
  const subscriptionsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!autoConnect) return;

    const newSocket = io(url, {
      auth: authToken ? { token: authToken } : undefined,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 10,
    });

    // Connection events
    newSocket.on('connect', () => {
      console.log('WebSocket connected', newSocket.id);
      setConnected(true);
      setConnectionStats(prev => ({
        ...prev,
        reconnectAttempts: 0,
        lastError: null
      }));
      reconnectAttemptsRef.current = 0;

      // Resubscribe to previous subscriptions
      subscriptionsRef.current.forEach(sub => {
        const [type, ...params] = sub.split(':');
        if (type === 'airport') {
          newSocket.emit('subscribe:airport', { airport: params[0] });
        } else if (type === 'flight') {
          newSocket.emit('subscribe:flight', { 
            flightNumber: params[0], 
            date: params[1] 
          });
        } else if (type === 'route') {
          newSocket.emit('subscribe:route', { 
            origin: params[0], 
            destination: params[1] 
          });
        }
      });
    });

    newSocket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason);
      setConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error.message);
      reconnectAttemptsRef.current++;
      setConnectionStats(prev => ({
        reconnectAttempts: reconnectAttemptsRef.current,
        lastError: error.message
      }));
    });

    // Custom events
    newSocket.on('subscribed', (data) => {
      console.log('Subscribed:', data);
    });

    newSocket.on('error', (data) => {
      console.error('WebSocket error:', data);
    });

    // Flight events
    newSocket.on('flight:update', (data) => {
      console.log('Flight update:', data);
      setLastUpdate(new Date());
      // Emit custom event for components to listen to
      window.dispatchEvent(new CustomEvent('flightUpdate', { detail: data }));
    });

    newSocket.on('flight:delay', (data) => {
      console.log('Flight delay:', data);
      setLastUpdate(new Date());
      window.dispatchEvent(new CustomEvent('flightDelay', { detail: data }));
    });

    newSocket.on('flight:cancelled', (data) => {
      console.log('Flight cancelled:', data);
      setLastUpdate(new Date());
      window.dispatchEvent(new CustomEvent('flightCancelled', { detail: data }));
    });

    newSocket.on('flight:gateChange', (data) => {
      console.log('Gate change:', data);
      setLastUpdate(new Date());
      window.dispatchEvent(new CustomEvent('gateChange', { detail: data }));
    });

    // Airport events
    newSocket.on('airport:status', (data) => {
      console.log('Airport status:', data);
      setLastUpdate(new Date());
      window.dispatchEvent(new CustomEvent('airportStatus', { detail: data }));
    });

    newSocket.on('airport:stats', (data) => {
      console.log('Airport stats:', data);
      setLastUpdate(new Date());
      window.dispatchEvent(new CustomEvent('airportStats', { detail: data }));
    });

    // System events
    newSocket.on('system:alert', (data) => {
      console.log('System alert:', data);
      window.dispatchEvent(new CustomEvent('systemAlert', { detail: data }));
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, [url, authToken, autoConnect]);

  const subscribeToAirport = useCallback((airport: string, types: string[] = ['all']) => {
    if (!socket || !connected) return;
    
    const subKey = `airport:${airport}`;
    subscriptionsRef.current.add(subKey);
    socket.emit('subscribe:airport', { airport, types });
  }, [socket, connected]);

  const unsubscribeFromAirport = useCallback((airport: string) => {
    if (!socket || !connected) return;
    
    const subKey = `airport:${airport}`;
    subscriptionsRef.current.delete(subKey);
    socket.emit('unsubscribe:airport', { airport });
  }, [socket, connected]);

  const subscribeToFlight = useCallback((flightNumber: string, date?: string) => {
    if (!socket || !connected) return;
    
    const subKey = `flight:${flightNumber}:${date || 'today'}`;
    subscriptionsRef.current.add(subKey);
    socket.emit('subscribe:flight', { flightNumber, date });
  }, [socket, connected]);

  const unsubscribeFromFlight = useCallback((flightNumber: string, date?: string) => {
    if (!socket || !connected) return;
    
    const subKey = `flight:${flightNumber}:${date || 'today'}`;
    subscriptionsRef.current.delete(subKey);
    socket.emit('unsubscribe:flight', { flightNumber, date });
  }, [socket, connected]);

  const subscribeToRoute = useCallback((origin: string, destination: string) => {
    if (!socket || !connected) return;
    
    const subKey = `route:${origin}:${destination}`;
    subscriptionsRef.current.add(subKey);
    socket.emit('subscribe:route', { origin, destination });
  }, [socket, connected]);

  const unsubscribeFromRoute = useCallback((origin: string, destination: string) => {
    if (!socket || !connected) return;
    
    const subKey = `route:${origin}:${destination}`;
    subscriptionsRef.current.delete(subKey);
    socket.emit('unsubscribe:route', { origin, destination });
  }, [socket, connected]);

  const value: WebSocketContextType = {
    socket,
    connected,
    subscribeToAirport,
    unsubscribeFromAirport,
    subscribeToFlight,
    unsubscribeFromFlight,
    subscribeToRoute,
    unsubscribeFromRoute,
    lastUpdate,
    connectionStats
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
}