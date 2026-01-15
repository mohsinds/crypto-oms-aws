import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useWebSocket } from './useWebSocket';

export const useOrderMonitoring = () => {
  const queryClient = useQueryClient();
  const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:5002/ws/market-data';
  
  const { lastMessage, isConnected } = useWebSocket(wsUrl);

  useEffect(() => {
    if (lastMessage) {
      switch (lastMessage.type) {
        case 'ORDER_UPDATE':
          queryClient.invalidateQueries({ queryKey: ['orders', 'active'] });
          break;
          
        case 'ORDER_FILLED':
          queryClient.invalidateQueries({ queryKey: ['orders', 'active'] });
          queryClient.invalidateQueries({ queryKey: ['orders', 'history'] });
          break;
      }
    }
  }, [lastMessage, queryClient]);

  return { isConnected };
};
