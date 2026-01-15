import { useMutation } from '@tanstack/react-query';
import { orderService } from '../services/orderService';
import { Order, PlaceOrderRequest, OrderStatus } from '../types/order';
import { useOrderStore } from '../contexts/OrderStore';

// Using store for state management - will switch to real API when backend is ready
const USE_MOCK_DATA = true;

export const useOrders = () => {
  const { activeOrders, orderHistory, addOrder, updateOrder } = useOrderStore();

  // Place new order
  const placeOrderMutation = useMutation({
    mutationFn: async (request: PlaceOrderRequest) => {
      if (USE_MOCK_DATA) {
        // Create order object
        const newOrder: Order = {
          orderId: `order-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          symbol: request.symbol,
          side: request.side,
          orderType: request.orderType,
          quantity: request.quantity,
          price: request.price,
          status: OrderStatus.ACCEPTED,
          filledQuantity: 0,
          createdAt: new Date().toISOString(),
        };

        // Add to store
        addOrder(newOrder);

        // Simulate order processing (move to filled after a delay)
        setTimeout(() => {
          updateOrder(newOrder.orderId, {
            status: OrderStatus.FILLED,
            filledQuantity: request.quantity,
            avgFillPrice: request.price || request.quantity * 45000, // Mock fill price
            updatedAt: new Date().toISOString(),
          });
        }, 3000); // Fill after 3 seconds

        return newOrder;
      }
      return orderService.placeOrder(request);
    },
  });

  return {
    placeOrder: placeOrderMutation.mutate,
    isPlacing: placeOrderMutation.isPending,
    activeOrders,
    orderHistory,
    isLoading: false,
    refetch: () => {
      // Store-based, no refetch needed
    },
  };
};

export const useActiveOrders = () => {
  const { activeOrders } = useOrderStore();
  return { orders: activeOrders, isLoading: false, refetch: () => {} };
};

export const useOrderHistory = (filter?: 'all' | 'filled' | 'cancelled' | 'rejected') => {
  const { orderHistory } = useOrderStore();
  
  let filtered = orderHistory;
  if (filter && filter !== 'all') {
    filtered = orderHistory.filter((order) => {
      if (filter === 'filled') return order.status === OrderStatus.FILLED;
      if (filter === 'cancelled') return order.status === OrderStatus.CANCELLED;
      if (filter === 'rejected') return order.status === OrderStatus.REJECTED;
      return true;
    });
  }
  
  return { orders: filtered, isLoading: false };
};
