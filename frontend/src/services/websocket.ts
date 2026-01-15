import { WebSocketMessage } from '../types/websocket';

// TODO: Replace with actual WebSocket connection when backend is ready
// For now, this is prepared but will use mock data

export class WebSocketService {
  private ws: WebSocket | null = null;
  private url: string;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private listeners: Map<string, ((message: WebSocketMessage) => void)[]> = new Map();

  constructor(url: string) {
    this.url = url;
  }

  connect(): void {
    // TODO: Uncomment when backend is ready
    // try {
    //   this.ws = new WebSocket(this.url);
    //
    //   this.ws.onopen = () => {
    //     console.log('WebSocket connected');
    //     this.subscribe(['prices', 'executions', 'order-updates']);
    //   };
    //
    //   this.ws.onmessage = (event) => {
    //     try {
    //       const message: WebSocketMessage = JSON.parse(event.data);
    //       this.handleMessage(message);
    //     } catch (error) {
    //       console.error('Failed to parse WebSocket message:', error);
    //     }
    //   };
    //
    //   this.ws.onerror = (error) => {
    //     console.error('WebSocket error:', error);
    //   };
    //
    //   this.ws.onclose = () => {
    //     console.log('WebSocket disconnected');
    //     this.scheduleReconnect();
    //   };
    // } catch (error) {
    //   console.error('Failed to create WebSocket:', error);
    //   this.scheduleReconnect();
    // }
    
    console.log('WebSocket service initialized (using mock data for now)');
  }

  private subscribe(channels: string[]): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        action: 'subscribe',
        channels,
      }));
    }
  }

  private handleMessage(message: WebSocketMessage): void {
    const listeners = this.listeners.get(message.type) || [];
    listeners.forEach((listener) => listener(message));
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }
    this.reconnectTimeout = setTimeout(() => {
      this.connect();
    }, 3000);
  }

  on(messageType: string, callback: (message: WebSocketMessage) => void): void {
    if (!this.listeners.has(messageType)) {
      this.listeners.set(messageType, []);
    }
    this.listeners.get(messageType)!.push(callback);
  }

  off(messageType: string, callback: (message: WebSocketMessage) => void): void {
    const listeners = this.listeners.get(messageType);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  send(message: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  disconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}
