/**
 * WEBSOCKET INTEGRATION GUIDE
 * 
 * Share this document with your backend developer.
 * It contains all requirements and frontend implementation examples.
 */

// ============================================
// BACKEND REQUIREMENTS
// ============================================

/**
 * 1. WebSocket Server Endpoint
 *    - URL: wss://your-api.com/ws
 *    - Authentication: JWT token in URL or initial message
 * 
 * 2. Message Format (JSON):
 *    {
 *      "type": "event_name",
 *      "data": { ... },
 *      "timestamp": "2024-01-15T10:30:00Z"
 *    }
 * 
 * 3. Events to Implement:
 * 
 *    parcel:created - New parcel registered
 *    parcel:updated - Parcel details changed
 *    parcel:status_changed - Status updated
 *    rider:location_updated - Rider GPS location
 *    delivery:completed - Successful delivery
 *    delivery:failed - Failed delivery attempt
 * 
 * 4. Example Event Payloads:
 * 
 *    parcel:status_changed:
 *    {
 *      "type": "parcel:status_changed",
 *      "data": {
 *        "parcelId": "123",
 *        "status": "out-for-delivery",
 *        "timestamp": "2024-01-15T10:30:00Z"
 *      }
 *    }
 * 
 *    rider:location_updated:
 *    {
 *      "type": "rider:location_updated",
 *      "data": {
 *        "riderId": "R001",
 *        "lat": 5.6037,
 *        "lng": -0.1870,
 *        "timestamp": "2024-01-15T10:30:00Z"
 *      }
 *    }
 */

// ============================================
// FRONTEND USAGE EXAMPLES
// ============================================

import { useState } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';
import websocketService from '../services/websocketService';

// Example 1: Connect on login
function handleLogin(token: string) {
  websocketService.connect(token);
}

// Example 2: Listen for parcel updates
function ParcelList() {
  const [parcels, setParcels] = useState([]);

  useWebSocket('parcel:created', (newParcel) => {
    setParcels(prev => [newParcel, ...prev]);
  });

  useWebSocket('parcel:status_changed', (update) => {
    setParcels(prev => prev.map(p => 
      p.id === update.parcelId ? { ...p, status: update.status } : p
    ));
  });

  return <div>Parcel List</div>;
}

// Example 3: Disconnect on logout
function handleLogout() {
  websocketService.disconnect();
}

export {};
