import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { Order, OrderSide, OrderType, OrderStatus } from '../types/order';
import { Position } from '../types/market';
import { generateDummyOrders, generateDummyPositions } from '../utils/mockData';

interface OrderStoreContextType {
  // Orders
  activeOrders: Order[];
  orderHistory: Order[];
  
  // Positions
  positions: Position[];
  
  // Actions
  addOrder: (order: Order) => void;
  updateOrder: (orderId: string, updates: Partial<Order>) => void;
  cancelOrder: (orderId: string) => void;
  updatePosition: (symbol: string, updates: Partial<Position>) => void;
  
  // Initialize with dummy data
  initialize: () => void;
}

const OrderStoreContext = createContext<OrderStoreContextType | undefined>(undefined);

export const useOrderStore = () => {
  const context = useContext(OrderStoreContext);
  if (!context) {
    throw new Error('useOrderStore must be used within OrderStoreProvider');
  }
  return context;
};

export const OrderStoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeOrders, setActiveOrders] = useState<Order[]>([]);
  const [orderHistory, setOrderHistory] = useState<Order[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [initialized, setInitialized] = useState(false);

  // Initialize with dummy data on mount
  useEffect(() => {
    if (!initialized) {
      initialize();
      setInitialized(true);
    }
  }, [initialized]);

  const initialize = useCallback(() => {
    // Generate initial dummy data
    const allOrders = generateDummyOrders();
    const initialActive = allOrders.filter(
      (o) => o.status === OrderStatus.ACCEPTED || o.status === OrderStatus.PARTIALLY_FILLED
    );
    const initialHistory = allOrders.filter(
      (o) => o.status === OrderStatus.FILLED || o.status === OrderStatus.CANCELLED || o.status === OrderStatus.REJECTED
    );
    const initialPositions = generateDummyPositions();

    setActiveOrders(initialActive);
    setOrderHistory(initialHistory);
    setPositions(initialPositions);
  }, []);

  const addOrder = useCallback((order: Order) => {
    setActiveOrders((prev) => [...prev, order]);
  }, []);

  const updateOrder = useCallback((orderId: string, updates: Partial<Order>) => {
    setActiveOrders((prev) => {
      const orderIndex = prev.findIndex((o) => o.orderId === orderId);
      if (orderIndex === -1) return prev;

      const updatedOrder = { ...prev[orderIndex], ...updates };
      
      // If order is filled, cancelled, or rejected, move to history
      if (
        updatedOrder.status === OrderStatus.FILLED ||
        updatedOrder.status === OrderStatus.CANCELLED ||
        updatedOrder.status === OrderStatus.REJECTED
      ) {
        setOrderHistory((history) => [updatedOrder, ...history]);
        return prev.filter((o) => o.orderId !== orderId);
      }

      const newActive = [...prev];
      newActive[orderIndex] = updatedOrder;
      return newActive;
    });
  }, []);

  const cancelOrder = useCallback((orderId: string) => {
    updateOrder(orderId, {
      status: OrderStatus.CANCELLED,
      updatedAt: new Date().toISOString(),
    });
  }, [updateOrder]);

  const updatePosition = useCallback((symbol: string, updates: Partial<Position>) => {
    setPositions((prev) => {
      const positionIndex = prev.findIndex((p) => p.symbol === symbol);
      if (positionIndex === -1) {
        // Create new position if it doesn't exist
        const newPosition: Position = {
          symbol,
          side: 'LONG',
          quantity: 0,
          averageEntryPrice: 0,
          currentPrice: 0,
          unrealizedPnl: 0,
          realizedPnl: 0,
          ...updates,
        };
        return [...prev, newPosition];
      }

      const newPositions = [...prev];
      newPositions[positionIndex] = { ...newPositions[positionIndex], ...updates };
      return newPositions;
    });
  }, []);

  return (
    <OrderStoreContext.Provider
      value={{
        activeOrders,
        orderHistory,
        positions,
        addOrder,
        updateOrder,
        cancelOrder,
        updatePosition,
        initialize,
      }}
    >
      {children}
    </OrderStoreContext.Provider>
  );
};
