import { useEffect, useRef, useState } from 'react';
import { WebSocketMessage } from '../types/websocket';
import { WebSocketService } from '../services/websocket';

// Using mock data for now - will switch to real WebSocket when backend is ready
const USE_MOCK_DATA = true;

export const useWebSocket = (url: string) => {
  const wsRef = useRef<WebSocketService | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (USE_MOCK_DATA) {
      // Simulate connection for UI purposes
      setIsConnected(true);
      return;
    }

    // TODO: Uncomment when backend is ready
    // const ws = new WebSocketService(url);
    // wsRef.current = ws;
    //
    // ws.on('ORDER_UPDATE', (message) => {
    //   setLastMessage(message);
    // });
    //
    // ws.on('ORDER_FILLED', (message) => {
    //   setLastMessage(message);
    // });
    //
    // ws.on('PRICE_UPDATE', (message) => {
    //   setLastMessage(message);
    // });
    //
    // ws.connect();
    // setIsConnected(ws.isConnected());
    //
    // return () => {
    //   ws.disconnect();
    // };
  }, [url]);

  const sendMessage = (message: any) => {
    if (wsRef.current && isConnected) {
      wsRef.current.send(message);
    }
  };

  return {
    isConnected,
    lastMessage,
    sendMessage,
  };
};
