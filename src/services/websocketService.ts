/**
 * WebSocket Service for Real-time Updates
 * 
 * BACKEND REQUIREMENTS:
 * 1. WebSocket endpoint: wss://your-api.com/ws
 * 2. Authentication: Send JWT token in connection URL or initial message
 * 3. Event format: { type: 'event_name', data: {...} }
 * 
 * Events to implement on backend:
 * - parcel:created
 * - parcel:updated
 * - parcel:status_changed
 * - rider:location_updated
 * - delivery:completed
 * - delivery:failed
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

interface WebSocketMessage {
  type: WebSocketEventType;
  data: any;
  timestamp?: string;
}

type EventCallback = (data: any) => void;

class WebSocketService {
  private ws: WebSocket | null = null;
  private listeners: Map<WebSocketEventType, Set<EventCallback>> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 3000;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private isIntentionallyClosed = false;

  /**
   * Connect to WebSocket server
   * @param token - JWT authentication token
   */
  connect(token: string) {
    // TODO: Replace with your actual WebSocket URL from backend
    const WS_URL = process.env.REACT_APP_WS_URL || 'ws://localhost:8080/ws';
    
    // Close existing connection if any
    if (this.ws) {
      this.disconnect();
    }

    this.isIntentionallyClosed = false;

    try {
      // Option 1: Token in URL (ask backend which method they prefer)
      this.ws = new WebSocket(`${WS_URL}?token=${token}`);

      // Option 2: Token in first message (uncomment if backend prefers this)
      // this.ws = new WebSocket(WS_URL);

      this.ws.onopen = () => {
        console.log('✅ WebSocket connected');
        this.reconnectAttempts = 0;

        // Option 2 continued: Send auth message after connection
        // this.send({ type: 'auth', token });

        this.emit('connection:established', { connected: true });
      };

      this.ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          console.log('📨 WebSocket message:', message);
          
          if (message.type) {
            this.emit(message.type, message.data);
          }
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      this.ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        this.emit('connection:error', { error });
      };

      this.ws.onclose = (event) => {
        console.log('🔌 WebSocket closed:', event.code, event.reason);
        this.ws = null;

        // Auto-reconnect if not intentionally closed
        if (!this.isIntentionallyClosed && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          console.log(`🔄 Reconnecting... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
          
          this.reconnectTimer = setTimeout(() => {
            this.connect(token);
          }, this.reconnectDelay);
        }
      };
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
    }
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect() {
    this.isIntentionallyClosed = true;
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    console.log('🔌 WebSocket disconnected');
  }

  /**
   * Subscribe to a specific event
   * @param event - Event type to listen for
   * @param callback - Function to call when event is received
   * @returns Unsubscribe function
   */
  on(event: WebSocketEventType, callback: EventCallback): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    
    this.listeners.get(event)!.add(callback);

    // Return unsubscribe function
    return () => {
      const callbacks = this.listeners.get(event);
      if (callbacks) {
        callbacks.delete(callback);
      }
    };
  }

  /**
   * Emit event to all listeners
   */
  private emit(event: WebSocketEventType, data: any) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in WebSocket callback for ${event}:`, error);
        }
      });
    }
  }

  /**
   * Send message to server
   * @param message - Message to send
   */
  send(message: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket is not connected. Message not sent:', message);
    }
  }

  /**
   * Check if WebSocket is connected
   */
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}

export default new WebSocketService();
