import { api } from './api';
import { Price, OrderBook, Candlestick, Trade } from '../types/market';

// TODO: Replace with actual API calls when backend is ready
// For now, these methods are prepared but will use mock data

export const marketDataService = {
  async getPrice(symbol: string): Promise<Price> {
    // TODO: Uncomment when backend is ready
    // const response = await api.get(`/api/market-data/prices/${symbol}`);
    // return response.data;
    
    // Mock data for now
    throw new Error('Use mock data');
  },

  async getOrderBook(symbol: string): Promise<OrderBook> {
    // TODO: Uncomment when backend is ready
    // const response = await api.get(`/api/market-data/orderbook/${symbol}`);
    // return response.data;
    
    // Mock data for now
    throw new Error('Use mock data');
  },

  async getCandlestickData(symbol: string, interval: string): Promise<Candlestick[]> {
    // TODO: Uncomment when backend is ready
    // const response = await api.get(`/api/market-data/candles/${symbol}`, {
    //   params: { interval },
    // });
    // return response.data;
    
    // Mock data for now
    throw new Error('Use mock data');
  },

  async getRecentTrades(symbol: string): Promise<Trade[]> {
    // TODO: Uncomment when backend is ready
    // const response = await api.get(`/api/market-data/trades/${symbol}`);
    // return response.data;
    
    // Mock data for now
    throw new Error('Use mock data');
  },
};
