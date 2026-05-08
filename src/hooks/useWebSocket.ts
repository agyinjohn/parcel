import { useEffect, useRef, useState } from 'react';
import websocketService from '../services/websocketService';

/**
 * React Hook for WebSocket real-time updates
 * 
 * Usage Example:
 * 
 * ```tsx
 * function ParcelList() {
 *   const [parcels, setParcels] = useState([]);
 * 
 *   useWebSocket('parcel:created', (newParcel) => {
 *     setParcels(prev => [newParcel, ...prev]);
 *     toast.success('New parcel registered!');
 *   });
 * 
 *   useWebSocket('parcel:status_changed', (update) => {
 *     setParcels(prev => prev.map(p => 
 *       p.id === update.parcelId ? { ...p, status: update.status } : p
 *     ));
 *   });
 * 
 *   return <div>...</div>;
 * }
 * ```
 */

type WebSocketEventType =
  | 'parcel:created'
  | 'parcel:updated'
  | 'parcel:status_changed'
  | 'rider:location_updated'
  | 'delivery:completed'
  | 'delivery:failed'
  | 'connection:established'
  | 'connection:error';

type EventCallback = (data: any) => void;

/**
 * Hook to subscribe to WebSocket events
 * @param event - Event type to listen for
 * @param callback - Function to call when event is received
 */
export function useWebSocket(event: WebSocketEventType, callback: EventCallback) {
  const callbackRef = useRef(callback);

  // Update ref when callback changes
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    // Subscribe to event
    const unsubscribe = websocketService.on(event, (data) => {
      callbackRef.current(data);
    });

    // Cleanup on unmount
    return () => {
      unsubscribe();
    };
  }, [event]);
}

/**
 * Hook to get WebSocket connection status
 */
export function useWebSocketStatus() {
  const [isConnected, setIsConnected] = useState(false);

  useWebSocket('connection:established', () => {
    setIsConnected(true);
  });

  useWebSocket('connection:error', () => {
    setIsConnected(false);
  });

  useEffect(() => {
    setIsConnected(websocketService.isConnected());
  }, []);

  return isConnected;
}
