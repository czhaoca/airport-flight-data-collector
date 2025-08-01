import { useEffect, useState, useCallback, useRef } from 'react';

interface SSEOptions {
  url: string;
  reconnect?: boolean;
  reconnectDelay?: number;
  onMessage?: (event: MessageEvent) => void;
  onError?: (error: Event) => void;
  onOpen?: () => void;
}

interface SSEState {
  connected: boolean;
  lastMessage: any;
  error: Error | null;
}

export function useSSE(options: SSEOptions) {
  const [state, setState] = useState<SSEState>({
    connected: false,
    lastMessage: null,
    error: null
  });
  
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);

  const connect = useCallback(() => {
    try {
      // Close existing connection
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      // Create new EventSource
      const eventSource = new EventSource(options.url);
      eventSourceRef.current = eventSource;

      // Connection opened
      eventSource.onopen = () => {
        setState(prev => ({ ...prev, connected: true, error: null }));
        reconnectAttemptsRef.current = 0;
        options.onOpen?.();
      };

      // Handle messages
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setState(prev => ({ ...prev, lastMessage: data }));
          options.onMessage?.(event);
        } catch (error) {
          console.error('Failed to parse SSE message:', error);
        }
      };

      // Handle specific event types
      eventSource.addEventListener('flight:update', (event: MessageEvent) => {
        const data = JSON.parse(event.data);
        window.dispatchEvent(new CustomEvent('sseFlightUpdate', { detail: data }));
      });

      eventSource.addEventListener('flight:delay', (event: MessageEvent) => {
        const data = JSON.parse(event.data);
        window.dispatchEvent(new CustomEvent('sseFlightDelay', { detail: data }));
      });

      eventSource.addEventListener('flight:cancelled', (event: MessageEvent) => {
        const data = JSON.parse(event.data);
        window.dispatchEvent(new CustomEvent('sseFlightCancelled', { detail: data }));
      });

      eventSource.addEventListener('airport:stats', (event: MessageEvent) => {
        const data = JSON.parse(event.data);
        window.dispatchEvent(new CustomEvent('sseAirportStats', { detail: data }));
      });

      eventSource.addEventListener('system:alert', (event: MessageEvent) => {
        const data = JSON.parse(event.data);
        window.dispatchEvent(new CustomEvent('sseSystemAlert', { detail: data }));
      });

      eventSource.addEventListener('metrics:update', (event: MessageEvent) => {
        const data = JSON.parse(event.data);
        window.dispatchEvent(new CustomEvent('sseMetricsUpdate', { detail: data }));
      });

      // Handle errors
      eventSource.onerror = (error) => {
        setState(prev => ({ 
          ...prev, 
          connected: false, 
          error: new Error('SSE connection failed') 
        }));
        options.onError?.(error);

        // Reconnect logic
        if (options.reconnect !== false && reconnectAttemptsRef.current < 10) {
          reconnectAttemptsRef.current++;
          const delay = (options.reconnectDelay || 1000) * reconnectAttemptsRef.current;
          
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log(`Reconnecting SSE (attempt ${reconnectAttemptsRef.current})...`);
            connect();
          }, delay);
        }
      };

    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        connected: false, 
        error: error as Error 
      }));
    }
  }, [options]);

  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    setState({
      connected: false,
      lastMessage: null,
      error: null
    });
  }, []);

  useEffect(() => {
    connect();
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    ...state,
    reconnect: connect,
    disconnect
  };
}

// Hook for flight updates via SSE
export function useSSEFlightUpdates(params: {
  airport?: string;
  flight?: string;
  route?: string;
}) {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v2';
  const queryParams = new URLSearchParams();
  
  if (params.airport) queryParams.append('airport', params.airport);
  if (params.flight) queryParams.append('flight', params.flight);
  if (params.route) queryParams.append('route', params.route);
  
  const url = `${baseUrl}/sse/flights?${queryParams.toString()}`;

  const [updates, setUpdates] = useState<any[]>([]);

  useEffect(() => {
    const handlers = {
      sseFlightUpdate: (event: CustomEvent) => {
        setUpdates(prev => [event.detail, ...prev].slice(0, 100));
      },
      sseFlightDelay: (event: CustomEvent) => {
        setUpdates(prev => [{
          ...event.detail,
          type: 'delay'
        }, ...prev].slice(0, 100));
      },
      sseFlightCancelled: (event: CustomEvent) => {
        setUpdates(prev => [{
          ...event.detail,
          type: 'cancellation'
        }, ...prev].slice(0, 100));
      }
    };

    Object.entries(handlers).forEach(([event, handler]) => {
      window.addEventListener(event, handler as EventListener);
    });

    return () => {
      Object.entries(handlers).forEach(([event, handler]) => {
        window.removeEventListener(event, handler as EventListener);
      });
    };
  }, []);

  const sse = useSSE({ url });

  return {
    ...sse,
    updates
  };
}

// Hook for system metrics via SSE
export function useSSEMetrics() {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v2';
  const url = `${baseUrl}/sse/metrics`;
  
  const [metrics, setMetrics] = useState<any>(null);

  useEffect(() => {
    const handleMetricsUpdate = (event: CustomEvent) => {
      setMetrics(event.detail);
    };

    window.addEventListener('sseMetricsUpdate', handleMetricsUpdate as EventListener);
    
    return () => {
      window.removeEventListener('sseMetricsUpdate', handleMetricsUpdate as EventListener);
    };
  }, []);

  const sse = useSSE({ url });

  return {
    ...sse,
    metrics
  };
}