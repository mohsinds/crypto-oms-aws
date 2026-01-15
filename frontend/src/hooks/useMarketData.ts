import { useQuery } from '@tanstack/react-query';
import { Price, OrderBook, Candlestick, Trade } from '../types/market';
import {
  generateDummyPrice,
  generateDummyOrderBook,
  generateCandlestickData,
  generateDummyTrades,
} from '../utils/mockData';

// Using mock data for now - will switch to real API when backend is ready
const USE_MOCK_DATA = true;

export const useMarketData = (symbol: string) => {
  const priceQuery = useQuery({
    queryKey: ['market-data', 'price', symbol],
    queryFn: async (): Promise<Price> => {
      if (USE_MOCK_DATA) {
        return generateDummyPrice(symbol);
      }
      // TODO: Use real API
      // return marketDataService.getPrice(symbol);
      throw new Error('Not implemented');
    },
    refetchInterval: 1000, // Update every second
  });

  return {
    currentPrice: priceQuery.data?.price,
    price: priceQuery.data,
    isLoading: priceQuery.isLoading,
  };
};

export const useOrderBook = (symbol: string) => {
  const orderBookQuery = useQuery({
    queryKey: ['market-data', 'orderbook', symbol],
    queryFn: async (): Promise<OrderBook> => {
      if (USE_MOCK_DATA) {
        return generateDummyOrderBook(symbol);
      }
      // TODO: Use real API
      // return marketDataService.getOrderBook(symbol);
      throw new Error('Not implemented');
    },
    refetchInterval: 2000, // Update every 2 seconds
  });

  return {
    orderBook: orderBookQuery.data,
    isLoading: orderBookQuery.isLoading,
  };
};

export const useCandlestickData = (symbol: string, interval: string) => {
  const candlestickQuery = useQuery({
    queryKey: ['market-data', 'candlestick', symbol, interval],
    queryFn: async (): Promise<Candlestick[]> => {
      if (USE_MOCK_DATA) {
        const data = generateCandlestickData(symbol, 100);
        // Ensure data is sorted by timestamp (oldest to newest)
        return data.sort((a, b) => a.timestamp - b.timestamp);
      }
      // TODO: Use real API
      // return marketDataService.getCandlestickData(symbol, interval);
      throw new Error('Not implemented');
    },
    staleTime: 5000, // Consider data fresh for 5 seconds
  });

  return {
    data: candlestickQuery.data || [],
    isLoading: candlestickQuery.isLoading,
  };
};

export const useRecentTrades = (symbol: string) => {
  const tradesQuery = useQuery({
    queryKey: ['market-data', 'trades', symbol],
    queryFn: async (): Promise<Trade[]> => {
      if (USE_MOCK_DATA) {
        return generateDummyTrades(symbol, 20);
      }
      // TODO: Use real API
      // return marketDataService.getRecentTrades(symbol);
      throw new Error('Not implemented');
    },
    refetchInterval: 3000, // Update every 3 seconds
  });

  return {
    trades: tradesQuery.data || [],
    isLoading: tradesQuery.isLoading,
  };
};
