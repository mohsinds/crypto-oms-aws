import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { orderService } from '../services/orderService';
import { Order, PlaceOrderRequest } from '../types/order';
import { generateDummyOrders } from '../utils/mockData';

// Using mock data for now - will switch to real API when backend is ready
const USE_MOCK_DATA = true;

export const useOrders = () => {
  const queryClient = useQueryClient();

  // Place new order
  const placeOrderMutation = useMutation({
    mutationFn: (request: PlaceOrderRequest) => orderService.placeOrder(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders', 'active'] });
      queryClient.invalidateQueries({ queryKey: ['orders', 'history'] });
    },
  });

  // Get active orders
  const activeOrdersQuery = useQuery({
    queryKey: ['orders', 'active'],
    queryFn: async () => {
      if (USE_MOCK_DATA) {
        const allOrders = generateDummyOrders();
        return allOrders.filter(
          (o) => o.status === 'ACCEPTED' || o.status === 'PARTIALLY_FILLED'
        );
      }
      return orderService.getActiveOrders();
    },
    refetchInterval: 5000,
  });

  // Get order history
  const orderHistoryQuery = useQuery({
    queryKey: ['orders', 'history'],
    queryFn: async () => {
      if (USE_MOCK_DATA) {
        const allOrders = generateDummyOrders();
        return allOrders.filter(
          (o) => o.status === 'FILLED' || o.status === 'CANCELLED' || o.status === 'REJECTED'
        );
      }
      return orderService.getOrderHistory();
    },
  });

  return {
    placeOrder: placeOrderMutation.mutate,
    isPlacing: placeOrderMutation.isPending,
    activeOrders: activeOrdersQuery.data || [],
    orderHistory: orderHistoryQuery.data || [],
    isLoading: activeOrdersQuery.isLoading || orderHistoryQuery.isLoading,
    refetch: () => {
      activeOrdersQuery.refetch();
      orderHistoryQuery.refetch();
    },
  };
};

export const useActiveOrders = () => {
  const { activeOrders, isLoading, refetch } = useOrders();
  return { orders: activeOrders, isLoading, refetch };
};

export const useOrderHistory = (filter?: 'all' | 'filled' | 'cancelled' | 'rejected') => {
  const { orderHistory, isLoading } = useOrders();
  
  let filtered = orderHistory;
  if (filter && filter !== 'all') {
    filtered = orderHistory.filter((order) => {
      if (filter === 'filled') return order.status === 'FILLED';
      if (filter === 'cancelled') return order.status === 'CANCELLED';
      if (filter === 'rejected') return order.status === 'REJECTED';
      return true;
    });
  }
  
  return { orders: filtered, isLoading };
};
