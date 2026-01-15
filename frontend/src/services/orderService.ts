import { api } from './api';
import { Order, PlaceOrderRequest } from '../types/order';

// TODO: Replace with actual API calls when backend is ready
// For now, these methods are prepared but will use mock data

export const orderService = {
  async placeOrder(request: PlaceOrderRequest): Promise<Order> {
    // TODO: Uncomment when backend is ready
    // const response = await api.post('/api/orders', {
    //   symbol: request.symbol,
    //   side: request.side,
    //   orderType: request.orderType,
    //   quantity: request.quantity,
    //   price: request.price,
    // }, {
    //   headers: {
    //     'X-Idempotency-Key': request.idempotencyKey,
    //   },
    // });
    // return response.data;
    
    // Mock response for now
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          orderId: `order-${Date.now()}`,
          symbol: request.symbol,
          side: request.side,
          orderType: request.orderType,
          quantity: request.quantity,
          price: request.price,
          status: 'ACCEPTED' as any,
          filledQuantity: 0,
          createdAt: new Date().toISOString(),
        });
      }, 500);
    });
  },

  async getActiveOrders(): Promise<Order[]> {
    // TODO: Uncomment when backend is ready
    // const response = await api.get('/api/orders', {
    //   params: {
    //     status: 'active', // ACCEPTED, PARTIALLY_FILLED
    //   },
    // });
    // return response.data;
    
    // Mock data for now
    return Promise.resolve([]);
  },

  async getOrderHistory(): Promise<Order[]> {
    // TODO: Uncomment when backend is ready
    // const response = await api.get('/api/orders', {
    //   params: {
    //     status: 'completed', // FILLED, CANCELLED, REJECTED
    //   },
    // });
    // return response.data;
    
    // Mock data for now
    return Promise.resolve([]);
  },

  async getOrder(orderId: string): Promise<Order> {
    // TODO: Uncomment when backend is ready
    // const response = await api.get(`/api/orders/${orderId}`);
    // return response.data;
    
    // Mock data for now
    throw new Error('Not implemented');
  },

  async cancelOrder(orderId: string): Promise<void> {
    // TODO: Uncomment when backend is ready
    // await api.delete(`/api/orders/${orderId}`);
    
    // Mock for now
    return Promise.resolve();
  },
};
